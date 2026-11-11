const ESC = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function cards(items) {
  return `<div class="visualgrid">${items.map((it) => `<div class="postit">${it[2] ? `<div class="bigemoji">${ESC(it[2])}</div>` : ""}<div class="visualTitle">${ESC(it[0])}</div><div class="target">${ESC(it[1])}</div></div>`).join("")}</div>`;
}
function table(head, rows) {
  return `<table class="datatable"><thead><tr>${head.map((x) => `<th>${ESC(x)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((x) => `<td>${ESC(x)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function clock(h, m) {
  let a = (Number(h) % 12) * 30 + Number(m) * 0.5,
    b = Number(m) * 6;
  let ticks = "";
  for (let i = 0; i < 12; i++) {
    let ang = (i * Math.PI) / 6;
    let xx = 110 + 81 * Math.sin(ang),
      yy = 110 - 81 * Math.cos(ang);
    ticks += `<circle cx="${xx.toFixed(1)}" cy="${yy.toFixed(1)}" r="2.5" fill="#3c678b"/>`;
  }
  return `<svg class="clockSvg" viewBox="0 0 220 220" role="img" aria-label="带时针和分针的钟表"><circle cx="110" cy="110" r="101" fill="#fff" stroke="#427da2" stroke-width="7"/><circle cx="110" cy="110" r="91" fill="none" stroke="#dcecf5" stroke-width="4"/>${ticks}<path d="M110 110 L110 57" transform="rotate(${a} 110 110)" stroke="#214861" stroke-width="8" stroke-linecap="round"/><path d="M110 110 L110 33" transform="rotate(${b} 110 110)" stroke="#268caf" stroke-width="5" stroke-linecap="round"/><circle cx="110" cy="110" r="8" fill="#d5a04c"/></svg>`;
}
function avatar(name, hair, shirt, glass, desc) {
  const head = `<rect x="32" y="84" width="76" height="60" rx="17" fill="${shirt}"/><rect x="59" y="78" width="20" height="24" fill="#eab58f"/><ellipse cx="69" cy="55" rx="34" ry="37" fill="#ecc09b"/><path d="M35 58 Q26 12 63 16 Q109 10 103 59 Q94 30 80 31 Q65 50 39 40 Z" fill="${hair}"/><circle cx="56" cy="61" r="3.5" fill="#32394f"/><circle cx="82" cy="61" r="3.5" fill="#32394f"/><path d="M58 79 Q69 85 80 78" stroke="#aa6c58" stroke-width="2.5" fill="none"/>${glass ? '<g fill="none" stroke="#263d56" stroke-width="3"><circle cx="55" cy="61" r="12"/><circle cx="83" cy="61" r="12"/><path d="M67 59L72 59M43 59L37 56M95 59L101 56"/></g>' : ""}`;
  return `<div class="portrait"><svg viewBox="0 0 138 146" aria-label="${ESC(name)} 的人物插画" role="img"><rect x="3" y="3" width="132" height="140" rx="17" fill="#f1f8fe"/>${head}</svg><strong>${ESC(name)}</strong><div class="sub">${ESC(desc)}</div></div>`;
}
const portraits = () =>
  `<div class="portraitgroup">${avatar("Nina", "#77523a", "#439d72", true, "")}${avatar("Hugo", "#222d35", "#4a83cc", false, "")}${avatar("Maya", "#ddb34b", "#db6569", false, "")}${avatar("Lucas", "#292d39", "#e2b050", true, "")}</div>`;
const flag = (c, name) =>
  `<div class="flagcard"><div class="flagpic flag-${c}" role="img" aria-label="${ESC(name)} 国旗"></div><strong>${ESC(name)}</strong></div>`;
const flags = () =>
  `<div class="flagrow">${flag("fr", "France")}${flag("de", "Allemagne")}${flag("it", "Italie")}${flag("lu", "Luxembourg")}</div>`;
function room() {
  return `<svg viewBox="0 0 700 250" class="roomSvg" role="img" aria-label="教室平面图。上方黑板，左侧门，右侧窗户，下方左侧书包"><rect x="30" y="16" width="640" height="215" rx="17" fill="#fff" stroke="#acc7da" stroke-width="5"/><rect x="244" y="23" width="212" height="44" rx="5" fill="#326e6f"/><text x="350" y="51" text-anchor="middle" fill="#fff" font-size="20">tableau · 黑板</text><rect x="46" y="103" width="103" height="63" rx="5" fill="#fff4d9" stroke="#caa678"/><text x="96" y="139" text-anchor="middle" fill="#6c4f37" font-size="17">porte</text><rect x="554" y="101" width="103" height="63" rx="5" fill="#d9f1fe" stroke="#75aec7"/><text x="604" y="139" text-anchor="middle" fill="#286688" font-size="17">fenêtre</text><rect x="300" y="98" width="100" height="50" rx="6" fill="#d2b18e"/><text x="350" y="126" text-anchor="middle" fill="#5a4733" font-size="18">bureau</text><rect x="103" y="184" width="95" height="31" rx="7" fill="#3a79cc"/><text x="150" y="205" text-anchor="middle" fill="#fff" font-size="16">sac</text></svg>`;
}
const schoolRows = [
  ["Lundi", "Français", "Mathématiques"],
  ["Mardi", "Arts", "Sciences"],
  ["Mercredi", "Géographie", "—"],
  ["Jeudi", "Sport", "Musique"],
  ["Vendredi", "Français", "—"],
];
function sceneHTML(q) {
  const stage = FrenchConfig.THEMES.indexOf(q.theme) + 1;
  if (q.id.startsWith("JQ-X")) {
    const n = ["时间挑战", "教室推理", "人物描述", "语言与地点", "课堂数学"][
      stage - 1
    ];
    return cards([
      ["学习主题", n, "📚"],
      ["任务提示", "读懂法语，再作判断", "✏️"],
    ]);
  }
  let k = q.scene;
  if (k === "clock835") return clock(8, 35);
  if (k === "clock945") return clock(9, 45);
  if (k === "clock-line")
    return cards([
      ["Expression", "moins vingt", "⏰"],
      ["Indice", "il reste 20 minutes", "⌛"],
    ]);
  if (k === "planning")
    return table(
      ["Heure", "Activité"],
      [
        ["08:20", "Accueil"],
        ["08:45", "Français"],
        ["09:30", "Pause"],
        ["09:45", "Mathématiques"],
        ["10:30", "Musique"],
      ],
    );
  if (k === "arrival")
    return cards([
      ["Ana", "8 h 12", "👧"],
      ["Léo", "8 h 19", "👦"],
      ["Zoé", "8 h 26", "👩"],
      ["La porte ferme", "8 h 20", "🚪"],
    ]);
  if (k === "duration")
    return cards([
      ["Atelier", "40 min", "🎨"],
      ["Pause", "15 min", "🍎"],
      ["Jeu", "35 min", "🎲"],
    ]);
  if (k === "message-clock")
    return cards([
      ["Léo", "À quelle heure finit le cours ?", "💬"],
      ["Emma", "À onze heures ___ quart.", "🗨️"],
    ]);
  if (k === "music-clock")
    return cards([
      ["Matière", "musique", "🎵"],
      ["Question", "heure de début ?", "🕒"],
    ]);
  if (k === "dialogue")
    return cards([
      ["Équipe", "Nous", "👧👦"],
      ["Action", "être en avance", "🏫"],
    ]);
  if (k === "roomplan") return room();
  if (k === "bags")
    return cards([
      ["Sac bleu", "✏️ × 2 · 📘 × 2 · 📏 × 1", "🎒"],
      ["Sac vert", "📕 × 4 · ⚽ × 1", "🎒"],
      ["Trousse", "🖊️ × 1 · gomme × 3", "🧰"],
    ]);
  if (k === "tools")
    return cards([
      ["Objet 1", "une règle", "📏"],
      ["Objet 2", "une gomme", "🧽"],
      ["Objet 3", "des ciseaux", "✂️"],
    ]);
  if (k === "pens")
    return cards([
      ["Au début", "9 feutres", "🖍️"],
      ["On donne", "3 feutres", "➖"],
      ["On ajoute", "5 feutres", "➕"],
    ]);
  if (k === "shelf")
    return cards([
      ["Trousse", "stylo · gomme", "🧰"],
      ["Sac vert", "livre · ballon", "🎒"],
      ["Table", "règle", "📏"],
    ]);
  if (k === "three-books")
    return cards([
      ["Sur la table", "📘 📘 📘", "📚"],
      ["Description", "3 cahiers bleus", "✏️"],
    ]);
  if (k === "pouches")
    return cards([
      ["Dans la classe", "2 trousses", "🧰"],
      ["Adjectif", "rouge → ?", "🎨"],
    ]);
  if (k === "rectangle")
    return `<svg viewBox="0 0 650 240" class="roomSvg" role="img" aria-label="长7厘米、宽4厘米的长方形"><rect x="180" y="44" width="300" height="148" fill="#b5e5dc" stroke="#1e817f" stroke-width="5"/><text x="330" y="30" text-anchor="middle" font-size="23" fill="#286b72">7 cm</text><text x="510" y="130" font-size="23" fill="#286b72">4 cm</text><text x="330" y="135" font-size="25" text-anchor="middle" fill="#1c6a68">P = ?</text></svg>`;
  if (k === "portraits") return portraits();
  if (k === "profile-hugo")
    return `<div class="portraitgroup">${avatar("Hugo", "#222d35", "#4a83cc", false, "Il est sportif.")}${avatar("Sa sœur", "#75533a", "#d16c8e", false, "Elle est ... ?")}</div>`;
  if (k === "profile-nina")
    return `<div class="portraitgroup">${avatar("Nina", "#77523a", "#439d72", true, "lunettes · cheveux bruns")}</div>`;
  if (k === "gender")
    return cards([
      ["Masculin", "grand, heureux, sportif", "👦"],
      ["Féminin", "?", "👧"],
    ]);
  if (k === "age-puzzle")
    return cards([
      ["Nina", "11 ans", "👧"],
      ["Hugo", "Nina + 3 ans", "👦"],
      ["Maya", "Hugo − 2 ans", "👧"],
    ]);
  if (k === "message-face")
    return cards([
      ["Brouillon", "Elle est blond et gentille.", "📝"],
      ["Mission", "Trouvez et corrigez la faute.", "🔎"],
    ]);
  if (k === "height")
    return cards([
      ["Indice 1", "Hugo > Maya", "📏"],
      ["Indice 2", "Maya > Nina", "📏"],
    ]);
  if (k === "kindness")
    return cards([
      ["Maya", "aide Nina à porter les livres", "🤝"],
      ["Question", "Quel caractère ?", "💛"],
    ]);
  if (k === "passport-claire")
    return cards([
      ["Prénom", "Claire", "👧"],
      ["Nationalité", "française", "🇫🇷"],
    ]);
  if (k === "flag-strip" || k === "flags") return flags();
  if (k === "passport-table")
    return table(
      ["Prénom", "Ville", "Langues"],
      [
        ["Claire", "Paris", "français · allemand"],
        ["Marco", "Rome", "italien · français"],
        ["Sofia", "Milan", "italien"],
        ["Tom", "Berlin", "allemand · anglais"],
      ],
    );
  if (k === "passport-sofia")
    return cards([
      ["Sofia", "fille", "👧"],
      ["Pays", "Italie", "🇮🇹"],
    ]);
  if (k === "route")
    return cards([
      ["Matin", "28 km", "🚲"],
      ["Après-midi", "37 km", "🚲"],
      ["Distance totale", "?", "🗺️"],
    ]);
  if (k === "message-language")
    return cards([
      ["Bonjour !", "Je parle ...", "🗨️"],
      ["Langues", "français · allemand", "🌐"],
    ]);
  if (k === "passport-letter")
    return cards([
      ["Marie", "nationalité : française", "✉️"],
      ["Adresse", "Rome, Italie", "🏡"],
    ]);
  if (k === "lux-card")
    return `<div class="visualpair">${flag("lu", "Luxembourg")}<div class="postit"><div class="visualTitle">Fiche : langues indiquées</div><div class="rowline"><b>1</b><span>luxembourgeois</span></div><div class="rowline"><b>2</b><span>français</span></div><div class="rowline"><b>3</b><span>allemand</span></div></div></div>`;
  if (k === "school-timetable")
    return table(["Jour", "9 h", "10 h"], schoolRows);
  if (k === "timetable-duration")
    return cards([
      ["Cours 1", "50 min", "📘"],
      ["Pause", "15 min", "🍎"],
      ["Cours 2", "40 min", "📗"],
    ]);
  if (k === "math-groups")
    return cards([
      ["Groupes", "7", "👥"],
      ["Par groupe", "6 cartes", "🃏"],
    ]);
  if (k === "school-blackboard")
    return `<div class="postit" style="text-align:center;min-width:min(420px,100%);background:#265953;color:white;border:7px solid #a87a51"><div style="font-size:35px">2 + 3 = 5</div><div>mathématiques · apprendre · aimer</div></div>`;
  if (k === "music-card")
    return cards([
      ["Jeudi", "cours de musique", "🎼"],
      ["Question", "Remettre les mots en ordre", "📝"],
    ]);
  if (k === "library")
    return cards([
      ["Bibliothèque", "48 livres", "📚"],
      ["Prêtés", "la moitié", "📤"],
      ["Rendus", "6 livres", "📥"],
    ]);
  if (k === "school-tools")
    return cards([
      ["Mathématiques", "calculatrice", "🧮"],
      ["Musique", "notes", "🎵"],
      ["Géographie", "carte", "🗺️"],
    ]);

  return cards([
    ["Dossier secret", "Un indice important", "🕵️"],
    ["Mission", DB.stages[stage - 1].french, "🗝️"],
  ]);
}
