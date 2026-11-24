# Deployment and Environment

## Requirements

- Node.js 20 or newer
- npm
- Cloudflare account
- Wrangler CLI

## Environment Variables

Create `.env.local` locally:

```text
NEXT_PUBLIC_APP_NAME=Quick
NEXT_PUBLIC_DEFAULT_CURRENCY=USD
```

Worker secrets:

```text
SESSION_SECRET
PASSWORD_RESET_SECRET
TWO_FACTOR_ENCRYPTION_KEY
R2_PUBLIC_URL
```

Never commit secrets or deployment credentials.

## Cloudflare D1 Setup

```bash
npx wrangler d1 create quick-db
npx wrangler d1 migrations create quick-db initial_schema
npx wrangler d1 migrations apply quick-db
npx wrangler d1 execute quick-db --file=./migrations/seed.sql
```

Update `wrangler.toml` with the D1 database ID. Bind R2 and Queue resources only
after they are created.

## Local Development

```bash
npm install
npm run dev
```

Open the local Next.js URL shown by the development server.

## Production Build

```bash
npm run build
npm start
```

For Cloudflare Pages, add an adapter such as OpenNext for Cloudflare and configure
the D1, R2, and Queue bindings. The worker entry file is a runtime boundary and
must not be deployed until its authentication and handler bindings are complete.

## Demo Accounts

Demo accounts must be created through the seed process with environment-specific
passwords. Do not ship shared production credentials.
