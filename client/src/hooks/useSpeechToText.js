// src/hooks/useSpeechToText.js
//
// Wraps the browser Web Speech API (SpeechRecognition). Runs ONLY while
// `active` is true (i.e. this client is the current speaker), streaming
// finalized phrases up to the server so RoomStateMachine can build the
// transcript for the end-of-match AI judge.
//
// Swap the recognizer internals for a hosted STT (Deepgram, AssemblyAI, etc.)
// if you need cross-browser reliability — the emitted event shape stays the same.

import { useEffect, useRef } from "react";
import { socket } from "../lib/socket";

const SpeechRecognitionImpl =
  typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

export function useSpeechToText({ roomId, active }) {
  const recognizerRef = useRef(null);

  useEffect(() => {
    if (!SpeechRecognitionImpl) {
      if (active) console.warn("Web Speech API unavailable in this browser; transcript will be empty.");
      return;
    }
    if (!active) return;

    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) socket.emit("debate:transcript-chunk", { roomId, text });
        }
      }
    };

    recognition.onerror = (e) => console.warn("STT error", e.error);
    // Auto-restart: some browsers stop recognition after silence.
    recognition.onend = () => {
      if (active) {
        try {
          recognition.start();
        } catch {
          /* already started */
        }
      }
    };

    recognizerRef.current = recognition;
    try {
      recognition.start();
    } catch {
      /* ignore double-start */
    }

    return () => {
      recognition.onend = null; // prevent auto-restart on teardown
      recognition.stop();
      recognizerRef.current = null;
    };
  }, [active, roomId]);
}
