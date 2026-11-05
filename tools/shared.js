/* ===========================================================
   워크플로우랩 강의자료 공용 모듈
   슬라이드 DSL 하나로 HTML 프레젠테이션 + PPTX를 생성한다.
   =========================================================== */

const THEME = {
  ink: "0F1420", ink2: "26304D", bg: "FFFFFF", bg2: "F1F4F9",
  g: "0A6E53", gb: "E8F3EF",      // ChatGPT / 1번 계열
  c: "B85042", cb: "F8EDE9",      // Claude / 2번 계열
  b: "1A4FA0", bb: "E9EFF9",      // Gemini / 3번 계열
  gold: "C08A1E", goldb: "FBF2DE",
  mut: "5A6B8C", mut2: "9FB0CA",
  code: "1B2338",
  font: "Malgun Gothic",
};

// tone → {accent, tint}
const TONE = {
  g:    { a: THEME.g,    t: THEME.gb },
  c:    { a: THEME.c,    t: THEME.cb },
  b:    { a: THEME.b,    t: THEME.bb },
  gold: { a: THEME.gold, t: THEME.goldb },
  n:    { a: THEME.mut,  t: THEME.bg2 },
  w:    { a: THEME.ink2, t: THEME.bg },
};
const tone = (k) => TONE[k] || TONE.n;

/* ============ HTML 이스케이프 ============ */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// 본문용: <b>만 허용하고 나머지는 이스케이프
function rich(s) {
  return esc(s).replace(/\[\[(.+?)\]\]/g, "<b>$1</b>").replace(/\n/g, "<br>");
}
// PPTX용: [[...]] 마크업을 run 배열로
function runs(s, base) {
  const out = [];
  String(s == null ? "" : s).split(/(\[\[.+?\]\])/).forEach((part) => {
    if (!part) return;
    const m = part.match(/^\[\[(.+)\]\]$/);
    out.push({
      text: m ? m[1] : part,
      options: Object.assign({}, base, m ? { bold: true } : {}),
    });
  });
  return out.length ? out : [{ text: "", options: base }];
}
const plain = (s) => String(s == null ? "" : s).replace(/\[\[|\]\]/g, "");

/* ===========================================================
   1. HTML 프레젠테이션 렌더러
   =========================================================== */

