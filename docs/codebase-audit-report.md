# Phase Two: Prioritized Codebase Audit & Architectural Quality Report

**Target Project:** Petites (Full-Stack Dessert Pre-Order & E-Commerce Platform)  
**Evaluator:** Senior Software Engineer, Software Architect & Quality Auditor  
**Audit Status:** Phase One Complete — No files modified. Awaiting review and approval before execution.

---

## 1. Architecture and Repository Structure Overview

The Petites repository is organized as a multi-tier monorepo:

```
petites/
├── backend/                  # Spring Boot 3.5.14 API (Java 21, JPA/Hibernate, Flyway, PostgreSQL, STOMP)
│   ├── src/main/java/com/petites/backend/
│   │   ├── addresses/        # Governorates, Cities, Areas, Customer delivery addresses
│   │   ├── auth/             # JWT authentication, Refresh tokens, OTP password reset, Guest sessions
│   │   ├── carts/            # Shopping cart and cart item state
│   │   ├── categories/       # Product category catalog
│   │   ├── chatbot/          # AI Shopping concierge (LLM integration & heuristic fallback)
│   │   ├── checkout/         # Order orchestration, capacity booking, coupons, loyalty
│   │   ├── coupons/          # Promotional discounts and usage rules
│   │   ├── images/           # Cloudinary image management
│   │   ├── loyalty/          # Order-based loyalty tier and free reward system
│   │   ├── orders/           # Order persistence, state machine, admin management
│   │   ├── products/         # Product catalog, instant delivery inventory, daily baking capacity
│   │   ├── security/         # Spring Security filter chain, JWT inspection, CORS
│   │   ├── settings/         # Dynamic application runtime settings
│   │   ├── users/            # User identity, roles (SUPER_ADMIN, STAFF, USER), password management
│   │   └── websocket/        # STOMP broker configuration and topic authorization
│   └── src/main/resources/db/migration/  # Flyway SQL migrations (V1, V2, V3)
├── frontend/                 # Customer Storefront (Angular 19, Standalone Components, Signals, RxJS)
│   └── src/app/
│       ├── core/             # HTTP interceptors, singleton services, domain models, utilities
│       ├── features/         # Customer pages (auth, cart, checkout, home, loyalty, orders, shop)
│       ├── layout/           # Shell, Header, Footer
│       └── shared/           # Chatbot widget, Date-picker, Product cards
├── dashboard/                # Admin Panel (Angular 19, Standalone Components, Signals, RxJS)
│   └── src/app/
│       ├── core/             # Auth, STOMP websocket, notifications, audio alerts, API client
│       ├── features/         # Admin management (categories, coupons, delivery-zones, orders, products, settings, users)
│       └── layout/           # Admin shell, navigation, header
├── docs/                     # Architecture specifications (mixed-fulfillment-checkout.md)
├── docker-compose.yml        # Production Docker configuration for PostgreSQL, Backend, Frontend, Dashboard
└── Jenkinsfile               # CI pipeline definition
```

### Build & Test Health Baseline

| Subsystem | Build Status | Test Status | Key Health Metric |
| :--- | :--- | :--- | :--- |
| **Backend** | Compiles Cleanly | **110 Passed, 33 Errors** | All 17 Mockito unit tests pass. All 5 `@SpringBootTest` integration tests fail due to hardcoded requirement for an active PostgreSQL daemon on `localhost:5432`. |
| **Frontend** | Compiles Cleanly | 3 Specs Present | Builds in ~13s. Customer storefront lacks page-level unit test coverage. |
| **Dashboard** | Compiles Cleanly | **0 Specs Present** | Builds in ~11s. Exactly 0 unit tests exist across the entire admin dashboard. |

---

## 2. Prioritized List of Findings with Evidence

### Finding [SEC-01] — Concurrency Race Condition on Coupon Usage Limit
- **Priority:** Critical | **Confidence:** High
- **Classification:** Confirmed bugs or security issues
- **Location:** `CouponService.java:204-218` & `CheckoutService.java:106-109`
- **Evidence:**  
  In `CheckoutService.java` (line 106), `couponService.resolveForCheckout(...)` performs read-only validation (`usedCount >= usageLimit`) without a database lock. Later, in `CouponService.recordUsage(...)` (line 204), a pessimistic lock is acquired via `couponRepository.findByIdForUpdate(couponId)`, but it **never re-checks** `usedCount < usageLimit` or `perUserLimit`:
  ```java
  Coupon coupon = couponRepository.findByIdForUpdate(couponId)
          .orElseThrow(() -> new IllegalArgumentException("Coupon not found"));
  coupon.setUsedCount(coupon.getUsedCount() + 1); // Unconditionally increments!
  couponRepository.save(coupon);
  ```
