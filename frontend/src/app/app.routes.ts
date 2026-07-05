import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./features/home/pages/home.component').then((m) => m.HomeComponent),
		data: {
			title: 'Petites | Handmade Sweet Treats & Tiny Bites',
			description: 'Handmade sweet treats for life\'s every little moment. Delight in every tiny bite of our cookies, pastries, and baked goods, delivered fresh to your door.',
			keywords: 'petites, sweet treats, bakery, cookies, pastries, desserts, handmade sweets, online bakery'
		}
	},
	{
		path: 'login',
		loadComponent: () => import('./features/auth/pages/login-page.component').then((m) => m.LoginPageComponent),
		data: {
			title: 'Login | Petites Sweet Treats',
			description: 'Log in to your Petites account to manage your orders, view your loyalty points, and check out faster.',
			keywords: 'login, sign in, petites account, customer login'
		}
	},
	{
		path: 'forgot-password',
		loadComponent: () => import('./features/auth/pages/forgot-password-page.component').then((m) => m.ForgotPasswordPageComponent),
		data: {
			title: 'Forgot Password | Petites Sweet Treats',
			description: 'Reset your Petites account password using an OTP verification code sent to your email.',
			keywords: 'forgot password, reset password, account recovery, otp'
		}
	},
	{
		path: 'signup',
		loadComponent: () => import('./features/auth/pages/signup-page.component').then((m) => m.SignupPageComponent),
		data: {
			title: 'Create an Account | Petites Sweet Treats',
			description: 'Join Petites to earn rewards, save delivery addresses, and order delicious handmade pastries and cookies easily.',
			keywords: 'signup, register, create account, join petites'
		}
	},
	{
		path: 'shop',
		loadComponent: () => import('./features/shop/pages/shop-page.component').then((m) => m.ShopPageComponent),
		data: {
			title: 'Shop Handmade Pastries & Cookies | Petites',
			description: 'Browse our selection of fresh, handmade sweet treats including cookies, cakes, muffins, and tiramisu. Order now for instant or scheduled delivery.',
			keywords: 'buy cookies, buy cakes, shop pastries, online sweet shop, cupcakes, desserts delivery'
		}
	},
	{
		path: 'products/:id',
		loadComponent: () => import('./features/shop/pages/product-detail/product-detail.component').then((m) => m.ProductDetailComponent)
		// ProductDetailComponent will handle its own dynamic SEO tags when product data is loaded
	},
	{
		path: 'cart',
		loadComponent: () => import('./features/cart/pages/cart-page.component').then((m) => m.CartPageComponent),
		data: {
			title: 'Your Cart | Petites Sweet Treats',
			description: 'View the delicious items in your shopping cart and get ready to enjoy your handmade treats.',
			keywords: 'shopping cart, checkout, petites cart'
		}
	},
	{
		path: 'checkout',
		loadComponent: () => import('./features/checkout/pages/checkout-page.component').then((m) => m.CheckoutPageComponent),
		data: {
			title: 'Secure Checkout | Petites',
			description: 'Complete your purchase securely. Enter your address, select a delivery slot, and get ready for sweet bliss.',
			keywords: 'checkout, secure payment, purchase desserts'
		}
	},
	{
		path: 'orders',
		loadComponent: () => import('./features/orders/pages/orders-page.component').then((m) => m.OrdersPageComponent),
		data: {
			title: 'My Orders | Petites',
			description: 'Track your current orders and view your purchase history with Petites.',
			keywords: 'my orders, order history, track order'
		}
	},
	{
		path: 'orders/:id',
		loadComponent: () => import('./features/orders/pages/orders-page.component').then((m) => m.OrdersPageComponent),
		data: {
			title: 'Order Details | Petites',
			description: 'View detailed tracking, delivery type, and items for your specific Petites order.',
			keywords: 'order tracking, receipt, delivery status'
		}
	},
	{
		path: 'account',
		canActivate: [authGuard],
		loadComponent: () => import('./features/auth/pages/account-page.component').then((m) => m.AccountPageComponent),
		data: {
			title: 'My Account | Petites',
			description: 'Manage your profile, view loyalty tier points, active session settings, and saved addresses.',
			keywords: 'profile, account settings, loyalty points, user settings'
		}
	},
	{
		path: 'loyalty',
		loadComponent: () => import('./features/loyalty/pages/loyalty-page.component').then((m) => m.LoyaltyPageComponent),
		data: {
			title: 'Loyalty Rewards | Petites',
			description: 'Track your completed orders, collect sweet stamps, and unlock delicious free rewards with Petites Loyalty Club.',
			keywords: 'loyalty rewards, sweet rewards, stamp card, free pastry, free cookie, petites membership'
		}
	},
	{
		path: 'about',
		loadComponent: () => import('./features/about/pages/about.component').then((m) => m.AboutComponent),
		data: {
			title: 'Our Story | Petites',
			description: 'Born in a home kitchen, Petites brings tiny, bite-sized handmade treats with big joy. Read our story and sweet dream.',
			keywords: 'about petites, bakery story, baking dream, handmade sweet treats, bite-sized desserts'
		}
	},
	{ path: '**', redirectTo: '' }
];
