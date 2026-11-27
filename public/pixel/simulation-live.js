/* Live engine for the pixel office: same OfficeSim API as simulation.js,
   but people/jobs/status come from the real HQ API (/api/state) instead of
   the scripted demo. Giao việc / nhắn tin / thêm bot go out through the
   office outbox (POST /api/send-message, /api/create-bot) and reach the
   real Muse side chats via the HQ sync relay. */
const OfficeSim = (() => {
  const departments = {
    design:{name:"Thiết kế", x:75,y:103}, engineering:{name:"Kỹ thuật",x:225,y:103},
    qa:{name:"Kiểm thử",x:375,y:103}, marketing:{name:"Marketing",x:225,y:293},
    hr:{name:"Nhân sự",x:375,y:293}, ops:{name:"Vận hành",x:525,y:293}
  };
  const deptIds = Object.keys(departments);
  // Stable room + sprite style per known side chat; new bots fall back to a hash.
  const known = {
    "agent-office":{dept:"design",style:0}, "config-agent":{dept:"engineering",style:2},
    "deepseek-bot":{dept:"qa",style:6}, "hot-repo":{dept:"marketing",style:5},
    "canton-network":{dept:"hr",style:4}, "custom-cursor":{dept:"ops",style:1}
  };
  const shirtColors = ["#c06c79","#6b91ad","#8a79a8","#d68b68","#82a18c","#b39b66","#5b998a","#9a80ae"];
  const statusMeta = {
    working:{label:"Đang làm",tone:"green",icon:"briefcase"},
    done:{label:"Vừa xong",tone:"green",icon:"check"},
    waiting:{label:"Chờ bạn duyệt",tone:"gold",icon:"alert"},
    idle:{label:"Sẵn sàng",tone:"lilac",icon:"coffee"},
    sleeping:{label:"Đang nghỉ",tone:"lilac",icon:"coffee"}
  };
  let s;
  let pollTimer = null, lastSignature = "", authBlocked = false, netWarned = false;
  const localMessages = new Map(); // chatId -> [{text, atLabel}]
  const chatMeta = new Map(); // chatId -> {name, snippet, lastActive} as last seen from the API
  const person = id => s.people.find(p => p.id === id);
  function change(){ s.version++; }
  function log(text, icon="activity", tone="violet"){ s.events.unshift({text, icon, tone, at:s.t}); s.events.length = Math.min(60, s.events.length); change(); }

  // --- HQ API (same key flow as the React office: localStorage "hq-key") ---
  function getKey(){ try { return localStorage.getItem("hq-key") || ""; } catch { return ""; } }
  function setKey(k){ try { k ? localStorage.setItem("hq-key", k) : localStorage.removeItem("hq-key"); } catch {} }
  async function api(path, options, retried){
    const headers = { ...(options && options.headers ? options.headers : {}) };
    const key = getKey();
    if (key) headers["x-hq-key"] = key;
    const res = await fetch(path, { ...options, headers });
    if (res.status === 401 && !retried){
      const entered = window.prompt("Office này có khoá — nhập mật khẩu office:");
      if (entered){ setKey(entered); return api(path, options, true); }
      setKey(""); authBlocked = true; throw new Error("401");
    }
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  // --- Scene movement (same router as the demo sim) ---
  function desk(p){
    const d = departments[p.dept], i = s.people.filter(q => q.dept === p.dept).indexOf(p);
    return [d.x + [0,-19,19,-26,26][i % 5], d.y + Math.floor(i / 5) * 6];
  }
  function lounge(p){
    const spots = [[75,293],[58,293],[92,293],[118,335],[32,315],[94,322],[51,318]];
    const busy = s.people.filter(q => q !== p && (q.pose === "rest" || q.arrival === "rest")).map(q => q.path.length ? q.path[q.path.length-1] : [q.x, q.y]);
    return spots.find(([x,y]) => busy.every(([a,b]) => Math.hypot(x-a, y-b) > 9)) || spots[s.people.indexOf(p) % spots.length];
  }
  function meetingSpot(p){
    const spots = [[500,128],[550,128],[525,140]];
    const busy = s.people.filter(q => q !== p && q.arrival === "stand").map(q => q.path.length ? q.path[q.path.length-1] : [q.x, q.y]);
    return spots.find(([x,y]) => busy.every(([a,b]) => Math.hypot(x-a, y-b) > 9)) || spots[s.people.indexOf(p) % spots.length];
  }
  function route(p, [x,y], arrival){
    const way = [], cx = v => Math.min(525, Math.max(75, Math.floor(v/150)*150 + 75));
    if (Math.hypot(x - p.x, y - p.y) > 1){
      if (p.y !== 177){ way.push([cx(p.x), p.y], [cx(p.x), 177]); }
      if (y !== 177){ way.push([cx(x), 177], [cx(x), y]); }
      way.push([x, y]);
    }
    let prev = [p.x, p.y];
    p.path = way.filter(pt => { const diff = Math.hypot(pt[0]-prev[0], pt[1]-prev[1]) > .3; prev = pt; return diff; });
    p.arrival = arrival; p.pose = p.path.length ? "walk" : arrival;
    if (!p.path.length) p.facing = "down";
    change();
  }
  function move(p, dt){
    let left = dt * 53;
    while (left > 0 && p.path.length){
      const [x,y] = p.path[0], dx = x - p.x, dy = y - p.y, dist = Math.hypot(dx, dy);
      if (dist < .01){ p.path.shift(); continue; }
      p.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
      const step = Math.min(left, dist); p.x += dx * step / dist; p.y += dy * step / dist; left -= step;
      if (step === dist){ p.x = x; p.y = y; p.path.shift(); }
    }
    if (p.pose === "walk" && !p.path.length){ p.pose = p.arrival; p.facing = "down"; }
  }

  // --- Mapping HQ chats -> people ---
  function placement(chat){
    if (known[chat.id]) return known[chat.id];
    let h = 0; for (const c of chat.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return { dept: deptIds[h % deptIds.length], style: h % 8 };
  }
  function makePerson(chat){
    const pl = placement(chat);
    const p = { id: chat.id, name: chat.name, role: chat.sub || "Side chat", dept: pl.dept, style: pl.style,
      color: chat.color || shirtColors[pl.style], x: 0, y: 0, pose: "idle", facing: "down", path: [], arrival: "idle",
      queue: [], job: null, assist: null, last: null, hqStatus: "", hqLabel: "", snippet: "", localJobTitle: "" };
    const d = departments[p.dept]; p.x = d.x; p.y = d.y;
    return p;
  }
  function jobFrom(chat){
    if (!chat.task) return null;
    const checks = Array.isArray(chat.checklist) ? chat.checklist : [];
    const steps = checks.map(c => c.text);
    return { title: chat.task, steps: steps.length ? steps : ["Đang thực hiện"],
      done: steps.length ? checks.filter(c => c.done).length : 0, phase: "work" };
  }
  function applyStatus(p, chat, first){
    const st = chat.status || "idle";
    const meta = statusMeta[st] || statusMeta.idle;
    const changed = p.hqStatus !== st;
    p.hqStatus = st; p.hqLabel = chat.statusLabel || meta.label;
    if (st === "working" || st === "done") route(p, desk(p), "work");
    else if (st === "waiting") route(p, meetingSpot(p), "stand");
    else if (st === "sleeping") route(p, lounge(p), "rest");
    else route(p, desk(p), "sit");
    if (!first && changed) log(p.name + " · " + p.hqLabel + (chat.task ? " — " + chat.task : ""), meta.icon, meta.tone);
    if (st === "waiting"){
      const text = String(chat.bubble || chat.snippet || "Đang chờ bạn duyệt").slice(0, 90);
      s.speech = { id: p.id, text, until: s.t + 40 };
    } else if (st === "done" && (changed || first) && chat.snippet){
      s.speech = { id: p.id, text: String(chat.snippet).slice(0, 90), until: s.t + 7 };
    }
  }
  function rebuildMessages(){
    const msgs = [];
    for (const p of s.people){
      const meta = chatMeta.get(p.id);
      if (meta && meta.snippet) msgs.push({ sender: meta.name, people: [p.id], text: meta.snippet, at: 0, atLabel: meta.lastActive || "" });
      for (const m of (localMessages.get(p.id) || [])) msgs.push({ sender: "Bạn", people: [p.id], text: m.text, at: 0, atLabel: m.atLabel });
    }
    s.messages = msgs;
  }
  function applyState(data){
    const chats = data.chats || [];
    const signature = JSON.stringify(chats.map(c => [c.id, c.status, c.task, c.snippet, c.lastActive,
      (c.checklist || []).map(x => x.done ? 1 : 0).join(""), (c.checklist || []).map(x => x.text).join("|")]));
    const first = !lastSignature;
    if (signature === lastSignature && !first) return;
    lastSignature = signature;
    // Drop placeholders whose real chat has arrived.
    const names = new Set(chats.map(c => c.name.trim().toLowerCase()));
    s.people = s.people.filter(p => !p.pending || !names.has(p.name.trim().toLowerCase()));
    for (const chat of chats){
      let p = person(chat.id);
      if (!p){ p = makePerson(chat); s.people.push(p); [p.x, p.y] = desk(p); }
      p.name = chat.name; p.role = chat.sub || p.role; p.color = chat.color || p.color;
      p.snippet = chat.snippet || "";
      chatMeta.set(chat.id, { name: chat.name, snippet: chat.snippet || "", lastActive: chat.lastActive || "" });
      if (p.localJobTitle && chat.task !== p.localJobTitle){
        // Server has not caught up with the job just assigned from the office.
        p.job = { title: p.localJobTitle, steps: ["Chờ side chat nhận việc"], done: 0, phase: "work" };
      } else { p.localJobTitle = ""; p.job = jobFrom(chat); }
      applyStatus(p, chat, first);
    }
    const serverIds = new Set(chats.map(c => c.id));
    s.people = s.people.filter(p => p.pending || serverIds.has(p.id));
    rebuildMessages();
    if (first) log("Đã nối dữ liệu HQ thật · " + chats.length + " side chat.", "check", "green");
    change();
  }
  async function poll(){
    if (authBlocked) return;
    try {
      const data = await api("/api/state");
      netWarned = false;
      applyState(data);
    } catch (e) {
      if (!netWarned && lastSignature){ netWarned = true; log("Mất nối HQ — đang thử lại mỗi 30 giây.", "alert", "gold"); }
    }
  }

  function reset(){
    s = { t: 0, version: 0, people: [], events: [], messages: [], incidents: [], serial: 0, paused: false, speech: null };
    if (!pollTimer){ poll(); pollTimer = setInterval(poll, 30000); }
    else poll();
    return s;
  }
  function status(p){ return p.hqLabel || (statusMeta[p.hqStatus] || statusMeta.idle).label; }
  function color(p){ return (statusMeta[p.hqStatus] || statusMeta.idle).tone; }

  function post(path, body){
    return api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  }
  function noteLocal(chatId, text, atLabel){
    if (!localMessages.has(chatId)) localMessages.set(chatId, []);
    localMessages.get(chatId).push({ text, atLabel });
    rebuildMessages();
    change();
  }
  function assign(p, title){
    if (!p || p.pending) return;
    p.localJobTitle = title;
    p.job = { title, steps: ["Chờ side chat nhận việc"], done: 0, phase: "work" };
    log("Đã giao việc “" + title + "” cho " + p.name + " · chờ đồng bộ.", "briefcase", "green");
    post("/api/send-message", { chatId: p.id, text: title });
    change();
  }
  function message(sender, recipients, text){
    const chatId = recipients && recipients[0];
    const p = chatId && person(chatId);
    if (!p || p.pending) return;
    noteLocal(chatId, text, "vừa gửi");
    post("/api/send-message", { chatId, text });
  }
  function add(name, role, dept, style){
    const p = { id: "pending-" + Date.now().toString(36), name, role: role || "Side chat", dept, style,
      color: shirtColors[style % 8], x: 0, y: 0, pose: "sit", facing: "down", path: [], arrival: "sit",
      queue: [], job: null, assist: null, last: null, hqStatus: "idle", hqLabel: "Đang tạo…", snippet: "", localJobTitle: "", pending: true };
    s.people.push(p); [p.x, p.y] = desk(p);
    log(name + " · đã gửi yêu cầu tạo bot, chờ side chat mới xuất hiện.", "users", "green");
    post("/api/create-bot", { name, purpose: role, color: shirtColors[style % 8] });
    change();
    return p;
  }
  function edit(p, name, role, dept, style){ if (!p) return; Object.assign(p, { name, role, dept, style }); if (!p.path.length) [p.x, p.y] = desk(p); change(); }
  function remove(p){ if (!p) return; s.people = s.people.filter(q => q !== p); change(); }
  function decide(){ /* Live mode: QC duyệt việc diễn ra trong side chat thật, không qua office. */ }
  function tick(dt){
    if (s.paused) return;
    s.t += dt;
    for (const p of s.people) move(p, dt);
    if (s.speech && s.t >= s.speech.until){ s.speech = null; change(); }
  }
  return { reset, get state(){ return s; }, departments, person, status, color, assign, add, edit, remove, message, decide, tick };
})();
