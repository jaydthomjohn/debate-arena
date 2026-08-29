// src/components/VideoArena.jsx
import { motion } from "motion/react";
import PlayerVideoFrame from "./PlayerVideoFrame";
import { PHASES } from "../state/phases";

export default function VideoArena({ state, myRole, localStream, remoteStream }) {
  const { phase, activeRole, players } = state;

  const player1SocketId = Object.keys(players).find((id) => players[id].role === "player1");
  const player2SocketId = Object.keys(players).find((id) => players[id].role === "player2");
  const p1Name = player1SocketId ? players[player1SocketId].name : "Player 1";
  const p2Name = player2SocketId ? players[player2SocketId].name : "Player 2";

  // Map local/remote streams to whichever role they represent, for both
  // player clients and spectators (who receive a dict keyed by socketId).
  const streamFor = (role) => {
    if (myRole === "spectator") {
      const socketId = role === "player1" ? player1SocketId : player2SocketId;
      return remoteStream?.[socketId];
    }
    return myRole === role ? localStream : remoteStream;
  };

  const duringPrepOrRound = phase === PHASES.PREP || phase === PHASES.ROUND;

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 gap-4 relative"
      animate={
        phase === PHASES.PREP
          ? { boxShadow: ["0 0 0px rgba(255,207,77,0)", "0 0 60px rgba(255,207,77,0.15)", "0 0 0px rgba(255,207,77,0)"] }
          : {}
      }
      transition={phase === PHASES.PREP ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      <PlayerVideoFrame
        role="player1"
        name={p1Name}
        stream={streamFor("player1")}
        isActive={phase === PHASES.PREP ? true : activeRole === "player1"}
        isMuted={phase === PHASES.ROUND ? activeRole !== "player1" : false}
        isSelf={myRole === "player1"}
      />
      <PlayerVideoFrame
        role="player2"
        name={p2Name}
        stream={streamFor("player2")}
        isActive={phase === PHASES.PREP ? true : activeRole === "player2"}
        isMuted={phase === PHASES.ROUND ? activeRole !== "player2" : false}
        isSelf={myRole === "player2"}
      />

      {!duringPrepOrRound && phase !== PHASES.LOBBY && (
        <div className="absolute inset-0 bg-void/60 rounded-2xl pointer-events-none" />
      )}
    </motion.div>
  );
}