const DECK_CSS = `
*{box-sizing:border-box;margin:0;padding:0;word-break:break-word;overflow-wrap:break-word;}
:root{--ink:#${THEME.ink};--ink2:#${THEME.ink2};--bg:#${THEME.bg};--bg2:#${THEME.bg2};
--g:#${THEME.g};--gb:#${THEME.gb};--c:#${THEME.c};--cb:#${THEME.cb};--b:#${THEME.b};--bb:#${THEME.bb};
--gold:#${THEME.gold};--goldb:#${THEME.goldb};--mut:#${THEME.mut};--mut2:#${THEME.mut2};--code:#${THEME.code};}
html,body{height:100%;}
body{font-family:'${THEME.font}','맑은 고딕',-apple-system,sans-serif;background:#0B0E16;color:var(--ink);
display:flex;align-items:center;justify-content:center;overflow:hidden;}
#stage{position:relative;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;}
.slide{position:absolute;width:1280px;height:720px;background:var(--bg);display:none;
padding:46px 56px 54px;flex-direction:column;overflow:hidden;}
.slide.on{display:flex;}
.slide.dark{background:var(--ink);color:#fff;}
.slide.sec{background:var(--ink2);color:#fff;}
.slide.tint{background:var(--bg2);}
h1{font-size:46px;font-weight:800;line-height:1.3;}
h2.t{font-size:31px;font-weight:800;margin-bottom:4px;line-height:1.3;}
.sub{font-size:15.5px;color:var(--mut);margin-bottom:14px;}
.kick{font-size:14px;font-weight:800;letter-spacing:3px;color:var(--mut2);margin-bottom:12px;}
.lead{font-size:18px;color:var(--mut2);line-height:1.65;}
.foot{position:absolute;left:56px;bottom:20px;font-size:11.5px;color:var(--mut);}
.pnum{position:absolute;right:56px;bottom:20px;font-size:11.5px;color:var(--mut);}
.slide.dark .foot,.slide.sec .foot,.slide.dark .pnum,.slide.sec .pnum{color:var(--mut2);}
.card{border-radius:12px;padding:16px 19px;box-shadow:0 2px 10px rgba(15,20,32,.07);}
.badge{width:30px;height:30px;border-radius:50%;flex:0 0 30px;display:flex;align-items:center;
justify-content:center;font-size:14.5px;font-weight:800;color:#fff;}
.row{display:flex;gap:12px;align-items:center;}
.cols{display:grid;gap:16px;}
.ttl{font-size:20px;font-weight:800;}
.tagline{font-size:13px;font-style:italic;color:var(--mut);margin:5px 0 9px;}
ul.li{list-style:none;}
ul.li li{font-size:14px;line-height:1.5;padding-left:14px;position:relative;margin-bottom:8px;}
ul.li li::before{content:'·';position:absolute;left:2px;font-weight:900;}
.callout{display:flex;gap:14px;align-items:center;border-radius:12px;padding:15px 19px;font-size:15px;line-height:1.55;}
table{width:100%;border-collapse:collapse;font-size:14px;background:#fff;border-radius:10px;overflow:hidden;}
th{color:#fff;text-align:left;padding:10px 13px;font-size:13.5px;font-weight:700;}
td{padding:9px 13px;border-bottom:1px solid #E2E7F0;vertical-align:top;line-height:1.45;}
tr:last-child td{border-bottom:none;}
pre.p{background:var(--code);color:#E4E9F2;border-radius:10px;padding:15px 18px;
font-family:'Consolas','D2Coding',monospace;font-size:12.5px;line-height:1.6;white-space:pre-wrap;overflow:hidden;}
pre.p .lbl{display:block;color:var(--mut2);font-weight:700;font-size:12px;
font-family:'${THEME.font}',sans-serif;letter-spacing:.5px;margin-bottom:8px;}
.big{font-size:56px;font-weight:800;line-height:1;}
.flow{display:grid;gap:9px;align-items:stretch;}
.flow .st{border-radius:12px;padding:13px 9px;text-align:center;}
.flow .st .nm{font-size:14.5px;font-weight:800;margin:7px 0 3px;}
.flow .st .d{font-size:12px;line-height:1.4;}
.flow .st .cap{font-size:11px;font-style:italic;color:var(--mut);margin-top:6px;}
.steps{display:flex;align-items:center;gap:9px;}
.steps .ar{font-size:21px;color:var(--mut);}
.note{font-size:13.5px;font-style:italic;color:var(--mut);}
.tl{display:flex;flex-direction:column;gap:10px;}
.tl .it{display:flex;gap:14px;align-items:center;border-radius:12px;padding:13px 18px;}
.tl .wh{width:150px;flex-shrink:0;font-weight:800;font-size:15px;}
.tl .wt{font-size:15px;}
#bar{position:fixed;bottom:0;left:0;right:0;height:4px;background:rgba(255,255,255,.12);z-index:20;}
#bar i{display:block;height:100%;background:#6E86C8;transition:width .25s;}
#hud{position:fixed;top:14px;right:16px;z-index:20;display:flex;gap:7px;}
#hud button{background:rgba(255,255,255,.1);color:#C9D4EA;border:none;border-radius:7px;
padding:6px 11px;font-size:12px;font-family:inherit;cursor:pointer;}
#hud button:hover{background:rgba(255,255,255,.22);}
#notes{position:fixed;left:0;right:0;bottom:0;max-height:38vh;overflow:auto;background:rgba(10,13,22,.97);
color:#D6DEEE;padding:18px 24px 24px;font-size:14px;line-height:1.65;display:none;z-index:19;border-top:2px solid #39456B;}
#notes.on{display:block;}
#notes b.h{color:#8FA6DB;display:block;margin-bottom:6px;font-size:12px;letter-spacing:1px;}
#help{position:fixed;inset:0;background:rgba(8,10,18,.93);color:#D6DEEE;z-index:30;display:none;
align-items:center;justify-content:center;font-size:16px;line-height:2;}
#help.on{display:flex;}
kbd{background:#2A3454;border-radius:5px;padding:2px 9px;font-family:inherit;font-size:14px;}
@page{size:A4 landscape;margin:0;}
@media print{
body{display:block;background:#fff;overflow:visible;}
#stage{display:block;width:auto;height:auto;}
#hud,#bar,#notes,#help{display:none !important;}
.slide{display:flex !important;position:relative;transform:none !important;width:297mm;height:167mm;
page-break-after:always;box-shadow:none;margin:0;}
.slide:last-child{page-break-after:auto;}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
`;

