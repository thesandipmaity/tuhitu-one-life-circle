# Production deployment

## Main ChatGPT Sites project

`.openai/hosting.json` binds this repository to the existing main One Life Circle Sites project and D1 database:

```json
{
  "d1": "DB",
  "project_id": "appgprj_6a5cbdafdc988191b8ed9083202fbaa1",
  "r2": null
}
```

Preserve the project ID. Do not create a second site for production updates.

## Pre-publish gate

```bash
npm install
npm run lint
npm test
git status
```

`npm test` includes:

- production client and worker build;
- Sites manifest and SPA worker validation;
- route/content/member-gate contract checks;
- password, Member ID, server-pricing, signature and CSRF tests;
- a real migration-backed registration/login/payment/account/form integration test.

Publish only from a reviewed committed source state. Use the Sites edit/checkpoint workflow so the source is pushed, saved as a version and deployed from that exact commit.

## Build output

```text
dist/client/             Static React application and local assets
dist/server/index.js     Bundled API and asset-first SPA worker
dist/server/index.js.map Worker source map
dist/.openai/hosting.json
dist/.openai/drizzle/    D1 migration files
```

The worker routes `/api/*` to the backend, applies security headers and serves `index.html` for non-file deep links.

## Environment activation

Production environment values are separate from `.env.example` and committed source. Configure them on the existing Sites project.

Required for real payment:

```text
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
```

Required for working WhatsApp links:

```text
VITE_WHATSAPP_NUMBER
```

Leave `VITE_API_BASE_URL` blank for same-origin Sites hosting. See the handover document for exact Razorpay and webhook steps.

## Post-publish verification

1. Wait until the deployment reaches terminal `succeeded` state.
2. Confirm the production URL and version belong to the same project ID.
3. Open `/api/health` and confirm `database: true`; confirm `payments: true` only after valid keys are configured.
4. Test home, membership, registration, login, locked Store, community, About/Support, deep links and custom 404.
5. Run the controlled member/payment tests in `SANDEEP_LAUNCH_HANDOVER.md`.
6. Review Worker error logs and Razorpay webhook deliveries.
7. Create the source ZIP from the exact published commit; do not edit source between deployment and archive creation.

## Safe payment-off launch

If merchant/legal approval is not complete, deploy without Razorpay environment variables and keep catalogue/event approval flags disabled. Registration, Member IDs, login, account and forms remain available. Payment order endpoints return a controlled unavailable message and cannot activate membership.

## Rollback

- Redeploy the previous known-good saved Sites version.
- If payment must be stopped immediately, remove or rotate the Razorpay production values before investigating.
- Verify database, registration/login and route health after rollback.
- Never delete payment/audit records during incident response; follow the approved retention policy.

## Alternate host requirements

If the project moves away from Sites, the replacement must provide:

- a Worker-compatible runtime or adapted server implementation;
- a D1-compatible SQLite database and applied migrations;
- static asset serving and SPA fallback;
- HTTPS for secure cookies;
- environment secret management;
- raw-body access for Razorpay webhook verification;
- same-origin frontend/API or a reviewed CORS/CSRF design;
- equivalent rate limits, security headers, logs and backups.

Publishing only `dist/client` on a generic static host will not provide member accounts, Store access, forms, orders, bookings or payments.
