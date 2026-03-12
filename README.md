# Inventorizer

A fungible inventory management system for tracking stock levels, recording transactions, and managing SKUs.

## Features

- **Inventory overview** — view current stock levels across all SKUs with low-stock warnings
- **SKU management** — create, update, and delete items with SKU codes, names, and thumbnail images
- **Stock operations** — add stock, consume stock, and track pending (on-order) quantities
- **Cart system** — queue multiple consumption actions and apply them at once
- **Transaction history** — full audit trail with filtering by type (addition, removal, pending)
- **Dark mode** — built-in light/dark theme support

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, React 19)
- **API**: [tRPC 11](https://trpc.io/) — end-to-end type-safe API
- **Database**: PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- **Validation**: [Zod](https://zod.dev/)
- **State**: [TanStack Query](https://tanstack.com/query) via tRPC

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- [pnpm](https://pnpm.io/)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/technet99m/inventorizer.git
cd inventorizer

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env and set your DATABASE_URL
```

### Environment Variables

| Variable       | Description                  | Example                                              |
| -------------- | ---------------------------- | ---------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/mydb` |

### Database

```bash
# Push schema to database (first time or after schema changes)
pnpm db:push

# Or use migrations
pnpm db:generate
pnpm db:migrate
```

### Run

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

The app runs at `http://localhost:3000`.

## Scripts

| Script             | Description                        |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | Start dev server with hot reload   |
| `pnpm build`       | Build for production               |
| `pnpm start`       | Start production server            |
| `pnpm check`       | Lint + type check                  |
| `pnpm db:push`     | Push schema to database            |
| `pnpm db:generate` | Generate migration files           |
| `pnpm db:migrate`  | Apply pending migrations           |
| `pnpm db:studio`   | Open Drizzle Studio (visual DB UI) |

## Project Structure

```
src/
├── app/               # Pages (/, /skus, /history)
├── server/
│   ├── api/routers/   # tRPC procedures
│   └── db/            # Drizzle schema & connection
├── components/        # Shared UI components
└── trpc/              # tRPC client setup
```
