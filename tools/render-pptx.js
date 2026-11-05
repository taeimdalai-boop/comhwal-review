/* 슬라이드 DSL → PPTX 렌더러 (pptxgenjs) */
const pptxgen = require("pptxgenjs");
const { THEME, tone, runs, plain } = require("./shared.js");

const W = 13.3, H = 7.5, M = 0.62, CW = W - M * 2;
const TOP = 1.46;          // 본문 시작 (부제 없을 때)
const TOP_SUB = 1.82;      // 부제 있을 때
const BOTTOM = 6.62;       // 푸터 여유

const hex = (k) => tone(k).a;
const tint = (k) => tone(k).t;

/* ---------- 높이 계산 ---------- */
function measure(bk) {
  switch (bk.t) {
    case "spacer": return 0;
    case "cards": {
      const maxLines = Math.max(...bk.items.map((i) =>
        (i.lines ? i.lines.length : 0) + (i.text ? 2 : 0)));
      return 0.66 + (bk.items.some((i) => i.tagline) ? 0.3 : 0) + maxLines * 0.34 + 0.22;
    }
    case "bignums": return 2.5;
    case "table": return 0.5 + bk.rows.length * (bk.rowH || 0.5);
    case "callout": return 0.56 + String(bk.text).split("\n").length * 0.26;
    case "prompt": return 0.5 + String(bk.lines).split("\n").length * (16 / 72) + 0.2;
    case "steps": return 0.76;
    case "flow": return 2.15;
    case "rows": return bk.items.length * ((bk.rowH || 0.95) + 0.14) - 0.14;
    case "timeline": return bk.items.length * 0.92 - 0.12;
    case "minicards": return bk.items.length * 0.86 - 0.08;
    case "note": return 0.36;
    case "two": {
      const l = bk.left.reduce((a, x) => a + measure(x) + 0.14, 0) - 0.14;
      const r = bk.right.reduce((a, x) => a + measure(x) + 0.14, 0) - 0.14;
      return Math.max(l, r);
    }
    default: return 0;
  }
}
const gapOf = (bk) => (bk.gap != null ? bk.gap / 72 : 0.2);

/* ---------- 그리기 ---------- */
function shadow() {
  return { type: "outer", color: THEME.ink, opacity: 0.09, blur: 10, offset: 2, angle: 90 };
}
function card(s, x, y, w, h, fill, name) {
  s.addShape("roundRect", {
    x, y, w, h, rectRadius: 0.1, fill: { color: fill },
    line: { color: fill, width: 0 }, shadow: shadow(), objectName: name || "card",
  });
}
function badge(s, x, y, d, color, text, fs) {
  s.addShape("ellipse", { x, y, w: d, h: d, fill: { color }, line: { color, width: 0 } });
  s.addText(String(text), {
    x, y, w: d, h: d, align: "center", valign: "middle",
    fontSize: fs || 13, bold: true, color: "FFFFFF", isTextBox: true, margin: 0,
  });
}
function txt(s, t, o) {
  s.addText(typeof t === "string" ? runs(t, { fontSize: o.fontSize, color: o.color, bold: o.bold }) : t,
    Object.assign({ isTextBox: true, margin: 0, fontFace: THEME.font }, o));
}

