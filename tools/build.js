/* 코스 데이터 → 슬라이드 HTML + PPTX + 강의 대본 HTML 생성 */
const fs = require("fs");
const path = require("path");
const { buildDeckHtml, buildScriptHtml } = require("./shared.js");
const { buildPptx } = require("./render-pptx.js");

const OUT = path.resolve(__dirname, "..");
const only = process.argv[2];

const COURSES = [
  "./course-design-2h.js",
  "./course-design-4h.js",
  "./course-compare-2h.js",
  "./course-compare-4h.js",
].filter((f) => fs.existsSync(path.resolve(__dirname, f)));

(async () => {
  let allWarn = [];
  for (const f of COURSES) {
    const c = require(f);
    if (only && c.id !== only) continue;

    const deckPath = path.join(OUT, `course-${c.id}-deck.html`);
    const scriptPath = path.join(OUT, `course-${c.id}-script.html`);
    const pptxPath = path.join(OUT, `course-${c.id}-deck.pptx`);

    fs.writeFileSync(deckPath, buildDeckHtml(c), "utf8");
    fs.writeFileSync(scriptPath, buildScriptHtml(c), "utf8");
    const warn = await buildPptx(c, pptxPath);
    allWarn = allWarn.concat(warn);

    const mins = c.blocks.reduce((a, b) => {
      const m = String(b.time).match(/(\d+):(\d+)~(\d+):(\d+)/);
      return m ? a + ((+m[3] * 60 + +m[4]) - (+m[1] * 60 + +m[2])) : a;
    }, 0);
    console.log(`✓ ${c.id}  슬라이드 ${c.slides.length}장 · 대본 ${c.blocks.length}블록 · 합계 ${mins}분`);
  }
  if (allWarn.length) {
    console.log("\n⚠ PPTX 넘침 경고");
    allWarn.forEach((w) => console.log("  " + w));
  } else {
    console.log("\n✓ PPTX 넘침 경고 없음");
  }
})();
