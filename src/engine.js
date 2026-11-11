(function (root) {
  const C =
    typeof module !== "undefined" && module.exports
      ? require("./config.js")
      : root.FrenchConfig;
  const normalize = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’‘]/g, "'")
      .toLowerCase()
      .replace(/[\p{P}\s]/gu, "");
  function check(q, answer) {
    if (q.type === "order") {
      if (
        !Array.isArray(answer) ||
        answer.length !== q.words.length ||
        new Set(answer).size !== answer.length ||
        answer.some((i) => !Number.isInteger(i) || i < 0 || i >= q.words.length)
      )
        return false;
      const text = normalize(answer.map((i) => q.words[i]).join(" "));
      return (q.answers ?? [q.answer]).some(
        (words) => normalize(words.join(" ")) === text,
      );
    }
    if (q.type === "multi")
      return (
        Array.isArray(answer) &&
        new Set(answer).size === answer.length &&
        answer.length === q.answer.length &&
        q.answer.every((value) => answer.includes(value))
      );
    if (q.type === "match")
      return (
        !!answer &&
        Object.entries(q.answer).every(
          ([key, value]) => normalize(answer[key]) === normalize(value),
        )
      );
    return [q.answer, ...(q.aliases ?? [])].some(
      (value) => normalize(value) === normalize(answer),
    );
  }
  function hash(value) {
    let h = 2166136261;
    for (const ch of value) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }
  const isDue = (card, day) =>
    card?.attempts > 0 &&
    typeof card.nextDue === "string" &&
    card.nextDue <= day;
  function quotas(bank, config = C) {
    if (
      Object.values(config.QUOTAS).reduce((a, b) => a + b, 0) !== config.DAILY
    )
      throw Error("技能配比总数必须等于每日题量");
    const capacity = Object.fromEntries(
      config.SKILLS.map((skill) => [
        skill,
        bank.filter((q) => q.skill === skill).length,
      ]),
    );
    const target = Object.fromEntries(
      config.SKILLS.map((skill) => [
        skill,
        Math.min(config.QUOTAS[skill], capacity[skill]),
      ]),
    );
    let missing =
      config.DAILY - Object.values(target).reduce((a, b) => a + b, 0);
    for (const skill of config.FALLBACK) {
      const count = Math.min(missing, capacity[skill] - target[skill]);
      target[skill] += count;
      missing -= count;
    }
    if (missing) throw Error(`题库不足，尚缺 ${missing} 道不重复的题目`);
    return target;
  }
  // Search by (skill, theme) groups. Failed states are memoized; question IDs remain seeded.
  function arrange(questions, config = C) {
    const groups = [];
    for (const q of questions) {
      let group = groups.find(
        (g) => g.skill === q.skill && g.theme === q.theme,
      );
      if (!group) {
        group = { skill: q.skill, theme: q.theme, items: [] };
        groups.push(group);
      }
      group.items.push(q);
    }
    const counts = groups.map((g) => g.items.length),
      failed = new Set();
    function visit(path, skill, skillRun, theme, themeRun) {
      if (path.length === questions.length) return path;
      const key = `${counts}|${skill}:${skillRun}|${theme}:${themeRun}`;
      if (failed.has(key)) return null;
      const skillCounts = {},
        themeCounts = {};
      groups.forEach((g, i) => {
        skillCounts[g.skill] = (skillCounts[g.skill] || 0) + counts[i];
        themeCounts[g.theme] = (themeCounts[g.theme] || 0) + counts[i];
      });
      const left = questions.length - path.length;
      for (const [value, count] of Object.entries(skillCounts)) {
        if (
          count >
          config.MAX_SKILL_RUN * (left - count + 1) -
            (value === skill ? skillRun : 0)
        )
          return null;
      }
      for (const [value, count] of Object.entries(themeCounts)) {
        if (
          count >
          config.MAX_THEME_RUN * (left - count + 1) -
            (value === theme ? themeRun : 0)
        )
          return null;
      }
      const options = groups
        .map((g, i) => i)
        .filter(
          (i) =>
            counts[i] &&
            !(groups[i].skill === skill && skillRun >= config.MAX_SKILL_RUN) &&
            !(groups[i].theme === theme && themeRun >= config.MAX_THEME_RUN),
        );
      options.sort(
        (a, b) =>
          skillCounts[groups[b].skill] +
            themeCounts[groups[b].theme] -
            (skillCounts[groups[a].skill] + themeCounts[groups[a].theme]) ||
          a - b,
      );
      for (const i of options) {
        const g = groups[i],
          q = g.items[g.items.length - counts[i]];
        counts[i]--;
        const result = visit(
          [...path, q],
          g.skill,
          g.skill === skill ? skillRun + 1 : 1,
          g.theme,
          g.theme === theme ? themeRun + 1 : 1,
        );
        counts[i]++;
        if (result) return result;
      }
      failed.add(key);
      return null;
    }
    const result = visit([], "", 0, "", 0);
    if (!result)
      throw Error("当前题库无法同时满足技能与主题连续限制，请调整题库或配比");
    return result;
  }
  function createPlan(bank, cards, day, config = C) {
    const target = quotas(bank, config);
    const seeded = bank
      .slice()
      .sort(
        (a, b) =>
          hash(day + "~" + a.id) - hash(day + "~" + b.id) ||
          a.id.localeCompare(b.id),
      );
    const due = seeded
      .filter((q) => isDue(cards[q.id], day))
      .sort(
        (a, b) =>
          cards[a.id].nextDue.localeCompare(cards[b.id].nextDue) ||
          (cards[b.id].wrong || 0) - (cards[a.id].wrong || 0),
      );
    const selected = [],
      reviewIds = [],
      counts = Object.fromEntries(config.SKILLS.map((skill) => [skill, 0]));
    for (const q of due) {
      if (reviewIds.length === config.REVIEW_LIMIT) break;
      if (counts[q.skill] < target[q.skill]) {
        selected.push(q);
        reviewIds.push(q.id);
        counts[q.skill]++;
      }
    }
    const available = seeded
      .filter((q) => !isDue(cards[q.id], day))
      .sort(
        (a, b) =>
          Number(!!cards[a.id]?.attempts) - Number(!!cards[b.id]?.attempts),
      );
    const used = new Set(reviewIds);
    function add(skill, limit) {
      for (const q of available) {
        if (counts[skill] >= limit) break;
        if (q.skill === skill && !used.has(q.id)) {
          selected.push(q);
          used.add(q.id);
          counts[skill]++;
        }
      }
    }
    for (const skill of config.SKILLS) add(skill, target[skill]);
    for (const skill of config.FALLBACK)
      add(skill, counts[skill] + config.DAILY - selected.length);
    if (selected.length !== config.DAILY)
      throw Error(
        "可用题不足：每日复习上限已达到，请补充新题后继续；既有学习记录已保留",
      );
    const adjusted = config.SKILLS.some(
      (skill) => counts[skill] !== config.QUOTAS[skill],
    );
    return {
      ids: arrange(selected, config).map((q) => q.id),
      reviewIds,
      quotas: counts,
      notice: adjusted
        ? "部分技能题不足，已按词汇 → 阅读 → 语法补足。阶段 1 暂无听力和口语题。"
        : "",
    };
  }
  const api = { normalize, check, hash, isDue, quotas, arrange, createPlan };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FrenchEngine = api;
})(globalThis);