function draw(s, bk, x, y, w) {
  switch (bk.t) {
    case "cards": {
      const n = bk.items.length, g = 0.3, cw = (w - g * (n - 1)) / n;
      const h = measure(bk);
      bk.items.forEach((it, i) => {
        const cx = x + i * (cw + g), a = hex(it.tone), ti = tint(it.tone);
        card(s, cx, y, cw, h, ti, "c" + i);
        let cy = y + 0.22;
        if (it.title) {
          badge(s, cx + 0.24, cy, 0.38, a, it.badge || (i + 1), 13);
          txt(s, it.title, { x: cx + 0.72, y: cy, w: cw - 0.96, h: 0.38, fontSize: it.titleSize ? it.titleSize * 0.72 : 15,
            bold: true, color: a, valign: "middle" });
          cy += 0.46;
        }
        if (it.tagline) {
          txt(s, it.tagline, { x: cx + 0.24, y: cy, w: cw - 0.48, h: 0.28, fontSize: 10.5, italic: true, color: THEME.mut });
          cy += 0.32;
        }
        if (it.lines) {
          s.addText(it.lines.map((l, k) => ({
            text: plain(l), options: { bullet: true, breakLine: k !== it.lines.length - 1,
              fontSize: 11, color: THEME.ink, paraSpaceAfter: 6 },
          })), { x: cx + 0.26, y: cy, w: cw - 0.5, h: h - (cy - y) - 0.2, isTextBox: true, margin: 0, valign: "top", fontFace: THEME.font });
        } else if (it.text) {
          txt(s, it.text, { x: cx + 0.26, y: cy, w: cw - 0.5, h: h - (cy - y) - 0.2, fontSize: 11.5, color: THEME.ink, valign: "top" });
        }
      });
      return;
    }

    case "bignums": {
      const n = bk.items.length, g = 0.3, cw = (w - g * (n - 1)) / n, h = measure(bk);
      bk.items.forEach((it, i) => {
        const cx = x + i * (cw + g);
        card(s, cx, y, cw, h, "FFFFFF", "bn" + i);
        txt(s, String(it.num), { x: cx + 0.3, y: y + 0.2, w: cw - 0.6, h: 0.95, fontSize: 44, bold: true, color: hex(it.tone), valign: "middle" });
        txt(s, it.title, { x: cx + 0.3, y: y + 1.22, w: cw - 0.6, h: 0.36, fontSize: 15, bold: true, color: THEME.ink });
        txt(s, plain(it.desc).replace(/\n/g, "\n"), { x: cx + 0.3, y: y + 1.62, w: cw - 0.6, h: 0.75, fontSize: 11, color: THEME.mut, valign: "top" });
      });
      return;
    }

    case "table": {
      const head = bk.head.map((t) => ({
        text: t, options: { fill: { color: hex(bk.headTone || "w") }, color: "FFFFFF", bold: true, fontSize: 11 },
      }));
      const rows = [head].concat(bk.rows.map((r) => r.map((c) => ({
        text: plain(c), options: { fontSize: bk.fontSize || 11 },
      }))));
      const opt = {
        x, y, w, rowH: bk.rowH || 0.5, autoPage: false, valign: "middle",
        border: { type: "solid", color: "DDE3EC", pt: 1 },
        color: THEME.ink, fill: { color: "FFFFFF" }, fontFace: THEME.font,
      };
      if (bk.colWIn) opt.colW = bk.colWIn;
      s.addTable(rows, opt);
      return;
    }

    case "callout": {
      const h = measure(bk), a = hex(bk.tone), ti = tint(bk.tone);
      card(s, x, y, w, h, ti, "co");
      badge(s, x + 0.26, y + (h - 0.42) / 2, 0.42, a, bk.label || "!", 13);
      txt(s, bk.text, { x: x + 0.86, y: y + 0.12, w: w - 1.12, h: h - 0.24, fontSize: 12.5, color: THEME.ink, valign: "middle" });
      return;
    }

    case "prompt": {
      const h = measure(bk);
      s.addShape("roundRect", { x, y, w, h, rectRadius: 0.06, fill: { color: THEME.code },
        line: { color: THEME.code, width: 0 }, shadow: shadow(), objectName: "prompt" });
      let ty = y + 0.14;
      if (bk.label) {
        txt(s, bk.label, { x: x + 0.26, y: ty, w: w - 0.52, h: 0.26, fontSize: 10, bold: true, color: THEME.mut2 });
        ty += 0.34;
      }
      s.addText(bk.lines, { x: x + 0.26, y: ty, w: w - 0.52, h: h - (ty - y) - 0.16,
        fontSize: 10.5, color: "E4E9F2", fontFace: "Consolas", lineSpacing: 16, valign: "top", isTextBox: true, margin: 0 });
      return;
    }

    case "steps": {
      const n = bk.items.length, aw = 0.42, cw = (w - aw * (n - 1)) / n, h = 0.76;
      bk.items.forEach((it, i) => {
        const cx = x + i * (cw + aw), a = hex(it.tone || bk.tone), ti = tint(it.tone || bk.tone);
        card(s, cx, y, cw, h, ti, "st" + i);
        badge(s, cx + 0.22, y + 0.19, 0.38, a, i + 1, 13);
        txt(s, it.label, { x: cx + 0.7, y, w: cw - 0.92, h, fontSize: 13.5, bold: true, color: THEME.ink, valign: "middle" });
        if (i < n - 1) txt(s, "→", { x: cx + cw, y, w: aw, h, fontSize: 18, color: THEME.mut, align: "center", valign: "middle" });
      });
      return;
    }

    case "flow": {
      const n = bk.items.length, g = 0.26, cw = (w - g * (n - 1)) / n, h = 2.15;
      bk.items.forEach((it, i) => {
        const cx = x + i * (cw + g), a = hex(it.tone), ti = tint(it.tone);
        card(s, cx, y, cw, h, ti, "fl" + i);
        badge(s, cx + (cw - 0.4) / 2, y + 0.2, 0.4, a, i + 1, 13);
        txt(s, it.name, { x: cx + 0.1, y: y + 0.68, w: cw - 0.2, h: 0.3, fontSize: 12.5, bold: true, color: a, align: "center" });
        txt(s, plain(it.desc), { x: cx + 0.1, y: y + 1.0, w: cw - 0.2, h: 0.62, fontSize: 10.5, color: THEME.ink, align: "center", valign: "top" });
        if (it.cap) txt(s, it.cap, { x: cx + 0.08, y: y + 1.68, w: cw - 0.16, h: 0.36, fontSize: 9.5, italic: true, color: THEME.mut, align: "center", valign: "top" });
      });
      return;
    }

    case "rows": {
      const rh = bk.rowH || 0.95;
      bk.items.forEach((it, i) => {
        const ry = y + i * (rh + 0.14), a = hex(it.tone);
        card(s, x, ry, w, rh, it.fill === "w" ? "FFFFFF" : tint(it.tone), "rw" + i);
        badge(s, x + 0.28, ry + (rh - 0.42) / 2, 0.42, a, i + 1, 13);
        let ty = ry + 0.14;
        if (it.over) { txt(s, it.over, { x: x + 0.88, y: ty, w: w - 1.14, h: 0.26, fontSize: 10.5, color: THEME.mut }); ty += 0.3; }
        txt(s, it.main, { x: x + 0.88, y: ty, w: w - 1.14, h: 0.36, fontSize: (it.mainSize || 18) * 0.78,
          bold: true, color: it.overColor ? a : THEME.ink });
        if (it.desc) txt(s, it.desc, { x: x + 0.88, y: ty + 0.38, w: w - 1.14, h: 0.4, fontSize: 11, color: THEME.ink, valign: "top" });
      });
      return;
    }

    case "timeline": {
      bk.items.forEach((it, i) => {
        const ry = y + i * 0.92;
        card(s, x, ry, w, 0.8, it.hot ? tint("gold") : "FFFFFF", "tl" + i);
        txt(s, it.when, { x: x + 0.3, y: ry, w: 1.9, h: 0.8, fontSize: 12.5, bold: true,
          color: it.hot ? hex("gold") : THEME.mut, valign: "middle" });
        txt(s, it.what, { x: x + 2.3, y: ry, w: w - 2.6, h: 0.8, fontSize: 12.5, color: THEME.ink, valign: "middle" });
      });
      return;
    }

    case "minicards": {
      bk.items.forEach((it, i) => {
        const ry = y + i * 0.86, a = hex(it.tone || bk.tone);
        card(s, x, ry, w, 0.78, bk.onTint ? "FFFFFF" : THEME.bg2, "mc" + i);
        txt(s, it.k, { x: x + 0.22, y: ry + 0.08, w: w - 0.44, h: 0.26, fontSize: 10, bold: true, color: a });
        txt(s, it.v, { x: x + 0.22, y: ry + 0.34, w: w - 0.44, h: 0.4, fontSize: 10.5, color: THEME.ink, valign: "top" });
      });
      return;
    }

    case "note":
      txt(s, bk.text, { x, y, w, h: 0.34, fontSize: 11, italic: true, color: THEME.mut });
      return;

    case "two": {
      const [lf, rf] = (bk.ratio || "1.5fr 1fr").split(" ").map((v) => parseFloat(v));
      const g = 0.3, lw = (w - g) * lf / (lf + rf), rw = (w - g) - lw;
      let ly = y; bk.left.forEach((b) => { draw(s, b, x, ly, lw); ly += measure(b) + gapOf(b); });
      let ry = y; bk.right.forEach((b) => { draw(s, b, x + lw + g, ry, rw); ry += measure(b) + gapOf(b); });
      return;
    }
  }
}

