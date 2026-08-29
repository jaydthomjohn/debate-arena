// src/components/ScorecardOverlay.jsx
//
// Dark-mode reveal for the AI Judge's verdict. Sequence:
// 1. overlay fades/blurs in
// 2. both score cards rise in, numbers spin-up (0 -> final value) via motion's
//    animate() on a plain number, rendered through a spring
// 3. after the spin-up settles, the winner's card gets a dramatic scale/glow
//    impact while the loser's card recedes.

import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect, useState } from "react";

function SpinUpNumber({ value, delay = 0 }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const unsub = rounded.on("change", (v) => setDisplay(v));
    const controls = animate(mv, value, { duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] });
    return () => {
      controls.stop();
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span>{display}</span>;
}

function ScoreRow({ label, value, delay }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-white/10">
      <span className="text-white/60 uppercase tracking-wide text-xs">{label}</span>
      <span className="font-display font-bold text-lg tabular-nums">
        <SpinUpNumber value={value} delay={delay} />
      </span>
    </div>
  );
}

function PlayerCard({ role, name, scores, isWinner, revealDelay }) {
  const accent = role === "player1" ? "#33f7d1" : "#ff3fa4";
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isWinner ? [1, 1.08, 1.03] : 1,
      }}
      transition={{
        opacity: { delay: revealDelay, duration: 0.4 },
        y: { delay: revealDelay, duration: 0.4 },
        scale: isWinner
          ? { delay: revealDelay + 1.3, duration: 0.6, times: [0, 0.6, 1], ease: "easeOut" }
          : {},
      }}
      className="relative rounded-2xl bg-surface p-5 w-full max-w-sm"
      style={{
        border: `2px solid ${accent}`,
        boxShadow: isWinner ? `0 0 30px ${accent}, 0 0 70px ${accent}55` : `0 0 8px ${accent}55`,
      }}
    >
      {isWinner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: -8 }}
          transition={{ delay: revealDelay + 1.5, type: "spring", stiffness: 300 }}
          className="absolute -top-4 -right-3 bg-gold text-black font-display font-bold text-xs px-3 py-1 rounded-full shadow-neon-gold"
        >
          WINNER
        </motion.div>
      )}

      <div className="font-display text-sm mb-1" style={{ color: accent }}>
        {role === "player1" ? "AFFIRMATIVE" : "NEGATIVE"}
      </div>
      <div className="font-mono text-white/70 text-xs mb-4">{name}</div>

      <ScoreRow label="Logic & Arguments" value={scores.logic} delay={revealDelay + 0.1} />
      <ScoreRow label="Rhetoric & Delivery" value={scores.rhetoric} delay={revealDelay + 0.25} />
      <ScoreRow label="Wit & Entertainment" value={scores.wit} delay={revealDelay + 0.4} />

      <div className="flex items-center justify-between pt-3 mt-1">
        <span className="text-xs text-white/50 uppercase tracking-wide">Overall</span>
        <span className="font-display font-extrabold text-3xl tabular-nums" style={{ color: accent }}>
          <SpinUpNumber value={scores.total} delay={revealDelay + 0.55} />
        </span>
      </div>
    </motion.div>
  );
}

export default function ScorecardOverlay({ verdict, players, isJudging }) {
  const player1SocketId = Object.keys(players).find((id) => players[id].role === "player1");
  const player2SocketId = Object.keys(players).find((id) => players[id].role === "player2");
  const p1Name = player1SocketId ? players[player1SocketId].name : "Player 1";
  const p2Name = player2SocketId ? players[player2SocketId].name : "Player 2";

  return (
    <motion.div
      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
      animate={{ opacity: 1, backdropFilter: "blur(6px)" }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 px-4"
    >
      {isJudging || !verdict ? (
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="font-display text-xl tracking-[0.3em] text-gold"
        >
          THE ARBITER IS DELIBERATING…
        </motion.div>
      ) : (
        <>
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-2xl md:text-3xl font-bold text-white mb-2 tracking-wide"
          >
            VERDICT IS IN
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="max-w-2xl text-center text-sm md:text-base text-white/75 mb-8 italic"
          >
            &ldquo;{verdict.summary}&rdquo;
          </motion.p>

          <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
            <PlayerCard
              role="player1"
              name={p1Name}
              scores={verdict.player1}
              isWinner={verdict.winner === "player1"}
              revealDelay={0.2}
            />
            <PlayerCard
              role="player2"
              name={p2Name}
              scores={verdict.player2}
              isWinner={verdict.winner === "player2"}
              revealDelay={0.5}
            />
          </div>
        </>
      )}
    </motion.div>
  );
}