- **Problem:** When multiple customers checkout concurrently with a coupon having 1 usage remaining, both pass `resolveForCheckout`, both proceed through order creation, and both increment the count, exceeding the merchant's usage limit.
- **Recommended Change:** In `CouponService.recordUsage(...)`, perform strict validation under the write lock: verify `coupon.isActive()`, `coupon.getUsageLimit() == null || coupon.getUsedCount() < coupon.getUsageLimit()`, and `perUserLimit`. Throw an exception if exhausted so the checkout rolls back cleanly.
- **Expected Benefit:** Guaranteed financial integrity and coupon limit enforcement under concurrent load.
- **Risks & Compatibility:** Safe change; transactions will roll back if limits are exceeded.
- **Verification:** Multi-threaded checkout test with limit=1 coupon.

---

### Finding [TX-01] — Premature WebSocket Event Dispatch Inside Active Transaction
- **Priority:** High | **Confidence:** High
- **Classification:** Confirmed bugs or security issues
- **Location:** `CheckoutService.java:271-274` & `OrderService.java:263, 279`
- **Evidence:**  
  Inside `@Transactional public CheckoutResponse checkout(...)`:
  ```java
  List<OrderResponse> responses = savedOrders.stream().map(orderService::toResponse).toList();
  for (OrderResponse response : responses) {
      orderWebSocketService.notifyOrderCreated(response); // Dispatched before commit!
  }
  ```
- **Problem:** If post-order operations fail, or database commit fails due to constraint checks, connection drop, or serialization conflicts, external STOMP clients have already received `ORDER_CREATED` or `ORDER_STATUS_UPDATED` events for records that were rolled back.
- **Recommended Change:** Use `TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() { void afterCommit() { ... } })` (as already practiced in `ProductService.java:194`) or publish Spring Domain Events handled by `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`.
- **Expected Benefit:** Prevents phantom order events on admin dashboard and customer sockets.
- **Risks & Compatibility:** None.
- **Verification:** Integration test simulating commit failure verifying no STOMP message is published.

---

### Finding [BUG-01] — Non-Existent Gemini LLM Models in Chatbot Service
- **Priority:** High | **Confidence:** High
- **Classification:** Confirmed bugs or security issues
- **Location:** `ChatbotService.java:37-38`
- **Evidence:**  
  ```java
  private static final List<String> GEMINI_MODELS = List.of("gemini-3.5-flash-lite", "gemini-3.6-flash");
  ```
- **Problem:** `gemini-3.5-flash-lite` and `gemini-3.6-flash` are invalid model identifiers that do not exist in the Google Gemini API. Any request when `GEMINI_API_KEY` is provided will fail with an HTTP 404 Model Not Found error, forcing fallback.
- **Recommended Change:** Update the model list to current valid GA models (e.g., `gemini-1.5-flash`, `gemini-2.0-flash` or make the primary model configurable via `app.ai.gemini.model:gemini-1.5-flash`).
- **Expected Benefit:** Functional AI shopping concierge responses when the API key is configured.
- **Risks & Compatibility:** None; existing fallback handles failures.
- **Verification:** Unit test with mocked HTTP responses verifying the payload format and model URI.

---

### Finding [SEC-02] — Angular HTTP Interceptor Triggers Token Refresh on 403 Forbidden
- **Priority:** High | **Confidence:** High
- **Classification:** Confirmed bugs or security issues
- **Location:** `frontend/src/app/core/interceptors/auth.interceptor.ts:30` & `dashboard/src/app/core/interceptors/auth.interceptor.ts:26`
- **Evidence:**  
  ```typescript
  const shouldAttemptRefresh =
      error instanceof HttpErrorResponse &&
      (error.status === 401 || error.status === 403) && // 403 triggers refresh!
      !skipAuthRefresh &&
      !skipAuthHeader &&
      Boolean(authState.refreshToken());
  ```
- **Problem:** HTTP `403 Forbidden` indicates that the user is authenticated but lacks required RBAC privileges (e.g. a customer attempting an administrative action). Refreshing the access token will not change the user's role and results in pointless `/api/auth/refresh` API calls, wasted rotations, and a repeated 403 error.
- **Recommended Change:** Restrict automatic token refresh strictly to `error.status === 401`.
- **Expected Benefit:** Proper RFC 7235 / 9110 HTTP semantics, eliminating redundant refresh calls.
- **Risks & Compatibility:** None.
- **Verification:** Interceptor test asserting 403 is rethrown immediately without calling `authService.refreshSession()`.

---

### Finding [CONC-01] — Non-Atomic In-Memory Counter Increments
- **Priority:** Medium | **Confidence:** High
- **Classification:** Confirmed bugs or security issues
- **Location:** `UserService.java:198-216`
- **Evidence:**  
  ```java
  @Transactional
  public UserResponse incrementCompletedOrdersCount(String id) {
      User user = getEntity(id);
      user.setCompletedOrdersCount(user.getCompletedOrdersCount() + 1);
      return toResponse(userRepository.save(user));
  }
  ```
- **Problem:** Counter updates read the entity into Java memory, perform arithmetic, and save it back. Concurrent completed orders or reward redemptions for the same user result in lost update anomalies.
- **Recommended Change:** Replace with atomic database updates:
  ```java
  @Modifying
  @Query("UPDATE User u SET u.completedOrdersCount = u.completedOrdersCount + 1 WHERE u.id = :id")
  int incrementCompletedOrdersCount(@Param("id") String id);
  ```
