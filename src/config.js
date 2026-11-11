(function (root) {
  const config = {
    DAILY: 30,
    QUOTAS: {
      listening: 7,
      speaking: 5,
      vocab: 5,
      grammar: 4,
      reading: 4,
      order: 3,
      logic: 2,
    },
    REVIEW_LIMIT: 10,
    FALLBACK: ["vocab", "reading", "grammar"],
    MAX_SKILL_RUN: 2,
    MAX_THEME_RUN: 2,
    TIMEZONE: "Europe/Luxembourg",
    STORAGE_KEY: "jiaqi-french-daily-v1",
    INTERVALS: [1, 3, 7, 14, 30],
    SKILLS: [
      "listening",
      "speaking",
      "vocab",
      "grammar",
      "reading",
      "order",
      "logic",
    ],
    TYPES: [
      "choice",
      "multi",
      "num",
      "fill",
      "order",
      "match",
      "error",
      "code",
    ],
    THEMES: ["time", "classroom", "people", "languages", "school"],
    UNITS: [1],
  };
  if (typeof module !== "undefined" && module.exports) module.exports = config;
  else root.FrenchConfig = config;
})(globalThis);
