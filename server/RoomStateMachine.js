// server/RoomStateMachine.js
//
// Pure(ish) state machine for one debate room. Server-authoritative: the client
// never decides timing, it only renders whatever this machine broadcasts.
// One instance per room. Call `.tick()` every second from the room's interval.

const { pickRandomTopic } = require("./topics");

const PHASES = Object.freeze({
  LOBBY: "LOBBY", // waiting for both players to mark ready
  PREP: "PREP", // 120s prep, both muted, topic revealed
  ROUND: "ROUND", // active debate, 4x 60s turns, alternating speaker
  JUDGING: "JUDGING", // transcript sent to AI judge, awaiting verdict
  COMPLETE: "COMPLETE", // scorecard revealed
});

const PREP_SECONDS = 120;
const ROUND_SECONDS = 60;
const TOTAL_ROUNDS = 4;

class RoomStateMachine {
  /**
   * @param {string} roomId
   * @param {(state: object) => void} onStateChange - broadcast callback (io.to(roomId).emit)
   * @param {(transcript: {round:number, speaker:string, text:string}[]) => Promise<object>} judgeFn
   */
  constructor(roomId, onStateChange, judgeFn) {
    this.roomId = roomId;
    this.onStateChange = onStateChange;
    this.judgeFn = judgeFn;

    this.phase = PHASES.LOBBY;
    this.players = {}; // socketId -> { role: 'player1'|'player2', ready: bool, name }
    this.spectators = new Set();

    this.topic = null;
    this.secondsRemaining = 0;
    this.round = 0; // 1..4 once started
    this.activeRole = null; // 'player1' | 'player2'
    this.transcript = []; // { round, speaker, text }
    this.verdict = null;

    this._interval = null;
  }

  // ---- player management -------------------------------------------------

  addPlayer(socketId, name) {
    // If a fresh join lands on a room that's still showing a finished match
    // (e.g. someone reopens the link), snap the match data back to a clean
    // slate so nobody gets stuck staring at the old scorecard/round.
    if (this.phase === PHASES.JUDGING || this.phase === PHASES.COMPLETE) {
      this._resetMatchData();
    }
    const takenRoles = new Set(Object.values(this.players).map((p) => p.role));
    const role = takenRoles.has("player1") ? "player2" : "player1";
    this.players[socketId] = { role, ready: false, name: name || role };
    this._emit();
    return role;
  }

  /** Lets a connected player manually restart without anyone refreshing. */
  requestPlayAgain(socketId) {
    if (!this.players[socketId]) return;
    if (this.phase !== PHASES.COMPLETE) return;
    this._resetMatchData();
    this._emit();
  }

  _resetMatchData() {
    this._stopTicking();
    this.phase = PHASES.LOBBY;
    this.topic = null;
    this.secondsRemaining = 0;
    this.round = 0;
    this.activeRole = null;
    this.transcript = [];
    this.verdict = null;
    Object.values(this.players).forEach((p) => {
      p.ready = false;
    });
  }

  addSpectator(socketId) {
    this.spectators.add(socketId);
    this._emit();
  }

  removeParticipant(socketId) {
    delete this.players[socketId];
    this.spectators.delete(socketId);
    this._emit();
  }

  setReady(socketId, ready) {
    if (!this.players[socketId]) return;
    this.players[socketId].ready = ready;
    const all = Object.values(this.players);
    if (all.length === 2 && all.every((p) => p.ready) && this.phase === PHASES.LOBBY) {
      this._startPrep();
    } else {
      this._emit();
    }
  }

  // ---- phase transitions ---------------------------------------------

  _startPrep() {
    this.topic = pickRandomTopic();
    this.phase = PHASES.PREP;
    this.secondsRemaining = PREP_SECONDS;
    this._startTicking();
    this._emit();
  }

  _startRounds() {
    this.phase = PHASES.ROUND;
    this.round = 1;
    this.activeRole = "player1"; // Affirmative opens
    this.secondsRemaining = ROUND_SECONDS;
    this._emit();
  }

  _advanceRound() {
    if (this.round >= TOTAL_ROUNDS) {
      this._startJudging();
      return;
    }
    this.round += 1;
    this.activeRole = this.activeRole === "player1" ? "player2" : "player1";
    this.secondsRemaining = ROUND_SECONDS;
    this._emit();
  }

  async _startJudging() {
    this.phase = PHASES.JUDGING;
    this.activeRole = null;
    this._stopTicking();
    this._emit();

    try {
      this.verdict = await this.judgeFn(this.transcript, this.topic);
    } catch (err) {
      this.verdict = {
        error: true,
        summary: "The AI judge choked on its own gavel. Scores unavailable this round.",
      };
    }
    this.phase = PHASES.COMPLETE;
    this._emit();
  }

  // ---- transcript ingestion (called as STT results arrive from client) --

  appendTranscript(socketId, text) {
    const p = this.players[socketId];
    if (!p || this.phase !== PHASES.ROUND) return;
    if (p.role !== this.activeRole) return; // ignore speech from muted player
    this.transcript.push({ round: this.round, speaker: p.role, text });
  }

  // ---- ticking ------------------------------------------------------

  _startTicking() {
    this._stopTicking();
    this._interval = setInterval(() => this.tick(), 1000);
  }

  _stopTicking() {
    if (this._interval) clearInterval(this._interval);
    this._interval = null;
  }

  tick() {
    if (this.phase === PHASES.PREP) {
      this.secondsRemaining -= 1;
      if (this.secondsRemaining <= 0) {
        this._startRounds();
        this._startTicking();
        return;
      }
      this._emit();
    } else if (this.phase === PHASES.ROUND) {
      this.secondsRemaining -= 1;
      if (this.secondsRemaining <= 0) {
        this._advanceRound();
        if (this.phase === PHASES.ROUND) this._startTicking();
        return;
      }
      this._emit();
    } else {
      this._stopTicking();
    }
  }

  // ---- serialization --------------------------------------------------

  _emit() {
    this.onStateChange(this.getPublicState());
  }

  getPublicState() {
    return {
      roomId: this.roomId,
      phase: this.phase,
      topic: this.topic,
      secondsRemaining: this.secondsRemaining,
      round: this.round,
      totalRounds: TOTAL_ROUNDS,
      activeRole: this.activeRole,
      players: Object.fromEntries(
        Object.entries(this.players).map(([id, p]) => [id, { role: p.role, ready: p.ready, name: p.name }])
      ),
      spectatorCount: this.spectators.size,
      verdict: this.verdict,
    };
  }
}

module.exports = { RoomStateMachine, PHASES, PREP_SECONDS, ROUND_SECONDS, TOTAL_ROUNDS };