- **Expected Benefit:** Concurrency-safe order and loyalty counters without locking delays.
- **Risks & Compatibility:** Safe change; ensures database-level atomicity.
- **Verification:** Concurrent thread execution test asserting count matches exactly.

---

### Finding [TEST-01] — Integration Test Suite Inoperable in Isolated Environments
- **Priority:** High | **Confidence:** High
- **Classification:** Best-practice improvements
- **Location:** `backend/src/test/resources/application.properties:5-8`
- **Evidence:**  
  Running `./mvnw test` fails 33 tests out of 143 (`BackendApplicationTests`, `FlywayMigrationIntegrationTest`, `Phase2SecurityIntegrationTest`, `Phase3BusinessIntegrityIntegrationTest`, `Phase4RealtimeAndEdgeSecurityTest`) with:
  `Caused by: org.postgresql.util.PSQLException: The connection attempt failed ... SocketException: Permission denied: getsockopt`.
- **Problem:** Spring Boot integration tests require a live PostgreSQL server running externally on `localhost:5432` with pre-created credentials. The suite cannot run self-contained in standard CI/CD runners, container builds, or developer sandboxes.
- **Recommended Change:** Configure an in-memory/embedded database profile (or Testcontainers PostgreSQL when docker is available) for `@SpringBootTest`, with H2 PostgreSQL mode as a fallback.
- **Expected Benefit:** 100% runnable, self-contained test suite in any CI or development environment.
- **Risks & Compatibility:** Ensure PostgreSQL-specific SQL dialect in migrations (e.g., `ON CONFLICT`) is supported by Testcontainers or isolated DB.
- **Verification:** `./mvnw clean test` passes with zero external service prerequisites.

---

### Finding [ARCH-01] — Oversized God Service in Chatbot Module
- **Priority:** High | **Confidence:** High
- **Classification:** Oversized or overly complex code that merits refactoring
- **Location:** `ChatbotService.java` (701 lines)
- **Evidence:**  
  A single class handles:
  1. Low-level HTTP requests and JSON serialization for Google Gemini (`callGeminiApi`).
  2. Low-level HTTP requests and JSON serialization for OpenAI (`callOpenAiApi`).
  3. Dynamic menu prompt construction querying product catalogs (`buildRealMenuSystemPrompt`).
  4. Regex action tag parsing (`ACTION_TAG_PATTERN`).
  5. Arabic keyword synonym mapping and multi-word tokenization (`ARABIC_PRODUCT_SYNONYMS`).
  6. Conversational heuristic fallback engine with extensive conditional rules (`handleConversationalFallback`).
- **Problem:** Violates Single Responsibility and Open/Closed principles. Zero unit tests exist for this critical customer-facing feature.
- **Recommended Change:** Decompose into cohesive components:
  - `GeminiChatClient` & `OpenAiChatClient` (external AI HTTP integration)
  - `ChatPromptBuilder` (catalog prompt formatting)
  - `ChatActionParser` (regex and action extraction)
  - `ChatFallbackEngine` (rule-based responses and Arabic synonyms)
  - `ChatbotService` (lean orchestrator)
- **Expected Benefit:** High cohesion, unit testability of individual algorithms, clean error handling.
- **Risks & Compatibility:** Public contracts (`processChat(ChatRequest)`) remain completely unchanged.
- **Verification:** Unit tests verifying action parsing, prompt building, and fallback rules independently.

---

### Finding [ARCH-02] — High Coupling & Duplication in Checkout Orchestration
- **Priority:** High | **Confidence:** High
- **Classification:** Oversized or overly complex code that merits refactoring
- **Location:** `CheckoutService.java` (483 lines, 12 constructor dependencies)
- **Evidence:**  
  `CheckoutService` injects 12 services and repositories. In lines 282-307, it duplicates `getOrCreateActiveCart` and `findActiveCart` using raw `CartRepository` instead of calling `CartService.getOrCreateActiveCart`. It also swallows loyalty reward errors with `catch (Exception ignored)` (lines 161-163).
- **Problem:** Over-coupling makes the service fragile and difficult to test in isolation.
- **Recommended Change:** 
  1. Delegate cart retrieval directly to `CartService.getOrCreateActiveCart`.
  2. Extract `DeliveryAddressResolver` to handle address snapshotting and delivery zone fee logic.
  3. Replace empty catch blocks with structured warning logs.
- **Expected Benefit:** Reduced dependencies, elimination of duplicated cart code, improved testability.
- **Risks & Compatibility:** Maintain identical checkout response contract and order structure.
- **Verification:** Unit tests in `CheckoutServiceTest`.

---

### Finding [ARCH-03] — Misplaced User Management in Dashboard AuthService
- **Priority:** Medium | **Confidence:** High
- **Classification:** Confirmed misplaced responsibilities
- **Location:** `dashboard/src/app/core/services/auth.service.ts:63-125`
- **Evidence:**  
  The dashboard has no `user.service.ts`. Instead, `listUsers()`, `getUser()`, `updateUser()`, `deactivateUser()`, `reactivateUser()`, `createAdminStaff()`, and `assignRoleByEmail()` are all implemented inside `AuthService`.
