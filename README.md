# KCA Retirement Calculator

Interactive retirement drawdown projection app comparing **CH (Zurich)** vs **NL (Netherlands)** tax scenarios.

## Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Recharts

## Features
- Full interactive inputs (sliders + numeric fields)
- Side-by-side CH vs NL yearly projections
- Tax logic for:
  - Dutch Box 1
  - Zurich wealth tax with municipal multiplier
  - NL Box 3 deemed/actual return modes
- Ending balance trend chart (CH vs NL)
- Summary metrics:
  - Total lifetime taxes
  - Year money runs out
  - Average annual tax
  - Break-even year
- Color-coded risk rows
- Print-friendly table mode

## Run locally
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

## Build
```bash
npm run build
npm start
```

## Deploy on Vercel
This project is Vercel-ready.

1. Import this GitHub repo into Vercel
2. Framework preset: Next.js (auto-detected)
3. Deploy

`vercel.json` is included for explicit framework detection.

## Notes
This is a production-style planning tool and not tax/legal advice. Final planning assumptions and tax treatment should be reviewed with a licensed tax advisor.
