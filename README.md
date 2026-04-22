# Brick Blitz (Vibe Coding)

Brick Blitz is a browser-based brick breaker game built with Next.js and React.
The game UI is in Urdu and includes keyboard, mouse, and touch controls.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![UI Language](https://img.shields.io/badge/UI-Urdu-22C55E)

## Play Online

🎮 **Live Game URL:** [https://studio--brick-blitz-g7dx2.us-central1.hosted.app/](https://studio--brick-blitz-g7dx2.us-central1.hosted.app/)

## Game Preview

> Screenshots captured from the live hosted URL.

![Brick Blitz - Home Screen](docs/screenshots/brick-blitz-home.png)
![Brick Blitz - Gameplay Area](docs/screenshots/brick-blitz-canvas.png)

## Features

- 🌐 Urdu UI and overlays
- 🧱 Multiple levels
- 🧮 Lives, score, and level tracking
- ⌨️ Keyboard controls (left/right, space, P)
- 🖱️ Mouse movement support for paddle control
- 📱 Touch/click launch support
- 🔊 Arcade sound effects for:
  - Game start
  - Wall hit
  - Paddle hit
  - Brick break
  - Ball miss (life lost)
  - Game over

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS

## Run Locally

```bash
npm install
npm run dev
```

Open: `http://localhost:9002`

## Build and Checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Controls

- `←` / `→`: Move paddle
- `Mouse move`: Move paddle
- `Space` or `Click/Tap`: Launch ball
- `P`: Pause / Resume

## Sound Effects

Sound files are stored in `public/sounds`.
License/source details are documented in `public/sounds/LICENSE.txt`.

## Deployment

✅ Currently hosted via Firebase App Hosting at the live URL above.

This app can also be deployed on platforms like Vercel or Netlify.
