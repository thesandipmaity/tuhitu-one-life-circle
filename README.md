# One Life Circle

Launch-ready React/Vite website and Cloudflare Worker backend for the main One Life Circle membership platform. The application combines annual membership, secure member accounts, protected Store access, orders, bookings, forms, digital membership cards and Razorpay-ready payments in one Sites deployment.

The public experience is ready to publish. Live payment collection, registration WhatsApp alerts and transactional recovery remain safely disabled until Sandeep adds the real merchant/provider values listed in [docs/launch/sandeep-launch-handover.md](docs/launch/sandeep-launch-handover.md).

## Launch status

| Area | Current state |
| --- | --- |
| Public website | Complete responsive pages, lifestyle-led hero, three-plan comparison, 16 prioritised activities, local production assets, metadata, legal routes, custom 404 and accessibility foundations |
| Registration | Real server submission to D1 with validation, consent record, duplicate prevention and rate limiting |
| Member ID | Generated from the member's name code, registration year and database sequence, for example `OLC-LSI-26-000042`; never derived from mobile number or date of birth |
| Passwords and sessions | PBKDF2-SHA256 with a unique salt and 210,000 iterations; secure HTTP-only session cookies; no plaintext password storage |
| Login | Only registered members can log in using Member ID, registered email or registered mobile plus password |
| Store access | Server-backed membership status controls access; only `active` members can open protected pricing, cart and checkout |
| Payments | Razorpay Orders, Checkout signature, payment-status/amount and signed webhook verification implemented; activates only when server secrets are configured |
| Orders and bookings | D1 records, server-authoritative pricing, paid/free booking paths and account history implemented |
| Support and Companion forms | Saved to D1 with references, validation, consent, spam trap and server rate limits |
| Password recovery | Requests are safely recorded; delivery needs a real email/SMS provider before it can send a reset flow |
| Store catalogue | Public browsing is available, but unapproved providers/items cannot expose a price or accept payment |
| Admin operations | Database and audit records exist; a staff dashboard/CRM is a post-launch operations task |

## Current membership model

All memberships are annual and paid upfront. These values are centralised in `src/data/plans.js` so they can be changed later without rebuilding the payment rules in a separate system.

| Plan | Annual price | Potential annual benefit value* |
| --- | ---: | ---: |
| Community | ₹6,000 launch price; ₹12,000 regular price shown struck through | ₹50,000+ |
| Active | ₹24,000 | ₹1 lakh+ |
| Signature | ₹48,000 | ₹2 lakh+ |

\*Illustrative potential value, not a cash return or guaranteed saving. Actual value depends on eligible use, approved providers, availability, location, exclusions and programme terms.

## Requirements and quick start

- Node.js 20.19 or newer
- npm

```bash
npm install
npm run dev
```

Quality and production commands:

```bash
npm run lint
npm test
npm run build
npm run preview
```

`npm test` performs the production build and runs the frontend contract, backend security and full registration/payment integration tests.

## Architecture

```text
Browser (React/Vite)
    │ same-origin /api requests
    ▼
Sites Worker
    ├── registration, login, sessions and account
    ├── support/Companion submissions
    ├── authoritative Store and booking pricing
    ├── Razorpay order, signature and webhook handling
    └── asset serving with SPA fallback and security headers
          │
          ▼
Cloudflare D1 (DB binding)
    members · sessions · payment_orders · orders · order_items
    bookings · form_submissions · password_reset_requests
    rate_limits · audit_logs
```

The schema is defined in `db/schema.ts`; the generated migration is in `drizzle/`. `.openai/hosting.json` binds D1 as `DB` and preserves the existing main Sites project ID.

## Member lifecycle

