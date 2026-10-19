import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ChatbotService } from '../../../core/services/chatbot.service';
import { CartService } from '../../../core/services/cart.service';
import { CheckoutService } from '../../../core/services/checkout.service';
import { OrderService } from '../../../core/services/order.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { AddressService } from '../../../core/services/address.service';
import { SettingService } from '../../../core/services/setting.service';
import { CouponService } from '../../../core/services/coupon.service';
import { ShopService } from '../../../core/services/shop.service';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { ChatAction, ChatMessage, InChatCheckoutState } from '../../../core/models/chatbot.models';
import { Product } from '../../../core/models/product.model';
import { CartResponse } from '../../../core/models/cart.models';
import { CheckoutRequest, CheckoutResponse } from '../../../core/models/order.models';
import { SavedAddressResponse } from '../../../core/models/address.models';
import { readApiErrorMessage } from '../../../core/models/api-error.model';

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent],
  templateUrl: './chatbot-widget.component.html',
  styleUrl: './chatbot-widget.component.css'
})
export class ChatbotWidgetComponent implements OnInit {
  readonly instapayPaymentLink = 'https://ipn.eg/S/renadkd29/instapay/3BqRUg';
  readonly instapayHandle = 'renadkd29@instapay';

  private readonly chatbotService = inject(ChatbotService);
  private readonly cartService = inject(CartService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly orderService = inject(OrderService);
  private readonly authState = inject(AuthStateService);
  private readonly addressService = inject(AddressService);
  private readonly settingService = inject(SettingService);
  private readonly couponService = inject(CouponService);
  private readonly shopService = inject(ShopService);
  private readonly router = inject(Router);

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

  isOpen = false;
  isLoading = false;
  userInput = '';
  addedProductIds = new Set<string>();

  deliveryFeeRate = 50;
  blockedDays: string[] = [];
  savedAddresses: SavedAddressResponse[] = [];
  loadingAddresses = false;

  messages: ChatMessage[] = [
    {
      role: 'assistant',
      content: 'Hello! 🥐 I am your Petites shopping concierge. How can I help you today? You can ask about our menu, ask me to add items to your cart, or place an order directly with me!',
      timestamp: new Date(),
      quickReplies: [
        "📜 Show Menu",
        "⚡ Instant Delivery",
        "🛒 View Cart",
        "💳 Checkout"
      ]
    }
  ];

  suggestions = [
    "المنيو كامل / Show Menu",
    "توصيل فوري / Instant Items",
    "سلة التسوق / View Cart",
    "تتبع الطلب / Track Order"
  ];

  ngOnInit(): void {
    this.loadDeliverySettings();
    this.loadSavedAddresses();
  }

  get cart(): CartResponse | null {
    return this.cartService.cart();
  }

  get cartItemCount(): number {
    return this.cartService.itemCount();
  }

  get isAuthenticated(): boolean {
    return this.authState.isAuthenticated();
  }

  loadDeliverySettings(): void {
    this.settingService.getDeliveryFee().subscribe({
      next: (res) => {
        if (res && typeof res.deliveryFee === 'number') {
          this.deliveryFeeRate = res.deliveryFee;
        }
      },
      error: () => {}
    });

    this.settingService.getBlockedDays().subscribe({
      next: (res) => {
        if (res && res.blockedDays) {
          this.blockedDays = res.blockedDays;
        }
      },
      error: () => {}
    });
  }

  loadSavedAddresses(onComplete?: () => void): void {
    if (!this.isAuthenticated) {
      this.savedAddresses = [];
      if (onComplete) onComplete();
      return;
    }

    this.loadingAddresses = true;
    this.addressService.listAddresses().subscribe({
      next: (addresses) => {
        this.savedAddresses = addresses || [];
        this.loadingAddresses = false;
        this.syncAddressWithActiveCheckoutCards();
        if (onComplete) onComplete();
      },
      error: () => {
        this.loadingAddresses = false;
        if (onComplete) onComplete();
      }
    });
  }

  private syncAddressWithActiveCheckoutCards(): void {
    if (this.savedAddresses.length === 0) return;
    const defaultAddr = this.savedAddresses[0];

    for (const msg of this.messages) {
      if (msg.checkoutCard && (!msg.checkoutCard.addressId || msg.checkoutCard.addressId === '')) {
        msg.checkoutCard.addressId = defaultAddr.id;
        msg.checkoutCard.deliveryCity = defaultAddr.city;
        msg.checkoutCard.deliveryArea = defaultAddr.area;
        msg.checkoutCard.deliveryStreet = defaultAddr.street;
        msg.checkoutCard.deliveryBuilding = defaultAddr.building || '';
        msg.checkoutCard.deliveryNotes = defaultAddr.notes || '';
      }
    }
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      if (this.isAuthenticated && this.savedAddresses.length === 0) {
        this.loadSavedAddresses();
      }
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  sendSuggestion(suggestion: string): void {
    this.userInput = suggestion;
    this.sendMessage();
  }

  handleQuickReply(replyText: string): void {
    this.userInput = replyText;
    this.sendMessage();
  }

  isArabic(text: string | undefined): boolean {
    if (!text) return false;
    return /[\u0600-\u06FF]/.test(text);
  }

  formatContent(text: string | undefined): string {
    if (!text) return '';
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Strip any leaked fake markdown links like | [Add to Cart](#) or [Add to Cart]
    escaped = escaped.replace(/\|?\s*\[Add to Cart\](?:\([^)]*\))?/gi, '');

    // Strip internal database UUID brackets like [ID: 123-abc]
    escaped = escaped.replace(/\[ID:\s*[^\]]+\]/gi, '');

    // Markdown bold **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="highlight-text">$1</strong>');

    // Bullet points
    escaped = escaped.replace(/^\s*•\s+/gm, '• ')
      .replace(/^\s*\*\s+/gm, '• ');

    return escaped.trim();
  }

  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isLoading) return;

