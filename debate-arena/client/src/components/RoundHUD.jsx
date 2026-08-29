// src/components/RoundHUD.jsx
import { motion, AnimatePresence } from "motion/react";

const ACCENT = { player1: "#33f7d1", player2: "#ff3fa4" };

export default function RoundHUD({ round, totalRounds, secondsRemaining, activeRole, topic }) {
  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="font-display text-xs tracking-[0.3em] text-white/50">
        ROUND {round} / {totalRounds}
      </div>

      <AnimatePresence mode="popLayout">
        <motion.div
          key={secondsRemaining}
          initial={{ y: -6, opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="font-display text-5xl font-bold tabular-nums"
          style={{ color: ACCENT[activeRole], textShadow: `0 0 20px ${ACCENT[activeRole]}88` }}
        >
          0:{String(secondsRemaining).padStart(2, "0")}
        </motion.div>
      </AnimatePresence>

      <motion.div
        key={activeRole}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="font-mono text-xs px-3 py-1 rounded-full border"
        style={{ borderColor: ACCENT[activeRole], color: ACCENT[activeRole] }}
      >
        {activeRole === "player1" ? "AFFIRMATIVE SPEAKING" : "NEGATIVE SPEAKING"}
      </motion.div>

      <p className="text-xs text-white/40 max-w-md text-center mt-1">{topic}</p>
    </div>
  );
}