1. The visitor completes `/membership-registration` and creates a password.
2. The server validates the data, blocks duplicate email/mobile registrations and writes the member record.
3. A readable unique Member ID is generated from the name code, current year and database sequence.
4. The member receives a secure session, but status remains `pending_payment`.
5. The membership payment order is created server-side from the selected plan in `src/data/plans.js`.
6. A valid Razorpay checkout signature or signed webhook changes the member to `active` and sets annual validity.
7. Only an active member can access Store prices, cart, Store checkout and member bookings.
8. Suspended or cancelled members are blocked from login.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Lifestyle positioning, membership value, side-by-side plan comparison, life stages, savings example and ecosystem |
| `/membership` | Annual plan cards followed immediately by plan comparison, FAQs and ecosystem benefits |
| `/membership-registration`, `/join` | Registration, Member ID creation and membership payment hand-off |
| `/login` | Registered-member login |
| `/account`, `/my-account` | Membership status, digital card, orders, bookings, saved items and support |
| `/access-card`, `/verify/:token` | Protected card and minimum-data public membership verification |
| `/store`, `/store/:slug` | Locked member catalogue and product/service detail |
| `/cart`, `/checkout` | Active-member cart, validated delivery details and payment |
| `/community`, `/experiences/:slug` | Sixteen prioritised activity formats without a rotating hero, plus interest, free booking and paid booking |
| `/about-support` | Brand story, vision, operating teams, contact and live support form |
| `/become-a-companion` | Companion application saved with a reference |
| `/forgot-password` | Secure recovery request |
| `/legal/:slug` | Privacy, membership, Store, cancellation/refund and medical notices |

## API surface

| Method and path | Purpose |
| --- | --- |
| `GET /api/health` | Database/payment configuration health |
| `POST /api/auth/register` | Create member, meaningful ID and session |
| `POST /api/auth/login` | Login using Member ID, email or mobile |
| `POST /api/auth/logout` | Revoke session |
| `GET /api/auth/session` | Restore current session |
| `POST /api/auth/recover` | Queue recovery request |
| `GET /api/account` | Member, order and booking history |
| `POST /api/forms/support` | Save a routed enquiry |
| `POST /api/forms/companion` | Save a Companion application |
| `POST /api/payments/order` | Create validated membership, Store or booking payment order |
| `POST /api/payments/verify` | Verify Razorpay Checkout signature and fulfil |
| `POST /api/payments/webhook` | Verify raw-body Razorpay webhook and reconcile |
| `GET /api/members/verify/:token` | Return minimum public membership status |

Every non-GET browser request is checked for same-origin use. Registration, login, recovery, form and payment-order endpoints use D1-backed rate limits. Payment prices are never trusted from the browser.

## Content and approval controls

| Content | Source |
| --- | --- |
| Plans, prices, benefits and comparison | `src/data/plans.js` |
| Value pillars, life stages, vision/mission and team profiles | `src/data/content.js` |
| Contact, WhatsApp, service area and public configuration | `src/data/siteConfig.js` |
| Store catalogue | `src/data/catalogue.js`, backed by product/service/experience files |
| Sixteen Community activities, pricing and booking status | `src/data/events.js` |
| Partners | `src/data/partners.js` |
| FAQs and form routes | `src/data/faqs.js`, `src/data/forms.js` |
| Brand and editorial assets | `public/assets` |

Homepage positioning and hero proof-point copy are in `src/pages/home-page.jsx`. The public claim of privileges across 100+ brands must remain aligned with management's approved partner inventory and evidence.

For an item to accept online payment, management must approve its data and set both `verified: true` and `checkoutEnabled: true`. Events need `bookingOpen: true`; a zero member price creates a free confirmed booking, while a positive price opens Razorpay.

## Environment variables

Copy `.env.example` to `.env.local` only for local development. Production values belong in the Sites environment, never in source control.

| Variable | Scope | Required for |
| --- | --- | --- |
| `RAZORPAY_KEY_ID` | Server | Razorpay Checkout and Orders API |
| `RAZORPAY_KEY_SECRET` | Secret, server only | Order creation and checkout-signature verification |
| `RAZORPAY_WEBHOOK_SECRET` | Secret, server only | Webhook-signature verification |
| `VITE_WHATSAPP_NUMBER` | Public build value | WhatsApp deep links; digits only with country code. Actions remain hidden until configured |
| `BAILEYS_BRIDGE_URL` | Secret, server only | URL of the separate always-on Baileys bridge, for example `http://127.0.0.1:8788` |
| `BAILEYS_BRIDGE_TOKEN` | Secret, server only | Optional bearer token required by the Baileys bridge |
| `WHATSAPP_ACCESS_TOKEN` | Secret, server only | Meta WhatsApp Cloud API access token for staff alerts |
| `WHATSAPP_PHONE_NUMBER_ID` | Secret, server only | Meta WhatsApp sender phone number ID |
| `WHATSAPP_ALERT_TO` | Secret, server only | Destination number for new-registration alerts, digits only with country code |
| `WHATSAPP_TEMPLATE_NAME` | Secret, server only | Approved WhatsApp template name with one body placeholder |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Secret, server only | Template language code, for example `en` |
| `WHATSAPP_API_VERSION` | Secret, server only | Optional Graph API version override; defaults to `v23.0` |
| `VITE_API_BASE_URL` | Public build value | Leave blank for same-origin Sites hosting |
| `VITE_GA_MEASUREMENT_ID` | Public build value | Optional approved analytics |
| `RESEND_API_KEY` / `SMS_PROVIDER_API_KEY` | Secret, server only | Future recovery delivery integration |

