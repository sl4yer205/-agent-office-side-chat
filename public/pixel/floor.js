/* Original, pixel-snapped environment for the office's 600 × 360 tile map. */
(function () {
  "use strict";

  window.drawOfficeFloor = function drawOfficeFloor(ctx) {
    const colors = {
      ink: "#4b4353", dark: "#544b59", muted: "#887782", lightWall: "#fff0d7",
      wall: "#edcfb0", wood: "#c78d63", woodLight: "#efbb86", woodDark: "#966849",
      evergreen: "#396a64", leaf: "#62946e", green: "#91b878", mint: "#bfcca0",
      white: "#f9f0d7", blue: "#88c2c7", teal: "#688e96", darkTeal: "#496575",
      coral: "#d27f68", peach: "#f4ad87", lilac: "#b69bbf", violet: "#8c779a",
      gold: "#f0bf73", shadow: "#a89391"
    };
    const c = colors;
    function rect(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    }
    function at(x, y, fn) {
      ctx.save();
      ctx.translate(x, y);
      fn();
      ctx.restore();
    }
    function clip(x, y, w, h, fn) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      fn();
      ctx.restore();
    }
    function shade(x, y, w, h) {
      rect(x + 2, y, w - 4, 1, "#74647940");
      rect(x, y + 1, w, Math.max(1, h - 2), "#74647940");
      rect(x + 2, y + h - 1, w - 4, 1, "#74647940");
    }
    function frame(x, y, w, h, edge, fill, shine) {
      rect(x, y, w, h, edge);
      rect(x + 1, y + 1, w - 2, h - 2, fill);
      if (shine) {
        rect(x + 1, y + 1, w - 2, 1, shine);
        rect(x + 1, y + 2, 1, h - 3, shine);
      }
    }
    function rug(x, y, w, h, edge, fill, trim) {
      rect(x + 2, y, w - 4, h, edge);
      rect(x, y + 2, w, h - 4, edge);
      rect(x + 2, y + 2, w - 4, h - 4, fill);
      rect(x + 4, y + 3, w - 8, 1, trim);
      rect(x + 4, y + h - 4, w - 8, 1, trim);
      for (let i = 4; i < w - 4; i += 5) {
        rect(x + i, y - 1, 2, 1, edge);
        rect(x + i, y + h, 2, 1, edge);
      }
    }
    function flooring(x, y, w, h, kind) {
      const floors = {
        honey: ["#e1b58b", "#e6ba92", "#dfb189", "#eac397", "#c99d7c", "#efd0a6"],
        maple: ["#dfad84", "#e5b68c", "#d9a881", "#eac197", "#c59678", "#f2cda3"],
        rose: ["#deb29b", "#e5baa4", "#d9ab97", "#eac3aa", "#c49c90", "#f1d0b4"],
        tile: ["#bfccca", "#c7d4ce", "#becbc5", "#cfdbd1", "#a9b9b8", "#dde3d6"],
        clay: ["#ddc4af", "#e5cbb5", "#d9bfac", "#e5cbb8", "#c5af9f", "#f2ddc7"],
        sage: ["#c4c9b7", "#cbd0bb", "#c1c7b3", "#d1d5bf", "#aeb5a7", "#e0e1c9"]
      };
      const p = floors[kind];
      const tiled = ["tile","clay","sage"].includes(kind);
      const th = tiled ? 14 : 7;
      const tw = tiled ? 28 : 41;
      clip(x, y, w, h, () => {
        rect(x, y, w, h, p[0]);
        for (let row = 0; row * th < h; row++) {
          const v = y + row * th;
          const offset = tiled ? 0 : (row * 17) % tw;
          for (let col = -1; col * tw < w + tw; col++) {
            const u = x + col * tw + offset;
            const seed = Math.abs(row * 7 + col * 11);
            rect(u, v, tw, th, p[seed % 4]);
            rect(u, v + th - 1, tw, 1, p[4]);
            rect(u + tw - 1, v, 1, th - 1, p[4]);
            if (tiled) rect(u + 1, v, tw - 2, 1, p[5]);
            else if (seed % 3 === 0) {
              rect(u + 5 + seed % 12, v + 3, 6 + seed % 7, 1, p[4] + "80");
              rect(u + 11 + seed % 12, v + 4, 4, 1, p[5]);
            }
          }
        }
      });
    }
    function windowView(x, y, w, h, seed, blind) {
      at(x, y, () => {
        rect(2, 2, w, h + 1, "#b69895");
        frame(0, 0, w, h, c.ink, c.wall, "#fff9df");
        rect(2, 2, w - 4, h - 5, "#a4d7df");
        rect(2, h - 9, w - 4, 6, "#afd3c4");
        clip(2, 2, w - 4, h - 5, () => {
          rect(7, 5, 8, 2, "#e2f0df");
          rect(10, 4, 3, 1, "#e2f0df");
          for (let i = 0; i < w; i += 7) {
            const height = 3 + (seed + i * 13) % 7;
            rect(i, h - 3 - height, 6, height, i % 2 ? "#88aeb4" : "#9dbcc0");
            rect(i + 2, h - height, 1, 2, "#c3d7d0");
          }
          for (let i = 0; i < w; i += 9) {
            rect(i, h - 5 - i % 3, 6, 5, "#91ad94");
            rect(i + 2, h - 6 - i % 3, 3, 3, "#9bbda2");
          }
          for (let k = 0; k < 5; k++) rect(w - 11 - k, 3 + k, 2, 1, "#d8eee1");
        });
        const mid = Math.floor(w / 2);
        rect(mid, 1, 2, h - 2, c.wall);
        rect(mid + 2, 2, 1, h - 5, "#758d90");
        if (blind) {
          rect(1, 1, w - 2, 3, "#ceb297");
          rect(2, 3, w - 4, 1, "#987e79");
          rect(w - 4, 4, 1, 6, "#b59c86");
        }
        rect(-2, h - 2, w + 4, 3, "#a28679");
        rect(-2, h - 2, w + 3, 1, "#ffebc9");
      });
    }
    function plant(x, y, size = 1, pot = "#d18e76") {
      at(x, y, () => {
        ctx.scale(size, size);
        shade(1, -1, 13, 3);
        rect(5, -14, 2, 10, "#526a56");
        rect(8, -16, 1, 12, "#526a56");
        rect(2, -10, 4, 2, c.evergreen);
        rect(-1, -17, 3, 6, c.evergreen); rect(0, -14, 4, 4, c.leaf);
        rect(-1, -17, 3, 3, c.green); rect(2, -12, 2, 3, c.leaf);
        rect(4, -24, 3, 8, c.evergreen); rect(3, -22, 3, 6, c.leaf);
        rect(3, -23, 2, 4, c.green); rect(5, -18, 2, 5, c.leaf);
        rect(10, -22, 4, 4, c.leaf); rect(8, -19, 4, 5, c.evergreen);
        rect(10, -22, 3, 2, c.green); rect(7, -17, 3, 6, c.leaf);
        rect(12, -14, 4, 3, c.leaf); rect(9, -12, 5, 3, c.evergreen);
        rect(12, -14, 3, 1, c.green);
        rect(0, -9, 12, 3, c.ink); rect(1, -8, 10, 2, "#edb99a");
        rect(1, -6, 10, 4, pot); rect(2, -2, 8, 2, "#9a756c");
        rect(2, -6, 2, 4, "#f0c6a1"); rect(9, -6, 1, 4, "#ab7466");
      });
    }
    function smallPlant(x,y) {
      rect(x+2,y-10,2,5,c.evergreen); rect(x,y-8,3,2,c.leaf);
      rect(x+4,y-10,3,3,c.green); rect(x+3,y-8,2,4,c.leaf);
      rect(x-1,y-5,9,2,c.ink); rect(x,y-4,7,4,c.peach);
      rect(x+1,y-1,5,1,c.woodDark);
    }
    function trailingVine(x,y,length) {
      for (let i=0;i<length;i++) {
        const side=i%2?-1:1,u=x+side,v=y+i*3;
        rect(u,v,1,4,c.evergreen);rect(u+side,v+1,2,2,c.leaf);
        rect(u+side,v+1,1,1,c.green);
      }
    }
    function books(x, y, count, palette) {
      let u = x;
      for (let i = 0; i < count; i++) {
        const h = 5 + i * 7 % 5;
        const w = 2 + (i % 2);
        rect(u,y-h,w,h,palette[i % palette.length]);
        rect(u,y-h+2,w,1,"#f7dec1");
        u += w + 1;
      }
    }
    function shelf(x,y,w) {
      frame(x,y,w,22,c.ink,c.wood,c.woodLight);
      rect(x+2,y+3,w-4,6,"#98765f"); rect(x+2,y+12,w-4,7,"#a58068");
      books(x+3,y+10,Math.min(7,Math.floor((w-5)/4)),[c.teal,c.peach,c.gold,c.violet]);
      books(x+3,y+20,Math.min(5,Math.floor((w-5)/4)),[c.coral,c.leaf,c.blue,c.lilac]);
      rect(x+1,y+10,w-2,2,c.woodLight); rect(x+1,y+20,w-2,1,c.woodLight);
    }
    function desk(x,y,w,d=12,white=false) {
      shade(x+2,y+8,w+2,d+2);
      rect(x+3,y+d,w-6,5,white?"#887e83":"#92684f");
      rect(x+3,y+d+3,3,6,c.dark); rect(x+w-7,y+d+3,3,6,c.dark);
      rect(x+4,y+d+3,1,4,c.woodLight); rect(x+w-6,y+d+3,1,4,c.woodLight);
      frame(x,y,w,d+3,c.ink,white?"#d9d4c5":c.wood,white?"#fff3d8":c.woodLight);
      rect(x+1,y+1,w-2,d,white?"#eae1cb":"#e4b17f");
      rect(x+2,y+1,w-4,1,white?"#fcf2d9":"#f5ca95");
      rect(x+1,y+d,w-2,1,white?"#bbb2ab":"#c38a65");
    }
    function monitor(x,y,w=20,mode="code") {
      frame(x,y,w,13,c.ink,c.darkTeal,"#89919a");
      rect(x+2,y+2,w-4,9,mode==="design"?"#d4b6d7":"#4c6676");
      if (mode==="design") {
        rect(x+2,y+2,3,9,"#887796"); rect(x+6,y+3,w-9,6,"#f7dfc8");
        rect(x+7,y+4,4,3,c.coral); rect(x+12,y+5,3,2,"#9db8a2");
      } else if (mode==="qa") {
        rect(x+3,y+3,w-6,1,"#a2d3d1");
        for (let i=0;i<3;i++) {rect(x+3,y+5+i*2,2,1,c.green);rect(x+6,y+5+i*2,w-10-i*2,1,"#b1c5b8");}
      } else {
        rect(x+3,y+3,5,1,c.peach); rect(x+5,y+5,7,1,"#9bc9be");
        rect(x+6,y+7,w-10,1,"#e8c68b"); rect(x+3,y+9,6,1,"#a7b7d2");
      }
      rect(x+w-4,y+11,1,1,c.green);
      const m=x+Math.floor(w/2);rect(m-1,y+13,3,2,c.dark);rect(m-4,y+15,9,1,c.ink);
    }
    function keyboard(x,y,w=14) {
      rect(x,y,w,4,c.ink); rect(x+1,y+1,w-2,2,"#c1bac0");
      for (let u=2;u<w-2;u+=3) rect(x+u,y+1,1,1,"#8b8a93");
      rect(x+w+2,y,3,3,c.muted); rect(x+w+2,y,2,1,c.white);
    }
    function mug(x,y) {
      rect(x+4,y-3,2,3,c.ink);rect(x,y-4,4,5,c.ink);rect(x,y-3,3,3,c.peach);rect(x+1,y-4,2,1,"#7d5b51");
    }
    function chair(x,y,tone=c.teal) {
      shade(x-1,y+5,18,4);
      rect(x+6,y+2,3,5,c.ink); rect(x+2,y+6,11,1,c.ink);
      rect(x+1,y+7,3,2,c.ink);rect(x+11,y+7,3,2,c.ink);
      frame(x+1,y-3,13,7,c.ink,tone,"#aebac0");frame(x,y-7,15,7,c.ink,tone,"#bcc7be");
    }
    function cabinet(x,y,w=19,light=false) {
      const base=light?"#a8b7ad":"#ab9ca9";
      shade(x+2,y+20,w,4);
      frame(x,y,w,23,c.ink,base,light?"#d4d9bc":"#c5bac1");
      for(let i=0;i<2;i++) {
        rect(x+2,y+3+i*9,w-4,7,light?"#bcc8b8":"#baabb8");
        rect(x+2,y+9+i*9,w-4,1,light?"#899e94":"#938293");
        rect(x+Math.floor(w/2)-2,y+5+i*9,5,2,c.dark);
      }
    }
    function notice(x,y,w,h,type) {
      frame(x,y,w,h,c.woodDark,type==="notes"?"#cda77b":"#f4e4c8","#efd4aa");
      if(type==="notes") {
        const notes=[c.gold,c.white,c.blue,c.lilac,c.peach];
        for(let i=0;i<5;i++) {
          const sx=x+3+(i*9)%(w-9), sy=y+3+(i*5)%(h-7);
          rect(sx+1,sy+1,5,5,"#ac8d77");rect(sx,sy,5,5,notes[i]);rect(sx+2,sy,1,1,c.muted);
        }
      } else {
        rect(x+3,y+3,w-6,2,"#cf9e8a");
        for(let i=0;i<3;i++){rect(x+4+i*4,y+h-5-i*2,3,2+i*2,[c.green,c.teal,c.coral][i]);}
      }
    }
    function clock(x,y) {
      rect(x+2,y,7,11,c.dark);rect(x,y+2,11,7,c.dark);
      rect(x+2,y+1,7,9,c.white);rect(x+1,y+2,9,7,c.white);
      rect(x+5,y+2,1,4,c.dark);rect(x+5,y+5,3,1,c.dark);rect(x+5,y+5,1,1,c.coral);
    }
    function sofa(x,y,w,tone,light) {
      shade(x+1,y+16,w+2,5);
      rect(x+3,y+16,3,4,c.woodDark);rect(x+w-6,y+16,3,4,c.woodDark);
      frame(x+2,y,w-4,10,c.dark,tone,light);
      frame(x+3,y+8,w-6,9,c.dark,tone,light);
      rect(x+Math.floor(w/2),y+9,1,7,c.dark+"bb");
      frame(x,y+5,5,12,c.dark,tone,light);frame(x+w-5,y+5,5,12,c.dark,tone,light);
    }
    function standingLamp(x,y) {
      rect(x-4,y,10,2,c.dark);rect(x,y-21,2,22,c.dark);
      rect(x-4,y-29,10,3,c.woodDark);rect(x-6,y-26,14,4,c.woodDark);
      rect(x-7,y-22,16,2,c.dark);rect(x-3,y-28,8,2,"#f5dcab");rect(x-5,y-26,12,4,"#ffe6b6");
    }
    function lightPatch(x,y,w,h) {
      for(let i=0;i<h;i++) rect(x-Math.floor(i/2),y+i,w,1,"#fff1bb24");
    }

    const materials=["honey","tile","clay","maple","maple","rose","sage","honey"];
    const wallPairs=[
      ["#edceb6","#e4b9a6"], ["#c9d5ca","#b6c6bd"], ["#ded5cf","#c7b9bc"], ["#e4c9ab","#d2b398"],
      ["#e9cfaf","#d7b89d"], ["#ead0bc","#dfbbaa"], ["#d9d3b8","#c4c5aa"], ["#d4d4c4","#c3c5b8"]
    ];
    function roomShell(i) {
      const x=(i%4)*150, y=i<4?0:199, bottom=i>=4;
      at(x,y,()=>{
        const h=bottom?161:150, wallH=bottom?39:40;
        flooring(3,wallH,145,h-wallH,materials[i]);
        rect(2,0,146,wallH,wallPairs[i][0]);
        rect(3,2,144,3,"#f6e4c9");rect(3,5,144,1,wallPairs[i][1]);
        rect(3,wallH-12,144,8,wallPairs[i][1]);
        for(let u=8;u<145;u+=17) rect(u,wallH-11,1,7,"#a78f8c55");
        rect(2,wallH-5,146,1,"#f1d6b5");rect(2,wallH-4,146,3,"#af9385");
        rect(3,wallH-1,144,1,"#8c7d7e");rect(3,wallH,144,2,"#7c687227");
        rect(0,0,150,2,c.ink);rect(1,2,2,h-2,c.dark);
        rect(3,2,2,h-2,i%2?"#beb6ad":"#c0aba2");rect(148,0,2,h,c.ink);
        if(bottom) {
          // The entrance is open on its north side, facing the shared corridor.
          flooring(62,0,27,wallH+2,materials[i]);
          rect(60,0,2,wallH,"#8e8081");rect(89,0,2,wallH,"#8e8081");
          rect(59,0,1,wallH,"#f4dec0");rect(91,0,1,wallH,"#f4dec0");
          rect(2,h-5,146,5,c.dark);rect(4,h-6,143,2,"#f0d8ba");rect(3,h-4,145,2,"#a99188");
        } else {
          for(const [u,w] of [[1,54],[96,53]]) {
            rect(u,h-10,w,10,c.ink);rect(u+1,h-9,w-2,2,"#f3dbbb");
            rect(u+1,h-7,w-2,5,"#c6afa0");rect(u+1,h-2,w-2,1,"#af978f");
          }
          rect(55,h-2,41,2,"#c4ac97");
        }
      });
    }
    for(let n=0;n<8;n++) roomShell(n);

    // The illustrator's room. The palette on the table echoes the pinned prints.
    at(0,0,()=>{
      windowView(84,7,39,24,2,true);
      notice(23,21,29,14,"notes");
      frame(56,16,16,17,c.woodDark,"#f8e4bd",c.white);
      rect(59,19,9,10,"#efb89a");rect(61,21,5,5,"#dc8a79");rect(65,24,3,4,c.green);
      lightPatch(77,41,36,19);
      rug(26,56,87,56,"#b78d99","#d1a6a3","#e9c1ae");
      cabinet(9,51,18);smallPlant(14,50);
      desk(43,65,62,13);monitor(48,54,21,"design");keyboard(49,71,12);
      frame(75,68,14,7,c.dark,"#e3c8c0");rect(77,69,10,4,"#9c91b5");
      rect(86,67,5,1,c.dark);mug(96,71);chair(68,95,c.violet);
      shelf(115,57,24);books(117,57,4,[c.peach,c.gold,c.teal]);
      plant(114,132,2);smallPlant(33,57);trailingVine(119,31,5);
      // A freestanding easel and an unfinished landscape.
      rect(19,99,2,21,c.woodDark);rect(31,99,2,21,c.woodDark);
      rect(24,86,3,20,c.woodDark);frame(13,92,24,17,c.woodDark,"#fbdeb4","#ffecd1");
      rect(16,95,18,10,"#b1c9c6");rect(26,96,3,3,c.gold);rect(16,102,18,3,"#84a58d");
      rect(18,101,6,2,c.leaf);rect(23,100,7,4,c.green);rect(12,108,26,2,c.woodDark);
    });
    // Engineering. Cooler flooring, a server rack and a dual-monitor station.
    at(150,0,()=>{
      windowView(82,8,44,24,7,true);notice(14,20,26,14,"graph");
      rect(49,23,20,2,"#817773");books(51,23,4,[c.leaf,c.gold,c.coral]);
      rug(35,59,77,51,"#8ca5aa","#b1bebe","#d0d4c7");
      frame(12,47,22,42,c.dark,"#63808a","#a8aeb0");
      for(let i=0;i<5;i++){
        frame(14,49+i*7,18,6,c.dark,"#61717f");
        rect(16,51+i*7,8,1,"#a5aebb");rect(28,51+i*7,2,1,i===2?c.peach:c.green);
      }
      desk(42,64,67,14,true);monitor(48,53,23);monitor(74,54,23);
      keyboard(64,72,17);mug(102,71);chair(68,95,c.teal);
      cabinet(117,65,20,true);smallPlant(121,65);
      frame(13,106,24,13,c.dark,"#b0afa8","#e0d3bd");rect(16,109,18,2,c.teal);
      rect(19,112,11,2,"#a7b7a8");rect(20,116,10,3,c.white);
      rect(13,119,24,3,c.woodDark);rect(15,122,2,4,c.dark);rect(33,122,2,4,c.dark);
      plant(126,131);
    });
    // Quality assurance. Test devices and a tall bench cart.
    at(300,0,()=>{
      windowView(88,8,37,23,5,false);notice(26,17,33,17,"graph");clock(67,19);
      rug(32,61,84,49,"#a299a8","#c3b5bc","#dfd1cd");
      desk(43,64,65,13,true);monitor(52,54,19,"qa");keyboard(54,71,12);
      frame(78,60,10,13,c.dark,c.blue,"#a7bcbe");rect(80,62,6,7,"#b9c8ca");
      rect(80,62,6,2,"#9c8bb3");rect(82,70,2,1,c.white);
      frame(93,64,6,9,c.dark,"#8db5ab");rect(94,66,4,2,c.gold);chair(68,95,c.violet);
      cabinet(10,56,22,true);frame(13,47,13,9,c.dark,"#99c7be");rect(15,49,8,2,c.white);
      shelf(115,62,25);smallPlant(121,61);
      desk(10,105,28,8,true);frame(15,98,10,10,c.dark,c.blue);rect(17,101,5,3,c.green);
      rect(26,103,6,3,c.lilac);plant(127,130,1,"#a49bb0");
    });
    // Meeting room. Chairs, a projection screen, notebook and table centerpiece.
    at(450,0,()=>{
      frame(37,12,49,21,c.dark,"#efe6cf","#f9eaca");
      rect(40,15,43,14,"#d5dfd2");rect(43,17,16,2,c.teal);
      rect(43,21,7,5,"#81a9a2");rect(52,22,6,4,c.gold);rect(62,20,15,1,"#a1adb3");
      rect(62,23,10,1,"#a1adb3");rect(35,11,53,2,c.dark);
      windowView(100,6,33,26,5,true);lightPatch(90,41,31,21);
      rug(23,56,105,60,"#9b938d","#bab5a0","#e1cfaf");
      for(const x of [47,70,93]) chair(x,65,c.teal);
      desk(33,70,85,16);frame(84,73,13,8,c.dark,c.white,c.white);
      rect(86,76,5,1,c.violet);rect(38,74,9,5,c.white);mug(51,76);smallPlant(69,80);
      for(const x of [47,69,92]) chair(x,96,c.teal);
      plant(12,106);shelf(119,53,22);
      standingLamp(126,128);
    });

    // Transit hall. Keep the centre stripe and all four doorway lanes walkable.
    flooring(0,150,600,49,"clay");
    rect(0,151,600,2,"#f3debd");rect(0,195,600,2,"#b4a19c");
    rect(1,150,3,49,c.dark);rect(597,150,3,49,c.dark);
    rug(9,166,582,20,"#a1a2a0","#b5b6a8","#d6ceb5");
    for(let x=16;x<590;x+=24) {
      rect(x,175,2,2,"#a6aba0");rect(x+2,174,2,1,"#a6aba0");rect(x+2,177,2,1,"#a6aba0");
    }
    plant(18,166);plant(575,194);plant(327,163);
    function hallBench(x,y,w) {
      shade(x,y+5,w+2,4);rect(x+2,y+2,3,7,c.dark);rect(x+w-5,y+2,3,7,c.dark);
      frame(x,y-6,w,12,c.woodDark,"#d8ae83","#efc8a0");
      rect(x+1,y-2,w-2,1,"#ab846b");rect(x+1,y+2,w-2,1,"#ab846b");
      rect(x+2,y-4,1,8,"#f0caa4");rect(x+w-3,y-4,1,8,"#b78a6d");
    }
    hallBench(119,155,32);hallBench(475,155,30);

    // Lounge. The main game character can sit on the velvet settee.
    at(0,199,()=>{
      windowView(12,16,36,17,4,false);windowView(97,8,35,24,3,true);
      lightPatch(95,41,31,21);rug(22,65,106,62,"#b5888a","#d5aaa1","#ecc8ac");
      sofa(48,78,52,"#709b93","#9fbc9f");
      frame(53,81,10,7,c.dark,"#dba881",c.gold);frame(83,82,10,7,c.dark,c.lilac,"#cdb7ce");
      // Low coffee table below the seat leaves its northern approach free.
      desk(54,109,39,8);mug(58,113);rect(72,110,11,4,c.violet);rect(73,110,8,1,c.white);
      standingLamp(31,88);plant(120,104);
      // Espresso machine, jars, and a tiny milk jug on the kitchenette.
      cabinet(9,48,31,true);cabinet(39,48,17,true);
      frame(11,40,15,11,c.dark,"#799093","#a8b2af");rect(14,43,9,2,c.ink);
      rect(15,45,4,4,c.white);rect(20,46,2,2,c.gold);rect(29,42,5,7,c.woodDark);
      rect(29,42,5,2,c.white);rect(37,43,5,5,c.blue);smallPlant(46,48);
      shelf(7,119,24);smallPlant(13,118);
      sofa(103,123,30,"#ab98a8","#d0bbc4");
    });
    // Marketing. The campaign pinboard and photography corner make this room distinct.
    at(150,199,()=>{
      notice(17,17,29,16,"notes");windowView(97,8,37,24,8,true);
      rug(30,69,87,53,"#bc959b","#d8b4ad","#ecd1b6");
      chair(68,89,c.coral);desk(45,98,60,13);
      monitor(50,88,21,"design");keyboard(52,105,12);
      rect(79,100,12,5,c.white);rect(80,101,5,2,c.coral);rect(86,101,3,1,c.violet);mug(97,105);
      shelf(10,56,26);books(12,56,4,[c.teal,c.gold,c.peach]);
      plant(118,79,1);trailingVine(131,31,6);
      frame(110,103,28,17,c.dark,"#ddbca2","#efceb0");
      rect(113,105,22,12,"#d1a8b0");rect(115,107,5,5,"#f3d7ae");
      rect(123,110,9,6,c.teal);rect(125,108,5,4,c.teal);
      rect(113,120,2,8,c.woodDark);rect(132,120,2,8,c.woodDark);
      // Tripod camera points towards the product backdrop.
      frame(15,108,15,8,c.dark,"#777987","#a4a7a5");rect(26,109,6,4,c.ink);
      rect(19,116,2,13,c.dark);rect(16,126,3,3,c.dark);rect(13,129,3,2,c.dark);
      rect(22,123,2,5,c.dark);rect(24,128,3,3,c.dark);
    });
    // People team. A welcoming coral chair and an upholstered sofa for interviews.
    at(300,199,()=>{
      notice(22,16,24,17,"notes");windowView(99,9,36,23,3,true);
      rug(34,68,80,54,"#9ba88f","#bfc3a3","#dfe0bf");
      chair(68,89,c.teal);desk(47,99,57,12,true);
      monitor(52,88,18,"qa");keyboard(54,105,12);
      frame(80,101,10,6,c.violet,c.white);rect(82,103,5,1,c.shadow);mug(97,105);
      sofa(7,63,36,"#b98d83","#dfb199");standingLamp(46,85);
      shelf(116,53,23);smallPlant(120,53);plant(123,129);
      cabinet(17,106,19,true);rect(17,105,16,2,c.lilac);rect(17,103,13,2,c.white);
    });
    // Operations. Packing supplies, file storage, dispatch terminal and trolley.
    at(450,199,()=>{
      windowView(13,16,32,17,6,false);notice(98,12,28,21,"graph");clock(130,20);
      rug(35,70,76,51,"#939b9f","#b6b8ad","#d7cebb");
      chair(68,89,c.teal);desk(48,99,60,12);monitor(52,88,21);keyboard(55,105,13);
      frame(80,100,12,8,c.dark,c.white);rect(82,102,8,1,c.teal);rect(82,105,5,1,c.shadow);
      mug(100,104);cabinet(10,55,22,true);cabinet(32,55,17,true);
      books(12,55,5,[c.teal,c.lilac,c.coral]);smallPlant(37,55);
      function box(x,y,w,h) {
        frame(x,y,w,h,c.woodDark,"#c99b71","#ebc69a");
        rect(x+Math.floor(w/2)-1,y+1,3,h-2,"#e4bf86");rect(x+2,y+h-5,4,3,c.white);
      }
      box(118,54,20,13);box(114,68,17,13);box(131,69,12,12);
      rect(11,122,24,3,"#817e87");rect(11,106,2,16,c.dark);rect(10,105,5,2,c.dark);
      rect(14,125,4,3,c.dark);rect(28,125,4,3,c.dark);
      box(16,111,18,11);box(21,101,12,10);plant(124,134);
    });
  };
})();
