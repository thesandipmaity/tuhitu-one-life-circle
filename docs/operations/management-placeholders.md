# Business-owned launch decisions

The software is intentionally conservative where business facts, credentials or legal approvals are absent. These controls prevent an attractive public page from accidentally promising an unapproved provider, price or payment.

| Item | Safe current behaviour | Final owner input |
| --- | --- | --- |
| Razorpay | Full integration exists, but payment is unavailable without Sites secrets | Test/live keys, webhook secret, KYC, settlement and dashboard access |
| WhatsApp | WhatsApp actions stay hidden and working support forms are shown instead | Approved business number and display number |
| Support | Current email, service area and hours are visible drafts; forms are stored with references | Final email/address/hours, response targets, escalation owners and D1/CRM workflow |
| Team | Shows four operating functions instead of invented names/photos | Optional approved names, roles, biographies and photographs |
| Catalogue | Concepts remain browseable; protected prices/payment are blocked unless individually approved | Real brands/providers, prices, tax, availability, images, regions, fulfilment and terms |
| Partners | Supplied ecosystem marks appear with restrained descriptions | Display permission, commercial terms, eligible benefits, locations and launch approval |
| 100+ brands claim | Approved management wording appears in the homepage hero and metadata | Evidence-backed brand inventory, applicable privileges, display/reference permission and an owner for keeping the count current |
| Activities | Sixteen formats remain visible; only selected approved booking paths open | Final dates, venues, hosts, capacity, prices, eligibility and cancellation rules |
| Membership values | Current ₹50,000+ / ₹1 lakh+ / ₹2 lakh+ labels are clearly potential/illustrative | Substantiation method, exclusions and management/legal approval |
| Community benefits | Current monthly companionship/wellness wording is centralised | Redemption limits, lapse rule, provider matrix, tax and exact inclusions |
| Active/Signature | Uses relative higher/highest allowances pending exact rules | Quantities, caps, priorities, fulfilment capacity and exclusions |
| Store savings | Explains an illustrative 20–30% eligible savings scenario | Eligible catalogue, discount bands, caps, exclusions and claim approval |
| Legal | Structured interim pages exist | Legal entity, GST/invoicing, privacy, membership, Store, refund, medical and safeguarding approval |
| Recovery | Request is recorded without exposing account existence | Email/SMS provider, signed reset-token delivery and support procedure |
| Operations | D1 stores members, payments, orders, bookings, forms and audit history | Staff dashboard/CRM, roles, notifications, reconciliation, fulfilment and retention |

Central edit locations are documented in `README.md`. Sandeep's exact activation and smoke-test steps are in `SANDEEP_LAUNCH_HANDOVER.md`.