- **Problem:** Authentication/session management is conflated with administrative user management CRUD.
- **Recommended Change:** Create `user.service.ts` in `dashboard/src/app/core/services/` and move user administrative operations there.
- **Expected Benefit:** Cohesion, clear ownership, consistency with other admin services (`order.service.ts`, `product.service.ts`).
- **Risks & Compatibility:** Update imports in `users-list.component.ts` and `user-create.component.ts`.
- **Verification:** Dashboard builds with clean TypeScript typecheck.

---

### Finding [DUP-01] — Duplicated `api-error.model.ts` Across Frontend and Dashboard
- **Priority:** Medium | **Confidence:** High
- **Classification:** Confirmed dead code and duplication
- **Location:** `frontend/src/app/core/models/api-error.model.ts` vs `dashboard/src/app/core/models/api-error.model.ts`
- **Evidence:**  
  Both files contain 144 lines of identical error extraction logic (`readApiErrorMessage`, `readApiFieldErrors`, `isApiErrorResponse`, `extractApiErrorMessage`). Similar duplicate definitions exist for `AuthResponse`, `OrderResponse`, and `DeliveryZone` models.
- **Problem:** Divergent error parsing logic when backend formats evolve.
- **Recommended Change:** Standardize the error model and keep models aligned. In future workspace refactoring, consider a shared workspace library (`@petites/shared-models`).
- **Expected Benefit:** Consistent error extraction and reduced maintenance burden.
- **Risks & Compatibility:** None.
- **Verification:** Build both apps.

---

### Finding [DEAD-01] — Empty Scaffolding Directories and Dead Frontend Methods
- **Priority:** Low | **Confidence:** High
- **Classification:** Confirmed unnecessary code
- **Location:** Multiple directories across `frontend/` and `dashboard/`
- **Evidence:**  
  1. Completely empty directory structures left behind by CLI generators:
     - `frontend/src/app/features/wishlist/` (empty subdirs: `components/wishlist-item`, `pages`, `services`)
     - `frontend/src/app/shared/directives/`, `shared/pipes/` (empty)
     - `frontend/src/app/features/cart/components/cart-item/`, `cart-summary/`
     - `frontend/src/app/features/orders/components/order-card/`, `tracking-timeline/`
     - `frontend/src/app/features/shop/components/filters/`, `product-list/`
     - `dashboard/src/app/features/cart/`, `checkout/`, `loyalty/`, `shop/`, `wishlist/`
  2. Dead methods in `frontend/src/app/core/services/auth.service.ts`:
     - `listUsers()` (never called, wrong return type `UserResponse[]` vs backend `Page<UserResponse>`)
     - `deactivateUser()`, `reactivateUser()`, `listRoles()` (never called in customer storefront)
  3. Obsolete endpoint in `PublicSettingController.java:20-30` (`GET /api/settings/delivery-fee`) and unused `SettingService.getDeliveryFee()` in storefront. Superseded by dynamic `DeliveryZone` fees.
  4. Committed untracked file: `backend/.zencoder/delta-history.json` (tracked in Git despite `.gitignore`).
  5. Dead CI environment variable in `Jenkinsfile:9`: `OAUTH2_ISSUER_URI = credentials('petites_oauth2_issuer_uri')` (OAuth2 is not used).
- **Problem:** Clutters repository, confuses developers about available features, creates phantom references.
- **Recommended Change:** Delete empty scaffolding folders, remove dead methods in storefront `AuthService`, remove obsolete `/delivery-fee` public endpoint, remove git-tracked `.zencoder` artifact, and clean up Jenkinsfile.
- **Expected Benefit:** Clean directory tree, reduced cognitive overhead.
- **Risks & Compatibility:** Verified zero references across both frontends and backend.
- **Verification:** Search codebase to ensure no references exist before removal.

---

### Finding [UI-01] — Debug Simulation Button Left in Production Customer UI
- **Priority:** Low | **Confidence:** High
- **Classification:** Confirmed bugs or security issues
- **Location:** `account-page.component.html:174`, `account-page.component.ts:156-178`, `auth-state.service.ts:49-62`
- **Evidence:**  
  Customer Account template renders:
  ```html
  <button type="button" class="auth-btn auth-btn--secondary" [disabled]="refreshTesting" (click)="simulateExpiredAccessToken()">
  ```
  Calling `authState.invalidateAccessTokenForTesting()`, which overwrites the active JWT with `"expired-access-token-for-testing"`.
- **Problem:** Developer debug code leaked into end-user production UI.
- **Recommended Change:** Remove the button from `account-page.component.html`, delete `simulateExpiredAccessToken()` from `account-page.component.ts`, and remove `invalidateAccessTokenForTesting()` from `auth-state.service.ts`.
- **Expected Benefit:** Clean production UI with no risk of accidental user session corruption.
- **Risks & Compatibility:** None.
- **Verification:** Customer account page renders cleanly with no test controls.

