# IPAC Admin Panel

A fast, modern admin panel built with TanStack Start for the IPAC operations system.

## Why TanStack Start?

The original admin panel was built with Expo Web (React Native Web), which had severe performance issues:
- **LCP of 30-80 seconds** due to massive bundle size
- No SSR/SSG - everything client-side rendered
- Font loading blocked rendering
- Cascading auth checks caused waterfall requests

This new admin panel offers:
- **Sub-second LCP** with SSR and streaming
- **~100-200KB initial bundle** vs ~2-5MB
- Built-in caching with TanStack Query
- Type-safe routing with TanStack Router

## Setup

1. Copy `.env.example` to `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## Project Structure

```
src/
├── components/     # Reusable UI components
├── hooks/          # React hooks (auth, etc.)
├── lib/            # Utilities (supabase client, cn helper)
└── routes/         # File-based routing
    ├── __root.tsx  # Root layout with auth context
    ├── login.tsx   # Login page
    ├── dashboard.tsx
    ├── orders.tsx
    ├── users.tsx
    ├── inventory.tsx
    ├── reports.tsx
    └── settings.tsx
```

## Features

### Implemented
- [x] Authentication with Supabase
- [x] Dashboard with stats
- [x] Orders list with search/filter
- [x] Users management
- [x] Responsive sidebar

### Coming Soon
- [ ] Order detail page
- [ ] User CRUD operations
- [ ] Inventory management
- [ ] Reports/Analytics
- [ ] Settings page

## Deployment

Build for production:
```bash
npm run build
```

The app can be deployed to Vercel, Netlify, or any Node.js hosting platform.

