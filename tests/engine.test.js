const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { loadQuestions, ROOT } = require("../scripts/questions");
const { validate } = require("../scripts/validate");
const E = require("../src/engine");
const C = require("../src/config");
const bank = loadQuestions();
const expected = {
  listening: 0,
  speaking: 0,
  vocab: 17,
  grammar: 4,
  reading: 4,
  order: 3,
  logic: 2,
};
function assertRuns(ids) {
  const rows = ids.map((id) => bank.find((q) => q.id === id));
  for (let i = 2; i < rows.length; i++) {
    assert.ok(
      !(
        rows[i].skill === rows[i - 1].skill &&
        rows[i].skill === rows[i - 2].skill
      ),
    );
    assert.ok(
      !(
        rows[i].theme === rows[i - 1].theme &&
        rows[i].theme === rows[i - 2].theme
      ),
    );
  }
}
test("all 85 legacy IDs, prompts and correct answers survive migration", () => {
  const html = fs.readFileSync(
    `${ROOT}/legacy/jiaqi_daily_french_30.html`,
    "utf8",
  );
  const legacy = JSON.parse(html.match(/const DB=(.*?);\n/)[1]).questions;
  assert.equal(bank.length, 85);
  assert.deepEqual(
    bank.map((q) => q.id).sort(),
    legacy.map((q) => q.id).sort(),
  );
  for (const q of legacy) {
    const migrated = bank.find((row) => row.id === q.id);
    assert.deepEqual(migrated.answer ?? migrated.answers[0], q.answer);
    assert.equal(migrated.prompt, q.prompt.replace("QuelleS", "Quelles"));
    assert.equal(migrated.theme, C.THEMES[q.stage - 1]);
    if (q.type === "num")
      assert.equal(migrated.skill, "logic");
  }
  assert.deepEqual(validate(bank), []);
});
test("365 seeded days: exact quotas, uniqueness, stable IDs and sequence limits", () => {
  const days = new Set();
  for (let i = 0; i < 365; i++) {
    const day = new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10);
    const plan = E.createPlan(bank, {}, day);
    assert.equal(new Set(plan.ids).size, C.DAILY);
    assert.deepEqual(plan.quotas, expected);
    assert.deepEqual(E.createPlan(bank, {}, day), plan);
    assertRuns(plan.ids);
    days.add(plan.ids.join(","));
  }
  assert.ok(days.size > 350);
});
test("due reviews occupy skill slots, respect upper limit, and older reviews win", () => {
  const cards = {};
  for (const skill of ["vocab", "reading", "grammar", "order", "logic"]) {
    for (const q of bank.filter((q) => q.skill === skill).slice(0, 3))
      cards[q.id] = { attempts: 2, wrong: 1, nextDue: "2026-11-10" };
  }
  const oldest = bank.find((q) => q.skill === "vocab");
  cards[oldest.id].nextDue = "2026-01-01";
  const result = E.createPlan(bank, cards, "2026-11-11");
  assert.equal(result.reviewIds.length, C.REVIEW_LIMIT);
  assert.ok(result.reviewIds.includes(oldest.id));
  assert.equal(
    result.ids.filter((id) => E.isDue(cards[id], "2026-11-11")).length,
    C.REVIEW_LIMIT,
  );
  assert.deepEqual(result.quotas, expected);
  assertRuns(result.ids);
});
test("fallback moves missing vocabulary slots to reading, then grammar", () => {
  const reduced = bank.filter((q) => q.skill !== "vocab");
  const result = E.createPlan(reduced, {}, "2026-11-11");
  assert.deepEqual(result.quotas, {
    listening: 0,
    speaking: 0,
    vocab: 0,
    grammar: 10,
    reading: 15,
    order: 3,
    logic: 2,
  });
});
test("impossible review supply produces explicit error rather than silently exceeding limit", () => {
  const cards = Object.fromEntries(
    bank.map((q) => [q.id, { attempts: 1, nextDue: "2026-01-01" }]),
  );
  assert.throws(() => E.createPlan(bank, cards, "2026-11-11"), /可用题不足/);
});
test("order accepts multiple sequences, whitespace, punctuation and case; rejects missing/duplicate words", () => {
  const q = bank.find((q) => q.id === "LL2-U1-H043");
  for (const words of q.answers) {
    const indexes = words.map((w) => q.words.indexOf(w));
    assert.equal(E.check(q, indexes), true);
  }
  const changed = { ...q, words: q.words.map((w) => `  ${w.toUpperCase()}  `) };
  assert.equal(
    E.check(
      changed,
      q.answers[0].map((w) => q.words.indexOf(w)),
    ),
    true,
  );
  assert.equal(E.check(q, Array(q.words.length).fill(0)), false);
  assert.equal(E.check(q, [0]), false);
  assert.equal(
    E.check(
      q,
      q.words.map((_, i) => i + 1),
    ),
    false,
  );
});
test("validator rejects schema, enum, Chinese, choice and duplicate-word defects", () => {
  const choice = bank.find((q) => q.type === "choice");
  const order = bank.find((q) => q.type === "order");
  const mutations = [
    [choice, choice],
    [{ ...choice, id: "" }],
    [{ ...choice, level: 4 }],
    [{ ...choice, unit: 2 }],
    [{ ...choice, skill: "math" }],
    [{ ...choice, theme: "unknown" }],
    [{ ...choice, type: "unknown" }],
    [{ ...choice, prompt: "中文" }],
    [{ ...choice, explanation_zh: "" }],
    [{ ...choice, answer: "absent" }],
    [{ ...order, answer: order.answer.slice(1) }],
    [{ ...order, words: [...order.words, order.words[0]] }],
    [{ ...choice, aliases: ["中文"] }],
    [{ ...choice, scene: undefined }],
    [{ ...choice, choices: [] }],
  ];
  for (const rows of mutations)
    assert.ok(validate(rows).length, JSON.stringify(rows));
  const missing = { ...choice };
  delete missing.audio_text;
  assert.ok(validate([missing]).length);
});
test("configuration rejects mismatched daily total", () => {
  assert.throws(() => E.quotas(bank, { ...C, DAILY: 31 }), /配比总数/);
});
