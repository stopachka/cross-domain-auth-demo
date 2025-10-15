# Cross-Domain Instant Auth Demo

Minimal two-app setup that shares Instant auth between an origin site and a satellite domain via a hidden iframe.

## How It Works
- `origin-site/src/app/page.tsx` renders the primary login UI using Instant's magic-code flow.
- `origin-site/src/app/auth-gate/page.tsx` is embedded by the satellite. It validates the parent origin, posts refresh tokens (or sign-out signals), and stays invisible otherwise.
- `satellite/src/app/page.tsx` boots a hidden iframe pointed at the auth gate, listens for messages, and calls `db.auth.signInWithToken` / `signOut` accordingly while showing current auth state.

## Running Locally
1. `cd origin-site && npm install && npm run dev` (listens on `http://localhost:3010`).
2. `cd satellite && npm install && npm run dev` (listens on `http://localhost:3015`).
3. Visit `http://localhost:3015`; it will mount the iframe, prompt you to authenticate on the origin, and reflect the shared session.

## Configuration
- Origin allows satellite origins via `NEXT_PUBLIC_SATELLITE_ORIGINS` (comma-separated). Defaults include production `https://satellite.vercel.app` and `http://localhost:3015`.
- Satellite targets the gate with `NEXT_PUBLIC_ORIGIN_AUTH_GATE_URL`, defaulting to `http://localhost:3010/auth-gate`.
- Both apps expect `NEXT_PUBLIC_INSTANT_APP_ID` and companion Instant environment in `.env.local`.
