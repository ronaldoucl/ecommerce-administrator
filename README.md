# Product-Focused E-commerce Management System

A product-focused e-commerce management system for administering products, inventory, and related operations. The platform is organized as a monorepo containing two independent applications: a React + Vite frontend and a Node.js + Express backend, backed by PostgreSQL through Prisma, with JWT-based authentication.

## Getting Started

### Prerequisites

- Node.js 20+ (ESM)
- A PostgreSQL database (local or cloud, e.g. Supabase/Render)


## Tech Stack

- **Frontend:** React, Vite
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT
- **Runtime:** Node.js 20+ (ESM)

## Team

- Ronaldo
  "Each day is a day of decision, and our decisions determine our destiny"
  -Russell M. Nelson
- Lucas
  "Time doesn't heal anything, it just teaches us how to live with pain"
  -Itachi Uchiha
## Repository Structure

```
.
├── backend/       # Node.js + Express API (independent npm project)
├── frontend/      # React + Vite app (independent npm project)
├── README.md
└── .gitignore
```

`backend/` and `frontend/` are two independent npm projects. Each will have its own `package.json` and dependencies and can be installed and run independently.

## Branching Strategy

```
main   (always deployable)
  ↑
dev    (integration)
  ↑
feature/*   (one branch per ticket)
```

- **`main`** — Always deployable. Only updated through reviewed pull requests from `dev`. Direct pushes are blocked.
- **`dev`** — Integration branch. Feature branches are merged here first for integration testing before being promoted to `main`.
- **`feature/*`** — One branch per ticket, created from `dev` and named `feature/<ticket-id>-<short-desc>` (or `fix/<ticket-id>-<short-desc>` for bug fixes). Merged back into `dev` via pull request.

Pull requests always target `dev`. Commits follow the Conventional Commits standard in English (`feat`, `fix`, `chore`, `docs`, `refactor`).
