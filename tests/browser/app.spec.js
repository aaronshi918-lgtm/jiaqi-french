const { test, expect } = require("@playwright/test");
const { loadQuestions } = require("../../scripts/questions");
const C = require("../../src/config");
const bank = loadQuestions();
const key = C.STORAGE_KEY;
const today = "2026-11-11";
const quota = {
  listening: 0,
  speaking: 0,
  vocab: 17,
  grammar: 4,
  reading: 4,
  order: 3,
  logic: 2,
};
async function boot(page) {
  await page.clock.install({ time: new Date("2026-11-11T12:00:00Z") });
  await page.goto("/");
}
async function current(page) {
  return page.evaluate(() => queue[pos]);
}
async function answer(page, q) {
  if (["choice", "error"].includes(q.type))
    await page
      .locator("[name=single]")
      .nth(q.choices.indexOf(q.answer))
      .check();
  else if (q.type === "multi")
    for (const a of q.answer)
      await page.locator("[name=multiple]").nth(q.choices.indexOf(a)).check();
  else if (q.type === "match")
    for (const [i, [a]] of q.pairs.entries())
      await page
        .locator(`[data-match="${i}"]`)
        .selectOption(
          String(q.pairs.findIndex((pair) => pair[1] === q.answer[a])),
        );
  else if (q.type === "order") {
    const used = new Set();
    for (const a of q.answer ?? q.answers[0]) {
      const i = q.words.findIndex((word, i) => word === a && !used.has(i));
      used.add(i);
      await page.locator(`[data-word="${i}"]`).click();
    }
  } else await page.locator("#textAnswer").fill(String(q.answer));
}
test("daily quotas and full session run offline, with reload/resume and history", async ({
  page,
}) => {
  // This scenario submits all 30 questions; keep the full UI assertions on slow runners.
  test.setTimeout(90_000);
  const errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) => {
    if (!route.request().url().startsWith("http://127.0.0.1:4173/")) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await boot(page);
  const ids = await page.evaluate(() => getPlan().map((q) => q.id));
  expect(new Set(ids).size).toBe(30);
  expect(await page.evaluate(() => store.daily[localDay()].quotas)).toEqual(
    quota,
  );
  await expect(page.locator("#homeStatus")).toContainText("词汇 → 阅读 → 语法");
  await page.locator("#startBtn").click();
  for (let i = 0; i < 30; i++) {
    const q = await current(page);
    expect(q.id).toBe(ids[i]);
    await answer(page, q);
    await page.locator("#submitBtn").click();
    await expect(page.locator("#feedbackArea")).toContainText("答对了");
    await page.locator("#nextBtn").click();
    if (i === 0) {
      await page.reload();
      expect(await page.evaluate(() => getPlan().map((q) => q.id))).toEqual(
        ids,
      );
      await expect(page.locator("#dateInfo")).toContainText("1 / 30");
      await page.locator("#startBtn").click();
    }
  }
  await expect(page.locator("#report")).toContainText("30 / 30");
  await page.reload();
  await page.locator("#historyBtn").click();
  await expect(page.locator("#report")).toContainText("30/30");
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test("six token clicks preserve scroll and question DOM, return to original pool, persist draft", async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() => {
    const d = store.daily[localDay()];
    const q = BANK.find((q) => q.id === "LL2-U1-H008");
    d.ids = [q.id, ...d.ids.filter((id) => id !== q.id)].slice(
      0,
      FrenchConfig.DAILY,
    );
    persist();
  });
  await page.locator("#startBtn").click();
  await page.locator("#wordChoice").scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => {
    window.questionNode = document.querySelector(".qtitle");
    window.inputNode = document.querySelector("#inputArea");
    return scrollY;
  });
  for (let i = 0; i < 6; i++) {
    const button = page.locator(`[data-word="${i}"]`);
    expect(
      await button.evaluate((b) => b.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44);
    await button.click();
    expect(await page.evaluate(() => scrollY)).toBe(y);
  }
  expect(
    await page.evaluate(
      () =>
        questionNode === document.querySelector(".qtitle") &&
        inputNode === document.querySelector("#inputArea"),
    ),
  ).toBe(true);
  await page.locator('[data-unpick="2"]').click();
  expect(await page.evaluate(() => scrollY)).toBe(y);
  await expect(page.locator('[data-word="2"]')).toBeEnabled();
  expect(
    await page
      .locator("#wordChoice button")
      .evaluateAll((bs) => bs.map((b) => Number(b.dataset.word))),
  ).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  await page.reload();
  await page.locator("#startBtn").click();
  await expect(page.locator("[data-unpick]")).toHaveCount(5);
  await page.locator("#clearBtn").click();
  await expect(page.locator("[data-unpick]")).toHaveCount(0);
  await expect(page.locator("#wordChoice button:disabled")).toHaveCount(0);
});
test("legacy cards, started 40-question day and responses remain readable", async ({
  page,
}) => {
  const ids = bank.slice(0, 40).map((q) => q.id);
  const old = {
    version: 1,
    cards: { [ids[0]]: { attempts: 4, wrong: 2, nextDue: "2026-12-01" } },
    daily: {
      [today]: {
        ids,
        responses: { [ids[0]]: { correct: true, answer: bank[0].answer } },
        completed: false,
      },
    },
    log: [{ id: ids[0], date: today, correct: true }],
  };
  await page.addInitScript(
    ({ key, old }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(old));
    },
    { key, old },
  );
  await boot(page);
  await expect(page.locator("#dateInfo")).toContainText("1 / 40");
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).cards,
      key,
    ),
  ).toEqual(old.cards);
  await page.locator("#startBtn").click();
  expect((await current(page)).id).toBe(ids[1]);
  await page.reload();
  expect(
    await page.evaluate(
      (key) =>
        JSON.parse(localStorage.getItem(key)).daily["2026-11-11"].responses,
      key,
    ),
  ).toEqual(old.daily[today].responses);
});
test("Luxembourg day boundary and persisted old plans", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-11T23:30:00Z") });
  await page.goto("/");
  await expect(page.locator("#dateInfo")).toContainText("2026-11-12");
  const first = await page.evaluate(() => store.daily[localDay()].ids);
  await page.reload();
  expect(await page.evaluate(() => store.daily[localDay()].ids)).toEqual(first);
});
test("review cap and priority survive plan persistence", async ({ page }) => {
  const cards = Object.fromEntries(
    bank
      .filter((q) => ["reading", "grammar"].includes(q.skill))
      .slice(0, 15)
      .map((q) => [q.id, { attempts: 2, wrong: 1, nextDue: "2026-11-01" }]),
  );
  await page.addInitScript(
    ({ key, cards }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({ version: 1, cards, daily: {}, log: [] }),
        );
    },
    { key, cards },
  );
  await boot(page);
  const result = await page.evaluate(() => store.daily[localDay()]);
  expect(result.ids).toHaveLength(30);
  expect(result.reviewIds.length).toBeLessThanOrEqual(C.REVIEW_LIMIT);
  expect(result.reviewIds.length).toBeGreaterThan(0);
  for (const id of result.reviewIds) expect(cards[id]).toBeTruthy();
  await page.reload();
  expect(await page.evaluate(() => store.daily[localDay()].reviewIds)).toEqual(
    result.reviewIds,
  );
});
test("an active day crossing midnight retains its original response record", async ({
  page,
}) => {
  await boot(page);
  await page.locator("#startBtn").click();
  const q = await current(page);
  await answer(page, q);
  await page.clock.setFixedTime(new Date("2026-11-11T23:30:00Z"));
  await page.locator("#submitBtn").click();
  await expect(page.locator("#feedbackArea")).toContainText("答对了");
  expect(
    await page.evaluate(
      ({ key, id }) =>
        JSON.parse(localStorage.getItem(key)).daily["2026-11-11"].responses[id]
          .correct,
      { key, id: q.id },
    ),
  ).toBe(true);
  await page.locator("#homeBack").click();
  await expect(page.locator("#dateInfo")).toContainText("2026-11-12");
});
