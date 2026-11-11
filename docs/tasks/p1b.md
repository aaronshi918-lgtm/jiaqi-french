# 阶段 1b：中英双语界面＋翻译/帮助按钮

仓库：aaronshi918-lgtm/jiaqi-french　分支：main　先读 AGENTS.md。
背景：佳琪的英语比中文好，界面必须中英双语。

## 1. 界面中英双语
- 所有界面文字同时显示中文和英文：按钮、提示、首页、进度、反馈、成绩页、错题集、学习记录、导入导出、错误提示。
- 格式：短文字同一行“提交 Submit”；长句中文一行、英文一行。
- 文字集中放在 `src/i18n.js`（每条都有 zh 和 en），validate 检查没有漏掉英文的条目。
- 答题反馈和解析也双语显示：`explanation_zh` + `explanation_en`。

## 2. 答题页三个按钮
放在题目下方、选项上方，点一下展开，再点收起，切题时自动收起：
- 🌐 **题目翻译 Translate question**：显示 `prompt_en` 和 `prompt_zh`。
- 🔤 **选项翻译 Translate options**：在每个选项下方显示 `choices_en[i]` / `choices_zh[i]`；配对题翻译两侧内容；排句子题翻译整句意思，不显示正确语序。
- 💡 **帮助 Help**：显示 `tips_en` 和 `tips_zh`，讲答题要点和技巧（如“注意 la 是阴性”“先看钟的短针”），**不得直接给出答案**。

规则：
- 翻译会直接泄露答案的题（如“哪个是 rouge？”选项翻译后就知道答案），题目设 `no_choice_translation: true`，选项翻译按钮变灰并显示“这题不能翻译选项 Not available for this question”。
- 听力题（阶段 2）：题目翻译只翻译题目要求，不显示录音文本。
- 用按钮不扣分，但记录到作答记录（`used: ["q","opt","help"]`），学习记录页显示各技能使用帮助的次数。

## 3. 题库补字段
- 85 道题全部补齐：`prompt_en, prompt_zh, choices_en, choices_zh, tips_en, tips_zh, explanation_en`（`explanation_zh` 已有），需要时设 `no_choice_translation`。
- 旧题的 `hint_zh` 可并入 `tips_zh`。
- validate 新增检查：上述字段必填；`choices_en`/`choices_zh` 长度与 `choices` 一致；tips 不包含答案原文（简单字符串比对，有命中就报警）。
- 英文用小学生能懂的简单英语。

## 4. 同步更新后续阶段
- 在 `docs/tasks/p2.md`、`p3.md`、`p4.md` 的题目字段里加入上述双语字段（已由家长方预先写入，核对即可）。

## 验收（回复里逐项 ✅/❌）
- [ ] validate 通过，85 题双语字段齐全
- [ ] Playwright：三个按钮展开/收起正常，切题自动收起
- [ ] Playwright：`no_choice_translation` 的题选项翻译按钮不可用
- [ ] 界面没有只剩中文的文字（抽查首页、答题页、成绩页、错题集）
- [ ] 帮助使用记录能在学习记录页看到
- [ ] 手机宽度（390px）下三个按钮不挤、不换行错乱
- [ ] 完成后创建 PR