function hBlock(bk) {
  const T = (k) => tone(k);
  switch (bk.t) {
    case "spacer":
      return `<div style="margin-top:auto;"></div>`;

    case "cards": {
      const n = bk.items.length;
      return `<div class="cols" style="grid-template-columns:repeat(${n},1fr);margin-bottom:${bk.gap || 14}px;">` +
        bk.items.map((it) => {
          const o = T(it.tone);
          return `<div class="card" style="background:#${o.t};">` +
            (it.title
              ? `<div class="row"><span class="badge" style="background:#${o.a};">${esc(it.badge || "")}</span>` +
                `<span class="ttl" style="color:#${o.a};${it.titleSize ? "font-size:" + it.titleSize + "px;" : ""}">${esc(it.title)}</span></div>`
              : "") +
            (it.tagline ? `<div class="tagline">${esc(it.tagline)}</div>` : "") +
            (it.lines ? `<ul class="li" style="margin-top:10px;">` +
              it.lines.map((l) => `<li>${rich(l)}</li>`).join("") + `</ul>` : "") +
            (it.text ? `<div style="font-size:14px;line-height:1.55;margin-top:8px;">${rich(it.text)}</div>` : "") +
            `</div>`;
        }).join("") + `</div>`;
    }

    case "bignums":
      return `<div class="cols" style="grid-template-columns:repeat(${bk.items.length},1fr);margin-bottom:16px;">` +
        bk.items.map((it) => {
          const o = T(it.tone);
          return `<div class="card" style="background:#fff;">` +
            `<div class="big" style="color:#${o.a};">${esc(it.num)}</div>` +
            `<div style="font-size:18px;font-weight:800;margin:11px 0 5px;">${esc(it.title)}</div>` +
            `<div style="font-size:13.5px;color:var(--mut);line-height:1.5;">${rich(it.desc)}</div></div>`;
        }).join("") + `</div>`;

    case "table": {
      const o = T(bk.headTone || "w");
      return `<table style="margin-bottom:${bk.gap || 14}px;"><tr>` +
        bk.head.map((h, i) => `<th style="background:#${o.a};${bk.colW && bk.colW[i] ? "width:" + bk.colW[i] + "px;" : ""}">${esc(h)}</th>`).join("") +
        `</tr>` + bk.rows.map((r) => `<tr>` + r.map((c) => `<td>${rich(c)}</td>`).join("") + `</tr>`).join("") +
        `</table>`;
    }

    case "callout": {
      const o = T(bk.tone);
      return `<div class="callout" style="background:#${o.t};margin-bottom:${bk.gap || 14}px;">` +
        `<span class="badge" style="background:#${o.a};">${esc(bk.label || "!")}</span>` +
        `<div>${rich(bk.text)}</div></div>`;
    }

    case "prompt":
      return `<pre class="p" style="margin-bottom:${bk.gap || 14}px;">` +
        (bk.label ? `<span class="lbl">${esc(bk.label)}</span>` : "") + esc(bk.lines) + `</pre>`;

    case "steps":
      return `<div class="steps" style="margin-bottom:${bk.gap || 14}px;">` +
        bk.items.map((it, i) => {
          const o = T(it.tone || bk.tone);
          return (i ? `<span class="ar">→</span>` : "") +
            `<div class="card row" style="background:#${o.t};flex:1;padding:11px 15px;">` +
            `<span class="badge" style="background:#${o.a};">${i + 1}</span>` +
            `<b style="font-size:15.5px;">${esc(it.label)}</b></div>`;
        }).join("") + `</div>`;

    case "flow":
      return `<div class="flow" style="grid-template-columns:repeat(${bk.items.length},1fr);margin-bottom:${bk.gap || 14}px;">` +
        bk.items.map((it, i) => {
          const o = T(it.tone);
          return `<div class="st" style="background:#${o.t};">` +
            `<div class="badge" style="background:#${o.a};margin:0 auto;">${i + 1}</div>` +
            `<div class="nm" style="color:#${o.a};">${esc(it.name)}</div>` +
            `<div class="d">${rich(it.desc)}</div>` +
            (it.cap ? `<div class="cap">${esc(it.cap)}</div>` : "") + `</div>`;
        }).join("") + `</div>`;

    case "rows":
      return `<div style="display:flex;flex-direction:column;gap:11px;margin-bottom:${bk.gap || 14}px;">` +
        bk.items.map((it, i) => {
          const o = T(it.tone);
          return `<div class="card row" style="background:#${it.fill === "w" ? "fff" : o.t};align-items:flex-start;padding:15px 19px;">` +
            `<span class="badge" style="background:#${o.a};">${i + 1}</span><div>` +
            (it.over ? `<div style="font-size:13px;color:var(--mut);">${esc(it.over)}</div>` : "") +
            `<div style="font-size:${it.mainSize || 18}px;font-weight:800;${it.overColor ? "color:#" + o.a + ";" : ""}">${rich(it.main)}</div>` +
            (it.desc ? `<div style="font-size:13.5px;margin-top:4px;line-height:1.5;">${rich(it.desc)}</div>` : "") +
            `</div></div>`;
        }).join("") + `</div>`;

    case "timeline":
      return `<div class="tl" style="margin-bottom:${bk.gap || 14}px;">` +
        bk.items.map((it) => {
          const o = T(it.hot ? "gold" : "w");
          return `<div class="it" style="background:${it.hot ? "#" + o.t : "#fff"};box-shadow:0 2px 10px rgba(15,20,32,.07);">` +
            `<div class="wh" style="color:#${it.hot ? o.a : THEME.mut};">${esc(it.when)}</div>` +
            `<div class="wt">${rich(it.what)}</div></div>`;
        }).join("") + `</div>`;

    case "two": {
      const w = bk.ratio || "1.5fr 1fr";
      return `<div style="display:grid;grid-template-columns:${w};gap:16px;margin-bottom:${bk.gap || 14}px;${bk.grow ? "flex:1;" : ""}">` +
        `<div style="display:flex;flex-direction:column;">${bk.left.map(hBlock).join("")}</div>` +
        `<div style="display:flex;flex-direction:column;gap:9px;">${bk.right.map(hBlock).join("")}</div></div>`;
    }

    case "minicards":
      return bk.items.map((it) => {
        const o = T(it.tone || bk.tone);
        return `<div class="card" style="background:${bk.onTint ? "#fff" : "#" + THEME.bg2};padding:12px 15px;">` +
          `<div style="font-size:12px;font-weight:800;color:#${o.a};">${esc(it.k)}</div>` +
          `<div style="font-size:13px;margin-top:3px;line-height:1.45;">${rich(it.v)}</div></div>`;
      }).join("");

    case "note":
      return `<div class="note" style="margin-bottom:${bk.gap || 10}px;">${rich(bk.text)}</div>`;

    case "html":
      return bk.html;

    default:
      return "";
  }
}