---

### Finding [VAL-01] — Missing `@Valid` and Validation Annotations on Admin Endpoints
- **Priority:** Medium | **Confidence:** High
- **Classification:** Best-practice improvements
- **Location:** `AdminDeliveryZoneController.java:52`, `AddressController.java:46`, `GovernoratePayload.java`, `CityPayload.java`, `AreaPayload.java`, `AddressUpdateRequest.java`
- **Evidence:**  
  `createGovernorate(@RequestBody GovernoratePayload payload)` and `updateAddress(@PathVariable String id, @RequestBody AddressUpdateRequest request)` omit `@Valid`. The payload records lack `@NotBlank`, `@Size`, and `@Min` annotations.
- **Problem:** Blank names (`""` or `null`) trigger raw database-level constraint violations (`DataIntegrityViolationException`) returning unhelpful 500 errors instead of structured 400 Bad Request validation responses.
- **Recommended Change:** Add `@Valid` to controller endpoints and standard Bean Validation annotations (`@NotBlank`, `@Size(max = 100)`, `@PositiveOrZero`) to records.
- **Expected Benefit:** Consistent, user-friendly 400 Bad Request error messages via `GlobalExceptionHandler`.
- **Risks & Compatibility:** None.
- **Verification:** Unit tests verifying 400 responses on invalid payloads.

---

### Finding [UX-01] — Brittle `setInterval` Polling in Storefront WebSocket Watcher
- **Priority:** Medium | **Confidence:** High
- **Classification:** Confirmed bugs or security issues
- **Location:** `frontend/src/app/core/services/websocket.service.ts:172-184`
- **Evidence:**  
  ```typescript
  intervalId = setInterval(() => {
    if (this.client?.connected) {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      performSubscription();
    }
  }, 300);
  ```
- **Problem:** If connection fails, intervals can leak. If connection drops and reconnects, subscriptions are not re-established because `intervalId` was already cleared on initial connection.
- **Recommended Change:** Use a reactive STOMP connection state Subject/Observable so that subscriptions trigger automatically upon STOMP `onConnect` without timer loops.
- **Expected Benefit:** Memory-leak-free, resilient real-time order status updates.
- **Risks & Compatibility:** Safe change; improves reliability.
- **Verification:** Test order tracking status updates across disconnect/reconnect cycles.

---

### Finding [CONF-01] — Duplicated Hardcoded Payment Links Across Frontend
- **Priority:** Low | **Confidence:** High
- **Classification:** Confirmed unnecessary code
- **Location:** `checkout-page.component.ts:61-62` & `chatbot-widget.component.ts:35-36`
- **Evidence:**  
  `readonly instapayPaymentLink = 'https://ipn.eg/S/renadkd29/instapay/3BqRUg';` and `readonly instapayHandle = 'renadkd29@instapay';` are hardcoded in both files.
- **Problem:** If payment credentials change, updating them in multiple hardcoded locations is error-prone.
- **Recommended Change:** Centralize payment details in `app.constants.ts` or fetch dynamically from backend `SettingService` (`setting_key: instapay_handle`, `instapay_link`).
- **Expected Benefit:** Single point of update for payment details.
- **Risks & Compatibility:** None.
- **Verification:** Check checkout summary and chatbot widget both display updated link.

---

### Finding [MOD-01] — Mutual Circular Import in Frontend Product Models
- **Priority:** Low | **Confidence:** High
- **Classification:** Confirmed misplaced responsibilities
- **Location:** `frontend/src/app/core/models/product.model.ts:1` & `shop.models.ts:13-14`
- **Evidence:**  
  `product.model.ts` imports `ProductImage` from `shop.models.ts`. In turn, `shop.models.ts` imports `Product` from `product.model.ts` and re-exports it.
- **Problem:** Circular module dependencies can cause bundler resolution warnings and undefined runtime type evaluations.
- **Recommended Change:** Define `ProductImage` in `product.model.ts` (or a dedicated `catalog.models.ts`) and eliminate the circular re-export.
- **Expected Benefit:** Clean dependency graph with zero circularities.
- **Risks & Compatibility:** None.
- **Verification:** `npx ng build` with `--verbose` showing zero circular dependency warnings.

---

## 3. Largest Files and Classes Requiring Attention

The following source files exceed acceptable architectural boundaries and require focused refactoring:

