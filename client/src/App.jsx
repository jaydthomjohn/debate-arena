// src/App.jsx
import { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRoomState } from "./hooks/useRoomState";
import { useWebRTC } from "./hooks/useWebRTC";
import { useSpeechToText } from "./hooks/useSpeechToText";
import { PHASES } from "./state/phases";

import LobbyScreen from "./components/LobbyScreen";
import VideoArena from "./components/VideoArena";
import PrepTimer from "./components/PrepTimer";
import RoundHUD from "./components/RoundHUD";
import ScorecardOverlay from "./components/ScorecardOverlay";

function getRoomIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("room") || "default-room";
}

export default function App() {
  const roomId = useMemo(getRoomIdFromUrl, []);
  const spectatorParam = new URLSearchParams(window.location.search).get("spectate") === "1";

  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);

  const { state, myRole, setReady, playAgain } = useRoomState(joined ? roomId : null, {
    name,
    asSpectator: spectatorParam,
  });

  const { localStream, remoteStream } = useWebRTC({
    roomId,
    myRole,
    muted: myRole && state ? state.activeRole !== myRole && state.phase === PHASES.ROUND : true,
  });

  useSpeechToText({
    roomId,
    active: myRole && state ? state.phase === PHASES.ROUND && state.activeRole === myRole : false,
  });

  // Brief banner when the server flags that a player just left mid-match —
  // the room itself has already snapped back to LOBBY by the time this fires.
  const [leftBanner, setLeftBanner] = useState(false);
  useEffect(() => {
    if (state?.opponentLeft) {
      setLeftBanner(true);
      const t = setTimeout(() => setLeftBanner(false), 5000);
      return () => clearTimeout(t);
    }
  }, [state?.opponentLeft]);

  if (!joined) {
    return (
      <div className="min-h-screen max-w-3xl mx-auto">
        <LobbyScreen
          state={state}
          myRole={myRole}
          onReady={setReady}
          name={name}
          setName={setName}
          joined={false}
        />
        <div className="flex justify-center">
          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={!name.trim() && !spectatorParam}
            onClick={() => setJoined(true)}
            className="mt-2 font-display text-sm px-6 py-2 rounded-lg bg-p1 text-black font-bold disabled:opacity-30"
          >
            {spectatorParam ? "WATCH ROOM" : "ENTER ARENA"}
          </motion.button>
        </div>
      </div>
    );
  }

  if (!state) {
    return <div className="min-h-screen flex items-center justify-center text-white/40">Connecting…</div>;
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display font-bold tracking-wide">
          DEBATE <span className="text-p1">ARENA</span>
        </h1>
        <span className="text-xs font-mono text-white/40">
          room: {roomId} · {state.spectatorCount} watching
        </span>
      </header>

      <AnimatePresence>
        {leftBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center text-sm font-mono py-2 px-4 rounded-lg bg-p2/10 border border-p2 text-p2"
          >
            Your opponent left — the match ended. Ready up again whenever you're set.
          </motion.div>
        )}
      </AnimatePresence>

      {state.phase === PHASES.LOBBY && (
        <LobbyScreen state={state} myRole={myRole} onReady={setReady} name={name} setName={setName} joined />
      )}

      {state.phase !== PHASES.LOBBY && (
        <VideoArena state={state} myRole={myRole} localStream={localStream} remoteStream={remoteStream} />
      )}

      <AnimatePresence mode="wait">
        {state.phase === PHASES.PREP && (
          <motion.div key="prep" exit={{ opacity: 0 }}>
            <PrepTimer secondsRemaining={state.secondsRemaining} topic={state.topic} />
          </motion.div>
        )}
        {state.phase === PHASES.ROUND && (
          <motion.div key="round" exit={{ opacity: 0 }}>
            <RoundHUD
              round={state.round}
              totalRounds={state.totalRounds}
              secondsRemaining={state.secondsRemaining}
              activeRole={state.activeRole}
              topic={state.topic}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(state.phase === PHASES.JUDGING || state.phase === PHASES.COMPLETE) && (
          <ScorecardOverlay
            verdict={state.verdict}
            players={state.players}
            isJudging={state.phase === PHASES.JUDGING}
            myRole={myRole}
            onPlayAgain={playAgain}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
