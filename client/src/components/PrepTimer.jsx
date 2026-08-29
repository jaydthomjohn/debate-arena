// src/components/PrepTimer.jsx
//
// Prominent animated countdown for the 2-minute Prep Time phase. A slow
// ambient shimmer builds tension in the background while the number itself
// gets a sharper per-second pulse.

import { motion, AnimatePresence } from "motion/react";

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function PrepTimer({ secondsRemaining, topic }) {
  return (
    <div className="relative flex flex-col items-center justify-center py-10 text-center overflow-hidden rounded-2xl">
      {/* ambient shimmer sweep */}
      <motion.div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "linear-gradient(120deg, transparent 20%, rgba(255,207,77,0.15) 50%, transparent 80%)",
          backgroundSize: "200% 200%",
        }}
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <span className="relative font-display text-xs tracking-[0.3em] text-gold/80 mb-2">
        PREP TIME REMAINING
      </span>

      <AnimatePresence mode="popLayout">
        <motion.div
          key={secondsRemaining}
          initial={{ scale: 1.15, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="relative font-display text-6xl md:text-7xl font-bold tabular-nums text-gold"
          style={{ textShadow: "0 0 24px rgba(255,207,77,0.6)" }}
        >
          {formatClock(secondsRemaining)}
        </motion.div>
      </AnimatePresence>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative mt-4 max-w-xl text-sm text-white/70 px-6"
      >
        <span className="text-white font-semibold">Topic:</span> {topic}
      </motion.p>
    </div>
  );
}
