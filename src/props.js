/**
 * props.js — 街角道具：贩卖机、自行车、路灯、电线杆与电线、路牌、护栏、垃圾桶、
 *            雨伞架、公告栏、凸面镜、横幅旗、后场杂物
 */
import * as THREE from 'three';
import {
  PAL, TAU, srand, sr, sri, spick, box, cyl, decal, part, boxGeo, cylGeo, sphGeo,
  toon, glow, litMap, wetMat, canvasTex, halo, lightStreak, planeGeo, texVending,
  texVendingSide, texRoadSign, texParkSign, texBoard, texCaution, texGoods,
} from './lib/core.js';
import { L } from './layout.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/** 两点之间的圆柱杆件 */
function link(parent, a, b, r, mat, ol = 0) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = part(cylGeo(r, r, len, 8), mat, { ol, shadow: true });
  const m = g.userData.mesh;
  g.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.normalize());
  g.userData.mesh.quaternion.copy(m.quaternion);
  parent.add(g);
  return g;
}

export function buildProps(scene, runtime) {
  const G = new THREE.Group();
  scene.add(G);

  const matSteel = toon(PAL.steel);
  const matMetal = toon(PAL.metal);
  const matDark = toon(0x2c3138);
  const matRubber = toon(0x191c21);
  const matWhite = toon(0xe8e8e4);
  const matGray = toon(0x8d949c);
  const matGalv = toon(0xb2b8be);
  const matRed = toon(PAL.brandRed);
  const matGreen = toon(PAL.brandGreen);
  const matBlue = toon(PAL.brandBlue);

  /* ================= 自动贩卖机 ================= */
  function vending(x, z, ry) {
    const grp = new THREE.Group();
    const w = 1.12, h = 1.92, d = 0.78;
    // 机身
    const body = part(boxGeo(w, h, d), toon(0xdde2e6), { ol: 0.05 });
    grp.add(body);
    // 正面灯箱（贴图 + 自发光）
    const face = new THREE.Mesh(planeGeo(w - 0.06, h - 0.06), new THREE.MeshBasicMaterial({ map: texVending() }));
    face.position.set(0, 0.02, d / 2 + 0.012);
    grp.add(face);
    // 侧面细节
    const sideTexMat = toon(0xd5dade, { map: texVendingSide() });
    for (const s of [1, -1]) {
      const sm = new THREE.Mesh(planeGeo(d - 0.04, h - 0.1), sideTexMat);
      sm.position.set(s * (w / 2 + 0.011), 0, 0);
      sm.rotation.y = s * Math.PI / 2;
      grp.add(sm);
    }
    // 顶部
    const roof = part(boxGeo(w + 0.08, 0.1, d + 0.08), toon(0xb9c0c7), { ol: 0.03, shadow: false });
    roof.position.set(0, h / 2 + 0.05, 0);
    grp.add(roof);
    // 底座
    const base = part(boxGeo(w + 0.04, 0.12, d + 0.04), matDark, { ol: 0.03, shadow: false });
    base.position.set(0, -h / 2 - 0.04, 0);
    grp.add(base);
    // 取物口
    const slot = part(boxGeo(0.6, 0.24, 0.06), toon(0x6b7078), { ol: 0.02, shadow: false });
    slot.position.set(0, -0.6, d / 2 + 0.02);
    grp.add(slot);
    // 顶部光晕
    grp.add(halo(grp, 0.85, 0xff8a7a, 0, h / 2, d / 2 + 0.14, 0.2));
    grp.position.set(x, 1.92 / 2 + 0.34, z);
    grp.rotation.y = ry || 0;
    G.add(grp);
    // 机器前方的冷白光（照亮人行道）
    const vl = new THREE.PointLight(0xd6e8ff, 7, 7, 2);
    vl.position.set(x, 1.5, z + 1.0);
    G.add(vl);
    // 机器下方溅光
    lightStreak(G, 1.8, 4.2, 0xff9a8a, x + Math.sin(ry || 0) * 0.8, L.CURB_H + 0.018, z + Math.cos(ry || 0) * 0.9, 0, 0.26);
    return grp;
  }
  vending(-9.8, 4.9, 0);
  vending(-8.5, 4.9, 0);

  // 贩卖机旁的回收箱
  const recBin = new THREE.Group();
  const rb = part(boxGeo(0.66, 0.86, 0.66), toon(0x3f7fb8), { ol: 0.04 });
  recBin.add(rb);
  const rl = part(boxGeo(0.7, 0.1, 0.7), toon(0x2b5f8c), { ol: 0.03, shadow: false });
  rl.position.y = 0.47; recBin.add(rl);
  const rHole = new THREE.Mesh(new THREE.CircleGeometry(0.14, 14), toon(0x14171c));
  rHole.rotation.x = -Math.PI / 2; rHole.position.y = 0.52; recBin.add(rHole);
  recBin.position.set(-7.2, 0.34 + 0.43, 4.9);
  G.add(recBin);

  /* ================= 垃圾桶（分类） ================= */
  function trashCan(x, z, color, lidColor, label) {
    const grp = new THREE.Group();
    const b = cyl(grp, 0.33, 0.29, 0.92, toon(color), 0, 0, 0, { seg: 16, ol: 0.04 });
    const lid = cyl(grp, 0.35, 0.35, 0.1, toon(lidColor), 0, 0.5, 0, { seg: 16, ol: 0.03, shadow: false });
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.16, 14), toon(0x14171c));
    hole.rotation.x = -Math.PI / 2; hole.position.y = 0.552; grp.add(hole);
    // 标签
    const tex = canvasTex(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#' + new THREE.Color(lidColor).getHexString(); ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(12, 44, w - 24, 12); ctx.fillRect(12, 66, w - 44, 12);
      ctx.fillRect(12, 22, w - 24, 10);
    });
    const lb = new THREE.Mesh(planeGeo(0.4, 0.4), new THREE.MeshBasicMaterial({ map: tex }));
    lb.position.set(0, 0.1, 0.335); grp.add(lb);
    grp.position.set(x, 0.34 + 0.47, z);
    G.add(grp);
    return grp;
  }
  trashCan(2.9, 4.7, 0x9aa0a6, PAL.brandBlue);
  trashCan(3.7, 4.7, 0x9aa0a6, PAL.brandOrange);
  trashCan(4.5, 4.7, 0x9aa0a6, PAL.brandGreen);

  /* ================= 雨伞架 ================= */
  function umbrellaStand(x, z) {
    const grp = new THREE.Group();
    cyl(grp, 0.24, 0.26, 0.54, toon(0x4a5058), 0, 0.27, 0, { seg: 18, ol: 0.035 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.02, 6, 20), matGray);
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.54; grp.add(rim);
    // 伞
    const umbMat = [toon(0x2b3a4a), toon(0x4a3a52), toon(0x243a30), toon(0x3a2f2a)];
    for (let i = 0; i < 4; i++) {
      const a = i * 1.6 + srand();
      const u = part(cylGeo(0.035, 0.06, 1.02, 6), umbMat[i % 4], { ol: 0.02 });
      u.position.set(Math.cos(a) * 0.1, 0.62, Math.sin(a) * 0.1);
      u.rotation.set(sr(-0.13, 0.13), 0, sr(-0.13, 0.13));
      grp.add(u);
      const tip = part(cylGeo(0.012, 0.012, 0.22, 5), matSteel, { ol: 0 });
      tip.position.set(Math.cos(a) * 0.1 + 0.02, 1.22, Math.sin(a) * 0.1);
      grp.add(tip);
      const handle = part(boxGeo(0.09, 0.05, 0.05), toon(0x5a4a3a), { ol: 0.02, shadow: false });
      handle.position.set(Math.cos(a) * 0.1 - 0.03, 0.14, Math.sin(a) * 0.1);
      grp.add(handle);
    }
    grp.position.set(x, 0.34, z);
    G.add(grp);
    return grp;
  }
  umbrellaStand(2.2, 3.9);
  umbrellaStand(-2.6, 3.9);

  /* ================= 自行车 ================= */
  function bicycle(x, z, ry, color, lean = 0.06) {
    const grp = new THREE.Group();
    const mFrame = toon(color);
    const wheelR = 0.33;
    const wheelX = [-0.55, 0.55];
    for (const wx of wheelX) {
      const w = new THREE.Mesh(new THREE.TorusGeometry(wheelR, 0.028, 6, 22), matRubber);
      w.position.set(wx, wheelR, 0);
      w.castShadow = true;
      grp.add(w);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 8), matGray);
      hub.rotation.x = Math.PI / 2; hub.position.set(wx, wheelR, 0); grp.add(hub);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI;
        const s1 = part(cylGeo(0.006, 0.006, wheelR * 2, 4), matSteel, { ol: 0 });
        s1.position.set(wx, wheelR, 0);
        s1.rotation.set(0, 0, a);
        grp.add(s1);
      }
    }
    const bb = V3(0, 0.3, 0);        // 五通
    const seat = V3(-0.12, 0.92, 0); // 座管顶
    const head = V3(0.44, 0.86, 0);// 头管顶
    const rear = V3(-0.55, wheelR, 0);
    const front = V3(0.55, wheelR, 0);
    link(grp, bb, seat, 0.022, mFrame, 0.02);
    link(grp, bb, head, 0.022, mFrame, 0.02);
    link(grp, seat, head, 0.024, mFrame, 0.02);
    link(grp, bb, rear, 0.018, mFrame, 0.02);
    link(grp, seat, rear, 0.016, mFrame, 0.02);
    link(grp, head, front, 0.02, mFrame, 0.02);
    link(grp, head, V3(0.5, 1.02, 0), 0.02, mFrame, 0.02);
    // 车把
    const bar = part(cylGeo(0.018, 0.018, 0.5, 8), matSteel, { ol: 0.015, shadow: false });
    bar.position.set(0.5, 1.02, 0);
    bar.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    grp.add(bar);
    // 座垫
    const sad = part(boxGeo(0.26, 0.06, 0.14), toon(0x23262b), { ol: 0.025 });
    sad.position.set(-0.14, 0.96, 0);
    sad.rotation.z = 0.08;
    grp.add(sad);
    // 车筐
    if (srand() > 0.3) {
      const bk = new THREE.Group();
      const bkM = toon(0x8d949c);
      const bw = 0.34, bh = 0.24, bd = 0.3;
      box(bk, bw, 0.02, bd, bkM, 0, -bh / 2, 0, { ol: 0.02, shadow: false });
      for (const [dx, dz] of [[bw / 2, 0], [-bw / 2, 0], [0, bd / 2], [0, -bd / 2]]) {
        box(bk, dx ? 0.02 : bw, bh, dz ? 0.02 : bd, bkM, dx * 0.98, 0, dz * 0.98, { ol: 0.02, shadow: false });
      }
      bk.position.set(0.6, 0.85, 0);
      grp.add(bk);
    }
    // 后货架
    const rack = part(boxGeo(0.4, 0.02, 0.24), matGray, { ol: 0.02, shadow: false });
    rack.position.set(-0.5, 0.72, 0);
    grp.add(rack);
    // 撑脚
    const kick = part(cylGeo(0.012, 0.012, 0.34, 6), matSteel, { ol: 0 });
    kick.position.set(-0.1, 0.16, 0.1);
    kick.rotation.z = 0.3;
    grp.add(kick);
    // 脚蹬
    for (const s of [1, -1]) {
      const pd = part(cylGeo(0.055, 0.055, 0.03, 8), matRubber, { ol: 0.02, shadow: false });
      pd.position.set(0, 0.3, s * 0.09);
      pd.rotation.x = Math.PI / 2;
      grp.add(pd);
    }
    // 挡泥板
    for (const [wx, c] of [[0.55, 0], [-0.55, 0]]) {
      const f = new THREE.Mesh(new THREE.TorusGeometry(wheelR + 0.03, 0.02, 5, 14, Math.PI * 0.7), matGray);
      f.position.set(wx, wheelR, 0);
      f.rotation.set(0, 0, Math.PI * 0.15);
      grp.add(f);
    }
    grp.position.set(x, 0.34, z);
    grp.rotation.set(0, ry, lean);
    G.add(grp);
    return grp;
  }
  bicycle(-6.0, 4.2, Math.PI * 0.06, 0x4a6a8a);
  bicycle(-5.2, 4.35, Math.PI * 0.02, 0x8a4a4a);
  bicycle(-4.4, 4.2, -Math.PI * 0.04, 0x3a4a3a);
  bicycle(6.4, 1.2, Math.PI / 2 + 0.1, 0x6a5a3a);
  bicycle(11.6, -6.4, Math.PI / 2, 0x3a4a6a);
  bicycle(-9.9, -12.6, 0.3, 0x5a4a5a);
  // 自行车区地面标线
  const bikeLine = toon(0xd2d6db);
  for (let i = 0; i < 4; i++) {
    const g = part(boxGeo(1.6, 0.04, 0.08), bikeLine, { ol: 0 });
    g.position.set(-6.9 + i * 1.0, 0.36, 5.0);
    G.add(g);
  }

  /* ================= 路灯 ================= */
  function streetLamp(x, z, ry, h = 6.0, on = true) {
    const grp = new THREE.Group();
    const base = cyl(grp, 0.2, 0.24, 0.36, matDark, 0, 0.18, 0, { seg: 12, ol: 0.04 });
    const pole = cyl(grp, 0.075, 0.1, h, toon(0x6b7078), 0, h / 2 + 0.32, 0, { seg: 12, ol: 0.03 });
    // 弯臂
    const curve = new THREE.CatmullRomCurve3([
      V3(0, 0, 0), V3(0, 0.5, 0.02), V3(0.5, 0.85, 0.05), V3(1.3, 0.95, 0.08),
    ]);
    const arm = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.06, 6, false), toon(0x6b7078));
    arm.position.set(0, h + 0.26, 0);
    arm.castShadow = true;
    grp.add(arm);
    // 灯头
    const head = part(boxGeo(0.8, 0.16, 0.34), toon(0x9aa1a8), { ol: 0.03, shadow: false });
    head.position.set(1.32, h + 1.18, 0.08);
    grp.add(head);
    const lens = new THREE.Mesh(planeGeo(0.68, 0.24), glow(0xffe8c0, on ? 1.25 : 0.22));
    lens.rotation.x = Math.PI / 2;
    lens.position.set(1.32, h + 1.09, 0.08);
    grp.add(lens);
    if (on) grp.add(halo(grp, 1.7, 0xffe0b4, 1.32, h + 1.02, 0.08, 0.26));
    // 灯杆设备
    const box1 = part(boxGeo(0.24, 0.5, 0.2), toon(0x565c63), { ol: 0.02, shadow: false });
    box1.position.set(0, 1.7, 0.16);
    grp.add(box1);
    grp.position.set(x, 0.34, z);
    grp.rotation.y = ry || 0;
    G.add(grp);
    if (on) {
      const pl = new THREE.PointLight(0xffe0b0, 105, 26, 2);
      pl.position.set(x + Math.cos(ry || 0) * 1.32, 0.34 + h + 1.0, z + Math.sin(ry || 0) * 1.32);
      G.add(pl);
      runtime.streetLights = runtime.streetLights || [];
      runtime.streetLights.push(pl);
    }
    return grp;
  }
  streetLamp(11.9, 6.3, Math.PI * 0.92, 6.0, true);
  streetLamp(19.4, 6.3, Math.PI, 5.4, true);
  streetLamp(-18.6, 6.4, 0.1, 5.4, true);

  /* ================= 电线杆 + 电线 ================= */
  const poles = [];
  function utilityPole(x, z, h = 8.6, ry = 0) {
    const grp = new THREE.Group();
    const pole = cyl(grp, 0.155, 0.235, h, toon(0xb0b6bc), 0, h / 2 + 0.2, 0, { seg: 12, ol: 0.04 });
    // 黑黄警示带
    const band = cyl(grp, 0.168, 0.172, 0.5, toon(0x2b2f36), 0, 1.0, 0, { seg: 12, ol: 0.02, shadow: false });
    cyl(grp, 0.17, 0.174, 0.16, toon(0xf2c53d), 0, 1.34, 0, { seg: 12, ol: 0.02, shadow: false });
    // 横担
    for (const [y, len] of [[h - 0.4, 2.2], [h - 1.15, 1.9]]) {
      const arm = part(boxGeo(len, 0.12, 0.12), toon(0x8d949c), { ol: 0.02, shadow: false });
      arm.position.set(0, y, 0);
      grp.add(arm);
      for (let i = -1; i <= 1; i++) {
        if (i === 0) continue;
        const ins = cyl(grp, 0.055, 0.07, 0.14, toon(0xdfe4e8), i * len * 0.4, y + 0.14, 0, { seg: 8, ol: 0.02, shadow: false });
      }
    }
    // 变压器
    const tr = cyl(grp, 0.3, 0.3, 0.78, toon(0x9aa1a8), 0.42, h - 2.2, 0.1, { seg: 14, ol: 0.03 });
    const trTop = cyl(grp, 0.32, 0.32, 0.08, toon(0x7c828a), 0.42, h - 2.2 + 0.44, 0.1, { seg: 14, ol: 0.02, shadow: false });
    // 挑臂灯
    const lampArm = part(boxGeo(0.9, 0.07, 0.07), matSteel, { ol: 0.02, shadow: false });
    lampArm.position.set(0.52, h - 3.1, 0);
    grp.add(lampArm);
    const lampHead = part(boxGeo(0.44, 0.12, 0.26), toon(0x9aa1a8), { ol: 0.03, shadow: false });
    lampHead.position.set(0.98, h - 3.16, 0);
    grp.add(lampHead);
    const lens = new THREE.Mesh(planeGeo(0.34, 0.18), glow(0xffe8c0, 1.1));
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0.98, h - 3.23, 0);
    grp.add(lens);
    // 广告旗
    const flagTex = canvasTex(64, 256, (ctx, w, hh) => {
      ctx.fillStyle = '#e8524a'; ctx.fillRect(0, 0, w, hh);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(8, 24, w - 16, 10); ctx.fillRect(8, 48, w - 26, 8); ctx.fillRect(8, 70, w - 20, 8);
      ctx.fillStyle = '#ffe08a'; ctx.fillRect(8, hh - 60, w - 16, 34);
    });
    const flag = new THREE.Mesh(planeGeo(0.34, 1.4), new THREE.MeshBasicMaterial({ map: flagTex, side: THREE.DoubleSide }));
    flag.position.set(0, h - 5.0, 0.24);
    grp.add(flag);
    // 号牌
    const plate = part(boxGeo(0.3, 0.42, 0.04), toon(0xdfe4e8), { ol: 0.02, shadow: false });
    plate.position.set(0, 2.4, 0.2);
    grp.add(plate);
    grp.position.set(x, 0.34, z);
    grp.rotation.y = ry;
    G.add(grp);
    poles.push({ x, z, h: h + 0.34, ry, grp });
    return grp;
  }
  utilityPole(12.15, 8.1, 8.6, 0);
  utilityPole(-4.6, 17.2, 8.2, 0.15);
  utilityPole(19.5, -6.6, 8.0, -0.1);
  utilityPole(-13.4, -19.0, 7.6, 0);

  // 电线（下垂弧线）
  function wire(a, b, sag, r = 0.028, mat = matDark) {
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, r, 4, false), toon(0x1a1d22));
    m.castShadow = false;
    G.add(m);
    return m;
  }
  const P1 = poles[0], P2 = poles[1], P3 = poles[2];
  const wireSet = (A, B, sag) => {
    for (let i = 0; i < 3; i++) {
      const dy = i * 0.36 - 0.3;
      const dx = (i % 2 ? 1 : -1) * (0.5 + (i % 3) * 0.45);
      wire(V3(A.x + dx, A.h + dy, A.z), V3(B.x + dx, B.h + dy, B.z), sag + i * 0.07, 0.022);
    }
  };
  wireSet(P1, P2, 0.9);
  wireSet(P1, P3, 0.75);
  // 引入线（到便利店屋面 / 到邻栋）
  wire(V3(P1.x - 0.6, P1.h - 0.5, P1.z), V3(6.6, 6.1, -8.0), 0.5, 0.022);
  wire(V3(P1.x - 0.9, P1.h - 0.85, P1.z), V3(7.6, 5.9, -4.0), 0.4, 0.02);
  const P4 = poles[3];
  wire(V3(P4.x + 0.3, P4.h - 0.6, P4.z), V3(-16.4, 9.4, -17.4), 0.42, 0.022);
  wire(V3(P4.x, P4.h - 0.95, P4.z + 0.3), V3(-15.2, 8.4, -14.0), 0.5, 0.02);

  /* ================= 路牌 / 停车牌 ================= */
  function signPole(x, z, ry) {
    const grp = new THREE.Group();
    cyl(grp, 0.055, 0.06, 2.9, matGalv, 0, 1.45, 0, { seg: 10, ol: 0.025 });
    cyl(grp, 0.11, 0.13, 0.14, matGray, 0, 0.07, 0, { seg: 10, ol: 0.02, shadow: false });
    const s1 = part(boxGeo(0.62, 0.62, 0.03), toon(0xf2f2ee), { ol: 0.02, shadow: false });
    s1.position.set(0, 2.55, 0.02);
    grp.add(s1);
    const f1 = new THREE.Mesh(planeGeo(0.6, 0.6), new THREE.MeshBasicMaterial({ map: texRoadSign(0) }));
    f1.position.set(0, 2.55, 0.045); grp.add(f1);
    const f1b = new THREE.Mesh(planeGeo(0.6, 0.6), new THREE.MeshBasicMaterial({ map: texRoadSign(0) }));
    f1b.position.set(0, 2.55, -0.02); f1b.rotation.y = Math.PI; grp.add(f1b);
    const s2 = part(boxGeo(0.56, 0.56, 0.03), toon(0xf2f2ee), { ol: 0.02, shadow: false });
    s2.position.set(0, 1.78, 0.02);
    grp.add(s2);
    const f2 = new THREE.Mesh(planeGeo(0.54, 0.54), new THREE.MeshBasicMaterial({ map: texRoadSign(1) }));
    f2.position.set(0, 1.78, 0.045); grp.add(f2);
    grp.position.set(x, 0.34, z);
    grp.rotation.y = ry || 0;
    G.add(grp);
    return grp;
  }
  signPole(11.0, 5.3, Math.PI * 0.9);
  // 停车位 P 牌
  const pGrp = new THREE.Group();
  cyl(pGrp, 0.05, 0.055, 2.5, matGalv, 0, 1.25, 0, { seg: 10, ol: 0.025 });
  const ps = part(boxGeo(0.56, 0.56, 0.03), toon(0xf2f2ee), { ol: 0.02, shadow: false });
  ps.position.set(0, 2.3, 0); pGrp.add(ps);
  const pf = new THREE.Mesh(planeGeo(0.54, 0.54), new THREE.MeshBasicMaterial({ map: texParkSign() }));
  pf.position.set(0, 2.3, 0.03); pGrp.add(pf);
  pGrp.position.set(-11.6, 0.36, -17.6);
  G.add(pGrp);

  /* ================= 街角护栏 / 车止め ================= */
  const guardMat = toon(0xe4e8ea);
  function guardrail(x0, z0, x1, z1, n) {
    const grp = new THREE.Group();
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      cyl(grp, 0.045, 0.05, 0.86, guardMat, x, 0.43, z, { seg: 8, ol: 0.02 });
      if (i < n) {
        const t2 = (i + 1) / n;
        const x2 = x0 + (x1 - x0) * t2, z2 = z0 + (z1 - z0) * t2;
        link(grp, V3(x, 0.78, z), V3(x2, 0.78, z2), 0.038, guardMat, 0.015);
        link(grp, V3(x, 0.52, z), V3(x2, 0.52, z2), 0.028, guardMat, 0.015);
      }
    }
    G.add(grp);
    return grp;
  }
  guardrail(-20.4, 15.4, 20.4, 15.4, 12);
  guardrail(18.9, -20.2, 18.9, 6.4, 8);
  guardrail(8.4, 6.6, 12.2, 6.6, 3);
  guardrail(-21, -18.6, -15, -18.6, 3);

  // 车止め柱（店前）
  const bollardMat = toon(0xd8dce0);
  for (const x of [-11.4, -3.2, 5.6]) {
    const b = cyl(G, 0.07, 0.08, 0.72, bollardMat, x, 0.34 + 0.36, 5.4, { seg: 10, ol: 0.03 });
    const cap = new THREE.Mesh(sphGeo(0.07, 10, 8), toon(0xf2933a));
    cap.position.set(x, 0.34 + 0.74, 5.4);
    G.add(cap);
  }

  /* ================= 公告栏 ================= */
  const board = new THREE.Group();
  const bBody = part(boxGeo(2.0, 1.3, 0.12), toon(0x8d949c), { ol: 0.04 });
  board.add(bBody);
  const bFace = new THREE.Mesh(planeGeo(1.86, 1.16), new THREE.MeshBasicMaterial({ map: texBoard() }));
  bFace.position.set(0, 0, 0.065);
  board.add(bFace);
  // 小雨棚
  const bRoof = part(boxGeo(2.14, 0.07, 0.34), toon(0x4c525a), { ol: 0.03, shadow: false });
  bRoof.position.set(0, 0.72, 0.1);
  board.add(bRoof);
  board.position.set(9.6, 0.34 + 0.95, 4.9);
  board.rotation.y = Math.PI;
  G.add(board);
  for (const dx of [-0.9, 0.9]) {
    cyl(G, 0.05, 0.05, 1.05, matGalv, 9.6 + dx, 0.34 + 0.5, 4.95, { seg: 8, ol: 0.02 });
  }

  /* ================= 转角凸面镜 ================= */
  const mirrorGrp = new THREE.Group();
  cyl(mirrorGrp, 0.05, 0.055, 3.0, matGalv, 0, 1.5, 0, { seg: 10, ol: 0.025 });
  const mGeo = new THREE.SphereGeometry(0.44, 20, 14, 0, TAU, 0, Math.PI * 0.42);
  const mM = new THREE.MeshStandardMaterial({ color: 0xdfe8f0, metalness: 1.0, roughness: 0.06, envMapIntensity: 1.6, side: THREE.DoubleSide });
  const mm = new THREE.Mesh(mGeo, mM);
  mm.rotation.x = Math.PI;
  mm.position.set(0, 2.85, 0.06);
  mm.rotation.z = -0.12;
  mirrorGrp.add(mm);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 8, 24), toon(0xf2933a));
  rim.position.set(0, 2.85, 0.0);
  rim.rotation.z = -0.12;
  mirrorGrp.add(rim);
  mirrorGrp.position.set(10.4, 0.34, 6.0);
  mirrorGrp.rotation.y = -2.3;
  G.add(mirrorGrp);

  /* ================= 横幅旗（のぼり） ================= */
  const noboriTex = canvasTex(128, 512, (ctx, w, h) => {
    ctx.fillStyle = '#f4f7f5'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#' + new THREE.Color(PAL.brandGreen).getHexString();
    ctx.fillRect(0, 0, w, 96);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px Arial'; ctx.textAlign = 'center';
    ctx.fillText('MART', w / 2, 64);
    ctx.fillStyle = '#' + new THREE.Color(PAL.brandOrange).getHexString();
    ctx.fillRect(0, 96, w, 12);
    ctx.fillStyle = '#' + new THREE.Color(PAL.brandGreen).getHexString();
    ctx.font = 'bold 64px Arial';
    ctx.fillText('24', w / 2, 210);
    ctx.font = 'bold 26px Arial';
    ctx.fillStyle = '#5a6a62';
    ctx.fillText('OPEN', w / 2, 268);
    ctx.fillText('24H', w / 2, 306);
    ctx.fillStyle = '#' + new THREE.Color(PAL.brandRed).getHexString();
    ctx.fillRect(14, 350, w - 28, 60);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px Arial';
    ctx.fillText('COFFEE', w / 2, 392);
  });
  function nobori(x, z, ry) {
    const grp = new THREE.Group();
    cyl(grp, 0.03, 0.03, 2.5, matGalv, 0, 1.25, 0, { seg: 8, ol: 0.02 });
    cyl(grp, 0.1, 0.12, 0.1, matGray, 0, 0.05, 0, { seg: 10, ol: 0.02, shadow: false });
    const cloth = new THREE.Mesh(planeGeo(0.44, 1.75), new THREE.MeshBasicMaterial({ map: noboriTex, side: THREE.DoubleSide }));
    cloth.position.set(-0.24, 1.5, 0);
    grp.add(cloth);
    grp.position.set(x, 0.34, z);
    grp.rotation.y = ry || 0;
    sub.nobori = grp;
    G.add(grp);
    return grp;
  }
  const sub = {};
  nobori(-4.2, 3.6, 0.1);
  nobori(4.9, 3.6, -0.1);

  /* ================= 后场杂物 ================= */
  // 纸箱
  const cardboard = toon(0xa8845c);
  const cardboard2 = toon(0x8d6c48);
  for (const [x, z, s, ry] of [[2.2, -10.0, 1.0, 0.3], [2.9, -10.3, 0.8, -0.2], [1.6, -10.4, 0.9, 0.6]]) {
    const bx = box(G, 0.72 * s, 0.5 * s, 0.56 * s, srand() > 0.5 ? cardboard : cardboard2, x, 0.36 + 0.25 * s, z, { ol: 0.03, ry });
  }
  // 收银台后的小推车
  const cart = new THREE.Group();
  box(cart, 0.7, 0.08, 0.5, matGalv, 0, 0.7, 0, { ol: 0.03, shadow: false });
  box(cart, 0.7, 0.3, 0.5, toon(0x9aa1a8), 0, 0.5, 0, { ol: 0.03, shadow: false });
  for (const [dx, dz] of [[0.28, 0.2], [-0.28, 0.2]]) {
    cyl(cart, 0.06, 0.06, 0.04, matRubber, dx, 0.06, dz, { seg: 8, ol: 0, rz: Math.PI / 2 });
  }
  cart.position.set(6.6, 0.34, -9.6);
  cart.rotation.y = 0.4;
  G.add(cart);

  // 后门外的垃圾袋
  const bagMat = toon(0x22262c);
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(sphGeo(sr(0.24, 0.34), 10, 8), bagMat);
    b.position.set(5.6 + srand() * 1.2, 0.36 + sr(0.2, 0.3), -11.7 - srand() * 0.6);
    b.scale.y = 0.85;
    b.castShadow = true;
    G.add(b);
  }

  /* ================= 店外小广告牌（立式） ================= */
  const aBoard = new THREE.Group();
  const aTex = canvasTex(256, 384, (ctx, w, h) => {
    ctx.fillStyle = '#f6f1e4'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#' + new THREE.Color(PAL.brandOrange).getHexString(); ctx.fillRect(0, 0, w, 60);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 34px Arial'; ctx.textAlign = 'center';
    ctx.fillText('HOT', w / 2, 44);
    ctx.fillStyle = '#' + new THREE.Color(PAL.brandRed).getHexString();
    ctx.font = 'bold 72px Arial'; ctx.fillText('¥120', w / 2, 160);
    ctx.fillStyle = '#5a6a62'; ctx.font = 'bold 30px Arial';
    ctx.fillText('COFFEE', w / 2, 214);
    ctx.fillStyle = '#' + new THREE.Color(PAL.brandGreen).getHexString();
    ctx.fillRect(28, 246, w - 56, 54);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px Arial';
    ctx.fillText('BENTO ¥398', w / 2, 284);
    ctx.fillStyle = '#8a8a86'; ctx.font = '22px Arial';
    ctx.fillText('MART 24', w / 2, 344);
  });
  const aMat = new THREE.MeshBasicMaterial({ map: aTex, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(planeGeo(0.7, 1.05), aMat);
    p.position.set(0, 0.72, s * 0.06);
    p.rotation.x = -0.1 * s;
    aBoard.add(p);
  }
  aBoard.position.set(8.4, 0.34, 4.2);
  aBoard.rotation.y = -0.5;
  G.add(aBoard);

  runtime.props = G;
  return G;
}
