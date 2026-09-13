/**
 * ground.js — 底座、街道、人行道、斑马线、排水、积水
 */
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import {
  PAL, srand, sr, TAU, canvasTex,
  toon, glow, wetMat, box, cyl, decal, lightStreak, texAsphalt, texTile,
  texGrate, sri, spick, planeGeo, part, boxGeo,
} from './lib/core.js';
import { L } from './layout.js';

const css = (h) => '#' + new THREE.Color(h).getHexString();

/* 积水遮罩：亮处=沥青不透明，暗处=镜面透出（积水） */
function texWetMask() {
  return canvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = 'rgb(214,214,214)'; ctx.fillRect(0, 0, w, h);
    // 大片水膜
    for (let i = 0; i < 70; i++) {
      const x = srand() * w, y = srand() * h;
      const r = sr(40, 190);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const v = sri(52, 96);
      g.addColorStop(0, `rgba(${v},${v},${v},0.92)`);
      g.addColorStop(0.55, `rgba(${v + 30},${v + 30},${v + 30},0.6)`);
      g.addColorStop(1, 'rgba(200,200,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * sr(0.5, 1), srand() * TAU, 0, TAU); ctx.fill();
    }
    // 细碎水痕
    for (let i = 0; i < 260; i++) {
      const x = srand() * w, y = srand() * h, r = sr(4, 20);
      const v = sri(120, 170);
      ctx.fillStyle = `rgba(${v},${v},${v},${sr(0.25, 0.7)})`;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * sr(0.4, 1.2), srand() * TAU, 0, TAU); ctx.fill();
    }
  }, { srgb: false, aniso: 4 });
}

