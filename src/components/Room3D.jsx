import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Interactive 3D version of the office (like the reference video):
// drag to orbit, scroll to zoom, click a blob to select its chat.
// Floor 1 = work desks, floor 2 = lounge for idle / sleeping blobs.
const DESK_SLOTS = [
  { x: -3.9, z: -1.7 },
  { x: 0, z: -1.7 },
  { x: 3.9, z: -1.7 },
  { x: -3.9, z: 1.5 },
  { x: 0, z: 1.5 },
  { x: 3.9, z: 1.5 },
];
const REST_SLOTS = [
  { x: -4.25, z: -0.9 },
  { x: -2.55, z: -0.9 },
  { x: -0.85, z: -0.9 },
  { x: 0.85, z: -0.9 },
  { x: 2.55, z: -0.9 },
  { x: 4.25, z: -0.9 },
];
const DESK_STATUSES = new Set(['working', 'waiting', 'done']);
const FLOOR2_TOP = 3.3;

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function plateTexture(name, statusLabel) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 120;
  const ctx = c.getContext('2d');
  roundedRect(ctx, 4, 4, 504, 112, 26);
  ctx.fillStyle = '#2e3440';
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 42px Quicksand, sans-serif';
  ctx.fillText(name, 256, 55, 480);
  ctx.fillStyle = '#aeb8c8';
  ctx.font = '600 27px Quicksand, sans-serif';
  ctx.fillText((statusLabel || '').toUpperCase(), 256, 95, 480);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function bubbleTexture(text) {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 128;
  const ctx = c.getContext('2d');
  roundedRect(ctx, 6, 6, 628, 100, 30);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(430, 100);
  ctx.lineTo(478, 100);
  ctx.lineTo(452, 126);
  ctx.closePath();
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2e3440';
  ctx.font = '700 37px Quicksand, sans-serif';
  const t = text.length > 34 ? `${text.slice(0, 33)}…` : text;
  ctx.fillText(t, 320, 68, 600);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function wallLabelTexture(text, color) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 96;
  const ctx = c.getContext('2d');
  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  ctx.font = '700 62px Quicksand, sans-serif';
  ctx.fillText(text, 8, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function whiteboardTexture() {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 224;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 640, 224);
  ctx.fillStyle = '#40513c';
  ctx.font = '700 34px Quicksand, sans-serif';
  ctx.fillText('KẾ HOẠCH TUẦN', 28, 48);
  ctx.strokeStyle = '#3b93f0';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const pts = [[28, 168], [130, 138], [224, 152], [330, 96], [436, 112], [560, 62]];
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
  ctx.fillStyle = '#e3e8db';
  roundedRect(ctx, 330, 150, 180, 16, 8);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts });
}

