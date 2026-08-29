// src/hooks/useWebRTC.js
//
// Peer-to-peer video/audio via WebRTC. Socket.io is used ONLY to exchange
// SDP offers/answers and ICE candidates ("signaling") — once connected,
// media flows directly between browsers.
//
// Topology: players hold a direct peer connection to each other. Each
// spectator gets its own receive-only peer connection fanned out from BOTH
// players (simple mesh — fine for a small-audience informal arena; swap for
// an SFU if you need to scale spectators past a few dozen).

import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "../lib/socket";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  // Add a TURN server here for reliability behind restrictive NATs:
  // { urls: "turn:your.turn.server:3478", username: "...", credential: "..." },
];

export function useWebRTC({ roomId, myRole, muted }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerRef = useRef(null); // player <-> player connection
  const spectatorPeersRef = useRef(new Map()); // spectatorId -> RTCPeerConnection (players only)
  const spectatorStreamRef = useRef(null); // spectators receive here

  // 1. Acquire local camera/mic
  useEffect(() => {
    if (myRole === "spectator") return;
    let stream;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        stream = s;
        setLocalStream(s);
      })
      .catch((err) => console.error("getUserMedia failed", err));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [myRole]);

  // 2. Reflect the server-driven mute state onto the actual mic/video tracks.
  //    This is what enforces "strictly turn-by-turn" — the inactive player's
  //    outgoing tracks are hard-disabled, not just visually dimmed.
  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => (t.enabled = !muted));
    // Video stays on for both (spec: "muted but visible"); only audio gates.
  }, [localStream, muted]);

  const createPeerConnection = useCallback((targetId, stream, onTrack) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    stream?.getTracks().forEach((track) => pc.addTrack(track, stream));
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("webrtc:ice-candidate", { targetId, candidate: e.candidate });
    };
    pc.ontrack = (e) => onTrack(e.streams[0]);
    return pc;
  }, []);

  // 3. Player <-> Player negotiation
  useEffect(() => {
    if (myRole === "spectator" || !localStream) return;

    async function handlePeerJoined({ socketId }) {
      const pc = createPeerConnection(socketId, localStream, setRemoteStream);
      peerRef.current = pc;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc:offer", { roomId, targetId: socketId, sdp: offer });
    }

    async function handleOffer({ fromId, sdp }) {
      const pc = createPeerConnection(fromId, localStream, setRemoteStream);
      peerRef.current = pc;
      await pc.setRemoteDescription(sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc:answer", { targetId: fromId, sdp: answer });
    }

    async function handleAnswer({ sdp }) {
      await peerRef.current?.setRemoteDescription(sdp);
    }

    async function handleIce({ candidate }) {
      try {
        await peerRef.current?.addIceCandidate(candidate);
      } catch (err) {
        console.warn("ICE candidate add failed", err);
      }
    }

    // Spectator fan-out: create a receive-add track-only connection per viewer.
    async function handleSpectatorJoined({ spectatorId }) {
      const pc = createPeerConnection(spectatorId, localStream, () => {});
      spectatorPeersRef.current.set(spectatorId, pc);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc:offer", { roomId, targetId: spectatorId, sdp: offer });
    }

    socket.on("webrtc:peer-joined", handlePeerJoined);
    socket.on("webrtc:offer", handleOffer);
    socket.on("webrtc:answer", handleAnswer);
    socket.on("webrtc:ice-candidate", handleIce);
    socket.on("webrtc:spectator-joined", handleSpectatorJoined);

    return () => {
      socket.off("webrtc:peer-joined", handlePeerJoined);
      socket.off("webrtc:offer", handleOffer);
      socket.off("webrtc:answer", handleAnswer);
      socket.off("webrtc:ice-candidate", handleIce);
      socket.off("webrtc:spectator-joined", handleSpectatorJoined);
      peerRef.current?.close();
      spectatorPeersRef.current.forEach((pc) => pc.close());
    };
  }, [myRole, roomId, localStream, createPeerConnection]);

  // 4. Spectator-side: request streams, receive two offers (one per player)
  useEffect(() => {
    if (myRole !== "spectator") return;
    const remotes = new Map(); // fromId -> MediaStream, exposed via spectatorStreamRef

    async function handleOffer({ fromId, sdp }) {
      const pc = createPeerConnection(fromId, null, (stream) => {
        remotes.set(fromId, stream);
        spectatorStreamRef.current = Object.fromEntries(remotes);
        setRemoteStream({ ...spectatorStreamRef.current });
      });
      await pc.setRemoteDescription(sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc:answer", { targetId: fromId, sdp: answer });
      spectatorPeersRef.current.set(fromId, pc);
    }

    async function handleIce({ candidate, fromId }) {
      try {
        await spectatorPeersRef.current.get(fromId)?.addIceCandidate(candidate);
      } catch (err) {
        console.warn("ICE candidate add failed", err);
      }
    }

    socket.emit("webrtc:spectator-request", { roomId });
    socket.on("webrtc:offer", handleOffer);
    socket.on("webrtc:ice-candidate", handleIce);

    return () => {
      socket.off("webrtc:offer", handleOffer);
      socket.off("webrtc:ice-candidate", handleIce);
      spectatorPeersRef.current.forEach((pc) => pc.close());
    };
  }, [myRole, roomId, createPeerConnection]);

  return { localStream, remoteStream };
}