    // Add user message
    this.messages.push({
      role: 'user',
      content: text,
      timestamp: new Date()
    });

    this.userInput = '';
    this.isLoading = true;
    this.scrollToBottom();

    // Payload
    const apiMessages = this.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    this.chatbotService.sendMessage({ messages: apiMessages }).subscribe({
      next: (res) => {
        this.isLoading = false;
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: res.reply,
          products: res.products || [],
          action: res.action || undefined,
          quickReplies: res.quickReplies || [],
          timestamp: new Date()
        };

        this.messages.push(assistantMsg);
        this.scrollToBottom();

        if (res.action) {
          this.executeAction(res.action, assistantMsg);
        }
      },
      error: () => {
        this.isLoading = false;
        this.messages.push({
          role: 'assistant',
          content: 'Sorry, I ran into a network error. Please try asking again!',
          timestamp: new Date()
        });
        this.scrollToBottom();
      }
    });
  }

  executeAction(action: ChatAction, assistantMsg: ChatMessage): void {
    switch (action.type) {
      case 'ADD_TO_CART':
        if (action.productId) {
          this.cartService.addItem({
            productId: action.productId,
            quantity: action.quantity || 1,
            deliveryMode: action.deliveryMode || 'SCHEDULED'
          }).subscribe({
            next: (cart) => {
              this.addedProductIds.add(action.productId!);
              assistantMsg.cartPreview = cart;
              setTimeout(() => this.addedProductIds.delete(action.productId!), 3000);
              this.scrollToBottom();
            },
            error: (err) => {
              assistantMsg.content += `\n\n⚠️ ${readApiErrorMessage(err, 'Failed to add item to cart.')}`;
              this.scrollToBottom();
            }
          });
        }
        break;

      case 'VIEW_CART':
        this.cartService.loadCart().subscribe({
          next: (cart) => {
            assistantMsg.cartPreview = cart;
            this.scrollToBottom();
          }
        });
        break;

      case 'CLEAR_CART':
        this.cartService.clearCart().subscribe({
          next: (cart) => {
            assistantMsg.cartPreview = cart;
            this.scrollToBottom();
          }
        });
        break;

      case 'INITIATE_CHECKOUT':
        this.cartService.loadCart().subscribe({
          next: (cart) => {
            if (!cart || !cart.items || cart.items.length === 0) {
              const arabic = this.isArabic(assistantMsg.content);
              assistantMsg.content += arabic
                ? '\n\n⚠️ سلة التسوق الخاصة بك فارغة حالياً! تصفح المنيو أدناه واختر ما تفضله لإتمام الطلب.'
                : '\n\n⚠️ Your cart is currently empty! Please add some delicious treats from our menu first.';
              this.scrollToBottom();
            } else {
              if (this.isAuthenticated && this.savedAddresses.length === 0) {
                this.loadSavedAddresses(() => {
                  this.setupCheckoutCard(assistantMsg, cart);
                });
              } else {
                this.setupCheckoutCard(assistantMsg, cart);
              }
            }
          }
        });
        break;

      case 'TRACK_ORDER':
        this.orderService.listOrders().subscribe({
          next: (orders) => {
            assistantMsg.trackedOrders = orders && orders.length > 0 ? orders.slice(0, 3) : [];
            if (!orders || orders.length === 0) {
              const arabic = this.isArabic(assistantMsg.content);
              assistantMsg.content += arabic
                ? '\n\nلم يتم العثور على طلبات سابقة مسجلة في جلستك الحالية.'
                : '\n\nNo recent orders found in your current session.';
            }
            this.scrollToBottom();
          },
          error: () => {
            const arabic = this.isArabic(assistantMsg.content);
            assistantMsg.content += arabic
              ? '\n\nتعذر تحميل حالة الطلبات حالياً.'
              : '\n\nUnable to retrieve order history at this moment.';
            this.scrollToBottom();
          }
        });
        break;

      case 'NAVIGATE':
        if (action.targetUrl) {
          this.router.navigateByUrl(action.targetUrl);
        }
        break;
    }
  }

  setupCheckoutCard(assistantMsg: ChatMessage, cart: CartResponse): void {
    const defaultAddress = this.savedAddresses.length > 0 ? this.savedAddresses[0] : null;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = tomorrow.toISOString().split('T')[0];

    const card: InChatCheckoutState = {
      customerName: '',
      customerPhone: '',
      orderType: 'DELIVERY',
      addressId: defaultAddress ? defaultAddress.id : undefined,
      deliveryCity: defaultAddress ? defaultAddress.city : 'Cairo',
      deliveryArea: defaultAddress ? defaultAddress.area : 'Maadi',
      deliveryStreet: defaultAddress ? defaultAddress.street : '',
      deliveryBuilding: defaultAddress?.building || '',
      deliveryNotes: defaultAddress?.notes || '',
      scheduledDate: defaultDate,
      minScheduledDate: '',
      couponCode: '',
      couponPreview: null,
      validatingCoupon: false,
      couponError: undefined,
      notes: '',
      isSubmitting: false
    };

    assistantMsg.checkoutCard = card;
    assistantMsg.cartPreview = cart;

    this.updateCardMinScheduledDate(card, cart);
    this.scrollToBottom();
  }

  private updateCardMinScheduledDate(card: InChatCheckoutState, cart: CartResponse | null): void {
    const scheduledItems = cart?.items?.filter((item) => item.deliveryMode === 'SCHEDULED') ?? [];
    if (scheduledItems.length === 0) {
      card.minScheduledDate = '';
      return;
    }

    const requests = scheduledItems.map((item) => this.shopService.getProductDetail(item.productId));
    forkJoin(requests).subscribe({
      next: (products) => {
        const dates = products.map((p) => p.earliestScheduledDate).filter(Boolean);
        if (dates.length > 0) {
          dates.sort();
          card.minScheduledDate = dates[dates.length - 1];
        } else {
          card.minScheduledDate = this.getTodayCairoFormatted();
        }
        
        // Ensure scheduledDate is at least minScheduledDate and not on a blocked day
        if (!card.scheduledDate || card.scheduledDate < card.minScheduledDate || this.isDateBlocked(card.scheduledDate)) {
          card.scheduledDate = this.findNextAvailableDate(card.minScheduledDate);
        }
      },
      error: () => {
        card.minScheduledDate = this.getTodayCairoFormatted();
        if (!card.scheduledDate || card.scheduledDate < card.minScheduledDate || this.isDateBlocked(card.scheduledDate)) {
          card.scheduledDate = this.findNextAvailableDate(card.minScheduledDate);
        }
      }
    });
  }

  private getTodayCairoFormatted(): string {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    const formatter = new Intl.DateTimeFormat('fr-CA', options);
    return formatter.format(new Date());
  }

  private findNextAvailableDate(startDateStr: string): string {
    if (!startDateStr) return '';
    const parts = startDateStr.split('-');
    let date = parts.length === 3 ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)) : new Date();
    
    for (let i = 0; i < 21; i++) {
      const y = date.getFullYear();
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const d = date.getDate().toString().padStart(2, '0');
      const str = `${y}-${m}-${d}`;
      if (!this.isDateBlocked(str)) {
        return str;
      }
      date.setDate(date.getDate() + 1);
    }
    return startDateStr;
  }

  validateInChatCoupon(card: InChatCheckoutState, cart: CartResponse | null): void {
    const code = card.couponCode?.trim();
    const subtotal = cart?.subtotal || 0;
    if (!code) {
      card.couponError = 'Please enter a promo code.';
      return;
    }
    if (subtotal <= 0) {
      card.couponError = 'Cart is empty.';
      return;
    }

    card.validatingCoupon = true;
    card.couponError = undefined;
    this.couponService.validateCoupon(code, subtotal).subscribe({
      next: (preview) => {
        card.validatingCoupon = false;
        card.couponPreview = preview;
        if (!preview.valid) {
          card.couponError = preview.message || 'Invalid promo code.';
        } else {
          card.couponError = undefined;
        }
        this.scrollToBottom();
      },
      error: (err) => {
        card.validatingCoupon = false;
        card.couponError = readApiErrorMessage(err, 'Unable to validate promo code.');
        this.scrollToBottom();
      }
    });
  }

  removeInChatCoupon(card: InChatCheckoutState): void {
    card.couponCode = '';
    card.couponPreview = null;
    card.couponError = undefined;
  }

  onAddressSelectChange(card: InChatCheckoutState, addressId: string | undefined): void {
    card.addressId = addressId;
    if (addressId && addressId !== 'NEW') {
      const selected = this.savedAddresses.find(a => a.id === addressId);
      if (selected) {
        card.deliveryCity = selected.city;
        card.deliveryArea = selected.area;
        card.deliveryStreet = selected.street;
        card.deliveryBuilding = selected.building || '';
        card.deliveryNotes = selected.notes || '';
      }
    } else {
      card.addressId = 'NEW';
      card.deliveryCity = 'Cairo';
      card.deliveryArea = '';
      card.deliveryStreet = '';
      card.deliveryBuilding = '';
      card.deliveryNotes = '';
    }
  }

  getSelectedSavedAddress(addressId: string | undefined): SavedAddressResponse | undefined {
    if (!addressId || addressId === 'NEW') return undefined;
    return this.savedAddresses.find(a => a.id === addressId);
  }

  addToCart(product: Product): void {
    const mode = product.instantAvailableToday && (product.instantQuantityToday ?? 0) > 0 ? 'INSTANT' : 'SCHEDULED';
    this.cartService.addItem({
      productId: product.id,
      quantity: 1,
      deliveryMode: mode
    }).subscribe({
      next: (cart) => {
        this.addedProductIds.add(product.id);
        setTimeout(() => this.addedProductIds.delete(product.id), 2500);

        // Append quick feedback
        this.messages.push({
          role: 'assistant',
          content: `✅ Added **${product.name}** to your cart! You now have ${cart.items.reduce((s, i) => s + i.quantity, 0)} item(s) in your basket.`,
          cartPreview: cart,
          quickReplies: ["🛒 View Cart", "💳 Checkout", "📜 Show Menu"],
          timestamp: new Date()
        });
        this.scrollToBottom();
      },
      error: (err) => {
        this.messages.push({
          role: 'assistant',
          content: `⚠️ Failed to add ${product.name}: ${readApiErrorMessage(err)}`,
          timestamp: new Date()
        });
        this.scrollToBottom();
      }
    });
  }

  submitInChatCheckout(msg: ChatMessage): void {
    const card = msg.checkoutCard;
    if (!card || card.isSubmitting) return;

    card.error = undefined;

    // Basic Validation: only require name & phone for non-authenticated guests
    if (!this.isAuthenticated) {
      if (!card.customerName.trim() || card.customerName.trim().length < 2) {
        card.error = 'Please enter your full name (minimum 2 characters).';
        return;
      }
      if (!card.customerPhone.trim() || card.customerPhone.trim().length < 7) {
        card.error = 'Please enter a valid phone number.';
        return;
      }
    }

    // Delivery Address Validation
    const isUsingSavedAddress = this.isAuthenticated && Boolean(card.addressId && card.addressId !== 'NEW');
    if (card.orderType === 'DELIVERY' && !isUsingSavedAddress) {
      if (!card.deliveryStreet.trim() || !card.deliveryArea.trim() || !card.deliveryCity.trim()) {
        card.error = 'Please enter street, area, and city for delivery.';
        return;
      }
    }

    const hasScheduled = msg.cartPreview?.items?.some(i => i.deliveryMode === 'SCHEDULED');
    if (hasScheduled) {
      if (!card.scheduledDate) {
        card.error = 'Please choose a scheduled delivery date for scheduled bakery items.';
        return;
      }
      if (card.minScheduledDate && card.scheduledDate < card.minScheduledDate) {
        card.error = `Selected scheduled date cannot be earlier than ${card.minScheduledDate}.`;
        return;
      }
      if (this.isDateBlocked(card.scheduledDate)) {
        card.error = 'Selected date falls on a blocked bakery delivery day. Please choose another date.';
        return;
      }
    }

    card.isSubmitting = true;

    const couponCode = card.couponCode?.trim() || '';
    const payload: CheckoutRequest = {
      customerName: card.customerName.trim() || undefined,
      customerPhone: card.customerPhone.trim() || undefined,
      orderType: card.orderType,
      addressId: isUsingSavedAddress ? card.addressId : null,
      deliveryCity: card.orderType === 'DELIVERY' && !isUsingSavedAddress ? card.deliveryCity.trim() : undefined,
      deliveryArea: card.orderType === 'DELIVERY' && !isUsingSavedAddress ? card.deliveryArea.trim() : undefined,
      deliveryStreet: card.orderType === 'DELIVERY' && !isUsingSavedAddress ? card.deliveryStreet.trim() : undefined,
      deliveryBuilding: card.orderType === 'DELIVERY' && !isUsingSavedAddress ? card.deliveryBuilding.trim() : undefined,
      deliveryNotes: card.orderType === 'DELIVERY' && !isUsingSavedAddress ? card.deliveryNotes.trim() : undefined,
      notes: card.notes.trim() || undefined,
      couponId: card.couponPreview?.valid ? card.couponPreview.couponId : null,
      couponCode: card.couponPreview?.valid ? null : (couponCode || null),
      scheduledDate: hasScheduled ? card.scheduledDate || null : null
    };

    this.checkoutService.submitCheckout(payload).subscribe({
      next: (response: CheckoutResponse) => {
        card.isSubmitting = false;

        const amountToTransfer = response.orders.reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);
        const formattedAmount = new Intl.NumberFormat('en-EG', {
          style: 'currency',
          currency: 'EGP'
        }).format(amountToTransfer);

        const orderNum = response.orders[0]?.orderNumber || 'CONFIRMED';

        // Add confirmed message
        this.messages.push({
          role: 'assistant',
          content: `🎉 **Order Placed Successfully!**\nYour order **#${orderNum}** has been received! Please complete payment via InstaPay using the details below so we can start baking and preparing your treats:`,
          orderConfirmation: {
            orderReference: response,
            orders: response.orders,
            totalAmountToTransfer: formattedAmount
          },
          quickReplies: ["📦 Track Order", "📜 Show Menu", "🛒 View Cart"],
          timestamp: new Date()
        });

        // Clear in-chat checkout card from previous message
        msg.checkoutCard = undefined;
        this.scrollToBottom();
      },
      error: (error) => {
        card.isSubmitting = false;
        card.error = readApiErrorMessage(error, 'Unable to place order. Please check all details and try again.');
        this.scrollToBottom();
      }
    });
  }

  isDateBlocked(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return false;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);

    if (isNaN(date.getTime())) return false;

    const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const selectedDayName = daysOfWeek[date.getDay()];
    return this.blockedDays.includes(selectedDayName);
  }

  calculateCheckoutTotal(card: InChatCheckoutState, cart: CartResponse | null): number {
    if (!cart) return 0;
    const itemsTotal = cart.subtotal || 0;
    const discount = (card.couponPreview && card.couponPreview.valid) ? card.couponPreview.discountAmount : 0;
    const delivery = card.orderType === 'DELIVERY' ? this.deliveryFeeRate : 0;
    return Math.max(0, itemsTotal - discount + delivery);
  }

  hasScheduledItems(cart: CartResponse | null): boolean {
    return Boolean(cart?.items?.some(i => i.deliveryMode === 'SCHEDULED'));
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  goToCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  clearChat(): void {
    this.messages = [
      {
        role: 'assistant',
        content: 'Conversation reset. 🥐 How can I assist you with your sweet cravings today?',
        timestamp: new Date(),
        quickReplies: [
          "📜 Show Menu",
          "⚡ Instant Delivery",
          "🛒 View Cart",
          "💳 Checkout"
        ]
      }
    ];
  }

  clearCartFromChat(): void {
    this.cartService.clearCart().subscribe({
      next: (cart) => {
        this.messages.push({
          role: 'assistant',
          content: '🗑️ Your shopping cart has been cleared.',
          cartPreview: cart,
          quickReplies: ["📜 Show Menu", "⚡ Instant Items"],
          timestamp: new Date()
        });
        this.scrollToBottom();
      }
    });
  }

  triggerCheckoutPrompt(): void {
    this.sendMessageWithText('Checkout');
  }

  sendMessageWithText(text: string): void {
    this.userInput = text;
    this.sendMessage();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    }, 60);
  }
}
