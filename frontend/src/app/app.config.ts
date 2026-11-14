import { ApplicationConfig, DEFAULT_CURRENCY_CODE, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
	provideZonelessChangeDetection(),
	provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
	provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
	{ provide: DEFAULT_CURRENCY_CODE, useValue: 'EGP' }
  ]
};
