// src/hooks/useRoomState.js
//
// Thin subscription to the server-authoritative room state. The client never
// computes timers or phase transitions itself — it only renders what the
// server broadcasts, so every viewer (players + spectators) stays in lockstep.

import { useEffect, useState, useCallback } from "react";
import { socket } from "../lib/socket";

export function useRoomState(roomId, { name, asSpectator } = {}) {
  const [state, setState] = useState(null);
  const [myRole, setMyRole] = useState(null); // 'player1' | 'player2' | 'spectator'
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    if (!roomId) return;

    function onConnect() {
      setConnected(true);
      socket.emit("room:join", { roomId, name, asSpectator }, ({ role, state: initial }) => {
        setMyRole(role);
        setState(initial);
      });
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onStateUpdate(next) {
      setState(next);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:state", onStateUpdate);

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state", onStateUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const setReady = useCallback(
    (ready) => socket.emit("room:ready", { roomId, ready }),
    [roomId]
  );

  return { state, myRole, connected, setReady };
}