| File | Size / Lines | Current Responsibilities | Recommended Action |
| :--- | :--- | :--- | :--- |
| **`ChatbotService.java`** | 701 lines / 35.6 KB | Gemini API HTTP client, OpenAI API HTTP client, DB catalog prompt serializer, regex tag parser, Arabic synonym dictionary, heuristic fallback engine. | Extract HTTP LLM clients to `GeminiChatClient`/`OpenAiChatClient`, prompt building to `ChatPromptBuilder`, and heuristics to `ChatFallbackEngine`. |
| **`CheckoutService.java`** | 483 lines / 22.9 KB | 12 dependencies. Cart loading, guest session resolution, address snapshotting, coupon validation, loyalty reward reservation, capacity booking, multi-order creation, WebSocket notification. | Reuse `CartService.getOrCreateActiveCart`, extract address resolution to `DeliveryAddressResolver`, dispatch WebSocket events `afterCommit()`. |
| **`checkout-page.component.ts`** | 664 lines / 20.9 KB | 12 injected services. Manages cart, addresses, delivery zones, blocked dates, coupon forms, payment modals, loyalty reward modals, and sessionStorage state. | Extract checkout state and form management into a dedicated `CheckoutStore` / `CheckoutFacadeService`. |
| **`chatbot-widget.component.ts`** | 661 lines / 22.1 KB | Chat history, prompt suggestions, full in-chat address form, zone selection, payment confirmation, order submission, date picker binding. | Extract in-chat address and checkout flows into small subcomponents. |
| **`DeliveryZonesComponent.ts`** (Dashboard) | 479 lines / 14.7 KB | Manages 3 hierarchical CRUDs (Governorate, City, Area) including 3 reactive forms, 3 modals, and state trees in one component. | Extract modal forms (`GovernorateModalComponent`, `CityModalComponent`, `AreaModalComponent`). |
| **`WebSocketConfig.java`** | 193 lines / 11.1 KB | STOMP broker setup, endpoint registration, plus an anonymous inner 120-line `ChannelInterceptor` checking JWTs, roles, order ownership, and guest tokens directly via DB. | Extract channel interceptor into a dedicated `StompSubscriptionSecurityInterceptor`. |

---

## 4. Files Containing Unrelated Responsibilities & Recommended Destinations

| Originating File | Unrelated Responsibility Present | Recommended Destination |
| :--- | :--- | :--- |
| `dashboard/src/app/core/services/auth.service.ts` | User CRUD operations (`listUsers`, `getUser`, `updateUser`, `deactivateUser`, `reactivateUser`, `createAdminStaff`, `assignRoleByEmail`) | `dashboard/src/app/core/services/user.service.ts` |
| `frontend/src/app/core/services/auth.service.ts` | Administrative user & role operations (`listUsers`, `deactivateUser`, `reactivateUser`, `listRoles`) | Remove completely from customer storefront (dead code). |
| `backend/src/main/java/com/petites/backend/websocket/config/WebSocketConfig.java` | 120-line anonymous security interceptor querying DB repositories during STOMP subscriptions | `com.petites.backend.websocket.security.StompSubscriptionInterceptor` |
| `backend/src/main/java/com/petites/backend/checkout/service/CheckoutService.java` | Raw cart resolution logic copy-pasted from `CartService` | Delegate to `CartService.getOrCreateActiveCart(owner)` |
| `frontend/src/app/features/auth/pages/account-page.component.ts` | Token invalidation test method `simulateExpiredAccessToken()` | Remove (test artifact). |
| `backend/src/main/java/com/petites/backend/settings/controller/PublicSettingController.java` | Obsolete flat `getDeliveryFee()` | Remove (superseded by dynamic delivery zones). |

---

## 5. Confirmed Dead Code and Duplication Summary

### Confirmed Dead Code (Safe to Remove)
1. **Empty Scaffolding Directories:**
   - `frontend/src/app/features/wishlist/` (entire tree)
   - `frontend/src/app/shared/directives/`, `shared/pipes/`
   - `frontend/src/app/features/cart/components/cart-item/`, `cart-summary/`
   - `frontend/src/app/features/orders/components/order-card/`, `tracking-timeline/`
   - `frontend/src/app/features/shop/components/filters/`, `product-list/`
   - `dashboard/src/app/features/cart/`, `checkout/`, `loyalty/`, `shop/`, `wishlist/`
2. **Unused Frontend Methods:**
   - `frontend/src/app/core/services/auth.service.ts`: `listUsers()`, `deactivateUser()`, `reactivateUser()`, `listRoles()`.
   - `frontend/src/app/core/services/setting.service.ts`: `getDeliveryFee()` and interface `DeliveryFeeResponse`.
   - `frontend/src/app/core/services/auth-state.service.ts`: `invalidateAccessTokenForTesting()`.
3. **Unused Backend Endpoints:**
   - `PublicSettingController.java`: `GET /api/settings/delivery-fee`.
4. **Obsolete Configuration & Artifacts:**
   - `Jenkinsfile:9`: `OAUTH2_ISSUER_URI = credentials('petites_oauth2_issuer_uri')`.
   - `backend/.zencoder/delta-history.json` (tracked in Git despite `.gitignore`).
   - `dashboard/src/app/app.component.spec.ts` (0 bytes) and `frontend/src/app/app.component.spec.ts` (0 bytes).

### Confirmed Duplication to Consolidate
1. **`getOrCreateActiveCart` & `findActiveCart`:** Copy-pasted between `CartService` and `CheckoutService`. Consolidate by delegating to `CartService`.
2. **`api-error.model.ts`:** 144 lines duplicated between `frontend` and `dashboard`.
3. **Instapay URLs:** Hardcoded in both `checkout-page.component.ts` and `chatbot-widget.component.ts`. Centralize in shared constant/setting.

