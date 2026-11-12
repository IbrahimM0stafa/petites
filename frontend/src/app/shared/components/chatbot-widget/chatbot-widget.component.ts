import { Component, ElementRef, OnInit, ViewChild, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ChatbotService } from '../../../core/services/chatbot.service';
import { CartService } from '../../../core/services/cart.service';
import { CheckoutService } from '../../../core/services/checkout.service';
import { OrderService } from '../../../core/services/order.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { AddressService } from '../../../core/services/address.service';
import { SettingService } from '../../../core/services/setting.service';
import { CouponService } from '../../../core/services/coupon.service';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { ChatAction, ChatMessage, InChatCheckoutState } from '../../../core/models/chatbot.models';
import { Product } from '../../../core/models/product.model';
import { CartResponse } from '../../../core/models/cart.models';
import { CheckoutResponse } from '../../../core/models/order.models';
import { SavedAddressResponse } from '../../../core/models/address.models';
import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { AreaNode, CityNode, GovernorateNode } from '../../../core/models/delivery-zone.model';
import { DeliveryZoneService } from '../../../core/services/delivery-zone.service';
import { DeliveryZoneUtil } from '../../../core/utils/delivery-zone.util';
import { CheckoutDateUtil } from '../../../features/checkout/utils/checkout-date.util';
import { InChatCheckoutCoordinator } from './services/in-chat-checkout-coordinator.service';

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent],
  templateUrl: './chatbot-widget.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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
  private readonly router = inject(Router);
  private readonly deliveryZoneService = inject(DeliveryZoneService);
  private readonly inChatCheckoutCoordinator = inject(InChatCheckoutCoordinator);

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

  isOpen = false;
  isLoading = false;
  userInput = '';
  addedProductIds = new Set<string>();

  deliveryFeeRate = 0;
  zoneTree: GovernorateNode[] = [];
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
    this.settingService.getBlockedDays().subscribe({
      next: (res) => {
        if (res && res.blockedDays) {
          this.blockedDays = res.blockedDays;
        }
      },
      error: () => { }
    });

    this.deliveryZoneService.getTree().subscribe({
      next: (tree) => {
        this.zoneTree = tree || [];
      },
      error: () => {
        this.zoneTree = [];
      }
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
      error: (err: any) => {
        this.isLoading = false;
        const fallbackMsg = err?.status === 429
          ? (err.error?.message || 'You are sending messages too quickly. Please wait a moment before trying again.')
          : 'Sorry, I ran into a network error. Please try asking again!';
        this.messages.push({
          role: 'assistant',
          content: fallbackMsg,
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
    const card = this.inChatCheckoutCoordinator.createInitialCard(
      defaultAddress,
      this.deliveryFeeRate,
      this.zoneTree
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    card.scheduledDate = tomorrow.toISOString().split('T')[0];

    assistantMsg.checkoutCard = card;
    assistantMsg.cartPreview = cart;

    this.inChatCheckoutCoordinator.updateCardMinScheduledDate(card, cart, this.blockedDays, () => {
      this.scrollToBottom();
    });
    this.scrollToBottom();
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

  findAreaInTree(areaId?: string | null): AreaNode | null {
    return DeliveryZoneUtil.findArea(this.zoneTree, areaId);
  }

  getAvailableCities(govId?: string): CityNode[] {
    return DeliveryZoneUtil.getCities(this.zoneTree, govId);
  }

  getAvailableAreas(cityId?: string): AreaNode[] {
    return DeliveryZoneUtil.getAreas(this.zoneTree, cityId);
  }

  onCardGovernorateChange(card: InChatCheckoutState, govId: string): void {
    card.deliveryGovernorateId = govId;
    const gov = DeliveryZoneUtil.findGovernorate(this.zoneTree, govId);
    card.deliveryGovernorate = gov?.name || '';
    card.deliveryCityId = undefined;
    card.deliveryCity = '';
    card.deliveryAreaId = undefined;
    card.deliveryArea = '';
    card.deliveryFee = 0;
    card.isCourierDelivery = false;
  }

  onCardCityChange(card: InChatCheckoutState, cityId: string): void {
    card.deliveryCityId = cityId;
    const city = DeliveryZoneUtil.findCity(this.zoneTree, cityId);
    card.deliveryCity = city?.name || '';
    card.deliveryAreaId = undefined;
    card.deliveryArea = '';
    card.deliveryFee = 0;
    card.isCourierDelivery = false;
  }

  onCardAreaChange(card: InChatCheckoutState, areaId: string): void {
    card.deliveryAreaId = areaId;
    const area = DeliveryZoneUtil.findArea(this.zoneTree, areaId);
    card.deliveryArea = area?.name || '';
    if (area) {
      card.deliveryFee = area.courierDelivery ? 0 : area.deliveryFee;
      card.isCourierDelivery = area.courierDelivery;
    } else {
      card.deliveryFee = 0;
      card.isCourierDelivery = false;
    }
  }

  onAddressSelectChange(card: InChatCheckoutState, addressId: string | undefined): void {
    card.addressId = addressId;
    if (addressId && addressId !== 'NEW') {
      const selected = this.savedAddresses.find(a => a.id === addressId);
      if (selected) {
        card.deliveryGovernorateId = selected.governorateId || undefined;
        card.deliveryGovernorate = selected.governorate || undefined;
        card.deliveryCityId = selected.cityId || undefined;
        card.deliveryCity = selected.city;
        card.deliveryAreaId = selected.areaId || undefined;
        card.deliveryArea = selected.area;
        card.deliveryStreet = selected.street;
        card.deliveryBuilding = selected.building || '';
        card.deliveryNotes = selected.notes || '';

        const matched = this.findAreaInTree(selected.areaId);
        if (matched) {
          card.deliveryFee = matched.courierDelivery ? 0 : matched.deliveryFee;
          card.isCourierDelivery = matched.courierDelivery;
        } else {
          card.deliveryFee = 0;
          card.isCourierDelivery = false;
        }
      }
    } else {
      card.addressId = 'NEW';
      card.deliveryGovernorateId = undefined;
      card.deliveryGovernorate = '';
      card.deliveryCityId = undefined;
      card.deliveryCity = '';
      card.deliveryAreaId = undefined;
      card.deliveryArea = '';
      card.deliveryStreet = '';
      card.deliveryBuilding = '';
      card.deliveryNotes = '';
      card.deliveryFee = 0;
      card.isCourierDelivery = false;
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
    const validationError = this.inChatCheckoutCoordinator.validateCard(
      card,
      msg.cartPreview ?? null,
      this.isAuthenticated,
      this.blockedDays
    );
    if (validationError) {
      card.error = validationError;
      return;
    }

    card.isSubmitting = true;
    const payload = this.inChatCheckoutCoordinator.buildCheckoutPayload(
      card,
      msg.cartPreview ?? null,
      this.isAuthenticated
    );

    this.checkoutService.submitCheckout(payload).subscribe({
      next: (response: CheckoutResponse) => {
        card.isSubmitting = false;

        const amountToTransfer = response.orders.reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);
        const formattedAmount = this.inChatCheckoutCoordinator.formatCurrency(amountToTransfer);
        const orderNum = response.orders[0]?.orderNumber || 'CONFIRMED';

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
    return CheckoutDateUtil.isDateBlocked(dateStr, this.blockedDays);
  }

  calculateCheckoutTotal(card: InChatCheckoutState, cart: CartResponse | null): number {
    return this.inChatCheckoutCoordinator.calculateCheckoutTotal(card, cart, this.deliveryFeeRate);
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
