# W3C Pi Bookings

W3C Pi Bookings is a Pi-native digital service marketplace being developed by W3C Digital Network. It connects clients who need services with providers who can offer and deliver those services through Pi Network.

The platform is designed to support service discovery, provider profiles, booking, Pi payments, delivery tracking, client confirmation, chat, and provider earnings workflows.

## Project status

The application is under active development. Core marketplace, provider, booking, payment, delivery, chat, and administrative settlement workflows are being developed and tested before production release.

## Main capabilities

- Browse and search published services
- View provider profiles and service details
- Book services using Pi
- Track booking status from payment to completion
- Support provider acceptance, delivery, revisions, cancellation, and completion confirmation
- Provide client and provider chat
- Provide a provider console for bookings, earnings, and release-related workflows
- Support Pi payment and payout integrations
- Provide feedback and tester reporting features

## Repository structure

This repository is a TypeScript monorepo managed with npm workspaces.

```text
.
├── artifacts/
│   ├── pibooking/       # Main React + Vite marketplace frontend
│   └── api-server/      # Backend API and server-side workflows
├── lib/
│   ├── api-client-react/ # Shared API client utilities
│   ├── api-spec/         # API specifications and contracts
│   ├── api-zod/          # Shared Zod schemas and validation
│   └── db/               # Shared database-related code
├── scripts/
│   └── supabase/        # Supabase scripts and supporting resources
├── package.json         # Root workspace configuration and scripts
└── README.md
```

## Technology stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- Pi Network authentication and payment integrations
- Node.js backend services
- Vercel deployment infrastructure
- GitLab as the primary source repository

## Requirements

- Node.js with npm
- Access to the required project environment variables and connected services
- Supabase project configuration for database-backed features
- Pi Network configuration for Pi authentication and payment-related features when testing those workflows

## Local development

Install dependencies from the repository root:

```bash
npm install
```

Start the main frontend development server:

```bash
npm run dev
```

The frontend development script runs the `@workspace/pibooking` workspace on port `3000`.

## Build the project

Build the frontend and API server from the repository root:

```bash
npm run build
```

Run the TypeScript project checks:

```bash
npm run typecheck
```

The root `lint` script currently runs the TypeScript build checks as well:

```bash
npm run lint
```

To start the backend after building:

```bash
npm start
```

## Booking and payment model

The platform separates payment confirmation from final settlement.

A typical booking flow is:

1. A client selects a service and submits booking details.
2. The client completes the Pi payment process.
3. The booking is recorded with a protected or escrow-style payment status.
4. The provider accepts the booking and performs the service.
5. The provider delivers the work through the platform.
6. The client confirms completion or requests a revision.
7. The applicable payout, refund, cancellation, or administrative action is processed by the server-side workflow.

Financial operations must be treated as server-authoritative and should be implemented with idempotency, verification, and recovery handling in mind.

## Environment configuration

Environment variables are required for services such as Supabase, Pi Network integrations, API access, and deployment-specific configuration.

Use the environment files and variable names expected by the relevant frontend and backend configuration files. Do not commit secrets, private keys, access tokens, or production credentials to the repository.

## Development guidelines

- Inspect the current implementation before changing code.
- Keep changes focused and avoid breaking working marketplace flows.
- Trace related frontend, backend, database, and payment logic before modifying shared behavior.
- Treat payment, payout, refund, escrow, and booking status changes as sensitive operations.
- Validate TypeScript and build output after implementation changes.
- Use clear commit messages that describe the actual change.

## Related organization

W3C Pi Bookings is part of the wider W3C Digital Network ecosystem, which also includes Web3 education, digital consulting, and other Pi- and Web3-related initiatives.

## License

This project is maintained by W3C Digital Network. Licensing and usage terms will be documented separately as the project approaches production release.
