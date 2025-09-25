# Better-Timer app
The simplest, most intuitive timer app on the market for your mac
Never lost track time of time while you work. 
Helps you time your beaks effectifely with the pomodoro technique

## Features
- Easily set a simple timer (presets)
- Switch between simple and pomodoro mode
- Get motivational quotes and inspiring backgrounds
- Switch between discrete and normal view mode

# Tech stack
Uses Electron + Next.js + shadcn/ui. Electron gives you a macOS .app with a frameless, transparent, always-on-top window; Next.js drives the UI; shadcn for components.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Run for web (Next.js):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Run as a macOS app (Electron + Next.js):

```bash
npm run dev:electron
```

This starts Next.js on port 3000 and launches Electron pointing to it with a transparent, frameless window.

### Production run locally (Electron):

```bash
npm run build
npm run start:electron
```

This serves the built Next.js app and opens it in Electron.

### Build a signed installer (.dmg):

```bash
npm run dist
```

Notes:
- First builds Next.js, then packages the Electron app for macOS using electron-builder.
- For Apple notarization, set `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` env vars if you plan to distribute outside your machine.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
