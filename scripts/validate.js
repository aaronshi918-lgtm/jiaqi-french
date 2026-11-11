const C = require("../src/config");
const { loadQuestions } = require("./questions");
const required = [
  "id",
  "unit",
  "theme",
  "skill",
  "type",
  "level",
  "prompt",
  "audio_text",
  "choices",
  "aliases",
  "hint_zh",
  "explanation_zh",
  "scene",
];
const han = /\p{Script=Han}/u;
const textList = (value) =>
  Array.isArray(value)
    ? value.flatMap(textList)
    : value && typeof value === "object"
      ? Object.entries(value).flatMap(textList)
      : [value];
const bag = (words) =>
  JSON.stringify(words.map((w) => String(w).toLocaleLowerCase("fr")).sort());
function validate(questions) {
  const errors = [],
    ids = new Set();
  const fail = (q, message) => errors.push(`${q?.id ?? "?"}: ${message}`);
  for (const q of questions) {
    if (!q || typeof q !== "object" || Array.isArray(q)) {
      fail(q, "题目必须是对象");
      continue;
    }
    for (const key of required) if (!(key in q)) fail(q, `缺少 ${key}`);
    if (typeof q.id !== "string" || !q.id.trim() || ids.has(q.id))
      fail(q, "id 必须非空且全局唯一");
    ids.add(q.id);
    for (const [key, values] of Object.entries({
      skill: C.SKILLS,
      type: C.TYPES,
      theme: C.THEMES,
      unit: C.UNITS,
    })) {
      if (!values.includes(q[key])) fail(q, `${key} 不在白名单中`);
    }
    if (![1, 2, 3].includes(q.level)) fail(q, "level 必须为 1–3");
    for (const key of ["prompt", "scene", "hint_zh", "explanation_zh"])
      if (typeof q[key] !== "string" || !q[key].trim())
        fail(q, `${key} 必须是非空文本`);
    if (typeof q.explanation_zh !== "string" || !han.test(q.explanation_zh))
      fail(q, "中文解析不能为空且须含中文");
    if (typeof q.audio_text !== "string") fail(q, "audio_text 必须是文本");
    if (
      !Array.isArray(q.choices) ||
      !Array.isArray(q.aliases) ||
      q.aliases.some((a) => typeof a !== "string")
    )
      fail(q, "choices / aliases 必须是数组");
    if (!("answer" in q) && !("answers" in q))
      fail(q, "缺少 answer 或 answers");
    for (const key of [
      "prompt",
      "audio_text",
      "choices",
      "answer",
      "answers",
      "aliases",
      "words",
      "pairs",
    ]) {
      if (textList(q[key]).some((value) => han.test(String(value ?? ""))))
        fail(q, `${key} 法语字段不能含中文`);
    }
    if (["choice", "error", "multi"].includes(q.type)) {
      if (
        !Array.isArray(q.choices) ||
        q.choices.length < 2 ||
        q.choices.some((x) => typeof x !== "string") ||
        new Set(q.choices).size !== q.choices.length
      )
        fail(q, "选项必须是至少两个不重复的文本");
      const answers = q.type === "multi" ? q.answer : [q.answer];
      if (
        !Array.isArray(answers) ||
        !answers.length ||
        answers.some(
          (a) => !Array.isArray(q.choices) || !q.choices.includes(a),
        ) ||
        new Set(answers).size !== answers.length
      )
        fail(q, "答案必须在选项中且不重复");
    }
    if (q.type === "order") {
      const answers = q.answers ?? [q.answer];
      if (
        !Array.isArray(q.words) ||
        !q.words.length ||
        q.words.some((w) => typeof w !== "string" || !w.trim()) ||
        !Array.isArray(answers) ||
        !answers.length ||
        answers.some((a) => !Array.isArray(a) || bag(a) !== bag(q.words))
      )
        fail(q, "所有正确语序的词（含重复词）必须与词块一致");
    }
    if (
      q.type === "match" &&
      (!Array.isArray(q.pairs) ||
        q.pairs.length < 2 ||
        !q.answer ||
        Array.isArray(q.answer) ||
        q.pairs.some(
          (pair) =>
            !Array.isArray(pair) ||
            pair.length !== 2 ||
            q.answer[pair[0]] !== pair[1],
        ) ||
        Object.keys(q.answer).length !== q.pairs.length)
    )
      fail(q, "配对题的 pairs 和答案必须一致");
    if (
      ["fill", "num", "code"].includes(q.type) &&
      !["string", "number"].includes(typeof q.answer)
    )
      fail(q, "填空答案必须是文本或数字");
  }
  return errors;
}
function statistics(questions) {
  for (const key of ["skill", "type", "theme", "unit"]) {
    console.log(`\n${key}\tcount`);
    const count = {};
    for (const q of questions) count[q[key]] = (count[q[key]] || 0) + 1;
    for (const value of Object.keys(count).sort())
      console.log(`${value}\t${count[value]}`);
  }
}
if (require.main === module) {
  const questions = loadQuestions(),
    errors = validate(questions);
  statistics(questions);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else console.log(`\n校验通过：${questions.length} 题`);
}
module.exports = { validate, statistics };
