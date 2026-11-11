const BANK = DB.questions;
const DAILY_COUNT = FrenchConfig.DAILY;
const STORAGE_KEY = FrenchConfig.STORAGE_KEY;
const TZ = FrenchConfig.TIMEZONE;
const INTERVALS = FrenchConfig.INTERVALS;
const el = (id) => document.getElementById(id);
let store = loadStore(),
  plan = [],
  pos = 0,
  mode = "daily",
  draft = null,
  judged = false,
  queue = [],
  activeDay = null;
function loadStore() {
  try {
    const o = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (o && o.version === 1 && o.cards && o.daily)
      return { ...o, log: Array.isArray(o.log) ? o.log : [] };
  } catch (e) {}
  return {
    version: 1,
    cards: {},
    daily: {},
    log: [],
    created: new Date().toISOString(),
  };
}
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch (e) {
    el("storageWarning").textContent =
      "无法保存学习记录，请先导出备份，并检查浏览器存储权限。";
    return false;
  }
}
function localDay() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return parts.year + "-" + parts.month + "-" + parts.day;
}
function plusDays(d, n) {
  const t = new Date(d + "T12:00:00Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}
function answerText(q) {
  const answer = q.answer ?? q.answers[0];
  if (Array.isArray(answer)) return answer.join(" · ");
  if (q.type === "match")
    return Object.entries(answer)
      .map(([a, b]) => a + " → " + b)
      .join("；");
  return String(answer);
}
function makePlan(d) {
  const previous = store.daily[d];
  if (
    previous?.ids?.length &&
    (previous.ids.length === DAILY_COUNT ||
      Object.keys(previous.responses || {}).length)
  ) {
    return previous.ids
      .map((id) => BANK.find((q) => q.id === id))
      .filter(Boolean);
  }
  const result = FrenchEngine.createPlan(BANK, store.cards, d);
  store.daily[d] = {
    ...result,
    completed: false,
    responses: {},
    drafts: {},
    created: new Date().toISOString(),
  };
  persist();
  return result.ids.map((id) => BANK.find((q) => q.id === id));
}
function getPlan() {
  return makePlan(localDay());
}
function updateHome() {
  try {
    plan = getPlan();
    el("startBtn").disabled = false;
  } catch (e) {
    el("homeStatus").textContent = e.message;
    el("startBtn").disabled = true;
    return;
  }
  const d = localDay();
  const done = store.daily[d]?.responses || {};
  el("dateInfo").textContent =
    d +
    " · 卢森堡时间 · " +
    Object.keys(done).length +
    " / " +
    plan.length +
    " 已完成";
  let due = 0,
    seen = 0;
  for (const q of plan) {
    const s = store.cards[q.id];
    if (s?.attempts) {
      seen++;
      if (store.daily[d]?.reviewIds?.includes(q.id)) due++;
    }
  }
  el("reviewCount").textContent = due;
  el("consolidateCount").textContent = Math.max(0, seen - due);
  el("newCount").textContent = plan.length - seen;
  el("homeStatus").textContent =
    (store.daily[d]?.notice || "") +
    " " +
    (store.daily[d]?.completed
      ? "今天已全部完成，可查看成绩或错题集。"
      : "有进度会自动保存；退出后可继续今日练习。");
  el("startBtn").textContent = store.daily[d]?.completed
    ? "查看今日成绩"
    : Object.keys(done).length
      ? "继续今日练习"
      : "开始今日" + plan.length + "题";
}
function showOnly(name) {
  for (const id of ["home", "play", "report"])
    el(id).classList.toggle("hidden", id !== name);
  window.scrollTo({ top: 0, behavior: "instant" });
}
function startDaily() {
  const d = localDay();
  activeDay = d;
  queue = getPlan();
  mode = "daily";
  pos = queue.findIndex((q) => !store.daily[d].responses[q.id]);
  if (pos < 0) {
    finishDaily();
    return;
  }
  draft = null;
  judged = false;
  showOnly("play");
  renderQuestion();
}
function startWrong() {
  queue = BANK.filter((q) => store.cards[q.id]?.wrong > 0).sort((a, b) =>
    (store.cards[a.id].nextDue || "").localeCompare(
      store.cards[b.id].nextDue || "",
    ),
  );
  mode = "extra";
  pos = 0;
  draft = null;
  judged = false;
  if (!queue.length) {
    report(
      "<h2>错题集目前是空的</h2><p>完成今日练习后，答错的知识点会自动进入错题集。</p>",
    );
    return;
  }
  queue = queue.slice(0, DAILY_COUNT);
  showOnly("play");
  renderQuestion();
}
function sessionDay() {
  return mode === "daily" && activeDay ? activeDay : localDay();
}
function defaultDraft(q) {
  if (q.type === "multi") return [];
  if (q.type === "order") return [];
  if (q.type === "match") return {};
  return "";
}
function pickDraft(q) {
  if (draft === null)
    draft =
      mode === "daily"
        ? (store.daily[sessionDay()]?.drafts?.[q.id] ?? defaultDraft(q))
        : defaultDraft(q);
}
function inputWidget(q) {
  pickDraft(q);
  if (["choice", "error"].includes(q.type)) {
    return `<div class="options">${q.choices.map((c, i) => `<label class="option"><input type="radio" name="single" value="${i}" ${draft === c ? "checked" : ""} ${judged ? "disabled" : ""}><span>${ESC(c)}</span></label>`).join("")}</div>`;
  }
  if (q.type === "multi") {
    return `<div class="options">${q.choices.map((c, i) => `<label class="option"><input type="checkbox" name="multiple" value="${i}" ${draft.includes(c) ? "checked" : ""} ${judged ? "disabled" : ""}><span>${ESC(c)}</span></label>`).join("")}</div><p class="smallnote">这是多选题，需要选出全部正确选项。</p>`;
  }
  if (q.type === "match") {
    return `<div>${q.pairs.map(([a, b], i) => `<div class="matchRow"><label><b>${ESC(a)}</b></label><select data-match="${i}" ${judged ? "disabled" : ""}><option value="">请选择对应含义</option>${q.pairs.map((p, j) => `<option value="${j}" ${draft[a] === p[1] ? "selected" : ""}>${ESC(p[1])}</option>`).join("")}</select></div>`).join("")}</div>`;
  }
  if (q.type === "order") {
    return `<p class="smallnote">依次点击下面词块进行排序；点击上面的词块可以直接移除它（不刷新页面）。</p><div class="answerLine" id="orderedLine" aria-label="当前排列的句子"></div><div class="wordTokens" id="wordChoice"></div><div class="actionline"><button class="btn outline smallbtn" id="undoBtn" ${judged ? "disabled" : ""}>撤销最后一词</button><button class="btn outline smallbtn" id="clearBtn" ${judged ? "disabled" : ""}>清空重排</button></div>`;
  }
  const placeholder =
    q.type === "code"
      ? "请输入密码"
      : q.type === "num"
        ? "请输入数字或时间"
        : "请输入法语答案";
  return `<div class="answerbox"><input id="textAnswer" type="text" autocomplete="off" spellcheck="false" placeholder="${placeholder}" ${judged ? "disabled" : ""} value="${ESC(draft)}"><p class="smallnote">填空自动忽略大小写和常见标点；注意法语语法。</p></div>`;
}
function readDraft(q) {
  if (["choice", "error"].includes(q.type)) {
    let x = document.querySelector("input[name=single]:checked");
    return x ? q.choices[Number(x.value)] : "";
  }
  if (q.type === "multi") {
    return [...document.querySelectorAll("input[name=multiple]:checked")].map(
      (x) => q.choices[Number(x.value)],
    );
  }
  if (q.type === "order" || q.type === "match") return draft;
  return el("textAnswer")?.value?.trim() || "";
}
function valid(q, a) {
  if (q.type === "multi") return a.length > 0;
  if (q.type === "order") return a.length === q.words.length;
  if (q.type === "match") return Object.keys(a).length === q.pairs.length;
  return String(a).trim() !== "";
}
function check(q, a) {
  return FrenchEngine.check(q, a);
}
function saveDraft(q) {
  if (mode === "daily") {
    const day = store.daily[sessionDay()];
    day.drafts ??= {};
    day.drafts[q.id] = draft;
    persist();
  }
}
function record(q, correct, a) {
  const d = sessionDay(),
    s = store.cards[q.id] || { attempts: 0, wrong: 0, streak: 0 };
  s.attempts++;
  s.wrong += correct ? 0 : 1;
  s.streak = correct ? s.streak + 1 : 0;
  s.lastDate = d;
  s.lastCorrect = correct;
  s.nextDue = plusDays(
    d,
    correct ? INTERVALS[Math.min(s.streak - 1, INTERVALS.length - 1)] : 1,
  );
  s.lastAnswer = a;
  s.skill = q.skill;
  store.cards[q.id] = s;
  if (mode === "daily") {
    store.daily[d].responses[q.id] = { correct, answer: a, date: d };
    store.log.push({ date: d, id: q.id, correct });
    if (store.log.length > 5000) store.log = store.log.slice(-5000);
  }
  persist();
}
function renderQuestion() {
  if (pos >= queue.length) {
    if (mode === "daily") finishDaily();
    else finishExtra();
    return;
  }
  let q = queue[pos];
  pickDraft(q);
  let d = sessionDay();
  const previous = mode === "daily" ? store.daily[d]?.responses[q.id] : null;
  if (previous) {
    judged = true;
    draft = previous.answer;
  }
  const info = DB.stages[FrenchConfig.THEMES.indexOf(q.theme)];
  showOnly("play");
  el("play").innerHTML =
    `<div class="playtop"><div><span class="pill">${mode === "daily" ? "每日练习" : "错题复习"}</span> <span class="subline">第 ${pos + 1} / ${queue.length} 题 · ${ESC(info.name)}</span></div><button class="btn light smallbtn" id="homeBack">返回首页</button></div><div class="progress"><div style="width:${(100 * (pos + 1)) / queue.length}%"></div></div><h2 class="qtitle">${ESC(q.prompt)}</h2><div class="scene">${sceneHTML(q)}</div><div id="inputArea">${inputWidget(q)}</div><div id="feedbackArea">${judged ? feedbackHTML(q, previous?.correct ?? false) : ""}</div><div class="answer-actions">${!judged ? '<button id="submitBtn" class="btn">提交答案</button>' : `<button id="nextBtn" class="btn">${pos === queue.length - 1 ? "查看成绩" : "下一题"}</button>`}</div>`;
  if (judged && q.type === "order") paintOrder(q);
  el("homeBack").onclick = () => {
    showOnly("home");
    updateHome();
  };
  if (!judged) {
    bindInputs(q);
    el("submitBtn").onclick = () => submit(q);
  } else el("nextBtn").onclick = next;
}
function paintOrder(q) {
  const y = window.scrollY;
  const line = el("orderedLine"),
    pool = el("wordChoice");
  if (!pool.children.length) {
    q.words.forEach((word, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.word = i;
      b.textContent = word;
      pool.append(b);
    });
  }
  line.replaceChildren();
  draft.forEach((i, k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "order-picked";
    b.dataset.unpick = k;
    b.textContent = q.words[i];
    b.setAttribute("aria-label", `移除第${k + 1}个词 ${q.words[i]}`);
    b.disabled = judged;
    line.append(b);
  });
  [...pool.children].forEach((b, i) => {
    b.disabled = judged || draft.includes(i);
  });
  window.scrollTo(0, y);
}
function bindInputs(q) {
  if (q.type === "order") {
    paintOrder(q);
    el("wordChoice").onclick = (e) => {
      const b = e.target.closest("[data-word]");
      if (!b || b.disabled) return;
      draft.push(Number(b.dataset.word));
      paintOrder(q);
      saveDraft(q);
    };
    el("orderedLine").onclick = (e) => {
      const b = e.target.closest("[data-unpick]");
      if (!b) return;
      draft.splice(Number(b.dataset.unpick), 1);
      paintOrder(q);
      saveDraft(q);
    };
    el("undoBtn").onclick = () => {
      draft.pop();
      paintOrder(q);
      saveDraft(q);
    };
    el("clearBtn").onclick = () => {
      draft = [];
      paintOrder(q);
      saveDraft(q);
    };
  }
  if (q.type === "match") {
    el("play")
      .querySelectorAll("[data-match]")
      .forEach(
        (s) =>
          (s.onchange = () => {
            draft[q.pairs[Number(s.dataset.match)][0]] =
              s.value === "" ? "" : q.pairs[Number(s.value)][1];
            if (s.value === "")
              delete draft[q.pairs[Number(s.dataset.match)][0]];
            saveDraft(q);
          }),
      );
  }
  if (q.type === "multi") {
    el("play")
      .querySelectorAll("[name=multiple]")
      .forEach(
        (x) =>
          (x.onchange = () => {
            draft = readDraft(q);
            saveDraft(q);
          }),
      );
  }
  if (["choice", "error"].includes(q.type)) {
    el("play")
      .querySelectorAll("[name=single]")
      .forEach(
        (x) =>
          (x.onchange = () => {
            draft = readDraft(q);
            saveDraft(q);
          }),
      );
  }
  if (["num", "fill", "code"].includes(q.type)) {
    el("textAnswer").oninput = () => {
      draft = readDraft(q);
      saveDraft(q);
    };
  }
}
function submit(q) {
  const a = readDraft(q);
  if (!valid(q, a)) {
    alert("请先完成这一题。");
    return;
  }
  draft = a;
  const correct = check(q, a);
  judged = true;
  record(q, correct, a);
  // do not rerecord on rerender
  el("feedbackArea").innerHTML = feedbackHTML(q, correct);
  el("inputArea")
    .querySelectorAll("button,input,select")
    .forEach((x) => (x.disabled = true));
  el("submitBtn").outerHTML =
    `<button id="nextBtn" class="btn">${pos === queue.length - 1 ? "查看成绩" : "下一题"}</button>`;
  el("nextBtn").onclick = next;
}
function feedbackHTML(q, correct) {
  return `<div class="feedback ${correct ? "" : "bad"}"><strong>${correct ? "✓ 答对了！" : "✕ 这道题需要再复习"}</strong><div>正确答案：<b>${ESC(answerText(q))}</b></div><div>${ESC(q.explanation_zh || "")}</div><div class="smallnote">${correct ? "按掌握情况自动安排下次复习。" : "已加入错题集，明天优先复习。"}</div></div>`;
}
function next() {
  pos++;
  draft = null;
  judged = false;
  renderQuestion();
}
function finishDaily() {
  const d = sessionDay(),
    record = store.daily[d],
    total = record.ids.length;
  record.completed = true;
  record.finished = new Date().toISOString();
  persist();
  const ans = Object.values(record.responses || {});
  const good = ans.filter((x) => x.correct).length;
  report(
    `<div class="score"><div class="big">${good} / ${total}</div><h2>今天完成啦！</h2><p>答对 ${good} 道，答错 ${total - good} 道。错误的题已加入错题集，并自动安排后续复习。</p><div class="scorecards"><div><b>${Math.round((good / total) * 100)}%</b>正确率</div><div><b>${total - good}</b>今日错题</div><div><b>${d}</b>完成日期</div></div><div class="actionline" style="justify-content:center"><button class="btn" id="return">回到首页</button><button class="btn light" id="goWrong">练习错题</button></div></div>`,
  );
  el("return").onclick = () => {
    showOnly("home");
    updateHome();
  };
  el("goWrong").onclick = startWrong;
}
function finishExtra() {
  report(
    `<div class="score"><h2>错题复习结束</h2><p>复习记录已更新，下一次复习日期已按这次的表现重新安排。</p><button class="btn" id="return">返回首页</button></div>`,
  );
  el("return").onclick = () => {
    showOnly("home");
    updateHome();
  };
}
function report(markup) {
  showOnly("report");
  el("report").innerHTML = markup;
}
function showHistory() {
  let ids = Object.keys(store.daily).sort().reverse();
  let data = ids
    .map((d) => {
      const r = store.daily[d];
      let n = Object.values(r.responses || {});
      return `<tr><td>${ESC(d)}</td><td>${n.length}/${r.ids?.length || DAILY_COUNT}</td><td>${n.filter((x) => x.correct).length}</td><td>${r.completed ? "已完成" : "未完成"}</td></tr>`;
    })
    .join("");
  let fails = BANK.filter((q) => store.cards[q.id]?.wrong > 0).length;
  report(
    `<h2>学习记录</h2><p>已记录 ${ids.length} 个练习日 · 错过的知识题 ${fails} 项 · 学习数据保存在当前浏览器。</p><table class="datatable"><thead><tr><th>日期</th><th>作答</th><th>答对</th><th>状态</th></tr></thead><tbody>${data || '<tr><td colspan="4">尚无记录</td></tr>'}</tbody></table><div class="actionline"><button id="return" class="btn">返回首页</button></div>`,
  );
  el("return").onclick = () => {
    showOnly("home");
    updateHome();
  };
}
function exportData() {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          app: "佳琪每日法语练习",
          exportedAt: new Date().toISOString(),
          state: store,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const u = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = u;
  a.download = "佳琪法语复习记录_" + localDay() + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 500);
}
function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const s = data.state || data;
      if (s.version !== 1 || !s.cards || !s.daily || !Array.isArray(s.log))
        throw Error("格式不匹配");
      if (!confirm("将使用备份覆盖当前浏览器学习记录，是否继续？")) return;
      store = s;
      persist();
      updateHome();
      alert("已导入学习记录");
    } catch (e) {
      alert("导入失败：" + e.message);
    }
  };
  reader.readAsText(file, "UTF-8");
}
el("startBtn").onclick = startDaily;
el("wrongBtn").onclick = startWrong;
el("historyBtn").onclick = showHistory;
el("exportBtn").onclick = exportData;
el("importBtn").onclick = () => el("importFile").click();
el("importFile").onchange = (e) => {
  if (e.target.files[0]) importData(e.target.files[0]);
  e.target.value = "";
};
updateHome();
