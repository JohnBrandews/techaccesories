# Mahir Technology

Kenyan technology storefront built with Next.js App Router, TypeScript, Prisma, and PostgreSQL on Neon. The Stitch exports in `stitch_electronics_e_commerce_storefront/` are the visual reference for the storefront, catalog, product, checkout, and inventory screens.

## Run locally

1. Use Node.js 20 or newer.
2. Install packages with `npm install`.
3. Ensure `.env` has the Neon PostgreSQL `DATABASE_URL`, a random `AUTH_SECRET` (at least 32 characters), `ADMIN_EMAIL`, and a strong `ADMIN_PASSWORD`. Add Cloudinary's `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` for product image uploads; keep these server-only and retain any existing values.
4. Deploy the checked-in PostgreSQL migrations with `npm run db:deploy`, copy existing local records with `npm run db:import-sqlite` if needed, then seed the demo catalog and configured admin with `npm run db:seed`.
5. Start Next.js with `npm run dev`.

The old SQLite database is preserved at `prisma/dev.db` and is ignored by Git. Its original migration history is archived at `prisma/migrations-sqlite-archive/`; PostgreSQL migrations live at `prisma/migrations/`. `npm run db:deploy` uses Neon’s direct endpoint for migrations when `DATABASE_URL` contains a pooled hostname, without changing `.env`. To copy existing SQLite rows into a newly migrated, empty Neon database, run `npm run db:import-sqlite` before `npm run db:seed`. The import stops if the destination already contains application records. `npm run db:seed` can refresh demo categories, brands, and products, and upserts the admin account using `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Do not use Prisma reset commands on a database containing work you want to keep.

## Implemented screens and flows

- Homepage with database-driven categories and featured products.
- Catalog search, brand and stock filters, price/newest sorting, and pagination.
- Category pages and product detail pages with images, warranty, stock, and specifications.
- Persistent browser cart with quantity controls.
- Checkout that re-reads database prices, validates inventory, reserves stock transactionally, and stores order/item price snapshots.
- Order confirmation and reference plus email lookup.
- Email/password account registration and sign-in, with an account dropdown, customer order dashboard and status tracking. New registrations are customer accounts; the local admin account is provisioned from `ADMIN_EMAIL` and `ADMIN_PASSWORD` when `db:setup` or `db:admin` runs.
- Inventory dashboard at `/admin`, protected by signed admin sessions, with product create/edit/delete, Cloudinary image upload, publish and stock controls, category creation/activation, order status tracking (pending, delivered, completed), and cancellation/restock for unpaid demo orders.

## Test checkout behavior

Checkout is intentionally a demo flow. It creates an order with `pending` payment status and does not contact Paystack, M-Pesa, or a card network. No frontend action can mark an order as paid. Stock is reserved when a demo order is submitted, and an admin can cancel pending unpaid demo orders to return stock.

Payment initiation and webhook verification, delivery pricing, category name/description editing, and paid-order refunds need their own implementation before production. Add merchant credentials through server-only environment variables; never expose payment secrets to browser code.

## Database migration direction

PostgreSQL on Neon is the active database. Prices use integer minor units; product specifications use JSON text. The initial PostgreSQL migration was generated independently from the archived SQLite migration history. Do not point a live database URL at `prisma migrate reset`.

## Project checks

- `npm run typecheck`
- `npm run lint`
- `npm run build`