export function buildGround(scene, runtime) {
  const G = new THREE.Group();
  scene.add(G);

  const matAsphaltTex = texAsphalt();
  const matTile = texTile(PAL.sidewalk, 0.55, 4);
  const matTileDark = texTile(PAL.sidewalkDark, 0.6, 3);
  const wetMask = texWetMask();

  /* ---------------- 底座（可收藏模型的台座） ---------------- */
  const plinthLow = toon(0x171a22);
  box(G, L.BASE * 2 + 1.6, 1.0, L.BASE * 2 + 1.6, plinthLow, 0, -L.BASE_T - 0.4, 0, { ol: 0.09, shadow: false });
  const plinthMid = toon(0x22262f);
  box(G, L.BASE * 2 + 0.5, 1.6, L.BASE * 2 + 0.5, plinthMid, 0, -L.BASE_T + 0.7, 0, { ol: 0.07, shadow: false });
  const top = new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.75, metalness: 0.2 });
  const topSlab = box(G, L.BASE * 2, L.BASE_T, L.BASE * 2, top, 0, -L.BASE_T / 2, 0, { ol: 0.06, shadow: false });
  // 台座顶部一圈亮边（模型感）
  const edgeMat = toon(0x4a5162);
  box(G, L.BASE * 2 + 0.16, 0.1, L.BASE * 2 + 0.16, edgeMat, 0, -0.03, 0, { ol: 0, shadow: false });

  /* ---------------- 镜面水膜层 ---------------- */
  const mirror = new Reflector(new THREE.PlaneGeometry(L.BASE * 2, L.BASE * 2), {
    clipBias: 0.0035,
    textureWidth: (runtime && runtime.cfg && runtime.cfg.reflector) || 512,
    textureHeight: (runtime && runtime.cfg && runtime.cfg.reflector) || 512,
    color: 0x6f7d8c,
  });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = L.MIRROR_Y;
  G.add(mirror);

  /* ---------------- 道路（半透明沥青，透出镜面 = 湿滑反光） ---------------- */
  const roadMat = wetMat(0xffffff, {
    map: matAsphaltTex,
    roughness: 0.14,
    metalness: 0.5,
    envMapIntensity: 1.15,
  });
  roadMat.alphaMap = wetMask;
  roadMat.transparent = true;
  roadMat.opacity = 1.0;
  roadMat.depthWrite = false;
  roadMat.map.repeat.set(7, 7);

  const addRoad = (r) => {
    const m = new THREE.Mesh(planeGeo(r.x1 - r.x0, r.z1 - r.z0), roadMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((r.x0 + r.x1) / 2, L.ROAD_Y, (r.z0 + r.z1) / 2);
    m.receiveShadow = true;
    m.renderOrder = 2;
    G.add(m);
    return m;
  };
  addRoad(L.ROAD_S);
  addRoad(L.ROAD_E);

  /* ---------------- 人行道（抬高），面向道路一侧是路缘 ---------------- */
  const walkTop = toon(PAL.sidewalk, { map: matTile });
  const walkSide = toon(PAL.curb);
  const walkDark = toon(PAL.sidewalkDark, { map: matTileDark });

  function sidewalk(r, opt = {}) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const g = part(boxGeo(w, L.CURB_H, d), opt.dark ? walkDark : walkTop, { ol: 0.035, shadow: true });
    g.position.set((r.x0 + r.x1) / 2, L.CURB_H / 2, (r.z0 + r.z1) / 2);
    G.add(g);
    // 路缘石压边
    for (const side of opt.curbs || []) {
      let cw = w, cd = 0.34, cx = (r.x0 + r.x1) / 2, cz;
      if (side === 'n') cz = r.z0 + 0.17;
      else if (side === 's') cz = r.z1 - 0.17;
      else if (side === 'e') { cd = w; cw = 0.34; cz = (r.z0 + r.z1) / 2; cx = r.x1 - 0.17; }
      else { cd = w; cw = 0.34; cz = (r.z0 + r.z1) / 2; cx = r.x0 + 0.17; }
      const cc = part(boxGeo(cw, L.CURB_H + 0.05, cd), walkSide, { ol: 0.03 });
      cc.position.set(cx, (L.CURB_H + 0.05) / 2, cz);
      G.add(cc);
    }
    return g;
  }

  sidewalk(L.SW_FRONT, { curbs: ['s'] });
  sidewalk(L.SW_EAST, { curbs: ['e'] });
  sidewalk(L.SW_FAR_S, { curbs: ['n'] });
  sidewalk(L.SW_FAR_E, { curbs: ['w', 'e'] });
  // 店铺西侧广场（连接小巷）
  sidewalk({ x0: -21, x1: -12, z0: -2.2, z1: 3 }, { dark: true, curbs: [] });
  // 店后窄巷（后场通道）
  sidewalk(L.SW_NORTH, { dark: true });

  /* 路缘石斜坡（斑马线处的无障碍坡道） */
  const rampMat = toon(PAL.sidewalkDark);
  const addRamp = (x, z, w, d, ry = 0) => {
    const m = part(boxGeo(w, 0.07, d), rampMat, { ol: 0.025 });
    m.position.set(x, L.CURB_H - 0.02, z);
    m.rotation.set(ry ? 0 : -0.16, ry, ry ? -0.16 : 0);
    G.add(m);
  };
  addRamp(10.5, 6.85, 3.4, 0.9);
  addRamp(12.85, 2.4, 0.9, 3.4);

  /* ---------------- 道路标线 ---------------- */
  const paintMat = wetMat(0xd9dde2, { roughness: 0.13, metalness: 0.55 });
  paintMat.transparent = true; paintMat.opacity = 0.92; paintMat.depthWrite = false;
  const paint = (w, d, x, z, ry = 0, mat = paintMat) => {
    const m = new THREE.Mesh(planeGeo(w, d), mat);
    m.rotation.set(-Math.PI / 2, 0, ry);
    m.position.set(x, L.ROAD_Y + 0.012, z);
    m.renderOrder = 4;
    m.receiveShadow = false;
    G.add(m);
    return m;
  };

  // 双黄/白实线（路中）
  const lineMat = wetMat(0xcfd4da, { roughness: 0.16, metalness: 0.5 });
  lineMat.transparent = true; lineMat.opacity = 0.85;
  paint(L.ROAD_S.x1 - L.ROAD_S.x0, 0.16, 0, (L.ROAD_S.z0 + L.ROAD_S.z1) / 2 - 0.3, 0, lineMat)
  // 虚线
  for (let x = -19; x < 20; x += 3.4) paint(1.7, 0.16, x, (L.ROAD_S.z0 + L.ROAD_S.z1) / 2 - 0.3, 0, lineMat);
  paint(0.16, L.ROAD_S.z1 - L.ROAD_S.z0, 0.15, (L.ROAD_S.z0 + L.ROAD_S.z1) / 2, 0, lineMat);
  for (let z = -19; z < 5; z += 3.4) paint(0.16, 1.7, 15.7, z, 0, lineMat);
  // 路缘白线
  paint(L.ROAD_S.x1 - L.ROAD_S.x0, 0.14, 0, L.ROAD_S.z0 + 0.5, 0, lineMat);
  paint(0.14, L.ROAD_S.z1 - L.ROAD_S.z0, L.ROAD_E.x0 + 0.5, (L.ROAD_S.z0 + L.ROAD_S.z1) / 2 + 5.2, 0, lineMat);

  // 斑马线 A：横穿南侧主路（行人南北向）
  for (let i = 0; i < 4; i++) {
    paint(0.78, 6.6, 9.4 + i * 1.62, 11.0);
  }
  // 斑马线 B：横穿东侧支路（行人东西向）
  for (let i = 0; i < 3; i++) {
    paint(4.1, 0.78, 15.6, 4.2 - i * 1.62);
  }
  // 停止线 + 倒三角（止まれ）
  paint(0.42, 7.6, 8.3, 11.0);
  paint(0.42, 5.0, 14.2, 2.6, 0);
  const tri = (x, z) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.9); shape.lineTo(0.85, -0.7); shape.lineTo(-0.85, -0.7);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), lineMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, L.ROAD_Y + 0.013, z);
    m.renderOrder = 4;
    G.add(m);
  };
  tri(15.6, 6.2);

  /* ---------------- 排水沟 + 井盖 ---------------- */
  const gutterMat = wetMat(0x24272e, { roughness: 0.1, metalness: 0.7 });
  const grateTex = texGrate();
  const grateMat = toon(0x353a42, { map: grateTex });
  // 沿南侧路缘的排水沟
  const gA = new THREE.Mesh(planeGeo(L.ROAD_S.x1 - L.ROAD_S.x0, 0.62), gutterMat);
  gA.rotation.x = -Math.PI / 2; gA.position.set(0, L.ROAD_Y + 0.006, L.ROAD_S.z0 + 0.31);
  gA.renderOrder = 3; G.add(gA);
  const gB = new THREE.Mesh(planeGeo(0.62, L.ROAD_E.z1 - L.ROAD_E.z0), gutterMat);
  gB.rotation.x = -Math.PI / 2; gB.position.set(L.ROAD_E.x0 + 0.31, L.ROAD_Y + 0.006, (L.ROAD_E.z0 + L.ROAD_E.z1) / 2);
  gB.renderOrder = 3; G.add(gB);
  // 沟盖板
  for (let x = -18; x <= 18; x += 3.2) {
    const m = new THREE.Mesh(planeGeo(1.5, 0.5), grateMat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, L.ROAD_Y + 0.014, L.ROAD_S.z0 + 0.31);
    m.renderOrder = 4; G.add(m);
  }
  for (let z = -18; z <= 4; z += 3.2) {
    const m = new THREE.Mesh(planeGeo(0.5, 1.5), grateMat);
    m.rotation.x = -Math.PI / 2; m.position.set(L.ROAD_E.x0 + 0.31, L.ROAD_Y + 0.014, z);
    m.renderOrder = 4; G.add(m);
  }
  // 井盖
  const manholeMat = wetMat(0x3a3f46, { roughness: 0.14, metalness: 0.72 });
  for (const [x, z] of [[-6.5, 11.6], [12.2, 13.4], [16.4, -6.4], [-15.5, 4.4]]) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), manholeMat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, L.ROAD_Y + 0.016, z);
    m.renderOrder = 4; G.add(m);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 20), toon(0x4c525a));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, L.ROAD_Y + 0.018, z);
    ring.renderOrder = 4; G.add(ring);
  }

  /* ---------------- 停车位（店后场地） ---------------- */
  const lot = L.BACKLOT;
  const lotMat = wetMat(0x30343c, { map: matAsphaltTex, roughness: 0.2, metalness: 0.5 });
  lotMat.map = matAsphaltTex.clone();
  lotMat.map.repeat.set(3, 3);
  lotMat.map.needsUpdate = true;
  const lotMesh = new THREE.Mesh(planeGeo(lot.x1 - lot.x0, lot.z1 - lot.z0), lotMat);
  lotMesh.rotation.x = -Math.PI / 2;
  lotMesh.position.set((lot.x0 + lot.x1) / 2, 0.05, (lot.z0 + lot.z1) / 2);
  lotMesh.receiveShadow = true;
  G.add(lotMesh);

  const stallMat = toon(0xd2d6db);
  for (let i = 0; i < 3; i++) {
    const x = -9.4 + i * 3.1;
    const g = part(boxGeo(3.0, 0.05, 0.12), stallMat, { ol: 0 });
    g.position.set(x, 0.07, -13.4); G.add(g);
    const g2 = part(boxGeo(0.12, 0.05, 5.0), stallMat, { ol: 0 });
    g2.position.set(x + 1.5, 0.07, -15.9); G.add(g2);
  }
  // 挡车器
  const stopMat = toon(PAL.brandOrange);
  for (let i = 0; i < 3; i++) {
    box(G, 1.5, 0.16, 0.22, stopMat, -7.9 + i * 3.1, 0.14, -16.6, { ol: 0.03 });
  }

  /* ---------------- 人行道积水 / 水洼 ---------------- */
  const puddleMat = wetMat(0x1b2029, { roughness: 0.05, metalness: 0.85, envMapIntensity: 1.5 });
  puddleMat.transparent = true; puddleMat.opacity = 0.72; puddleMat.depthWrite = false;
  const puddleSpots = [
    [-8.2, 5.4, 2.6, 1.3], [2.4, 5.1, 2.0, 1.0], [10.6, 4.3, 2.4, 1.5],
    [-2.6, 6.4, 1.6, 0.8], [11.2, -3.4, 2.2, 1.2], [-16.4, 5.6, 2.8, 1.4],
    [-9.6, -12.9, 3.2, 1.6], [4.2, -14.6, 2.6, 1.2], [-13.4, -6.0, 1.8, 1.0],
  ];
  for (const [x, z, rx, rz] of puddleSpots) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 26), puddleMat);
    m.rotation.x = -Math.PI / 2; m.rotation.z = srand() * TAU;
    m.scale.set(rx, rz, 1);
    m.position.set(x, L.CURB_H + 0.012, z);
    m.renderOrder = 5;
    G.add(m);
  }
  // 路面积水（贴在沥青之上，透出更多镜面）
  const roadPuddle = wetMat(0x171b23, { roughness: 0.04, metalness: 0.9, envMapIntensity: 1.6 });
  roadPuddle.transparent = true; roadPuddle.opacity = 0.42; roadPuddle.depthWrite = false;
  for (const [x, z, rx, rz] of [[-3.8, 9.4, 4.2, 1.9], [7.5, 12.6, 3.4, 1.6], [16.6, 2.0, 1.7, 3.0], [-12.5, 13.6, 3.0, 1.4]]) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 26), roadPuddle);
    m.rotation.x = -Math.PI / 2; m.rotation.z = srand() * TAU;
    m.scale.set(rx, rz, 1);
    m.position.set(x, L.ROAD_Y + 0.02, z);
    m.renderOrder = 5;
    G.add(m);
  }

  /* ---------------- 地面反光条（霓虹在湿地面的倒影） ---------------- */
  // 店招前
  for (let i = 0; i < 5; i++) {
    lightStreak(G, 2.6 + srand() * 1.4, 9 + srand() * 3, i % 2 ? 0x9fe8ff : 0xd8ffe8,
      -9.5 + i * 4.4, L.ROAD_Y + 0.03, 5.6 + srand() * 0.7, sr(-0.1, 0.1), 0.30);
  }
  // 路灯倒影
  lightStreak(G, 2.2, 12, 0xffe0ae, 11.6, L.ROAD_Y + 0.03, 9.6, 0, 0.34);
  // 自动贩卖机倒影
  lightStreak(G, 2.0, 7, 0xd84a4a, -9.9, L.ROAD_Y + 0.03, 6.2, 0, 0.30);
  lightStreak(G, 1.9, 6.4, 0xffd08a, -6.4, L.ROAD_Y + 0.03, 6.1, 0, 0.26);
  // 人行道上
  lightStreak(G, 3.4, 5.4, 0xfff0cf, 0, L.CURB_H + 0.02, 4.1, 0, 0.26);
  lightStreak(G, 2.0, 5.0, 0xa8e8ff, 11.0, L.CURB_H + 0.02, 0.4, 0, 0.24);

  runtime.mirror = mirror;
  runtime.wetMask = wetMask;
  return G;
}
