// src/components/LobbyScreen.jsx
import { motion } from "motion/react";

export default function LobbyScreen({ state, myRole, onReady, name, setName, joined }) {
  const playerEntries = Object.entries(state?.players || {});
  const me = playerEntries.find(([, p]) => p.role === myRole);
  const isReady = me?.[1]?.ready;
  const opponentEntry = playerEntries.find(([, p]) => p.role !== myRole);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 text-center px-4">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-3xl md:text-4xl font-bold tracking-wide"
      >
        DEBATE <span className="text-p1">ARENA</span>
      </motion.h1>
      <p className="text-white/50 max-w-md text-sm">
        1v1 informal video debate. Random topic, 2 min prep, 4 rounds of 60s, judged live by AI.
      </p>

      {!joined ? (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
            className="bg-surface border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-p1"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="text-xs font-mono text-white/40">
            You are <span className="text-p1 font-bold">{myRole?.toUpperCase()}</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onReady(!isReady)}
            className="font-display font-bold px-8 py-3 rounded-xl border-2"
            style={{
              borderColor: isReady ? "#33f7d1" : "#3a3f4c",
              color: isReady ? "#33f7d1" : "#e7e9ee",
              boxShadow: isReady ? "0 0 20px rgba(51,247,209,0.5)" : "none",
            }}
          >
            {isReady ? "READY ✓" : "MARK READY"}
          </motion.button>

          <div className="text-xs text-white/40 font-mono">
            {opponentEntry
              ? opponentEntry[1].ready
                ? "Opponent is ready."
                : "Waiting for opponent to ready up…"
              : "Waiting for an opponent to join…"}
          </div>
        </div>
      )}
    </div>
  );
}
