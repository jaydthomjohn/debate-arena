// server/index.js
//
// Signaling server: bridges WebRTC offer/answer/ICE between exactly 2 players
// per room, relays to spectators as receive-only viewers, and drives the
// authoritative RoomStateMachine (prep timer, round timer, turn-taking, judging).

const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const cors = require("cors");
const { RoomStateMachine } = require("./RoomStateMachine");
const { judgeDebate } = require("./aiJudge");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

/** roomId -> RoomStateMachine */
const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    const machine = new RoomStateMachine(
      roomId,
      (state) => io.to(roomId).emit("room:state", state),
      (transcript, topic) => judgeDebate(transcript, topic)
    );
    rooms.set(roomId, machine);
  }
  return rooms.get(roomId);
}

io.on("connection", (socket) => {
  let joinedRoomId = null;

  // ---- room join --------------------------------------------------------

  socket.on("room:join", ({ roomId, name, asSpectator }, ack) => {
    const room = getOrCreateRoom(roomId);
    joinedRoomId = roomId;
    socket.join(roomId);

    const playerCount = Object.keys(room.players).length;
    if (asSpectator || playerCount >= 2) {
      room.addSpectator(socket.id);
      ack?.({ role: "spectator", state: room.getPublicState() });
    } else {
      const role = room.addPlayer(socket.id, name);
      ack?.({ role, state: room.getPublicState() });
      // Tell existing peer a new player arrived so they can initiate WebRTC offer.
      socket.to(roomId).emit("webrtc:peer-joined", { socketId: socket.id, role });
    }
  });

  socket.on("room:ready", ({ roomId, ready }) => {
    rooms.get(roomId)?.setReady(socket.id, ready);
  });

  // ---- WebRTC signaling relay (pure pass-through, no media touches server) --

  socket.on("webrtc:offer", ({ roomId, targetId, sdp }) => {
    io.to(targetId).emit("webrtc:offer", { fromId: socket.id, sdp });
  });

  socket.on("webrtc:answer", ({ targetId, sdp }) => {
    io.to(targetId).emit("webrtc:answer", { fromId: socket.id, sdp });
  });

  socket.on("webrtc:ice-candidate", ({ targetId, candidate }) => {
    io.to(targetId).emit("webrtc:ice-candidate", { fromId: socket.id, candidate });
  });

  // Spectators request the current broadcasters' stream so players can
  // fan out an additional peer connection to them (mesh; fine at small scale).
  socket.on("webrtc:spectator-request", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    Object.keys(room.players).forEach((playerSocketId) => {
      io.to(playerSocketId).emit("webrtc:spectator-joined", { spectatorId: socket.id });
    });
  });

  // ---- live speech-to-text transcript ingestion --------------------------

  socket.on("debate:transcript-chunk", ({ roomId, text }) => {
    rooms.get(roomId)?.appendTranscript(socket.id, text);
  });

  // ---- disconnect ---------------------------------------------------------

  socket.on("disconnect", () => {
    if (!joinedRoomId) return;
    const room = rooms.get(joinedRoomId);
    room?.removeParticipant(socket.id);
    socket.to(joinedRoomId).emit("webrtc:peer-left", { socketId: socket.id });
    if (room && Object.keys(room.players).length === 0 && room.spectators.size === 0) {
      rooms.delete(joinedRoomId);
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Signaling server listening on :${PORT}`));