function hSlide(s, foot) {
  if (s.layout === "title" || s.layout === "closing") {
    return `<section class="slide dark">` +
      (s.kicker ? `<div class="kick">${esc(s.kicker)}</div>` : "") +
      `<h1${s.layout === "closing" ? ' style="margin-top:auto;"' : ""}>` +
      (s.h1pre ? `<span style="color:var(--mut2);font-size:33px;font-weight:700;">${esc(s.h1pre)}</span><br>` : "") +
      rich(s.h1) + `</h1>` +
      (s.lead ? `<p class="lead" style="margin-top:20px;">${rich(s.lead)}</p>` : "") +
      `<div style="margin-top:auto;display:flex;align-items:center;justify-content:space-between;">` +
      `<div style="display:flex;gap:24px;">` +
      (s.chips || []).map((c, i) => {
        const o = tone(c.tone);
        return `<div class="row"><span class="badge" style="background:#${o.a};">${i + 1}</span>` +
          `<b style="font-size:14.5px;">${esc(c.label)}</b></div>`;
      }).join("") + `</div>` +
      (s.meta ? `<div style="font-size:13px;color:var(--mut2);text-align:right;">${rich(s.meta)}</div>` : "") +
      `</div><div class="notes">${esc(s.notes || "")}</div></section>`;
  }
  if (s.layout === "section") {
    return `<section class="slide sec">` +
      `<div class="kick">${esc(s.kicker || "")}</div><h1>${rich(s.h1)}</h1>` +
      (s.lead ? `<p class="lead" style="margin-top:18px;">${rich(s.lead)}</p>` : "") +
      `<div class="foot">${esc(foot)}</div><div class="pnum"></div>` +
      `<div class="notes">${esc(s.notes || "")}</div></section>`;
  }
  return `<section class="slide${s.tint ? " tint" : ""}">` +
    `<h2 class="t">${rich(s.title)}</h2>` +
    (s.sub ? `<div class="sub">${rich(s.sub)}</div>` : `<div style="height:10px;"></div>`) +
    (s.body || []).map(hBlock).join("") +
    `<div class="foot">${esc(foot)}</div><div class="pnum"></div>` +
    `<div class="notes">${esc(s.notes || "")}</div></section>`;
}

