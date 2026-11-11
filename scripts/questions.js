const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
function loadQuestions() {
  return fs
    .readdirSync(path.join(ROOT, "questions"))
    .filter((file) => file.endsWith(".json"))
    .sort()
    .flatMap((file) => {
      const data = JSON.parse(
        fs.readFileSync(path.join(ROOT, "questions", file), "utf8"),
      );
      if (!Array.isArray(data)) throw Error(`${file}: 顶层必须是题目数组`);
      return data;
    });
}
module.exports = { ROOT, loadQuestions };
