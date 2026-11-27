/* Pixel sprites are drawn in their own 1 px coordinate system, with the origin at the feet. */
(() => {
  "use strict";

  const ink = "#353246";
  const pants = "#4c5267";
  const shoe = "#393c51";
  const cast = [
    { hair: "#59414b", sheen: "#986759", skin: "#efb484", trim: "#ffe0a1", cut: "bun", outfit: "apron" },
    { hair: "#34374b", sheen: "#59627a", skin: "#dea37e", trim: "#bce3df", cut: "crop", outfit: "shirt", glasses: true },
    { hair: "#51404b", sheen: "#896258", skin: "#c98b67", trim: "#ffdd92", cut: "curl", outfit: "jacket" },
    { hair: "#773f4c", sheen: "#bc6962", skin: "#efbca0", trim: "#ffcfb4", cut: "tail", outfit: "vest" },
    { hair: "#453342", sheen: "#806272", skin: "#df9e76", trim: "#ffd7c5", cut: "bob", outfit: "jacket" },
    { hair: "#4f3c3e", sheen: "#916f60", skin: "#c38b69", trim: "#e9dfb0", cut: "cap", outfit: "shirt" },
    { hair: "#653e44", sheen: "#a2695a", skin: "#eebc92", trim: "#d4e9dc", cut: "sweep", outfit: "vest", glasses: true },
    { hair: "#2e3e4b", sheen: "#586776", skin: "#d89d77", trim: "#ffe1a4", cut: "flop", outfit: "apron" }
  ];
  const defaultShirts = ["#c06c79", "#6b91ad", "#8a79a8", "#d68b68", "#82a18c", "#b39b66", "#5b998a", "#9a80ae"];
  const colorCache = new Map();

  function blend(color, target, strength) {
    const value = parseInt(color.slice(1), 16);
    const goal = parseInt(target.slice(1), 16);
    let result = "#";
    for (const shift of [16, 8, 0]) {
      const source = (value >> shift) & 255;
      const end = (goal >> shift) & 255;
      result += Math.round(source + (end - source) * strength).toString(16).padStart(2, "0");
    }
    return result;
  }

  function palette(person) {
    const i = ((Math.trunc(Number(person.style)) || 0) % cast.length + cast.length) % cast.length;
    let shirt = person.color || defaultShirts[i];
    if (/^#[a-f\d]{3}$/i.test(shirt)) shirt = "#" + [...shirt.slice(1)].map(c => c + c).join("");
    if (!/^#[a-f\d]{6}$/i.test(shirt)) shirt = defaultShirts[i];
    const key = i + shirt;
    if (!colorCache.has(key)) {
      const art = cast[i];
      colorCache.set(key, {
        ...art, shirt,
        shirtDark: blend(shirt, ink, 0.42),
        shirtLight: blend(shirt, "#fff0d6", 0.40),
        chin: blend(art.skin, "#9b5c67", 0.37),
        cheek: blend(art.skin, "#e87473", 0.47),
        skinLight: blend(art.skin, "#fff3c5", 0.33),
        sole: blend(pants, "#aaada7", 0.38)
      });
    }
    return colorCache.get(key);
  }

  function paint(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  // A compact silhouette shared by the head angles keeps character identity stable in motion.
  const headShape = [
    "    #####    ",
    "  ##hhhhh##  ",
    " #hhHHHhhhh# ",
    " #hHHhhhhhh# ",
    "#hhhhhhhhhhh#",
    "#hhssssssshh#",
    "#hsssssssssh#",
    " #sssssssss# ",
    " #sssssssss# ",
    " #csssssssc# ",
    "  #csssssc#  ",
    "   #ccccc#   ",
    "    #####    "
  ];

  function head(ctx, p, angle, blink, talking) {
    const r = (color, x, y, w, h) => paint(ctx, color, x, y, w, h);
    const pigments = { "#": ink, h: p.hair, H: p.sheen, s: p.skin, c: p.chin };
    const left = -6, top = -29;
    ctx.save();
    ctx.translate(left, top);
    for (let y = 0; y < headShape.length; y++) {
      const row = headShape[y];
      for (let x = 0; x < row.length;) {
        const c = row[x];
        let end = x + 1;
        while (end < row.length && row[end] === c) end++;
        if (pigments[c]) r(pigments[c], x, y, end - x, 1);
        x = end;
      }
    }
    const side = angle === "side";
    if (angle === "back") {
      r(p.hair, 1, 4, 11, 6);
      r(p.hair, 2, 10, 9, 1);
      r(p.hair, 3, 11, 7, 1);
      r(p.sheen, 2, 3, 3, 1);
      r(p.sheen, 8, 7, 2, 1);
    } else {
      if (side) {
        r(p.hair, 1, 4, 4, 6);
        r(p.sheen, 2, 5, 1, 3);
        r(p.chin, 4, 7, 2, 2);
        r(p.skinLight, 5, 7, 1, 1);
        r(ink, 11, 7, 2, 2);
        r(p.skin, 10, 7, 2, 1);
        r(ink, 9, 6, 1, blink ? 1 : 2);
        r(p.cheek, 8, 9, 2, 1);
        r(p.skinLight, 10, 5, 1, 1);
      } else {
        r(ink, 3, 7, blink ? 2 : 1, blink ? 1 : 2);
        r(ink, 9, 7, blink ? 2 : 1, blink ? 1 : 2);
        r(p.cheek, 2, 9, 2, 1);
        r(p.cheek, 9, 9, 2, 1);
        r(p.skinLight, 6, 8, 1, 1);
      }
      r(talking ? ink : p.chin, side ? 9 : 6, 10, talking ? 2 : 1, 1);
      if (p.glasses) {
        if (!side) {
          r(ink, 1, 6, 11, 1);
          r(p.sheen, 2, 7, 1, 2);
          r(p.sheen, 5, 7, 1, 2);
          r(p.sheen, 8, 7, 1, 2);
          r(p.sheen, 11, 7, 1, 2);
          r(ink, 2, 9, 4, 1);
          r(ink, 8, 9, 4, 1);
        } else {
          r(ink, 4, 6, 8, 1);
          r(ink, 8, 7, 1, 2);
          r(ink, 8, 9, 4, 1);
        }
      }
    }
    switch (p.cut) {
      case "bun":
        r(ink, -1, -1, 5, 5); r(ink, 0, -2, 3, 1);
        r(p.hair, 0, 0, 3, 3); r(p.sheen, 0, -1, 2, 2);
        r(p.trim, 1, 3, 3, 1);
        r(p.hair, 3, 4, 4, 2); r(p.hair, 3, 5, 2, 2);
        break;
      case "tail":
        r(ink, -3, 3, 4, 6); r(ink, -4, 6, 3, 5);
        r(p.hair, -2, 4, 2, 4); r(p.sheen, -3, 7, 1, 3);
        r(p.trim, -1, 3, 2, 2); r(p.hair, 7, 4, 3, 2);
        break;
      case "bob":
        r(ink, 0, 5, 3, 7); r(p.hair, 1, 6, 2, 5); r(p.sheen, 1, 5, 1, 3);
        if (!side) { r(ink, 11, 5, 2, 7); r(p.hair, 11, 6, 1, 5); }
        r(p.hair, 3, 4, 7, 2); r(p.hair, 4, 5, 2, 2); r(p.trim, 9, 4, 2, 1);
        break;
      case "curl":
        r(ink, 2, 0, 2, 2); r(ink, 7, -1, 3, 2); r(ink, 10, 1, 3, 3);
        r(p.sheen, 2, 2, 2, 1); r(p.sheen, 7, 1, 2, 1);
        r(p.hair, 3, 4, 2, 3); r(p.hair, 7, 4, 2, 2);
        break;
      case "cap":
        r(ink, 1, 1, 11, 4); r(p.shirtDark, 2, 1, 9, 3);
        r(p.shirt, 3, 0, 6, 3); r(p.shirtLight, 4, 1, 3, 1);
        r(ink, side ? 7 : 1, 4, side ? 7 : 12, 2); r(p.shirtDark, side ? 7 : 2, 4, side ? 6 : 10, 1);
        break;
      case "sweep":
        r(p.hair, 2, 4, 6, 2); r(p.hair, 2, 6, 3, 2);
        r(p.sheen, 3, 4, 3, 1); r(p.hair, 1, 7, 2, 3);
        break;
      case "flop":
        r(ink, 3, -1, 6, 2); r(p.hair, 4, 0, 5, 2);
        r(p.hair, 7, 4, 4, 2); r(p.hair, 8, 6, 2, 2);
        r(p.sheen, 5, 1, 4, 1); break;
      default:
        r(p.hair, 4, 4, 4, 2); r(p.sheen, 6, 2, 2, 1);
    }
    ctx.restore();
  }

  function legs(ctx, p, seated, walking, beat, side) {
    const r = (color, x, y, w, h) => paint(ctx, color, x, y, w, h);
    function leg(x, y, height) {
      r(ink, x, y, 4, height); r(pants, x + 1, y, 2, height - 1);
      r(shoe, x - 1, y + height - 2, 5, 2); r(p.sole, x, y + height - 1, 4, 1);
    }
    if (seated) {
      leg(side ? 0 : -4, -6, 6); leg(3, -7, 6);
      r(ink, -4, -8, 10, 3); r(pants, -3, -8, 8, 2);
    } else if (walking) {
      const kick = [0, 2, 0, -2][beat % 4];
      leg(-4 + kick, -8, kick < 0 ? 7 : 8); leg(1 - kick, -8, kick > 0 ? 7 : 8);
    } else {
      leg(side ? -2 : -4, -8, 8); leg(side ? 0 : 1, -8, 8);
    }
  }

  function torso(ctx, p, side, back, seated) {
    const r = (color, x, y, w, h) => paint(ctx, color, x, y, w, h);
    const l = side ? -4 : -5;
    const w = side ? 8 : 11;
    r(ink, l + 1, -17, w - 2, 1); r(ink, l, -16, w, 9);
    r(p.shirt, l + 1, -16, w - 2, 8); r(p.shirtLight, l + 1, -15, 2, 3);
    r(p.shirtDark, l + w - 3, -15, 2, 8); r(ink, l + 1, -8, w - 2, 1);
    if (!back) {
      r(p.chin, side ? 1 : -1, -17, 3, 2);
      if (p.outfit === "apron") {
        r(p.trim, -2, -15, 1, 3); r(p.trim, 2, -15, 1, 3);
        r(p.shirtDark, -2, -12, 5, 4); r(p.trim, 0, -11, 2, 1);
      } else if (p.outfit === "jacket") {
        r(p.trim, -1, -15, side ? 2 : 3, seated ? 5 : 6);
        r(p.shirtLight, -2, -14, 1, 3); r(ink, 2, -12, 1, 3);
      } else if (p.outfit === "vest") {
        r(p.trim, -3, -15, 2, 1); r(p.trim, 2, -15, 2, 1);
        r(p.shirtDark, 0, -13, 1, 5); r(p.trim, 1, -11, 1, 1);
      } else {
        r(p.trim, 0, -14, 2, 1); r(p.trim, 0, -12, 1, 1); r(p.trim, 0, -10, 1, 1);
      }
    } else {
      r(p.shirtLight, -3, -15, 6, 1);
      if (p.outfit === "apron") r(p.trim, -3, -10, 7, 1);
    }
  }

  function arms(ctx, p, pose, dept, back, beat) {
    const r = (color, x, y, w, h) => paint(ctx, color, x, y, w, h);
    const alt = beat % 2;
    function arm(x, y, handX, handY) {
      r(ink, x, y, 4, 5); r(p.shirtDark, x + 1, y, 2, 4);
      r(p.shirtLight, x + 1, y, 1, 2);
      if (handX !== x) r(ink, Math.min(handX, x) + 1, handY + 1, Math.abs(handX - x) + 2, 2);
      r(ink, handX, handY, 4, 4); r(p.skin, handX + 1, handY, 2, 3);
    }
    if (pose === "walk") {
      arm(-6, -15, -6 + alt * 2, -12 + alt); arm(3, -15, 4 - alt * 2, -11 - alt);
      return;
    }
    if (pose === "stand") {
      arm(-6, -15, -7, -10); arm(3, -15, 5, -10);
      return;
    }
    if (pose === "sit") {
      arm(-6, -15, -4, -9); arm(3, -15, 2, -9);
      return;
    }
    if (pose === "listen") {
      arm(-6, -15, -4, -11); arm(3, -15, 4, -16);
      return;
    }
    if (pose === "talk" || pose === "blocked") {
      arm(-6, -15, -6, -11);
      const raised = alt;
      arm(3, -15, pose === "blocked" ? 2 : 5 + raised, pose === "blocked" ? -18 : -12 - raised * 3);
      if (pose === "talk" && raised) r(p.skinLight, 8, -17, 1, 3);
      return;
    }
    if (pose === "rest") {
      arm(-6, -15, -4, -10);
      const cupY = alt ? -17 : -12;
      arm(3, -15, 4, cupY + 1);
      r(ink, 5, cupY - 1, 6, 5); r("#fff0c9", 5, cupY, 4, 3);
      r("#8c6055", 5, cupY - 1, 4, 1); r(p.skin, 9, cupY + 1, 1, 1);
      return;
    }
    if (pose === "review" || (pose === "work" && (dept === "qa" || dept === "hr"))) {
      r(ink, 2, -15, 7, 9); r("#e9d5a9", 3, -14, 5, 7); r("#716b6a", 4, -15, 3, 2);
      r("#81999b", 4, -11, 3, 1); r("#81999b", 4, -9, 2, 1);
      arm(-5, -15, -2, -12 + alt); r(p.skin, 3, -11 + alt, 2, 2);
      return;
    }
    if (pose === "work") {
      if (dept === "engineering") {
        r(ink, -4, -8, 14, 3); r("#9aa9b5", -3, -8, 12, 2);
        for (let key = -2; key < 8; key += 3) r("#637187", key, -7, 2, 1);
      } else if (dept === "marketing") {
        r(ink, 4, -15, 6, 7); r("#ffda92", 5, -14, 4, 5); r("#ad806a", 6, -13, 2, 1);
      } else if (dept === "ops") {
        r(ink, 4, -15, 6, 7); r("#a5c9bd", 5, -14, 4, 5); r("#537577", 6, -11, 2, 1);
      }
      arm(-6, -15, -4, -11 + alt); arm(3, -15, 5, -11 - alt);
      if (dept === "design") {
        r(ink, 6, -14 - alt, 1, 5); r("#e9d09b", 7, -15 - alt, 1, 3);
        r("#f2e3b9", 7, -9 - alt, 1, 1);
      }
      return;
    }
    if (!back) { arm(-6, -15, -6, -11); arm(3, -15, 4, -11); }
    else { arm(-6, -15, -6, -11); arm(4, -15, 4, -11); }
  }

  function drawOfficeSprite(ctx, person, pose = "idle", facing = "down", time = 0, x = 0, y = 0, scale = 1) {
    const p = palette(person);
    const seated = ["sit", "rest", "work", "review"].includes(pose);
    const beat = Math.floor(Math.max(0, time) * (pose === "walk" ? 7 : pose === "rest" ? 0.65 : 3));
    const walking = pose === "walk";
    const gesture = pose === "talk" && beat % 2 === 1;
    const side = facing === "left" || facing === "right";
    const back = facing === "up";
    const bob = walking ? beat % 2 : pose === "listen" ? Math.floor(time * 1.5) % 2 : 0;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(facing === "left" ? -scale : scale, scale);
    paint(ctx, "rgba(45,40,56,0.16)", -7, -2, 14, 2);
    paint(ctx, "rgba(45,40,56,0.16)", -5, -3, 10, 4);
    legs(ctx, p, seated, walking, beat, side);
    ctx.translate(0, (seated ? 2 : 0) - bob);
    torso(ctx, p, side, back, seated);
    const blink = Math.floor(time * 7 + (Number(person.style) || 0) * 2) % 31 === 28;
    head(ctx, p, back ? "back" : side ? "side" : "front", blink, gesture);
    arms(ctx, p, pose, person.dept, back, beat);
    ctx.restore();
  }

  function drawOfficePortrait(ctx, person) {
    const p = palette(person);
    ctx.save();
    ctx.clearRect(0, 0, 32, 32);
    paint(ctx, blend(p.shirt, "#fff2d8", 0.65), 0, 0, 32, 32);
    paint(ctx, blend(p.shirt, "#fff2d8", 0.78), 1, 1, 30, 21);
    ctx.translate(15, 61);
    ctx.scale(2, 2);
    torso(ctx, p, false, false, false);
    head(ctx, p, "front", false, false);
    ctx.restore();
  }

  window.drawOfficeSprite = drawOfficeSprite;
  window.drawOfficePortrait = drawOfficePortrait;
})();
