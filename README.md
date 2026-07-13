# CS Assistant — Sales Marketing Flow SaaS

Otomasi flow sales marketing: scrape leads → CRM → WhatsApp broadcast → pipeline kanban → dashboard laporan.

## Tech Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend:** Next.js API Routes, Prisma 5, NextAuth v5
- **Database:** PostgreSQL (Neon free tier — dipakai dev & prod)
- **Messaging:** WhatsApp Business Cloud API (Meta)
- **Scraping:** Playwright (Google Maps)
- **Charts:** Recharts
- **Kanban:** @hello-pangea/dnd

## Quick Start

```bash
# Clone
git clone https://github.com/gyuxce/csmarketing.git
cd csmarketing

# Install
npm install

# Setup env
cp .env.example .env.local
# Edit .env.local — minimal isi NEXTAUTH_SECRET

# Setup database
npx prisma migrate dev --name init
npx tsx prisma/seed.ts

# Run
npm run dev
```

Login: `admin@cs-assistant.com` / `admin123`

## Features

| Module | Route | Description |
|--------|-------|-------------|
| Dashboard | `/` | Charts: lead growth, source pie, sales funnel, performance |
| CRM | `/crm` | Lead list with search, filter, pagination |
| CRM Detail | `/crm/:id` | Edit/delete lead, activity timeline, message history |
| Pipeline | `/pipeline` | Drag-and-drop kanban board |
| Scraper | `/scraper` | Google Maps scraper + CSV import |
| Broadcast | `/broadcast` | WhatsApp blast with audience selector |
| Reports | (via API) | `/api/reports?type=overview|funnel|lead-growth|source-distribution` |

## Database Setup for Production

### Option A: Neon (recommended — free tier)

1. Bikin akun di [neon.tech](https://neon.tech)
2. Create project → dapat connection string
3. Update `.env.local`:
```env
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/db?sslmode=require"
```
4. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
5. Run:
```bash
npx prisma migrate deploy
npx tsx prisma/seed.ts
```

### Option B: Vercel Postgres

1. Di Vercel dashboard → Storage → Create Postgres
2. Copy connection string ke env vars
3. Sama seperti Opsi A untuk migrate

## WhatsApp Cloud API Setup

1. Bikin [Meta for Developers](https://developers.facebook.com/) account
2. Create app → type: Business
3. Add WhatsApp product
4. Dapatkan Phone Number ID + Access Token
5. Tambah ke `.env.local`:
```env
WA_PHONE_NUMBER_ID=123456789
WA_ACCESS_TOKEN=EAAxxx...
WA_VERIFY_TOKEN=my-secret-token
```
6. Setup webhook URL: `https://yourdomain.com/api/wa-webhook`

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

## Environment Variables

```env
DATABASE_URL=              # PostgreSQL connection string (wajib — Neon)
NEXTAUTH_SECRET=            # Random string for JWT (wajib)
NEXTAUTH_URL=http://localhost:3000

# WhatsApp Cloud API (optional)
WA_PHONE_NUMBER_ID=
WA_ACCESS_TOKEN=
WA_VERIFY_TOKEN=

# Google Maps scraper proxy (optional)
PROXY_URL=
```

## Project Structure

```
cs-assistant/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx              # Dashboard charts
│   │   │   ├── crm/                  # CRM leads
│   │   │   ├── pipeline/             # Kanban board
│   │   │   ├── scraper/              # Scraper UI
│   │   │   └── broadcast/            # WA broadcast
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/   # NextAuth
│   │   │   ├── leads/                # Leads CRUD
│   │   │   ├── pipeline/             # Pipeline + move
│   │   │   ├── scrape/               # Scraper trigger
│   │   │   ├── messages/             # WA messages
│   │   │   ├── broadcast/            # Broadcast
│   │   │   ├── wa-webhook/           # WA webhook
│   │   │   └── reports/              # Dashboard data
│   │   ├── login/
│   │   └── register/
│   ├── components/
│   │   ├── layout/                   # Sidebar, Header
│   │   ├── crm/                      # Lead form
│   │   └── ui/                       # shadcn/ui
│   └── lib/
│       ├── prisma.ts
│       ├── auth.ts
│       ├── wa-client.ts
│       └── scrapers/
├── .env.example
└── package.json
```

## License

MIT