// src/lib/socket.js
import { io } from "socket.io-client";

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || "http://localhost:4000";

// One socket per browser tab, reused across the whole app.
export const socket = io(SIGNALING_URL, { autoConnect: true });
