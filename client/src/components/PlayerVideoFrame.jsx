// src/components/PlayerVideoFrame.jsx
//
// Renders one player's video. Handles the "Active Turn Spotlight" requirement:
// - active speaker: scale 1.05, pulsing neon border in their color
// - inactive speaker: dimmed (lower opacity + desaturation), border fades to mute-gray
// The border color transition is what reads as the "spotlight sliding" between
// players when `active` flips — motion animates the shared layoutId-less props
// (borderColor/boxShadow/scale) so it cross-fades smoothly rather than snapping.

import { motion } from "motion/react";
import { useEffect, useRef } from "react";

const ACCENTS = {
  player1: { border: "#33f7d1", ring: "shadow-neon-p1", label: "AFFIRMATIVE" },
  player2: { border: "#ff3fa4", ring: "shadow-neon-p2", label: "NEGATIVE" },
};

export default function PlayerVideoFrame({ role, name, stream, isActive, isMuted, isSelf }) {
  const videoRef = useRef(null);
  const accent = ACCENTS[role];

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden bg-surface aspect-video"
      animate={{
        scale: isActive ? 1.05 : 1,
        opacity: isActive ? 1 : 0.55,
        filter: isActive ? "saturate(1.1) brightness(1.05)" : "saturate(0.4) brightness(0.7)",
        borderColor: isActive ? accent.border : "#3a3f4c",
        boxShadow: isActive
          ? `0 0 14px ${accent.border}, 0 0 40px ${accent.border}66`
          : "0 0 0px transparent",
      }}
      transition={{ type: "spring", stiffness: 160, damping: 20 }}
      style={{ borderWidth: 3, borderStyle: "solid" }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf} // never echo your own local audio back to yourself
        className="w-full h-full object-cover"
      />

      {/* pulsing ring overlay only while active — separate layer so the base
          border transition above stays smooth and this can loop independently */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ border: `2px solid ${accent.border}` }}
          animate={{ opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* nameplate / role chip */}
      <div className="absolute top-3 left-3 flex items-center gap-2 font-display text-xs tracking-wider">
        <span
          className="px-2 py-1 rounded-md bg-black/60 backdrop-blur"
          style={{ color: accent.border }}
        >
          {accent.label}
        </span>
        <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur text-white/80">{name}</span>
      </div>

      {/* mic status */}
      <div className="absolute bottom-3 right-3">
        <motion.div
          key={isMuted ? "muted" : "live"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`px-2 py-1 rounded-md text-xs font-mono backdrop-blur ${
            isMuted ? "bg-black/60 text-mute" : "bg-black/60"
          }`}
          style={!isMuted ? { color: accent.border } : {}}
        >
          {isMuted ? "● MUTED" : "● LIVE MIC"}
        </motion.div>
      </div>
    </motion.div>
  );
}