function box(w, h, d, color, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function buildBuilding(scene) {
  const g = new THREE.Group();

  // ground shadow-catcher
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat('#e2e9d8', { roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.37;
  ground.receiveShadow = true;
  g.add(ground);

  // floor 1 slab + sage top
  g.add(box(12.4, 0.35, 7, '#b08968', 0, -0.175, 0));
  const f1 = new THREE.Mesh(new THREE.PlaneGeometry(12.4, 7), mat('#a9c6a0', { roughness: 1 }));
  f1.rotation.x = -Math.PI / 2;
  f1.position.y = 0.005;
  f1.receiveShadow = true;
  g.add(f1);

  // floor 2 slab: a MEZZANINE (depth 5, not the full 7) so floor 1's front
  // row stands in the open and its back row stays visible under the slab.
  // Plus a back strip that stops at x=3.4, leaving a stairwell along the back-right.
  g.add(box(11.1, 0.35, 5.0, '#b08968', -0.65, FLOOR2_TOP - 0.175, -1.0));
  const f2 = new THREE.Mesh(new THREE.PlaneGeometry(11.1, 5.0), mat('#ddd2f3', { roughness: 1 }));
  f2.rotation.x = -Math.PI / 2;
  f2.position.set(-0.65, FLOOR2_TOP + 0.005, -1.0);
  f2.receiveShadow = true;
  g.add(f2);
  g.add(box(9.6, 0.35, 0.95, '#b08968', -1.4, FLOOR2_TOP - 0.175, -3.025));
  const f2b = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 0.95), mat('#ddd2f3', { roughness: 1 }));
  f2b.rotation.x = -Math.PI / 2;
  f2b.position.set(-1.4, FLOOR2_TOP + 0.005, -3.025);
  f2b.receiveShadow = true;
  g.add(f2b);

  // walls: back + left only, so the interior stays visible while orbiting
  g.add(box(12.4, 6.6, 0.25, '#ece6fa', 0, 3.3, -3.62, { roughness: 1 }));
  g.add(box(0.25, 6.6, 7, '#e3dbf7', -6.32, 3.3, 0, { roughness: 1 }));
  // trim between floors on the back wall
  g.add(box(12.4, 0.18, 0.06, '#b08968', 0, FLOOR2_TOP - 0.05, -3.48));
  // roof slab
  g.add(box(12.9, 0.28, 7.5, '#d3c8f5', 0, 6.74, 0));

  // floor labels on the back wall
  const mkLabel = (text, color, x, y) => {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(3.7, 0.35),
      new THREE.MeshBasicMaterial({ map: wallLabelTexture(text, color), transparent: true })
    );
    p.position.set(x, y, -3.48);
    g.add(p);
  };
  mkLabel('TẦNG 2 · NGHỈ NGƠI', '#574f7a', -4.25, 5.82);
  // floor-1 label lives on the LEFT wall (the back wall is under the mezzanine)
  const f1Label = new THREE.Mesh(
    new THREE.PlaneGeometry(3.7, 0.35),
    new THREE.MeshBasicMaterial({ map: wallLabelTexture('TẦNG 1 · LÀM VIỆC', '#47603f'), transparent: true })
  );
  f1Label.rotation.y = Math.PI / 2;
  f1Label.position.set(-6.17, 2.78, -2.4);
  g.add(f1Label);

  // staircase along the back wall (right side), rising left to right;
  // sitting behind the desks so it never blocks them from the front.
  for (let i = 0; i < 6; i += 1) {
    const h = (i + 1) * (FLOOR2_TOP / 6);
    g.add(box(0.47, h, 0.9, '#c3a06d', 3.63 + i * 0.47, h / 2, -3.02));
  }

  // ---- floor 2 furniture ----
  // TV on the back wall
  g.add(box(2.3, 1.15, 0.09, '#2e3440', 1.2, 5.25, -3.44));
  const tvScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.05, 0.92),
    new THREE.MeshStandardMaterial({ color: '#31445c', emissive: '#22384f', roughness: 0.4 })
  );
  tvScreen.position.set(1.2, 5.25, -3.39);
  g.add(tvScreen);
  // bookshelf on the back-left
  const shelf = new THREE.Group();
  shelf.position.set(-5.35, FLOOR2_TOP, -3.2);
  shelf.add(box(1.15, 1.7, 0.34, '#b08968', 0, 0.85, 0));
  const spineColors = ['#e8483f', '#f0b429', '#3ecf8e', '#3b93f0', '#8b5cf6', '#e152b0'];
  [0.42, 0.92, 1.42].forEach((yy) => {
    spineColors.forEach((c, i) => {
      const b = box(0.13, 0.34, 0.2, c, -0.42 + i * 0.17, yy, 0.1);
      b.castShadow = false;
      shelf.add(b);
    });
  });
  g.add(shelf);
  // sofa along the left wall
  const sofa = new THREE.Group();
  sofa.position.set(-5.55, FLOOR2_TOP, 0.1);
  sofa.add(box(0.95, 0.42, 2.7, '#d96c47', 0, 0.21, 0));
  sofa.add(box(0.28, 0.85, 2.7, '#c95f3a', -0.36, 0.43, 0));
  sofa.add(box(0.95, 0.55, 0.28, '#c95f3a', 0, 0.28, 1.32));
  sofa.add(box(0.95, 0.55, 0.28, '#c95f3a', 0, 0.28, -1.32));
  g.add(sofa);
  // clock on the back wall
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), mat('#ffffff', { roughness: 0.5 }));
  clock.position.set(-3.3, 5.55, -3.48);
  g.add(clock);
  g.add(box(0.045, 0.19, 0.02, '#2e3440', -3.3, 5.6, -3.46));
  const hand2 = box(0.045, 0.15, 0.02, '#2e3440', -3.24, 5.52, -3.46);
  hand2.rotation.z = -0.9;
  g.add(hand2);

  // ---- floor 1 furniture ----
  // whiteboard with chart texture, on the LEFT wall where the camera can see it
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.3, 3.6), mat('#c9cfda'));
  board.position.set(-6.16, 1.9, -0.5);
  board.castShadow = true;
  g.add(board);
  const boardFace = new THREE.Mesh(
    new THREE.PlaneGeometry(3.44, 1.18),
    new THREE.MeshBasicMaterial({ map: whiteboardTexture() })
  );
  boardFace.rotation.y = Math.PI / 2;
  boardFace.position.set(-6.11, 1.9, -0.5);
  g.add(boardFace);

  // plants
  const plant = (x, y, z, s = 1) => {
    const p = new THREE.Group();
    p.position.set(x, y, z);
    p.scale.setScalar(s);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.26, 20), mat('#d96c47'));
    pot.position.y = 0.13;
    pot.castShadow = true;
    p.add(pot);
    [[0, 0.48, 0, 0.21], [-0.13, 0.4, 0.04, 0.15], [0.13, 0.42, -0.03, 0.16]].forEach(([px, py, pz, r], i) => {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat(i % 2 ? '#5d8a5f' : '#4e7a51'));
      leaf.position.set(px, py, pz);
      leaf.castShadow = true;
      p.add(leaf);
    });
    g.add(p);
  };
  plant(3.0, FLOOR2_TOP, -3.0, 1.05);
  plant(-5.65, 0, -2.95);
  plant(5.65, 0, 2.95, 1.1);

  scene.add(g);
}