function buildDeckHtml(course) {
  const foot = course.foot || "워크플로우랩";
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(course.title)} | ${esc(course.subtitle)}</title>
<meta name="description" content="${esc(course.desc || course.title)}">
<style>${DECK_CSS}</style>
</head>
<body>
<div id="stage">
${course.slides.map((s) => hSlide(s, foot)).join("\n")}
</div>
<div id="hud">
  <button onclick="prev()">◀</button><button onclick="next()">▶</button>
  <button onclick="toggleNotes()">노트 N</button><button onclick="fs()">전체화면 F</button>
  <button onclick="window.print()">인쇄/PDF</button>
  <button onclick="document.getElementById('help').classList.toggle('on')">?</button>
</div>
<div id="bar"><i></i></div>
<div id="notes"><b class="h">강사 노트</b><span id="ntext"></span></div>
<div id="help"><div>
  <kbd>→</kbd> <kbd>Space</kbd> 다음 슬라이드<br>
  <kbd>←</kbd> 이전 슬라이드<br>
  <kbd>F</kbd> 전체화면　<kbd>N</kbd> 강사 노트<br>
  <kbd>Home</kbd> / <kbd>End</kbd> 처음 / 마지막<br>
  <kbd>Ctrl</kbd>+<kbd>P</kbd> 전체를 PDF로 저장<br>
  <kbd>Esc</kbd> 이 도움말 닫기<br>
  <span style="font-size:14px;color:#8FA6DB;">폰에서는 좌우로 밀어서 넘깁니다</span>