/* ---------- 슬라이드 조립 ---------- */
function buildPptx(course, outPath) {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.theme = { headFontFace: THEME.font, bodyFontFace: THEME.font };
  pres.author = "워크플로우랩";
  pres.title = course.title;
  pres.subject = course.subtitle;

  const foot = course.foot || "워크플로우랩";
  const warnings = [];

  const common = (bgHex) => [
    { rect: { x: 0, y: 0, w: W, h: H, fill: { color: bgHex } } },
  ];

  pres.defineSlideMaster({ title: "DARK", background: { color: THEME.ink }, objects: [] });
  pres.defineSlideMaster({ title: "SEC", background: { color: THEME.ink2 }, objects: [] });
  pres.defineSlideMaster({ title: "LIGHT", background: { color: THEME.bg }, objects: [
    { text: { text: foot, options: { x: M, y: H - 0.5, w: 8.4, h: 0.3, fontSize: 9.5,
      color: THEME.mut, isTextBox: true, margin: 0, fontFace: THEME.font } } },
    { slideNumber: { x: W - M - 0.9, y: H - 0.5, w: 0.9, h: 0.3, fontSize: 9.5, color: THEME.mut, align: "right" } },
  ] });
  pres.defineSlideMaster({ title: "TINT", background: { color: THEME.bg2 }, objects: [
    { text: { text: foot, options: { x: M, y: H - 0.5, w: 8.4, h: 0.3, fontSize: 9.5,
      color: THEME.mut, isTextBox: true, margin: 0, fontFace: THEME.font } } },
    { slideNumber: { x: W - M - 0.9, y: H - 0.5, w: 0.9, h: 0.3, fontSize: 9.5, color: THEME.mut, align: "right" } },
  ] });

  let section = null;
  course.slides.forEach((sl, idx) => {
    if (sl.section && sl.section !== section) { section = sl.section; pres.addSection({ title: section }); }
    const master = sl.layout === "title" || sl.layout === "closing" ? "DARK"
      : sl.layout === "section" ? "SEC" : (sl.tint ? "TINT" : "LIGHT");
    const s = pres.addSlide(section ? { masterName: master, sectionTitle: section } : { masterName: master });

    if (sl.layout === "title" || sl.layout === "closing") {
      let y = 1.5;
      if (sl.kicker) { txt(s, sl.kicker, { x: M, y, w: CW, h: 0.4, fontSize: 13, bold: true, charSpacing: 3, color: THEME.mut2 }); y += 0.5; }
      if (sl.h1pre) { txt(s, sl.h1pre, { x: M, y, w: CW, h: 0.55, fontSize: 24, bold: true, color: THEME.mut2 }); y += 0.62; }
      txt(s, sl.h1, { x: M, y, w: CW, h: 1.7, fontSize: 36, bold: true, color: "FFFFFF", valign: "top" });
      y += 1.85;
      if (sl.lead) txt(s, sl.lead, { x: M, y, w: 10.4, h: 1.2, fontSize: 15, color: THEME.mut2, valign: "top" });
      (sl.chips || []).forEach((c, i) => {
        const cx = M + i * 1.72;
        badge(s, cx, 6.08, 0.46, hex(c.tone), i + 1, 13);
        txt(s, c.label, { x: cx + 0.58, y: 6.08, w: 1.14, h: 0.46, fontSize: 11.5, bold: true, color: "FFFFFF", valign: "middle" });
      });
      if (sl.meta) txt(s, sl.meta, { x: W - M - 6.4, y: 6.16, w: 6.4, h: 0.4, fontSize: 11, color: THEME.mut2, align: "right" });
    } else if (sl.layout === "section") {
      txt(s, sl.kicker || "", { x: M, y: 2.4, w: CW, h: 0.4, fontSize: 12.5, bold: true, charSpacing: 3, color: THEME.mut2 });
      txt(s, sl.h1, { x: M, y: 2.85, w: CW, h: 1.1, fontSize: 31, bold: true, color: "FFFFFF", valign: "top" });
      if (sl.lead) txt(s, sl.lead, { x: M, y: 4.1, w: 10.4, h: 1.0, fontSize: 14, color: THEME.mut2, valign: "top" });
    } else {
      txt(s, sl.title, { x: M, y: 0.44, w: CW, h: 0.86, fontSize: 26, bold: true, color: THEME.ink, valign: "middle" });
      if (sl.sub) txt(s, sl.sub, { x: M, y: 1.3, w: CW, h: 0.36, fontSize: 12.5, color: THEME.mut });
      let y = sl.sub ? TOP_SUB : TOP;
      const body = sl.body || [];
      const total = body.reduce((a, b) => a + measure(b) + gapOf(b), 0) - (body.length ? gapOf(body[body.length - 1]) : 0);
      const spare = Math.max(0, (BOTTOM - y) - total);
      if (total > BOTTOM - y + 0.02) {
        warnings.push(`[${course.id}] 슬라이드 ${idx + 1} "${plain(sl.title)}" 내용이 ${(total - (BOTTOM - y)).toFixed(2)}in 넘침`);
      }
      body.forEach((b) => {
        if (b.t === "spacer") { y += spare; return; }
        draw(s, b, M, y, CW);
        y += measure(b) + gapOf(b);
      });
    }
    if (sl.notes) s.addNotes(plain(sl.notes));
  });

  return pres.writeFile({ fileName: outPath }).then(() => warnings);
}

module.exports = { buildPptx };