function buildStation(chat, slot, variant, index) {
  const st = new THREE.Group();
  const isDesk = variant === 'desk';
  st.position.set(slot.x, isDesk ? 0 : FLOOR2_TOP, slot.z || 0);

  const bodyG = new THREE.Group();
  const baseY = isDesk ? 0.64 : 0.5;
  bodyG.position.y = baseY;
  bodyG.position.z = isDesk ? -0.08 : 0;
  st.add(bodyG);

  // rig: desk blobs are scaled up so they read clearly over their desks
  const rig = new THREE.Group();
  if (isDesk) rig.scale.setScalar(1.22);
  bodyG.add(rig);

  const color = new THREE.Color(chat.color);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 36, 28), mat(chat.color, { roughness: 0.55 }));
  body.castShadow = true;
  body.userData.chatId = chat.id;
  rig.add(body);

  // dot arms, small gap from the body
  [-0.52, 0.52].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), mat(chat.color, { roughness: 0.55 }));
    arm.position.set(ax, -0.03, 0.05);
    arm.castShadow = true;
    rig.add(arm);
  });

  // white pill eyes
  const eyesG = new THREE.Group();
  [-0.14, 0.14].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), mat('#ffffff', { roughness: 0.35 }));
    eye.scale.set(1, 1.5, 0.55);
    eye.position.set(ex, 0.06, 0.365);
    eyesG.add(eye);
  });
  rig.add(eyesG);

  // thinking dots (working): three white dots on the belly
  const thinkG = new THREE.Group();
  [-0.15, 0, 0.15].forEach((dx) => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), mat('#ffffff', { roughness: 0.4 }));
    d.position.set(dx, -0.14, 0.4);
    thinkG.add(d);
  });
  thinkG.visible = false;
  rig.add(thinkG);

  let bubble = null;
  if (chat.status === 'waiting' && chat.bubble) {
    bubble = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: bubbleTexture(chat.bubble), transparent: true, depthWrite: false })
    );
    bubble.scale.set(2.15, 0.43, 1);
    bubble.position.set(-0.35, 1.42, 0);
    st.add(bubble);
  }

  let zzz = null;
  if (chat.status === 'sleeping') {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#7a8699';
    ctx.font = '700 84px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Zzz', 128, 88);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    zzz = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    zzz.scale.set(0.85, 0.43, 1);
    zzz.position.set(0.62, 1.05, 0);
    st.add(zzz);
  }

  // selection halo on the floor
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.78, 40),
    new THREE.MeshBasicMaterial({ color: '#f5a623', transparent: true, opacity: 0.7, side: THREE.DoubleSide })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.02;
  if (isDesk) halo.scale.setScalar(1.25);
  halo.visible = false;
  st.add(halo);

  // name plate
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.66, 0.39),
    new THREE.MeshBasicMaterial({ map: plateTexture(chat.name, chat.statusLabel), transparent: true })
  );

  if (isDesk) {
    const desk = new THREE.Group();
    desk.position.set(0, 0, 0.52);
    desk.add(box(2.0, 0.09, 0.95, '#dec49a', 0, 0.47, 0));
    desk.add(box(2.0, 0.44, 0.07, '#c3a06d', 0, 0.22, 0.44));
    // monitor
    const mon = new THREE.Group();
    mon.position.set(0.45, 0.51, -0.05);
    mon.rotation.y = -0.16;
    mon.add(box(0.64, 0.44, 0.05, '#2e3440', 0, 0.28, 0));
    const scr = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.35),
      new THREE.MeshStandardMaterial({ color: '#7dd3fc', emissive: '#3d7ea6', roughness: 0.35 })
    );
    scr.position.set(0, 0.28, 0.03);
    mon.add(scr);
    mon.add(box(0.09, 0.1, 0.05, '#2e3440', 0, 0.02, 0));
    desk.add(mon);
    // paper sheet
    const paper = box(0.44, 0.02, 0.3, '#ffffff', -0.55, 0.53, 0.05);
    paper.rotation.y = 0.3;
    desk.add(paper);
    st.add(desk);
    plate.position.set(0, 0.27, 0.995);
    st.add(plate);
  } else {
    // beanbag in the chat's own color, faded
    const bag = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 24, 18),
      mat(chat.color, { roughness: 1, transparent: true, opacity: 0.32 })
    );
    bag.scale.set(1.15, 0.38, 1.15);
    bag.position.y = 0.07;
    bag.receiveShadow = true;
    st.add(bag);
    plate.position.set(0, 0.2, 0.78);
    st.add(plate);
  }

  return { group: st, bodyG, body, eyesG, thinkG, halo, zzz, baseY, index, chat };
}

