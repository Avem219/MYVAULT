# MYVAULT

Luxury-style contribution portal starter for the MYVAULT Supabase project.

## Included

- Next.js App Router application
- Black, gold, white and crimson visual direction
- Supabase email magic-link sign-in
- Admin-only payment-link creation through the existing `myvault_create_payment_link` database function
- Provider selection fields for MTN Mobile Money, Airtel Money, PayPal and Flutterwave
- Responsive dashboard starter

## Important implementation status

This ZIP is a **starter application**, not a completed or production-ready payment service.

The current source does not yet include:
- the public `/pay/[token]` contribution page
- provider checkout API integrations
- signed webhook verification and idempotent payment processing
- transaction history, downloadable QR generation or a complete admin payment-method editor
- dark/light theme switching

The link creation screen creates a database record only. It does not collect money and does not prove that a payment has been made. Do not share generated links with contributors until the public payment page and checkout flow have been implemented and tested.

A payment must only be marked paid after server-side verification of an authentic provider notification, including the expected amount, currency and transaction reference. Never trust a browser redirect as proof of payment.

## Requirements

- Node.js 20.9 or later
- npm
- Access to the MYVAULT Supabase project
- An administrator account already registered in `public.myvault_admins`

## Run locally

1. Extract the ZIP.
2. Open a terminal in the extracted `MYVAULT` folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env.local`.
5. Fill in the Supabase URL and publishable (or legacy anon) key from the Supabase project dashboard.
6. Start the development server:

   ```bash
   npm run dev
   ```

7. Open `http://localhost:3000`.

## Supabase configuration

Project dashboard:

https://supabase.com/dashboard/project/qbtirahtgoxjaoddvmxr

Set the Supabase Auth Site URL to your local URL during local testing, and add the deployed app URL to the Auth redirect allow-list when deploying.

The signed-in account must be an authorized MYVAULT administrator. The database function enforces this. If link creation returns a permission error, verify the account's admin membership in `myvault_admins`; do not weaken the RLS policies to make the error disappear.

## Secrets

- Only the Supabase publishable/anon key belongs in the browser environment.
- Never place the Supabase `service_role` key in a `NEXT_PUBLIC_` variable.
- Never commit `.env.local`.
- Provider API secrets and webhook signing secrets must be stored in server-side environment variables only.
- Do not paste passwords, service-role keys or provider secrets into chat or source files.

## Deploying

Import the GitHub repository into Vercel and add the two public Supabase environment variables in the Vercel project settings. Add the deployed domain to Supabase Auth redirect URLs. Deploy only after local type-checking and a production build succeed.

## Database RPC expected by this starter

`public.myvault_create_payment_link(text,numeric,text,text,timestamptz)`

Arguments:
- `p_title`
- `p_amount`
- `p_currency`
- `p_provider`
- `p_expires_at`

The function must remain restricted to authenticated MYVAULT admins.
