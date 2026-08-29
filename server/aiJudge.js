// server/aiJudge.js
//
// Sends the full round-by-round transcript to an LLM and gets back a strict
// JSON verdict: per-player scores on 3 axes (0-100) + a punchy summary.
// Swap ANTHROPIC_API_KEY / model as needed. Uses fetch (Node 18+).

const JUDGE_SYSTEM_PROMPT = `You are "THE ARBITER", the snarky AI judge of an informal 1v1 video debate arena.
You will receive a debate topic and a transcript of a 4-round debate (Player 1 = Affirmative, Player 2 = Negative).
Score EACH player 0-100 on exactly three axes: logic, rhetoric, wit.
Then declare an overall winner and write a short (2-4 sentence), witty, informal, punchy summary roasting/celebrating
the players based on what they actually said. Be specific — reference real moments from the transcript, not generic praise.
Respond with ONLY valid JSON, no markdown fences, no preamble, matching this exact shape:
{
  "winner": "player1" | "player2" | "draw",
  "player1": { "logic": number, "rhetoric": number, "wit": number, "total": number },
  "player2": { "logic": number, "rhetoric": number, "wit": number, "total": number },
  "summary": string
}
"total" is the average of the three axes, rounded to the nearest integer.`;

function formatTranscript(transcript, topic) {
  const lines = transcript.map((t) => `[Round ${t.round}] ${t.speaker.toUpperCase()}: ${t.text}`);
  return `TOPIC: ${topic}\n\nTRANSCRIPT:\n${lines.join("\n") || "(no speech was captured)"}`;
}

async function judgeDebate(transcript, topic) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Deterministic offline fallback so the app is demoable without a key.
    return mockVerdict(transcript);
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: JUDGE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: formatTranscript(transcript, topic) }],
    }),
  });

  if (!res.ok) throw new Error(`Judge API error: ${res.status}`);
  const data = await res.json();
  const text = data.content.map((b) => b.text || "").join("");
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

function mockVerdict(transcript) {
  const wordsFor = (role) =>
    transcript.filter((t) => t.speaker === role).reduce((n, t) => n + t.text.split(/\s+/).length, 0);
  const w1 = wordsFor("player1");
  const w2 = wordsFor("player2");
  const score = (words) => {
    const base = 55 + Math.min(30, Math.round(words / 5));
    return {
      logic: base,
      rhetoric: Math.max(40, base - 5),
      wit: Math.max(35, base - 10),
      total: base - 5,
    };
  };
  const p1 = score(w1);
  const p2 = score(w2);
  return {
    winner: p1.total === p2.total ? "draw" : p1.total > p2.total ? "player1" : "player2",
    player1: p1,
    player2: p2,
    summary:
      "The judge's API key is missing so you're getting the backup ref — but on word count and hustle alone, this one had a clear tempo winner. Plug in ANTHROPIC_API_KEY for a real roast.",
  };
}

module.exports = { judgeDebate };
