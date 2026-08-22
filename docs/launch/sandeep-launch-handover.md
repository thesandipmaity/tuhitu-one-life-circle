# Sandeep — final launch handover

This is the day-of-launch checklist for the main One Life Circle website. The website, registration/login backend, D1 database, member-ID generation, Store gate, member account, orders, bookings, support forms and Razorpay integration code are complete.

Do not bypass the approval controls just to make a button look live. Real collection should open only after merchant credentials, webhook verification, legal copy and the relevant offer/provider are approved.

## What you do not need to rebuild

- Registration creates a real D1 member record and a readable unique Member ID.
- Only registered members can log in; email, mobile or Member ID plus the saved password works.
- Passwords are salted/hashed and sessions use secure HTTP-only cookies.
- New members remain `pending_payment` and cannot open the protected Store.
- A verified membership payment changes the member to `active` for one year.
- Active membership is checked again on the server before Store and booking payments.
- Membership, cart and booking amounts are calculated from server-owned data.
- Razorpay checkout and webhook signatures are verified before access/order/booking fulfilment.
- Paid orders, free/paid bookings, enquiries, Companion applications, rate limits and audit events are recorded in D1.
- Failed or missing merchant configuration cannot accidentally grant Store access.

## 1. Confirm the production project

This source is bound to the existing main Sites project through `.openai/hosting.json`. Do not create a second site and do not replace the `project_id`.

From the project directory:

```bash
npm install
npm run lint
npm test
git status
```

`npm test` must finish with the production build and all frontend/backend tests passing. The working tree should be clean before publishing another version.

## 2. Add the real Sites environment values

At handover, the main Sites project has no production environment variables. Add these in the Sites project environment:

```text
RAZORPAY_KEY_ID=<merchant key id>
RAZORPAY_KEY_SECRET=<merchant key secret>
RAZORPAY_WEBHOOK_SECRET=<a separate webhook secret chosen in Razorpay>
VITE_WHATSAPP_NUMBER=<digits only, for example 9198XXXXXXXX>
```

Optional:

```text
VITE_GA_MEASUREMENT_ID=<approved analytics id>
RESEND_API_KEY=<only after recovery email is implemented>
SMS_PROVIDER_API_KEY=<only after recovery SMS is implemented>
```

Leave `VITE_API_BASE_URL` blank on Sites so browser and API stay same-origin.

Rules:

- `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are server secrets. Never prefix them with `VITE_`, place them in `.env.example`, paste them into source, or send them in chat.
- Set test-mode Razorpay values first. Replace them with live-mode values only after the Razorpay account/KYC and final business checks are approved.
- Publish a new version after changing public `VITE_` build values.

## 3. Complete Razorpay dashboard setup

1. In Razorpay, finish account/KYC, settlement account and live-mode approval.
2. Start with Test Mode keys and add them to the Sites environment.
3. Create a webhook pointing to the exact published domain plus:

   ```text
   /api/payments/webhook
   ```

4. Subscribe to:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
5. Set a strong webhook secret in Razorpay and add the identical value as `RAZORPAY_WEBHOOK_SECRET` in Sites.
6. Publish, then complete the test transactions in the smoke-test section below.
7. Confirm each successful test is visible in Razorpay and the matching member/order/booking is updated in D1.
8. Only then repeat with live credentials and a small controlled live payment.

The backend uses Razorpay Orders, validates the Checkout HMAC signature, fetches and matches the Razorpay payment status/amount/currency, validates webhooks over the original raw body and fulfils only after a valid captured/paid confirmation.

## 4. Approve what can accept payment

Store data is in:

```text
src/data/products.js
src/data/services.js
src/data/experiences.js
```

The combined catalogue is in `src/data/catalogue.js`. Before enabling any item, confirm:

- real provider/brand name and permission to display it;
- member and list prices, GST/tax treatment and payment recipient;
- inventory or appointment capacity;
- delivery/service area, fulfilment owner and escalation route;
- cancellation, refund and partner-specific terms;
- image/licensing and copy approval.

Then set the record to:

```js
verified: true,
checkoutEnabled: true,
```

If either control is not ready, leave it false. The website will show interest/approval messaging and the backend will reject checkout even if someone modifies the browser.

Community activities are in `src/data/events.js`. Set `bookingOpen: true` only after the date, time, venue, host, capacity, eligibility and cancellation rule are approved. `memberPrice: 0` creates a free confirmed booking; a positive member price creates a Razorpay order.

## 5. Confirm membership and benefit data

All current plan prices, benefits and value labels are in `src/data/plans.js`.

Before live collection, management must approve:

- annual price and any struck-through regular price;
- plan benefit quantities and monthly refresh/lapse rules;
- the basis and substantiation for ₹50,000+ / ₹1 lakh+ / ₹2 lakh+ claims;
- provider eligibility, exclusions, geography, taxes and availability;
- upgrade, renewal, suspension, cancellation and refund treatment.
- the public "100+ brands" statement, including the approved brand inventory, applicable privilege per brand and permission to display or reference each brand.

When these values change later, edit `plans.js`, run the full tests and publish a new version. The same source is imported by the backend, so the displayed and charged membership price remain aligned.

The homepage lifestyle statement, 100+ brands claim and three proof points are in `src/pages/home-page.jsx`. Keep the comparison rows in `src/data/plans.js` aligned with any revised quotas before republishing.

## 6. Replace business-owned contact and legal details

Edit `src/data/siteConfig.js` for:

- final support email;
- service area and address;
- business hours;
- website/social links;
- approved WhatsApp display number.

The actual WhatsApp link uses `VITE_WHATSAPP_NUMBER`; WhatsApp actions stay hidden and the working support form is shown instead until that value exists.

Have counsel/management approve all pages under `/legal/*`, especially privacy, membership terms, Store terms, cancellation/refund and medical disclaimer. Confirm the legal business name, GST/tax invoicing entity, grievance contact, registered address and data-retention rules.

## 7. Decide how staff will operate D1 records

The launch backend records operational data but does not include a public admin dashboard. Assign an authorised staff workflow for:

- `members` — identity, plan, status and validity;
- `orders` / `order_items` — payment and fulfilment;
- `bookings` — schedule and confirmation;
- `form_submissions` — support and Companion follow-up;
- `password_reset_requests` — recovery handling;
- `payment_orders` — reconciliation;
- `audit_logs` — security/operations trail.

Use the hosting provider's authorised D1/database controls or connect a private admin/CRM. Do not expose raw D1 tables through a public browser route.

Before launch, name owners for Membership Support, Payments/Reconciliation, Store Fulfilment, Booking Coordination and Privacy/Grievance handling. Decide response-time targets and escalation contacts.

## 8. Finish password recovery delivery

The current `/forgot-password` flow deliberately records a time-limited recovery request and always returns a privacy-safe response. It does not yet send a reset link or allow a password change.

Before describing recovery as automated, implement one approved route:

1. Email: Resend or another approved transactional provider, verified sending domain, signed single-use reset token and 30-minute expiry.
2. SMS: approved Indian DLT/template/provider flow, signed single-use reset token and rate limits.
3. Interim manual support: authorised staff verifies the member through an approved process and performs a secure reset. Never ask for or send the existing password.

Keep the current generic response so account existence is not disclosed.

## 9. Production smoke test

Use a new test email and mobile number. Do not use a real customer's personal data.

1. Open `/api/health`; confirm `database: true`. After keys are added, confirm `payments: true`.
2. Register a test Community member.
3. Confirm the Member ID follows `OLC-<name code>-<year>-<sequence>` and is not random text or based on phone/DOB.
4. Confirm the new account shows `Payment pending` and Store remains locked.
5. Log out, then log in with Member ID + password.
6. Repeat login with registered email and then registered mobile.
7. Verify a wrong password does not log in and does not reveal which field was wrong.
8. Complete a Razorpay test membership payment.
9. Confirm the member becomes `Active`, has an issue/valid-until date and can open Store prices.
10. Open the digital card and its public verification link; confirm email/mobile/address are not shown publicly.
11. Confirm an unapproved Store item cannot be paid for.
12. If one product is approved, add it to cart, complete checkout and confirm the D1 order is `paid`.
13. Book `Morning Mobility Circle`; confirm the free booking is `confirmed` without opening Razorpay.
14. Book `Panchakarma Discovery Session`; confirm the ₹499 Razorpay flow and booking confirmation.
15. Submit About & Support and Companion forms; confirm each returns a reference and is present in `form_submissions`.
16. Request password recovery; confirm the privacy-safe response and D1 request record.
17. Test logout, direct `/store`, `/checkout`, `/account`, a deep link and the custom 404 on desktop and mobile.
18. Review Razorpay webhook delivery status and Worker error logs; there should be no application errors.

## 10. Go-live gate

Publish live payments only when all boxes are true:

- [ ] Sites deployment succeeded on the main project and main URL
- [ ] D1 health is true and migrations exist
- [ ] Razorpay KYC/live account and settlement details are approved
- [ ] Live key, secret and separate webhook secret are configured
- [ ] Webhook events delivered successfully in Test Mode
- [ ] Controlled live membership payment reconciled correctly
- [ ] At least one real support owner receives form/order/booking records
- [ ] WhatsApp number and support details are approved
- [ ] Store/event records accepting money are individually approved
- [ ] Membership/value claims and legal/refund/privacy copy are approved
- [ ] Mobile, keyboard, registration, login, payment, Store gate and deep-link smoke tests pass
- [ ] Rollback owner and previous known-good Sites version are identified

If payment/legal approval misses the deadline, publish the site with Razorpay variables absent and all Store items unapproved. Registration, Member IDs, login, account and enquiry capture will still work; payment buttons will remain safely unavailable.

## 11. Rollback and incident response

- Redeploy the previous known-good saved Sites version if the new deployment fails.
- If payment behaviour is in doubt, remove/rotate the Razorpay environment values to disable new payment orders, then investigate before re-enabling.
- For a leaked secret, rotate it immediately in Razorpay/provider and Sites; a new deployment alone does not revoke a credential.
- Never mark a member, order or booking paid based only on a browser screenshot. Reconcile against a signed webhook and the Razorpay dashboard.
- Preserve payment and audit records needed for reconciliation; follow the approved privacy-retention policy for personal data.

## Source locations at a glance

| Task | File or folder |
| --- | --- |
| Membership plans/benefits | `src/data/plans.js` |
| Store approvals/prices | `src/data/products.js`, `services.js`, `experiences.js` |
| Activity schedules/prices | `src/data/events.js` |
| Contact/business details | `src/data/siteConfig.js` |
| Public pages | `src/pages/` |
| Member shell/Store gate | `src/components/app-provider.jsx` |
| API routes | `worker/api.js` |
| Payment logic | `worker/payments.js` |
| Auth/security | `worker/security.js`, `worker/database.js` |
| D1 schema/migrations | `db/schema.ts`, `drizzle/` |
| Backend tests | `tests/backend.test.mjs`, `tests/integration.test.mjs` |
| Sites binding | `.openai/hosting.json` |

When anything business-critical changes, run `npm run lint` and `npm test`, publish through the existing Sites project, verify the terminal deployment status, and create the source archive from that exact published commit.