---

## 6. SOLID and Design Concerns

- **Single Responsibility Principle (SRP):**
  - `ChatbotService` violates SRP by combining LLM transport, catalog formatting, Arabic NLP, and rule fallbacks.
  - `CheckoutService` violates SRP by acting as an all-encompassing God Service for carts, addresses, coupons, and orders.
  - Dashboard `AuthService` combines user authentication with administrative user directory management.
- **Open/Closed Principle (OCP):**
  - Chatbot fallback heuristics rely on long `if-else` chains. Adding new shopping intents requires modifying the core service rather than registering an `IntentHandler`.
- **Dependency Inversion Principle (DIP):**
  - `ChatbotService` is tightly coupled to concrete `HttpClient` calls rather than an `LlmClient` interface abstraction.
- **Interface Segregation / Overengineering:**
  - `PurchaseSessionService` is an unnecessary 1-method wrapper around `AuthService.ensureGuestSession()`. Can be inlined or simplified.

---

## 7. Security, Correctness, and Performance Findings

| Area | Finding | Impact | Severity |
| :--- | :--- | :--- | :--- |
| **Security** | Role endpoint `/api/roles` lacks `@PreAuthorize` | Any authenticated user can view internal roles. | Medium |
| **Security** | `403 Forbidden` triggers token refresh in Angular interceptor | Redundant token rotations and retries on permission denial. | High |
| **Security** | Debug simulation button on production Account page | Users can accidentally invalidate their access token. | Low |
| **Correctness** | Concurrency race condition on coupon `usedCount` | Coupons can be over-redeemed under concurrent checkout. | Critical |
| **Correctness** | Premature WebSocket broadcast before transaction commit | Phantom events dispatched if database transaction rolls back. | High |
| **Correctness** | In-memory counter increments for user order counts | Lost update anomaly under concurrent order completions. | Medium |
| **Correctness** | Cart `addItem` only checks incoming quantity, not total | Customers can add more items than are in stock. | Medium |
| **Performance** | `JwtAuthenticationFilter` performs DB query on every request | Defeats JWT statelessness; unnecessary database load under scale. | Medium |
| **Performance** | `ImageUploadService.upload` loads 10MB into heap `byte[]` | Potential GC pressure under concurrent uploads. | Low |

---

## 8. Missing and Weak Tests

| Area | Existing Coverage | Gap / Missing Coverage | Risk Level |
| :--- | :--- | :--- | :--- |
| **Backend Integration** | 5 test classes (`@SpringBootTest`) | Failing due to hardcoded requirement for external PostgreSQL on localhost:5432. | **Critical** |
| **Backend Chatbot** | 0 tests | `ChatbotService`, `ChatbotController`, `ChatbotToolsService` have zero unit or integration tests. | **High** |
| **Backend Users & Roles** | 0 tests for `UserService` | `UserService`, `UserController`, `RoleController` have zero tests. | **High** |
| **Backend Addresses** | Only zone controller tested | `AddressService` and customer `AddressController` have zero tests. | **Medium** |
| **Customer Frontend** | 3 utility spec files | `checkout-page`, `orders-page`, `cart-page`, `shop-page` have zero component tests. | **High** |
| **Admin Dashboard** | **0 tests across entire app** | Zero unit tests for orders, products, delivery zones, or settings. `app.component.spec.ts` is 0 bytes. | **High** |

---

## 9. Dependency, Configuration, and Infrastructure Cleanup Opportunities

1. **Test Database Configuration:**
   Add H2 or Testcontainers PostgreSQL configuration to `backend/pom.xml` so all 143 backend tests pass in standard build pipelines without needing an external PostgreSQL service.
2. **Spring Boot Hibernate DDL-Auto in Dev:**
   Change `spring.jpa.hibernate.ddl-auto` from `update` to `validate` in `application-dev.properties` to ensure Flyway remains the single source of truth for schema alterations.
3. **Flyway Delivery Zone Seeding:**
   Move `DeliveryZoneSeeder.java` (currently runs in production if count is 0) into an idempotent Flyway migration `V4__seed_default_zones.sql` or restrict it to `@Profile({"dev", "demo"})`.
4. **Clean Git Tracking:**
   Remove `backend/.zencoder/delta-history.json` from Git tracking (`git rm --cached`).
5. **Jenkinsfile Pipeline Extension:**
   Remove obsolete `OAUTH2_ISSUER_URI`, combine build/test stages efficiently, and include frontend/dashboard build steps.

---

## 10. Proposed Implementation Plan (Safe, Incremental Batches)

