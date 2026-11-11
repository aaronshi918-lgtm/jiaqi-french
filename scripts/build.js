const fs = require("node:fs");
const path = require("node:path");
const { ROOT, loadQuestions } = require("./questions");
const { validate } = require("./validate");
const C = require("../src/config");
const questions = loadQuestions(),
  errors = validate(questions);
if (errors.length) throw Error(errors.join("\n"));
const read = (name) => fs.readFileSync(path.join(ROOT, "src", name), "utf8");
const stages = [
  ["钟楼的秘密", "L’horloge mystérieuse"],
  ["教室宝藏", "Le trésor de la classe"],
  ["人物侦探社", "Le club des détectives"],
  ["语言护照局", "Le bureau des passeports"],
  ["课程表终极战", "Le défi de l’emploi du temps"],
].map(([name, french], i) => ({ id: i + 1, name, french }));
const script =
  ["config.js", "engine.js"].map(read).join("\n") +
  "\nconst DB=" +
  JSON.stringify({ questions, stages }).replace(/</g, "\\u003c") +
  ";\n" +
  ["scenes.js", "app.js"].map(read).join("\n");
const html = read("index.html")
  .replaceAll("{{DAILY}}", C.DAILY)
  .replace("{{STYLE}}", () => read("styles.css"))
  .replace("{{SCRIPT}}", () => script);
fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "dist/jiaqi_french.html"), html);
console.log(
  `已构建 dist/jiaqi_french.html（${Buffer.byteLength(html)} 字节），无外部依赖`,
);
