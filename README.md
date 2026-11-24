# RouteSaathi

RouteSaathi is a mobile-first delivery operations copilot for Indian riders. It includes seeded logistics data, validated action APIs, grounded policy retrieval, a judge-ready Hinglish interruption demo, and a dispatcher queue.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Demo walkthrough

1. Select **Start 3-minute voice scenario** on the dashboard.
2. Watch the interrupted Hinglish exchange and action timeline.
3. The demo performs a real landmark update through `/api/orders`.
4. Use the manual action buttons to test rescheduling, handoff, or escalation.
5. Open **Review** to approve or decline the seeded dispatcher case.

The demo provider works without Gemini credentials. Gemini Lite text processing is enabled through `/api/gemini` when credentials are configured.

## Gemini Live setup

Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` from Google AI Studio. Never expose the key in browser code.

```env
GEMINI_API_KEY=your_server_side_key
GEMINI_LIVE_MODEL=gemini-2.5-flash-native-audio-preview
```

For production, proxy browser microphone audio through a secure server WebSocket, forward it to the official Gemini Live API, and stream transcripts and synthesized audio back to the browser. Declare the action functions from `src/lib/actions.ts` as Gemini tools and require explicit confirmation for sensitive updates.

## Architecture

- `src/app/api/orders/route.ts` - validated orders and action endpoint
- `src/lib/actions.ts` - action handlers and high-value safety guards
- `src/lib/data.ts` - six realistic seeded orders and policy documents
- `src/app/page.tsx` - dashboard, active order, demo, transcript, and dispatcher UI

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm test
```
