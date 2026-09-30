# Connect — where is everyone?

A persistent virtual office on a live 3D globe. Instead of joining a meeting, you go to the person: see the Earth, spot your team, travel there by car or flight, walk into their office and step into the ring around their desk to talk.

Built as an MVP for up to 50 people.

## Run it

Requirements: Node 22.5+ (uses the built-in `node:sqlite`), npm 10.

```bash
npm install
npm run dev
```

Open http://localhost:5173. The API and realtime server run on port 3001 (the client proxies `/api` and connects sockets directly in dev).

Production build (served by the same Node server):

```bash
npm run build
npm start
```

Then open http://localhost:3001.

Other scripts: `npm test` (shared geo/space/travel tests), `npm run typecheck`.

## The flow

1. Landing → **Enter the world**.
2. Onboarding: say whether you work from home or from an office. Working from home: pick your home 50 km area (search a place, use your approximate location, or double-click the globe), create your avatar, and you get your own desk at home. Working from an office: pick one of the admin offices, create your avatar and claim a desk there; there is no home area. Offices are set up at admin level, not searched for: the list lives in `shared/src/offices.ts` (Copenhagen, Santiago, Hyderabad, San Francisco Bay Area) and is seeded into the database on server start. Only office people can claim office desks; everyone can travel to any office.
3. The globe: everyone is shown as glowing markers at the centre of their 50 km unit. Drag to spin, scroll to zoom through four heights (Orbit → Region → Area → Unit). Click a person to **peek** at their area; you stay put.
4. **Travel here** (T) from the peek panel: choose **Car** (same landmass, ≤1,500 km) or **Flight**. Everyone sees you moving. You land on the arrival pad of the office.
5. In a space: walk with **WASD / arrows** or click the floor. Step inside the ring around someone's desk and you're together — no join button. Walk away to leave.
6. **Desk mode** (Profile → Desk → Change desk, in your home office): claim, move, release or add desks.

Keys: `T` travel, `H` home (home workers), `O` offices menu for quick travel, `M` mute, `P` people, `Esc` up one layer, `Enter` walk into your own office from the Unit view.

## Voice

Proximity voice uses a WebRTC mesh per ring (STUN only, works on localhost/LAN). Microphone permission is requested the first time you enter a space. Without a mic (denied or unavailable) the app degrades to a listen-only / mock mode: the conversation state, rings and waveforms still work, and bots "talk" in mock mode.

Screen sharing rides the same mesh: while you are in a ring, "Share screen" in the conversation bar sends your screen to everyone in it, and it stops when you walk away. Viewers get a panel they can expand or hide.

## Sign-in

People sign in with Google. Create two env files (both are gitignored):

- `server/.env` with `GOOGLE_CLIENT_ID=<your OAuth web client id>` and `SESSION_SECRET=<long random string>`
- `client/.env` with `VITE_GOOGLE_CLIENT_ID=<the same client id>`

The OAuth client needs `http://localhost:5173` and `http://localhost` as authorized JavaScript origins, plus your production URL. Restart `npm run dev` after changing either file.

## Hosting (Vercel front end, local backend over ngrok)

1. Start the backend in production mode: `npm start`. It listens on port 3001 and reads `server/.env`.
2. Expose it: `ngrok http --url=<your-static-domain>.ngrok-free.app 3001`.
3. Deploy the front end from the repo root with the Vercel CLI (`npx vercel --prod`). `vercel.json` builds `client/` and serves `client/dist`.
4. Set these Vercel environment variables, then redeploy:
   - `VITE_API_URL=https://<your-static-domain>.ngrok-free.app`
   - `VITE_GOOGLE_CLIENT_ID=<your OAuth web client id>`
5. Add the Vercel URL to the OAuth client's authorized JavaScript origins.
6. Put the Vercel URL in `CORS_ORIGINS` in `server/.env` (comma separated for several) and restart the backend.

## Testing with two people on one machine

Open a second browser profile or an incognito window and sign in with another Google account. In dev mode you can also append `?profile=b` to the URL: the landing page then shows a "Dev sign-in as b" button that creates a local test user without Google.

## Privacy

Only a unit id (`band:cell`, a 50 km cell) is ever stored. Place search and geolocation are resolved to a unit on the device and thrown away. The globe shows no city names, roads or borders. Your home never moves unless you change it in Profile.

## Layout

```
shared/   types, config, protocol, geo (50 km grid, land, great circles), space templates, travel rules, mock cast
server/   Express + Socket.IO + SQLite (node:sqlite); world state, presence, zones, travel scheduler, desks, bot simulator
client/   Vite + React; three.js globe, 2D floors, movement/pathfinding, WebRTC voice, UI kit
design-ref/  the design artboards this UI was built from
```

Mock users are off by default. To seed about ten bots (they sit at desks, talk when you join them and hold a huddle), start the server with `ORBIT_BOTS=1`. Starting without the flag removes any previously seeded bots and the offices only they lived in.

Data lives in `server/data/orbit.db` (delete it to reset the world).