```
                                  PROPOSED IMPLEMENTATION ROADMAP
 ┌───────────────────────┐     ┌────────────────────────┐     ┌────────────────────────┐
 │ Batch 1: Safe Cleanup │ ──► │ Batch 2: Simplification│ ──► │ Batch 3: Responsibilities│
 │ Dead code, empty dirs,│     │ In-memory counters,    │     │ Chatbot decompose,     │
 │ test button removal   │     │ LLM models, 403 refresh│     │ Dashboard UserService  │
 └───────────────────────┘     └────────────────────────┘     └────────────────────────┘
                                                                           │
                                                                           ▼
 ┌───────────────────────┐     ┌────────────────────────┐     ┌────────────────────────┐
 │ Batch 6: Verification │ ◄── │ Batch 5: Test Harness  │ ◄── │ Batch 4: Concurrency & │
 │ Full test suite, diff,│     │ H2/Test DB, Chatbot &  │     │ Transaction Safety     │
 │ builds, regressions   │     │ Frontend/Admin tests   │     │ Coupon lock, afterCommit│
 └───────────────────────┘     └────────────────────────┘     └────────────────────────┘
```

### Batch 1: Safe Cleanup & Dead Code Removal
- **Scope:**
  - Delete empty scaffolding directories in `frontend` and `dashboard`.
  - Remove dead admin methods from storefront `AuthService` (`listUsers`, `deactivateUser`, etc.).
  - Remove obsolete `GET /api/settings/delivery-fee` in `PublicSettingController.java` and storefront `SettingService`.
  - Remove debug simulation button and helpers from `account-page.component.html/ts` and `auth-state.service.ts`.
  - Remove Git-tracked `backend/.zencoder/delta-history.json`.
  - Remove unused OAuth2 credential in `Jenkinsfile`.
- **Risk:** Zero risk; all items verified to have no callers.
- **Verification:** Full compilation of backend, frontend, and dashboard.

### Batch 2: Focused Bug Fixes & Interceptor Simplification
- **Scope:**
  - Fix invalid Gemini model names in `ChatbotService.java` (`gemini-1.5-flash`, `gemini-2.0-flash`).
  - Restrict Angular HTTP interceptors in `frontend` and `dashboard` to only refresh on 401 Unauthorized (exclude 403 Forbidden).
  - Fix cart `addItem` availability check to validate `existingQuantity + incomingQuantity`.
  - Replace brittle `setInterval` in storefront `websocket.service.ts` with reactive connection handling.
  - Centralize hardcoded Instapay payment links into shared configuration.
  - Resolve circular import between `product.model.ts` and `shop.models.ts`.
- **Risk:** Very low; targeted bug fixes preserving all public API contracts.
- **Verification:** Unit tests and frontend/dashboard builds.

### Batch 3: Responsibility Separation & File Structure
- **Scope:**
  - Decompose `ChatbotService.java` (701 lines) into `GeminiChatClient`, `OpenAiChatClient`, `ChatPromptBuilder`, `ChatActionParser`, and `ChatFallbackEngine`.
  - Create `user.service.ts` in `dashboard` and move administrative user CRUD out of `auth.service.ts`.
  - In `CheckoutService.java`, reuse `CartService.getOrCreateActiveCart` and extract `DeliveryAddressResolver`.
  - Extract `StompSubscriptionSecurityInterceptor` from `WebSocketConfig.java`.
  - Add missing `@Valid` and Bean Validation annotations to `AdminDeliveryZoneController` and address payloads.
- **Risk:** Low-Medium; internal restructuring while preserving public API contracts and method signatures.
- **Verification:** Run all backend unit tests (`mvn test -Dtest=*Test`) and verify dashboard/frontend builds.

### Batch 4: Concurrency, Transactional Safety & Data Integrity
- **Scope:**
  - Enforce atomic coupon limit validation inside `CouponService.recordUsage` under the pessimistic write lock.
  - Wrap STOMP notifications in `CheckoutService` and `OrderService` with `TransactionSynchronization.afterCommit()` to prevent premature broadcasts.
  - Convert `UserService` counter increments (`completedOrdersCount`, `rewardsRedeemedCount`) to atomic SQL updates.
  - Secure `/api/roles` endpoint with `@PreAuthorize("hasRole('SUPER_ADMIN')")`.
- **Risk:** Medium; touches core transactional checkout and order completion paths.
- **Verification:** Multi-threaded checkout test; verify transactional rollbacks do not trigger WebSocket events.

### Batch 5: Test Infrastructure & Coverage Expansion
- **Scope:**
  - Add self-contained H2 / embedded test database configuration so all 143 backend tests (including the 33 failing integration tests) pass cleanly without external PostgreSQL.
  - Add unit tests for `ChatbotService` and decomposed LLM/parser components.
  - Add unit tests for `UserService` and `AddressService`.
  - Add unit tests for dashboard `user.service.ts` and customer checkout/order utilities.
- **Risk:** Low; additive testing code only.
- **Verification:** Run complete Maven test suite and frontend/dashboard karma tests.

### Batch 6: Final Verification & Repository Polish
- **Scope:**
  - Run full backend Maven test suite (`./mvnw clean test`).
  - Run frontend production build (`ng build`) and tests.
  - Run dashboard production build (`ng build`) and tests.
  - Inspect complete Git diff to confirm zero unintended changes.
  - Deliver final audit completion report.