No merchant or provider secrets are committed. Without Razorpay values the website preserves registrations and explains that payment activation is pending; it never fakes success. Without the WhatsApp server values, membership registration still works and no alert is sent.

## Baileys bridge

For low-volume WhatsApp Web messaging, the project can call a separate Baileys bridge after a member registration is created. This is not run inside the Sites worker itself. You need an always-on Node process because the WhatsApp Web session must stay connected and periodically re-authenticated.

1. Add `BAILEYS_BRIDGE_URL` in the backend environment that serves `/api/auth/register`.
2. Optionally set `BAILEYS_BRIDGE_TOKEN` in both the website backend and the bridge process.
3. On the machine that will keep the WhatsApp account online, run:

```bash
npm run whatsapp:bridge
```

4. Scan the QR shown in the terminal from the WhatsApp account that should send the confirmation.
5. Keep the process running. The auth session is stored in `.baileys-auth/` and is ignored by git.

Optional bridge-only variables:

```text
BAILEYS_BRIDGE_HOST=127.0.0.1
BAILEYS_BRIDGE_PORT=8788
BAILEYS_AUTH_DIR=.baileys-auth
BAILEYS_REGISTRATION_TEMPLATE=Hi {{name}}, thank you for registering with One Life Circle. Your Member ID is {{memberId}} and your selected plan is {{plan}}. Our team will guide you on the next steps shortly.
```

The registration backend now sends the new member a simple text confirmation through that bridge when `BAILEYS_BRIDGE_URL` is configured.

## Build output

```text
dist/client/          React application and local assets
dist/server/index.js  Bundled API + SPA worker
dist/.openai/         Sites manifest and D1 migrations
```

## Security and operational notes

- Cart and saved-item convenience state remains device-local; final order lines and amounts are recalculated on the server.
- Session tokens are random, stored only as hashes in D1 and sent through `Secure; HttpOnly; SameSite=Lax` cookies.
- Public verification exposes only name, plan, status and validity; it never returns email, mobile or address.
- General forms tell users not to submit medical or highly sensitive information.
- Security headers include no-sniff, referrer, permissions and frame controls.
- Legal copy is a structured operational draft and needs counsel approval before collecting live money.
- Recovery delivery, staff notifications, fulfilment automation, refunds and an admin dashboard are not represented as complete.

## Handover

Start with [docs/launch/sandeep-launch-handover.md](docs/launch/sandeep-launch-handover.md). It contains the exact credential, Razorpay, catalogue, support, legal, smoke-test and rollback steps for the final launch.

Additional references:

- [docs/backend/backend-integration.md](docs/backend/backend-integration.md) explains the implemented backend and safe extension points.
- [docs/deployment/deployment.md](docs/deployment/deployment.md) covers Sites publishing and verification.
- [docs/operations/management-placeholders.md](docs/operations/management-placeholders.md) lists the remaining business-owned decisions.

## Project structure

```text
one-life-circle/
├── .openai/hosting.json
├── db/schema.ts
├── docs/
│   ├── backend/
│   ├── deployment/
│   ├── launch/
│   └── operations/
├── drizzle/
├── public/assets/
├── scripts/
├── src/
│   ├── components/
│   ├── data/
│   ├── lib/
│   ├── pages/
│   └── styles/global.css
├── tests/
├── worker/
├── .env.example
└── package.json
```
