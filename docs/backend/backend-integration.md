# Backend architecture and extension notes

The Sites worker is a real same-origin backend, not a browser-only simulation. It uses the `DB` D1 binding declared in `.openai/hosting.json` and serves the React SPA when a request is not under `/api/`.

## Implemented responsibilities

| Area | Implementation |
| --- | --- |
| Registration | Validates identity/contact/plan/password/consent, rejects duplicate email/mobile, creates a pending member and unique Member ID |
| Authentication | Member ID/email/mobile login, salted PBKDF2 hashes, timing-safe comparison, secure cookie sessions, logout and inactive-account blocks |
| Authorisation | `active` membership is required server-side for Store orders and member bookings |
| Account | Returns minimum member profile plus recent orders and bookings |
| Digital card | Uses the authenticated member; public verification uses a long random token and minimum fields |
| Forms | Support and Companion submissions stored with reference, consent timestamp, spam trap and rate limit |
| Store | Server imports the approved catalogue, recalculates line amounts and blocks unverified/disabled entries |
| Bookings | Server validates source and booking-open state; supports free confirmation and paid booking |
| Payments | Razorpay Orders API, Checkout HMAC, gateway capture/amount verification, raw-body webhook HMAC and idempotent fulfilment |
| Operations | D1-backed rate limits and audit logs |

## Database

Schema: `db/schema.ts`

Migration: `drizzle/0000_peaceful_clea.sql`

Tables:

- `members`
- `sessions`
- `payment_orders`
- `orders`
- `order_items`
- `bookings`
- `form_submissions`
- `password_reset_requests`
- `rate_limits`
- `audit_logs`

The production package copies the migration directory to `dist/.openai/drizzle` so Sites can initialise the bound D1 database.

## Security model

- Password policy: at least 10 characters with uppercase, lowercase and a number.
- Password storage: PBKDF2-SHA256, 210,000 iterations and a unique 16-byte salt.
- Sessions: 32-byte random token, only its SHA-256 hash is stored, seven-day default or 30-day remembered session.
- Cookie: `Secure`, `HttpOnly`, `SameSite=Lax`, root path.
- Mutating browser requests: same-origin `Origin` validation except the signed payment webhook.
- Abuse controls: server/D1 rate limits for registration, login, recovery, forms and payment-order creation.
- Payloads: JSON capped at 64 KB with field-length normalisation and server validation.
- Payment integrity: prices come from server imports, not request totals.
- Verification privacy: no email, mobile, locality or internal database ID is returned publicly.
- Audit: registration, login, logout, payment, form and booking events are recorded without logging passwords/secrets.

## Member ID format

`OLC-<three-letter name code>-<two-digit year>-<six-digit database sequence>`

Examples:

- Lalit Singh, record 42 in 2026: `OLC-LSI-26-000042`
- Meera, record 108 in 2026: `OLC-MEE-26-000108`

The sequence guarantees uniqueness. The name/year portion makes the ID recognisable. It deliberately excludes phone numbers, dates of birth and random-looking tokens.

## Membership state

| Status | Login | Account | Store price/cart/payment |
| --- | --- | --- | --- |
| `pending_payment` | Yes | Yes, with activation prompt | No |
| `active` | Yes | Yes | Yes, subject to item approval |
| `suspended` | No | No | No |
| `cancelled` | No | No | No |

A verified membership payment changes the record to `active`, sets `issued_at` and adds one year to `valid_until`. If a still-valid member renews, the year extends from the existing validity date.

## Payment lifecycle

1. Authenticated browser calls `POST /api/payments/order` with purpose and references, not a trusted amount.
2. Backend looks up the plan/catalogue/event, validates approval and calculates paise.
3. Backend creates local `payment_orders` plus a pending order/booking where required.
4. Backend creates a Razorpay order using server credentials.
5. Browser opens Razorpay Checkout with the returned public key/order ID.
6. Checkout returns payment/order/signature values to `/api/payments/verify`.
7. Backend verifies `HMAC-SHA256(order_id + "|" + payment_id)` with the server secret.
8. Backend fetches the payment from Razorpay and matches order ID, amount, currency and `captured` status. An authorised-but-not-captured payment remains pending and grants no access.
9. Signed `payment.captured` and `order.paid` webhooks provide reconciliation if the browser callback is lost or capture completes later.
10. Fulfilment is idempotent: membership activates, order becomes `paid` or booking becomes `confirmed` only once.
11. Gateway/order failures and `payment.failed` update local payment/order/booking states without granting access.

Do not create a second client-only success path. Do not accept browser amounts. Do not fulfil from an unsigned callback.

## Approval controls

Catalogue transactions require:

```js
active: true,
verified: true,
checkoutEnabled: true,
```

The exact source record must also have a valid `memberPrice`. Store checkout accepts products; catalogue services/experiences use booking.

Event booking requires:

```js
bookingOpen: true,
```

This is intentionally stricter than merely displaying an item. Public concepts can remain visible while money collection stays disabled.

## Remaining integrations

These are operational extensions, not missing access controls:

1. Transactional recovery delivery and single-use password reset completion.
2. Staff admin/CRM interface for D1 enquiries, members, orders and bookings.
3. Order fulfilment, tax invoice, shipping and return-provider integrations.
4. Calendar/provider-capacity integration for service and event bookings.
5. Automated email/SMS/WhatsApp receipts and status notifications.
6. Refund API and webhook handling after the refund policy is approved.
7. Plan entitlement/redemption ledger if monthly quantities need automated enforcement.
8. Consent-aware analytics after the property and retention rules are approved.

## Safe extension rules

- Keep authentication, pricing, eligibility, capacity and fulfilment decisions on the worker/server.
- Add D1 migrations; do not change production tables manually without a reversible plan.
- Preserve payment records and idempotency when adding refunds or asynchronous fulfilment.
- Use signed, random, expiring tokens for recovery; store hashes rather than usable reset tokens.
- Require staff authentication and least privilege for any future admin route.
- Avoid collecting clinical details in general forms. If health data is later required, establish a separate approved data model, consent and access policy.
- Add tests for each new API branch before publishing.

See [SANDEEP_LAUNCH_HANDOVER.md](SANDEEP_LAUNCH_HANDOVER.md) for the exact production activation checklist.