</div></div>
<script>
var slides=Array.prototype.slice.call(document.querySelectorAll('.slide')),i=0;
var notesText=slides.map(function(s){var n=s.querySelector('.notes');var t=n?n.textContent.trim():'';if(n)n.remove();return t;});
slides.forEach(function(s,k){var p=s.querySelector('.pnum');if(p)p.textContent=(k+1)+' / '+slides.length;});
function scale(){var pad=window.innerWidth<700?8:24;
var r=Math.min((window.innerWidth-pad)/1280,(window.innerHeight-pad)/720);
slides.forEach(function(s){s.style.transform='scale('+r+')';});}
function show(n){i=Math.max(0,Math.min(slides.length-1,n));
slides.forEach(function(s,k){s.classList.toggle('on',k===i);});
document.querySelector('#bar i').style.width=((i+1)/slides.length*100)+'%';
document.getElementById('ntext').textContent=notesText[i]||'(이 슬라이드에는 노트가 없습니다)';
if(location.hash!=='#'+(i+1))history.replaceState(null,'','#'+(i+1));}
function next(){show(i+1);}function prev(){show(i-1);}
function toggleNotes(){document.getElementById('notes').classList.toggle('on');}
function fs(){if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen();}
document.addEventListener('keydown',function(e){
if(e.key==='ArrowRight'||e.key===' '||e.key==='PageDown'){e.preventDefault();next();}
else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();prev();}
else if(e.key==='Home')show(0);else if(e.key==='End')show(slides.length-1);
else if(e.key==='n'||e.key==='N')toggleNotes();else if(e.key==='f'||e.key==='F')fs();
else if(e.key==='Escape')document.getElementById('help').classList.remove('on');});
var x0=null;
document.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;},{passive:true});
document.addEventListener('touchend',function(e){if(x0===null)return;
var dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>45){dx<0?next():prev();}x0=null;},{passive:true});
document.getElementById('stage').addEventListener('click',function(e){
if(e.target.closest('#hud')||e.target.closest('#notes'))return;next();});
window.addEventListener('resize',scale);scale();
show(parseInt((location.hash||'#1').slice(1),10)-1||0);
</script>
</body>
</html>
`;
}

/* ===========================================================
   2. 강의 대본 문서 (A4 인쇄용)
   =========================================================== */

const SCRIPT_CSS = `
*{box-sizing:border-box;margin:0;padding:0;word-break:break-word;overflow-wrap:break-word;}
body{font-family:'${THEME.font}','맑은 고딕',sans-serif;font-size:10.5pt;line-height:1.75;color:#1a1a1a;background:#f5f5f5;}
.page{width:210mm;min-height:297mm;margin:12px auto;padding:18mm 18mm 18mm 22mm;background:#fff;
box-shadow:0 2px 8px rgba(0,0,0,.12);position:relative;counter-increment:pg;}
.cover{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;min-height:255mm;}
.cover .eye{font-size:11pt;font-weight:700;color:#4a6fa5;letter-spacing:.1em;margin-bottom:16px;}
.cover h1{font-size:27pt;font-weight:700;color:#1a3a5c;border:none;padding:0;margin-bottom:8px;line-height:1.3;}
.cover .st{font-size:14pt;color:#4a6fa5;margin-bottom:6px;}
.cover .dv{width:60mm;height:3px;background:#4a6fa5;margin:24px auto;}
.cover .info{font-size:10.5pt;color:#555;line-height:2.1;}
.cover .nt{margin-top:24px;font-size:9pt;color:#888;border-top:1px solid #ddd;padding-top:10px;max-width:130mm;}
.hd{position:absolute;top:7mm;left:22mm;right:18mm;font-size:8.5pt;color:#888;
border-bottom:.5px solid #ccc;padding-bottom:3px;display:flex;justify-content:space-between;}
.ft{position:absolute;bottom:7mm;left:22mm;right:18mm;font-size:8.5pt;color:#888;
border-top:.5px solid #ccc;padding-top:3px;display:flex;justify-content:space-between;}
.pn::after{content:counter(pg);}
.page.cv .hd,.page.cv .ft{display:none;}
h1{font-size:17pt;font-weight:700;color:#1a3a5c;margin-bottom:11px;padding-bottom:6px;
border-bottom:2px solid #4a6fa5;page-break-after:avoid;}
h2{font-size:13pt;font-weight:700;color:#2c5282;margin:18px 0 7px;page-break-after:avoid;}
h3{font-size:11pt;font-weight:700;color:#2d3748;margin:13px 0 5px;page-break-after:avoid;}
p{margin-bottom:8px;}
.lead{font-size:10.5pt;color:#555;margin-bottom:13px;}
table{width:100%;border-collapse:collapse;font-size:9.8pt;margin:10px 0;page-break-inside:avoid;}
thead{display:table-header-group;}
th{background:#1a3a5c;color:#fff;padding:7px 9px;text-align:left;font-weight:700;font-size:9.3pt;
-webkit-print-color-adjust:exact;print-color-adjust:exact;}
td{padding:6px 9px;border-bottom:.5px solid #ddd;vertical-align:top;}
tr:nth-child(even) td{background:#F6F9FD;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.blk{border:1px solid #ddd;border-left:4px solid #4a6fa5;border-radius:0 8px 8px 0;
padding:12px 15px;margin-bottom:13px;page-break-inside:avoid;}
.blk .bh{display:flex;align-items:baseline;gap:10px;margin-bottom:4px;}
.blk .tm{font-size:10pt;font-weight:700;color:#fff;background:#4a6fa5;border-radius:5px;padding:2px 9px;
white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.blk .bt{font-size:12pt;font-weight:700;}
.blk .goal{font-size:9.5pt;color:#666;margin-bottom:9px;}
.say{background:#F7F9FC;border-left:3px solid #8aa6c8;border-radius:0 6px 6px 0;
padding:9px 13px;margin:8px 0;font-size:10.2pt;line-height:1.8;page-break-inside:avoid;}
.say .lb{display:block;font-size:8.5pt;font-weight:700;color:#4a6fa5;letter-spacing:.04em;margin-bottom:4px;}
.do{background:#eaf3de;border-left:3px solid #3b6d11;border-radius:0 6px 6px 0;
padding:9px 13px;margin:8px 0;font-size:10pt;page-break-inside:avoid;
-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.do .lb{display:block;font-size:8.5pt;font-weight:700;color:#27500a;margin-bottom:4px;}
.warn{background:#fcebeb;border-left:3px solid #a32d2d;border-radius:0 6px 6px 0;
padding:9px 13px;margin:8px 0;font-size:10pt;page-break-inside:avoid;
-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.warn .lb{display:block;font-size:8.5pt;font-weight:700;color:#791f1f;margin-bottom:4px;}
.tip{background:#faeeda;border-left:3px solid #854f0b;border-radius:0 6px 6px 0;
padding:9px 13px;margin:8px 0;font-size:10pt;page-break-inside:avoid;
-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.tip .lb{display:block;font-size:8.5pt;font-weight:700;color:#633806;margin-bottom:4px;}
.sum{background:#e6f1fb;border:1px solid #b5d4f4;border-radius:7px;padding:12px 16px;margin:14px 0;
font-size:10pt;page-break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.sum .lb{font-weight:700;color:#0c447c;margin-bottom:6px;display:block;}
.sum li,.do li,.warn li,.tip li{list-style:none;padding-left:14px;position:relative;margin-bottom:4px;}
.sum li::before{content:'✓';position:absolute;left:0;color:#0c447c;font-weight:700;font-size:9pt;}
.do li::before{content:'▸';position:absolute;left:0;color:#3b6d11;font-size:9pt;}
.warn li::before,.tip li::before{content:'·';position:absolute;left:3px;font-weight:900;}
pre{background:#F7F8FA;border:.5px solid #d5d8de;border-radius:6px;padding:9px 12px;margin:8px 0;
font-family:'Consolas','D2Coding',monospace;font-size:9pt;line-height:1.6;white-space:pre-wrap;page-break-inside:avoid;}
.slideref{font-size:8.5pt;color:#fff;background:#8aa6c8;border-radius:4px;padding:1px 7px;
white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
ul.pl li{list-style:none;padding-left:13px;position:relative;margin-bottom:5px;}
ul.pl li::before{content:'▪';position:absolute;left:0;color:#4a6fa5;font-size:8pt;top:3px;}
@page{size:A4;margin:16mm 18mm 16mm 22mm;}
@media print{body{background:#fff;}
.page{margin:0;padding:0;box-shadow:none;page-break-after:always;width:100%;min-height:0;}
.page:last-child{page-break-after:avoid;}}
@media screen and (max-width:820px){
.page{width:100%;padding:16px;min-height:0;}
.hd,.ft{position:static;margin:0 0 10px;}.ft{margin:14px 0 0;}
.cover{min-height:0;padding:26px 0;}.cover h1{font-size:19pt;}}
`;

function scriptBlock(b) {
  let h = `<div class="blk"><div class="bh"><span class="tm">${esc(b.time)}</span>` +
    `<span class="bt">${rich(b.title)}</span>` +
    (b.slides ? `<span class="slideref">슬라이드 ${esc(b.slides)}</span>` : "") + `</div>`;
  if (b.goal) h += `<div class="goal">목표 — ${rich(b.goal)}</div>`;
  (b.parts || []).forEach((p) => {
    if (p.say) h += `<div class="say"><span class="lb">${esc(p.lb || "이렇게 말합니다")}</span>${rich(p.say)}</div>`;
    else if (p.do) h += `<div class="do"><span class="lb">${esc(p.lb || "진행")}</span>${rich(p.do)}</div>`;
    else if (p.warn) h += `<div class="warn"><span class="lb">${esc(p.lb || "주의")}</span>${rich(p.warn)}</div>`;
    else if (p.tip) h += `<div class="tip"><span class="lb">${esc(p.lb || "팁")}</span>${rich(p.tip)}</div>`;
    else if (p.pre) h += `<pre>${esc(p.pre)}</pre>`;
    else if (p.p) h += `<p>${rich(p.p)}</p>`;
  });
  return h + `</div>`;
}

function buildScriptHtml(c) {
  const hdr = (right) => `<div class="hd"><span>${esc(c.title)} · ${esc(c.subtitle)}</span><span>${esc(right)}</span></div>`;
  const ftr = `<div class="ft"><span>워크플로우랩</span><span class="pn"></span><span>${esc(c.date)}</span></div>`;
  let out = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(c.title)} ${esc(c.subtitle)} | 강의 대본</title>
<style>${SCRIPT_CSS}</style></head><body>
<div style="counter-reset:pg 0;"></div>

<div class="page cv"><div class="cover">
<div class="eye">워크플로우랩 강사용 자료</div>
<h1>${esc(c.title)}</h1>
<div class="st">${esc(c.subtitle)} · 강의 대본과 운영 노트</div>
<div class="dv"></div>
<div class="info">${rich(c.coverInfo)}</div>
<div class="nt">${rich(c.coverNote)}</div>
</div></div>

<div class="page">${hdr("전체 진행표")}
<h1>전체 진행표</h1>
<p class="lead">${rich(c.tableLead)}</p>
<table><thead><tr><th style="width:74px;">시간</th><th>내용</th><th style="width:150px;">수강생 활동</th><th style="width:66px;">슬라이드</th></tr></thead><tbody>`;
  c.blocks.forEach((b) => {
    out += `<tr><td style="white-space:nowrap;font-weight:700;">${esc(b.time)}</td>` +
      `<td>${rich(b.title)}${b.goal ? `<br><span style="color:#666;font-size:9pt;">${rich(b.goal)}</span>` : ""}</td>` +
      `<td>${rich(b.act || "—")}</td><td>${esc(b.slides || "—")}</td></tr>`;
  });
  out += `</tbody></table>`;
  (c.tableAfter || []).forEach((x) => {
    if (x.tip) out += `<div class="tip"><span class="lb">${esc(x.lb || "팁")}</span>${rich(x.tip)}</div>`;
    if (x.sum) out += `<div class="sum"><span class="lb">${esc(x.lb || "핵심")}</span>${x.sum.map((l) => `<li>${rich(l)}</li>`).join("")}</div>`;
    if (x.warn) out += `<div class="warn"><span class="lb">${esc(x.lb || "주의")}</span>${rich(x.warn)}</div>`;
  });
  out += ftr + `</div>`;

  // 대본 본문
  let page = `<div class="page">${hdr("강의 대본")}<h1>강의 대본</h1>`;
  let count = 0;
  c.blocks.forEach((b) => {
    const h = scriptBlock(b);
    if (count >= (b.big ? 1 : 2)) {
      page += ftr + `</div>`;
      out += page;
      page = `<div class="page">${hdr("강의 대본 (이어서)")}`;
      count = 0;
    }
    page += h;
    count += b.big ? 2 : 1;
  });
  out += page + ftr + `</div>`;

  // 운영 노트
  out += `<div class="page">${hdr("운영 노트")}<h1>운영 노트</h1>`;
  (c.ops || []).forEach((sec) => {
    out += `<h2>${esc(sec.h)}</h2>`;
    if (sec.lead) out += `<p class="lead">${rich(sec.lead)}</p>`;
    if (sec.table) {
      out += `<table><thead><tr>` + sec.table.head.map((x, i) =>
        `<th${sec.table.colW && sec.table.colW[i] ? ` style="width:${sec.table.colW[i]}"` : ""}>${esc(x)}</th>`).join("") +
        `</tr></thead><tbody>` +
        sec.table.rows.map((r) => `<tr>` + r.map((cl) => `<td>${rich(cl)}</td>`).join("") + `</tr>`).join("") +
        `</tbody></table>`;
    }
    (sec.items || []).forEach((x) => {
      if (x.tip) out += `<div class="tip"><span class="lb">${esc(x.lb || "팁")}</span>${rich(x.tip)}</div>`;
      else if (x.warn) out += `<div class="warn"><span class="lb">${esc(x.lb || "주의")}</span>${rich(x.warn)}</div>`;
      else if (x.do) out += `<div class="do"><span class="lb">${esc(x.lb || "진행")}</span>${rich(x.do)}</div>`;
      else if (x.sum) out += `<div class="sum"><span class="lb">${esc(x.lb || "핵심")}</span>${x.sum.map((l) => `<li>${rich(l)}</li>`).join("")}</div>`;
      else if (x.p) out += `<p>${rich(x.p)}</p>`;
      else if (x.pre) out += `<pre>${esc(x.pre)}</pre>`;
    });
  });
  out += ftr + `</div></body></html>\n`;
  return out;
}

module.exports = { THEME, TONE, tone, esc, rich, runs, plain, buildDeckHtml, buildScriptHtml };
