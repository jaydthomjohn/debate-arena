// server/topics.js
// Curated pool: medium-controversy, universally accessible, high-engagement.
// Each topic is pre-phrased as a resolution so Affirmative/Negative sides are unambiguous.

const TOPICS = [
  "Social media does more harm than good for youth.",
  "Remote work is strictly better than in-office work.",
  "AI will completely replace creative jobs within 10 years.",
  "College degrees are no longer worth the cost.",
  "Cities should ban private cars from downtown cores.",
  "Reality TV is a net positive for society.",
  "Streaming has ruined the music industry.",
  "Video games are a legitimate substitute for team sports.",
  "The four-day work week should be the global standard.",
  "Cancel culture does more good than harm.",
  "Billionaires should not be allowed to exist.",
  "Zoos should be phased out entirely.",
  "Tipping culture should be abolished.",
  "Standardized testing should be eliminated from college admissions.",
  "Space exploration budgets should be redirected to Earth problems.",
  "Cryptocurrency is a net negative for the global economy.",
  "Fast fashion should be regulated out of existence.",
  "Nuclear energy is the best path to a green future.",
  "Homework should be abolished in K-12 schools.",
  "Influencer culture is bad for democracy.",
];

function pickRandomTopic() {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)];
}

module.exports = { TOPICS, pickRandomTopic };
