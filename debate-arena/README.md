# Debate Arena — 1v1 Video Debate with AI Judge

A server-authoritative debate app: prep timer → 4 alternating 60s rounds →
live speech-to-text → AI-scored verdict, wrapped in a neon "cyber arena" UI
animated with Motion.

## Architecture at a glance

```
debate-arena/
├── server/                      Node + Express + Socket.io (signaling + game state)
│   ├── index.js                 Socket event router, WebRTC relay, room lifecycle
│   ├── RoomStateMachine.js      LOBBY → PREP → ROUND(x4) → JUDGING → COMPLETE
│   ├── topics.js                Curated topic pool + random picker
│   └── aiJudge.js               Transcript → LLM → {scores, summary} verdict
│
└── client/                      React + Tailwind + Motion (motion/react)
    └── src/
        ├── hooks/
        │   ├── useRoomState.js      Subscribes to server-broadcast state (single source of truth)
        │   ├── useWebRTC.js         getUserMedia + RTCPeerConnection + signaling glue
        │   └── useSpeechToText.js   Web Speech API, active only while you're the speaker
        ├── components/
        │   ├── LobbyScreen.jsx      Name entry + ready-up
        │   ├── VideoArena.jsx       Split-screen container
        │   ├── PlayerVideoFrame.jsx Neon border, spotlight scale/dim, mic status
        │   ├── PrepTimer.jsx        2-min countdown, ambient shimmer
        │   ├── RoundHUD.jsx         Round counter + turn timer
        │   └── ScorecardOverlay.jsx Counter spin-up + winner impact animation
        └── App.jsx               Phase-driven composition root
```

## Why server-authoritative

The `RoomStateMachine` (server) is the **only** clock in the system. It ticks
every second and broadcasts `room:state` to everyone in the room (both
players + spectators). Clients never run their own countdowns — they just
render `secondsRemaining`. This guarantees:
- Player 1 and Player 2 always agree on whose turn it is.
- A late-joining spectator sees the exact same state instantly.
- Muting is enforced twice: the server tags the active role, and
  `useWebRTC` actually disables the inactive player's outgoing audio track
  (not just a UI dim) — so "muted" is real, not decorative.

## Request → code mapping

| Spec requirement | Where |
|---|---|
| Curated topic list, random pick, auto-assign sides | `server/topics.js`, `RoomStateMachine._startPrep()` |
| 2-minute Prep Time, both streams visible | `RoomStateMachine.PREP_SECONDS`, `PrepTimer.jsx` |
| 4 rounds × 60s, strict turn alternation | `RoomStateMachine._startRounds/_advanceRound`, `ROUND_SECONDS` |
| Mic/video gating per active speaker | `useWebRTC` (`localStream track.enabled`), `App.jsx` `muted` prop |
| Spectator join via link | `?spectate=1` query param, `webrtc:spectator-request` fan-out in `useWebRTC.js` |
| WebRTC P2P + Socket.io signaling | `server/index.js` (`webrtc:offer/answer/ice-candidate` relay), `useWebRTC.js` |
| Live STT during active turn | `useSpeechToText.js`, gated by `active` prop |
| Transcript → LLM at round 4 end | `RoomStateMachine._startJudging()` → `aiJudge.judgeDebate()` |
| Scores per player (Logic/Rhetoric/Wit) out of 100 | `aiJudge.js` prompt schema |
| Witty summary of winner/loser | `verdict.summary`, rendered in `ScorecardOverlay.jsx` |
| Neon split-screen | `VideoArena.jsx` + `PlayerVideoFrame.jsx` |
| Prep pulse/shimmer | `PrepTimer.jsx` background sweep animation |
| Active speaker spotlight (scale 1.05, pulsing border, dim opponent) | `PlayerVideoFrame.jsx` `motion.div animate={...}` |
| Border slide/cross-fade on turn switch | Shared `borderColor`/`boxShadow` spring transition in `PlayerVideoFrame.jsx` (re-animates automatically when `isActive` flips) |
| Dark scorecard overlay, counter spin-up, winner scale impact | `ScorecardOverlay.jsx` (`SpinUpNumber` + delayed `scale` keyframes) |

## Running it

```bash
# Terminal 1 — signaling server
cd server
npm install
ANTHROPIC_API_KEY=sk-ant-... npm run dev   # key optional — falls back to a mock judge

# Terminal 2 — client
cd client
cp .env.example .env
npm install
npm run dev
```

Open two browser windows (or two devices) at `http://localhost:5173/?room=test1`
to play both sides. Open a third tab at `http://localhost:5173/?room=test1&spectate=1`
to watch as a spectator.

## Notes & production hardening

- **TURN server**: the STUN-only ICE config in `useWebRTC.js` works on most
  open networks; add a TURN server for reliability behind symmetric NATs.
- **Spectator scale**: the current fan-out is a mesh (each player streams
  directly to each spectator). Fine for a handful of viewers; swap in an SFU
  (e.g. mediasoup, LiveKit) if you expect a real audience.
- **STT portability**: Web Speech API is Chrome/Edge-first. For Safari/Firefox
  reliability, replace `useSpeechToText.js`'s recognizer with a hosted API
  (Deepgram/AssemblyAI) fed by a `MediaRecorder` chunk stream over the socket.
- **Room cleanup**: `RoomStateMachine` instances are garbage collected once a
  room has zero players and zero spectators (see `disconnect` handler).