export default function Room3D({ chats, selectedId, gazeN, onSelect }) {
  const mountRef = useRef(null);
  const stateRef = useRef({ stations: [], bodies: [] });
  const propsRef = useRef({ chats, selectedId, gazeN, onSelect });
  propsRef.current = { chats, selectedId, gazeN, onSelect };
  const chatsSig = JSON.stringify(
    chats.map((c) => [c.id, c.status, c.color, c.name, c.statusLabel, c.bubble || '', !!c.hop])
  );

  // scene setup (once)
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(8.0, 7.4, 14.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2.45, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 8.5;
    controls.maxDistance = 24;
    controls.minPolarAngle = 0.3;
    controls.maxPolarAngle = 1.42;
    controls.minAzimuthAngle = -1.2;
    controls.maxAzimuthAngle = 1.2;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8fae86, 1.15));
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(7, 13, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xdfe9ff, 0.45);
    fill.position.set(-8, 6, -6);
    scene.add(fill);

    buildBuilding(scene);
    const stationsRoot = new THREE.Group();
    scene.add(stationsRoot);
    stateRef.current.stationsRoot = stationsRoot;
    stateRef.current.sceneReady = true;

    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // click (not drag) on a blob selects its chat
    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    let downAt = null;
    const onDown = (e) => {
      downAt = { x: e.clientX, y: e.clientY, t: Date.now() };
    };
    const onUp = (e) => {
      if (!downAt) return;
      const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
      const dt = Date.now() - downAt.t;
      downAt = null;
      if (moved > 6 || dt > 450) return;
      const r = renderer.domElement.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ptr, camera);
      const hits = ray.intersectObjects(stateRef.current.bodies, false);
      if (hits.length > 0) propsRef.current.onSelect(hits[0].object.userData.chatId);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const { selectedId: sel, gazeN: gz } = propsRef.current;
      stateRef.current.stations.forEach((s) => {
        const sleeping = s.chat.status === 'sleeping';
        const speed = sleeping ? 0.9 : 1.85;
        const amp = sleeping ? 0.018 : 0.045;
        let y = s.baseY + Math.sin(t * speed + s.index * 1.3) * amp;
        if (s.chat.status === 'done' && s.chat.hop) {
          const ph = (t * 1.6 + s.index) % 1;
          y += Math.abs(Math.sin(ph * Math.PI * 3)) * 0.16 * (ph < 0.9 ? 1 : 0);
        }
        s.bodyG.position.y = y;
        s.bodyG.scale.y = sleeping ? 0.84 : 1;
        // blink
        const bp = (t + s.index * 0.7) % 4.8;
        const eyeScale = s.chat.status === 'sleeping' ? 0.12 : bp > 4.62 ? 0.12 : 1;
        s.eyesG.children.forEach((eye) => eye.scale.set(1, 1.5 * eyeScale, 0.55));
        // gaze follows the pointer a little
        s.eyesG.position.x = THREE.MathUtils.clamp(gz.x, -1, 1) * 0.045;
        s.eyesG.position.y = THREE.MathUtils.clamp(-gz.y, -1, 1) * 0.03;
        // thinking dots: visible in short windows, bouncing
        if (s.chat.status === 'working') {
          const cyc = (t + s.index * 0.9) % 5.2;
          s.thinkG.visible = cyc < 1.6;
          s.thinkG.children.forEach((d, i) => {
            d.position.y = -0.14 + Math.abs(Math.sin(t * 6 + i * 0.55)) * 0.07;
          });
        } else {
          s.thinkG.visible = false;
        }
        if (s.zzz) {
          s.zzz.position.y = 1.05 + Math.sin(t * 1.4 + s.index) * 0.07;
          s.zzz.material.opacity = 0.65 + 0.35 * Math.sin(t * 1.4 + s.index);
        }
        const isSel = s.chat.id === sel;
        s.halo.visible = isSel;
        if (isSel) s.halo.material.opacity = 0.5 + 0.3 * Math.sin(t * 3.2);
      });
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      stateRef.current.sceneReady = false;
    };
  }, []);

  // (re)build stations when the cast or statuses change
  useEffect(() => {
    const root = stateRef.current.stationsRoot;
    if (!root || !stateRef.current.sceneReady) return;
    while (root.children.length) {
      const child = root.children.pop();
      root.remove(child);
    }
    const deskChats = chats.filter((c) => DESK_STATUSES.has(c.status));
    const restChats = chats.filter((c) => !DESK_STATUSES.has(c.status));
    const stations = [];
    const bodies = [];
    deskChats.forEach((chat, i) => {
      const s = buildStation(chat, DESK_SLOTS[i % DESK_SLOTS.length], 'desk', i);
      root.add(s.group);
      stations.push(s);
      bodies.push(s.body);
    });
    restChats.forEach((chat, i) => {
      const s = buildStation(chat, REST_SLOTS[i % REST_SLOTS.length], 'rest', i + 3);
      root.add(s.group);
      stations.push(s);
      bodies.push(s.body);
    });
    stateRef.current.stations = stations;
    stateRef.current.bodies = bodies;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatsSig]);

  return <div className="room3d" ref={mountRef} aria-label="Văn phòng 3D — kéo để xoay, cuộn để zoom, bấm blob để chọn" />;
}
