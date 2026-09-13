/**
 * neighbors.js — 西侧邻栋（公寓/小酒馆）、后巷细节、北侧围墙、底座绿化围合
 */
import * as THREE from 'three';
import {
  PAL, TAU, srand, sr, sri, spick, box, cyl, decal, part, boxGeo, cylGeo, sphGeo,
  toon, glow, litMap, wetMat, canvasTex, halo, lightStreak, planeGeo, texFacade,
  texGoods, texPoster, texAsphalt,
} from './lib/core.js';
import { L } from './layout.js';

function link(parent, a, b, r, mat, ol = 0) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = part(cylGeo(r, r, len, 8), mat, { ol, shadow: true });
  g.position.copy(a).add(b).multiplyScalar(0.5);
  g.userData.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(g);
  return g;
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/** 带灯光的窗（可选窗帘、暖光） */
function window_(parent, x, y, z, w, h, ry, opt = {}) {
  const frameMat = toon(0x6b7078);
  const fr = part(boxGeo(w + 0.12, h + 0.12, 0.1), frameMat, { ol: 0.025, shadow: false });
  fr.position.set(x, y, z);
  fr.rotation.y = ry;
  parent.add(fr);
  const lit = opt.lit !== false;
  const g = new THREE.Mesh(planeGeo(w, h), lit ? glow(opt.color ?? 0xffd9a0, opt.intensity ?? 0.85) : toon(0x1b2230));
  g.position.set(x, y, z);
  g.rotation.y = ry;
  g.translateZ(0.06);
  parent.add(g);
  if (lit && opt.curtain !== false) {
    const c = new THREE.Mesh(planeGeo(w * sr(0.35, 0.6), h), toon(0xd8d2c8));
    c.position.set(x, y, z);
    c.rotation.y = ry;
    c.translateZ(0.09);
    c.translateX(sr(-0.2, 0.2) * w);
    parent.add(c);
  }
  return fr;
}

export function buildNeighbors(scene, runtime) {
  const G = new THREE.Group();
  scene.add(G);

  const N = L.NEIGH_W;
  const matWall = toon(0xc2bdb4, { map: texFacade(0xc2bdb4) });
  const matWallDark = toon(0x9a958c, { map: texFacade(0x9a958c) });
  const matConcrete = toon(PAL.concrete);
  const matMetal = toon(PAL.metal);
  const matDark = toon(0x33383f);
  const matGalv = toon(0xb2b8be);

  /* ================= 西侧邻栋（两层，楼上住家 / 楼下小酒馆） ================= */
  const nb = new THREE.Group();
  // 主体
  const w = N.x1 - N.x0, d = N.z1 - N.z0;
  const body = part(boxGeo(w, N.h, d), matWall, { ol: 0.07 });
  body.position.set((N.x0 + N.x1) / 2, N.h / 2, (N.z0 + N.z1) / 2);
  nb.add(body);
  // 一层贴面（深色石材）
  const base = part(boxGeo(w + 0.06, 2.6, d + 0.06), matWallDark, { ol: 0.05 });
  base.position.set((N.x0 + N.x1) / 2, 1.3, (N.z0 + N.z1) / 2);
  nb.add(base);
  // 层间腰线
  const band = part(boxGeo(w + 0.14, 0.22, d + 0.14), matConcrete, { ol: 0.03, shadow: false });
  band.position.set((N.x0 + N.x1) / 2, 4.5, (N.z0 + N.z1) / 2);
  nb.add(band);
  // 屋顶女儿墙 + 防水
  const pf = L.NEIGH_W.h;
  const par = part(boxGeo(w + 0.2, 0.55, d + 0.2), matWallDark, { ol: 0.05 });
  par.position.set((N.x0 + N.x1) / 2, N.h + 0.27, (N.z0 + N.z1) / 2);
  nb.add(par);

  // 南立面（朝街）：窗 + 门 + 招牌
  for (let i = 0; i < 3; i++) {
    window_(nb, N.x0 + 1.6 + i * 1.85, 6.1, N.z1 + 0.02, 1.15, 1.35, 0, { lit: i !== 1, intensity: 0.7 });
    window_(nb, N.x0 + 1.6 + i * 1.85, 3.1, N.z1 + 0.02, 1.25, 1.45, 0, { lit: false });
  }
  // 一层小酒馆门头
  const door = part(boxGeo(1.5, 2.3, 0.14), toon(0x4a3a2f), { ol: 0.04 });
  door.position.set(N.x1 - 1.6, 1.5, N.z1 + 0.04);
  nb.add(door);
  const doorGlass = new THREE.Mesh(planeGeo(1.1, 1.5), glow(0xffb46a, 0.5));
  doorGlass.position.set(N.x1 - 1.6, 1.7, N.z1 + 0.12);
  nb.add(doorGlass);
  // 门头雨棚
  const dv = part(boxGeo(2.4, 0.14, 0.9), toon(0x2f3a3a), { ol: 0.03, shadow: false });
  dv.position.set(N.x1 - 1.6, 2.75, N.z1 + 0.5);
  nb.add(dv);
  // 竖招牌（霓虹粉）
  const vsTex = canvasTex(128, 512, (ctx, w2, h2) => {
    ctx.fillStyle = '#20141c'; ctx.fillRect(0, 0, w2, h2);
    ctx.fillStyle = '#ff5f9e';
    ctx.font = 'bold 62px Arial'; ctx.textAlign = 'center';
    ctx.fillText('S', w2 / 2, 120);
    ctx.fillText('N', w2 / 2, 196);
    ctx.fillText('A', w2 / 2, 272);
    ctx.fillText('C', w2 / 2, 348);
    ctx.fillText('K', w2 / 2, 424);
    ctx.fillStyle = '#ffd0e4';
    ctx.fillRect(24, 448, w2 - 48, 8);
  });
  const vs = part(boxGeo(0.2, 2.6, 0.62), toon(0x2a1e26), { ol: 0.04, shadow: false });
  vs.position.set(N.x0 + 0.9, 5.4, N.z1 + 0.35);
  nb.add(vs);
  const vsFace = new THREE.Mesh(planeGeo(0.56, 2.5), new THREE.MeshBasicMaterial({ map: vsTex }));
  vsFace.position.set(N.x0 + 0.9, 5.4, N.z1 + 0.63);
  nb.add(vsFace);
  nb.add(halo(nb, 1.5, 0xff5f9e, N.x0 + 0.9, 5.4, N.z1 + 0.7, 0.24));
  const pl = new THREE.PointLight(0xff6fa8, 17, 11, 2);
  pl.position.set(N.x0 + 0.9, 5.2, N.z1 + 1.6);
  nb.add(pl);

  // 提灯（红灯笼）
  for (const [dx, dy] of [[0, 0], [0.7, 0.22], [1.4, 0]]) {
    const lan = new THREE.Mesh(sphGeo(0.17, 12, 10), toon(0xd8453c));
    lan.scale.y = 1.25;
    lan.position.set(N.x1 - 1.6 - 1.5 + dx, 2.5 + dy, N.z1 + 0.55);
    nb.add(lan);
    const lg = new THREE.Mesh(planeGeo(0.34, 0.4), glow(0xff8a5a, 0.9));
    lg.position.copy(lan.position);
    lg.rotation.y = 0;
    nb.add(lg);
    cyl(nb, 0.012, 0.012, 0.3, matDark, lan.position.x, 2.5 + dy + 0.28, N.z1 + 0.55, { seg: 4, ol: 0 });
  }
  const lanLight = new THREE.PointLight(0xff9a5a, 12, 7, 2);
  lanLight.position.set(N.x1 - 2.4, 2.6, N.z1 + 1.0);
  nb.add(lanLight);

  // 东立面（朝小巷）：窗 + 空调 + 管道 + 外楼梯
  for (let i = 0; i < 5; i++) {
    const z = N.z0 + 1.8 + i * 3.0;
    window_(nb, N.x1 + 0.02, 6.2, z, 1.1, 1.3, Math.PI / 2, { lit: i % 2 === 0, intensity: 0.6 });
    window_(nb, N.x1 + 0.02, 3.2, z, 1.0, 1.2, Math.PI / 2, { lit: false });
  }
  for (let i = 0; i < 4; i++) {
    const ac = part(boxGeo(0.72, 0.56, 0.36), toon(0xb9bfc6), { ol: 0.035 });
    ac.position.set(N.x1 + 0.22, 7.3, N.z0 + 3.0 + i * 3.4);
    nb.add(ac);
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.2, 14), toon(0x565c63));
    fan.rotation.y = Math.PI / 2;
    fan.position.set(N.x1 + 0.41, 7.3, N.z0 + 3.0 + i * 3.4);
    nb.add(fan);
    const br = part(boxGeo(0.8, 0.06, 0.5), matGalv, { ol: 0.02, shadow: false });
    br.position.set(N.x1 + 0.24, 6.98, N.z0 + 3.0 + i * 3.4);
    nb.add(br);
  }
  // 燃气表 / 配电箱
  for (const [y, z] of [[1.6, -6.0], [1.6, -9.5], [3.4, -12.0]]) {
    const mb = part(boxGeo(0.24, 0.42, 0.34), matGalv, { ol: 0.02, shadow: false });
    mb.position.set(N.x1 + 0.12, y, z);
    nb.add(mb);
  }
  // 立管
  for (const z of [N.z0 + 0.8, -8.0, -14.0]) {
    cyl(nb, 0.075, 0.075, N.h, matGalv, N.x1 + 0.14, N.h / 2, z, { seg: 8, ol: 0.02 });
  }
  // 室外钢楼梯（到二层）
  const st = new THREE.Group();
  const stepMat = toon(0x8d949c);
  for (let i = 0; i < 11; i++) {
    const sp = part(boxGeo(0.9, 0.05, 0.26), stepMat, { ol: 0.02, shadow: false });
    sp.position.set(0, 0.2 + i * 0.24, -i * 0.26);
    st.add(sp);
  }
  link(st, V3(-0.45, 0.2, 0.1), V3(-0.45, 2.9, -2.7), 0.05, matGalv, 0.02);
  link(st, V3(0.45, 0.2, 0.1), V3(0.45, 2.9, -2.7), 0.05, matGalv, 0.02);
  // 栏杆
  link(st, V3(0.44, 1.05, 0.1), V3(0.44, 3.75, -2.7), 0.035, matGalv, 0.02);
  for (let i = 0; i < 6; i++) {
    link(st, V3(0.44, 1.05 + i * 0.45, 0.1 - i * 0.45), V3(0.44, 0.2 + i * 1.2, 0.1 - i * 0.6), 0.022, matGalv, 0.01);
  }
  st.position.set(N.x1 + 0.7, 0.34, N.z0 + 9.0);
  st.rotation.y = 0;
  nb.add(st);
  // 二层平台
  const plat = part(boxGeo(1.2, 0.09, 3.0), stepMat, { ol: 0.03, shadow: false });
  plat.position.set(N.x1 + 0.7, 3.24, N.z0 + 7.0);
  nb.add(plat);
  const platDoor = new THREE.Mesh(planeGeo(0.85, 1.9), glow(0xffd8a0, 0.35));
  platDoor.rotation.y = Math.PI / 2;
  platDoor.position.set(N.x1 + 0.05, 4.3, N.z0 + 7.0);
  nb.add(platDoor);

  // 屋顶水塔 + 栏杆 + 天线
  const tank = cyl(nb, 0.62, 0.62, 1.15, toon(0x8d949c), N.x0 + 3.2, N.h + 1.15, (N.z0 + N.z1) / 2 + 1.0, { seg: 14, ol: 0.04 });
  const tankTop = cyl(nb, 0.66, 0.66, 0.1, toon(0x6b7078), N.x0 + 3.2, N.h + 1.75, (N.z0 + N.z1) / 2 + 1.0, { seg: 14, ol: 0.03, shadow: false });
  for (const [dx, dz] of [[0.4, 0.4], [-0.4, 0.4], [0.4, -0.4], [-0.4, -0.4]]) {
    link(nb, V3(N.x0 + 3.2 + dx, N.h + 0.6, (N.z0 + N.z1) / 2 + 1.0 + dz), V3(N.x0 + 3.2 + dx * 0.9, 0.4 + N.h, (N.z0 + N.z1) / 2 + 1.0 + dz * 0.9), 0.03, matGalv, 0.01);
  }
  for (let i = 0; i < 8; i++) {
    const p = part(boxGeo(0.05, 0.8, 0.05), matGalv, { ol: 0, shadow: false });
    p.position.set(N.x0 + 0.3 + i * 0.85, N.h + 0.9, N.z1 - 0.2);
    nb.add(p);
  }
  link(nb, V3(N.x0 + 0.3, N.h + 1.3, N.z1 - 0.2), V3(N.x0 + 6.5, N.h + 1.3, N.z1 - 0.2), 0.03, matGalv, 0.01);
  cyl(nb, 0.03, 0.03, 2.4, matGalv, N.x0 + 1.2, N.h + 2.1, N.z1 - 1.2, { seg: 6, ol: 0.015 });
  for (const dx of [-0.5, 0, 0.5]) {
    link(nb, V3(N.x0 + 1.2, N.h + 3.0, N.z1 - 1.2), V3(N.x0 + 1.2 + dx, N.h + 3.9, N.z1 - 1.2 + (dx ? 0 : 0.5)), 0.02, matGalv, 0.01);
  }
  G.add(nb);

  /* ================= 小巷细节 ================= */
  const al = L.ALLEY;
  const alleyGrp = new THREE.Group();
  // 巷底（暗沥青）
  const aMat = wetMat(0x2c3038, { map: texAsphalt(), roughness: 0.2, metalness: 0.5 });
  aMat.map = texAsphalt().clone(); aMat.map.repeat.set(2, 6); aMat.map.needsUpdate = true;
  const alleyFloor = new THREE.Mesh(planeGeo(al.x1 - al.x0, al.z1 - al.z0), aMat);
  alleyFloor.rotation.x = -Math.PI / 2;
  alleyFloor.position.set((al.x0 + al.x1) / 2, 0.05, (al.z0 + al.z1) / 2);
  alleyFloor.receiveShadow = true;
  alleyGrp.add(alleyFloor);
  // 巷中排水沟
  const gutter = wetMat(0x1e222a, { roughness: 0.06, metalness: 0.8 });
  const gg = new THREE.Mesh(planeGeo(0.36, al.z1 - al.z0), gutter);
  gg.rotation.x = -Math.PI / 2;
  gg.position.set((al.x0 + al.x1) / 2 - 0.3, 0.056, (al.z0 + al.z1) / 2);
  gg.renderOrder = 3;
  alleyGrp.add(gg);
  // 两侧墙：店侧（浅色瓷砖）+ 邻栋侧已有
  const sideWall = part(boxGeo(0.16, 3.0, al.z1 - al.z0), toon(0xbdb8b0, { map: texFacade(0xbdb8b0) }), { ol: 0.04 });
  sideWall.position.set(al.x1 + 0.08, 1.5, (al.z0 + al.z1) / 2);
  alleyGrp.add(sideWall);
  // 墙上的杂乱：管道、配电箱、水龙头、软管
  for (const z of [-3.0, -6.4, -10.0, -14.0]) {
    cyl(alleyGrp, 0.06, 0.06, 2.6, toon(0x9aa1a8), al.x1 - 0.06, 1.7, z, { seg: 8, ol: 0.02 });
  }
  const meter = part(boxGeo(0.3, 0.45, 0.24), toon(0xb2b8be), { ol: 0.025, shadow: false });
  meter.position.set(al.x1 - 0.14, 1.8, -8.5);
  alleyGrp.add(meter);
  // 空调外机（巷内）
  for (const [z, y] of [[-4.6, 0.9], [-11.8, 0.9]]) {
    const ac = part(boxGeo(0.44, 0.6, 0.86), toon(0xb9bfc6), { ol: 0.04 });
    ac.position.set(al.x0 + 0.4, y, z);
    alleyGrp.add(ac);
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.2, 14), toon(0x565c63));
    fan.rotation.y = -Math.PI / 2;
    fan.position.set(al.x0 + 0.18, y, z);
    alleyGrp.add(fan);
    // 支架
    for (const dz of [-0.3, 0.3]) {
      const br = part(boxGeo(0.3, 0.05, 0.05), matGalv, { ol: 0.01, shadow: false });
      br.position.set(al.x0 + 0.2, y - 0.36, z + dz);
      alleyGrp.add(br);
    }
  }
  // 墙灯（昏暗，闪烁）
  const alLampBody = part(boxGeo(0.2, 0.14, 0.28), toon(0x4c525a), { ol: 0.02, shadow: false });
  alLampBody.position.set(al.x1 - 0.2, 2.6, -7.0);
  alleyGrp.add(alLampBody);
  const alLamp = new THREE.Mesh(planeGeo(0.16, 0.1), glow(0xcfe4ff, 1.2));
  alLamp.rotation.x = Math.PI / 2;
  alLamp.position.set(al.x1 - 0.2, 2.52, -7.0);
  alleyGrp.add(alLamp);
  const alLight = new THREE.PointLight(0xbfd8ff, 14, 8, 2);
  alLight.position.set(al.x1 - 0.5, 2.4, -7.0);
  alleyGrp.add(alLight);
  runtime.flickerLights = runtime.flickerLights || [];
  runtime.flickerLights.push({ light: alLight, mesh: alLamp });
  // 杂物：木箱、水桶、旧自行车
  for (const [z, s, ry] of [[-13.2, 1.0, 0.3], [-13.8, 0.8, -0.4]]) {
    box(alleyGrp, 0.6 * s, 0.44 * s, 0.48 * s, toon(0x8d6c48), al.x0 + 0.55, 0.28 * s, z, { ol: 0.03, ry });
  }
  cyl(alleyGrp, 0.19, 0.16, 0.4, toon(0x4a5a6a), al.x0 + 0.5, 0.26, -15.6, { seg: 12, ol: 0.03 });
  // 尽头铁栅栏门
  const fenceMat = toon(0x6b7078);
  for (let i = 0; i < 14; i++) {
    const b = part(boxGeo(0.05, 2.2, 0.05), fenceMat, { ol: 0.01, shadow: false });
    b.position.set(al.x0 + 0.2 + i * 0.2, 1.24, al.z0 + 0.1);
    alleyGrp.add(b);
  }
  for (const y of [0.5, 1.4, 2.3]) {
    const h = part(boxGeo(al.x1 - al.x0, 0.06, 0.06), fenceMat, { ol: 0.01, shadow: false });
    h.position.set((al.x0 + al.x1) / 2, y, al.z0 + 0.1);
    alleyGrp.add(h);
  }
  // 杂草
  for (let i = 0; i < 16; i++) {
    const w2 = new THREE.Mesh(new THREE.ConeGeometry(sr(0.05, 0.1), sr(0.16, 0.34), 5), toon(0x4a6a3a));
    w2.position.set(al.x0 + srand() * (al.x1 - al.x0), 0.1, al.z0 + srand() * (al.z1 - al.z0));
    w2.rotation.z = sr(-0.2, 0.2);
    alleyGrp.add(w2);
  }
  // 积水
  const pMat = wetMat(0x161a21, { roughness: 0.04, metalness: 0.9, envMapIntensity: 1.5 });
  pMat.transparent = true; pMat.opacity = 0.6; pMat.depthWrite = false;
  for (const [x, z, rx, rz] of [[al.x0 + 1.0, -5.0, 0.9, 1.8], [al.x1 - 0.9, -12.0, 1.1, 2.2]]) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 20), pMat);
    m.rotation.x = -Math.PI / 2;
    m.scale.set(rx, rz, 1);
    m.position.set(x, 0.062, z);
    m.renderOrder = 4;
    alleyGrp.add(m);
  }
  G.add(alleyGrp);

  /* ================= 北侧围墙 + 铁门 ================= */
  const wallZ = L.WALL_N.z;
  const matWallC = toon(0xa8a49c, { map: texFacade(0xa8a49c) });
  box(G, 14.0, L.WALL_N.h, 0.4, matWallC, -14.0, L.WALL_N.h / 2, wallZ, { ol: 0.05 });
  box(G, 8.0, L.WALL_N.h, 0.4, matWallC, 17.0, L.WALL_N.h / 2, wallZ, { ol: 0.05 });
  // 大门
  box(G, 0.3, 2.6, 0.5, toon(0x8d949c), -6.6, 1.3, wallZ, { ol: 0.04 });
  box(G, 0.3, 2.6, 0.5, toon(0x8d949c), -3.4, 1.3, wallZ, { ol: 0.04 });
  const gateTex = canvasTex(64, 256, (ctx, w2, h2) => {
    ctx.fillStyle = '#9aa1a8'; ctx.fillRect(0, 0, w2, h2);
    ctx.fillStyle = '#6b7078';
    for (let i = 0; i < 8; i++) ctx.fillRect(4 + i * 7, 4, 4, h2 - 8);
  });
  const gateMat = toon(0xa8aeb4, { map: gateTex });
  for (let i = 0; i < 5; i++) {
    const p = part(boxGeo(0.55, 2.4, 0.08), gateMat, { ol: 0.03, shadow: false });
    p.position.set(-6.35 + i * 0.62, 1.22, wallZ);
    G.add(p);
  }
  // 墙顶
  const capMat = toon(0x8d8a84);
  box(G, 14.2, 0.14, 0.54, capMat, -14.0, L.WALL_N.h + 0.07, wallZ, { ol: 0.02, shadow: false });
  box(G, 8.2, 0.14, 0.54, capMat, 17.0, L.WALL_N.h + 0.07, wallZ, { ol: 0.02, shadow: false });
  // 围墙上的爬藤 / 苔痕（暗色贴片）
  const mossMat = new THREE.MeshBasicMaterial({ color: 0x2f3a2a, transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(planeGeo(sr(1.0, 2.4), sr(0.5, 1.6)), mossMat);
    m.position.set(-19 + srand() * 12, sr(0.3, 1.6), wallZ + 0.21);
    G.add(m);
  }

  /* ================= 底座绿化围合（东北 / 南侧树篱） ================= */
  const hedgeMat = toon(0x35503a);
  const hedgeDark = toon(0x28402c);
  function hedge(x0, z0, x1, z1, h, n) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ang = Math.atan2(x1 - x0, z1 - z0);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const body = part(boxGeo(0.92, h, len), hedgeMat, { ol: 0.05 });
    body.position.set(cx, 0.34 + h / 2, cz);
    body.rotation.y = ang;
    G.add(body);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      const m = new THREE.Mesh(sphGeo(sr(0.3, 0.46), 10, 8), srand() > 0.5 ? hedgeMat : hedgeDark);
      m.position.set(x, 0.34 + h + 0.06, z);
      m.scale.set(1, 0.62, 1);
      m.castShadow = true;
      G.add(m);
    }
  }
  // 南侧沿边树篱（避开对面楼体）
  hedge(-1.2, 20.0, 20.4, 20.0, 0.9, 12);
  // 东侧沿边树篱
  hedge(20.1, -20.2, 20.1, 5.6, 0.85, 14);
  // 花坛（南侧人行道边）
  const planterMat = toon(0x9a958c);
  for (const [x, z] of [[-19.0, 16.6], [-16.0, 16.6]]) {
    const pl2 = part(boxGeo(2.4, 0.5, 1.1), planterMat, { ol: 0.04 });
    pl2.position.set(x, 0.34 + 0.25, z);
    G.add(pl2);
    const soil = new THREE.Mesh(planeGeo(2.2, 0.9), toon(0x4a3a2c));
    soil.rotation.x = -Math.PI / 2;
    soil.position.set(x, 0.6, z);
    G.add(soil);
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(sphGeo(sr(0.16, 0.3), 8, 6), srand() > 0.5 ? hedgeMat : toon(0x3a5a38));
      b.position.set(x + sr(-1.0, 1.0), 0.72, z + sr(-0.35, 0.35));
      b.castShadow = true;
      G.add(b);
    }
  }

  /* ================= 街道对面（南侧）的邻栋，提供远景层次 ================= */
  // A 栋：三层小楼 + 一层亮灯小店
  const farWallMat = toon(0x8a8f96, { map: texFacade(0x8a8f96) });
  const A = { x0: -21, x1: -12.2, z0: 17.2, z1: 21, h: 6.4 };
  const Aw = A.x1 - A.x0, Ad = A.z1 - A.z0;
  const farB = part(boxGeo(Aw, A.h, Ad), farWallMat, { ol: 0.07 });
  farB.position.set((A.x0 + A.x1) / 2, A.h / 2, (A.z0 + A.z1) / 2);
  G.add(farB);
  // 一层店面（暖光）
  const shopGlow = new THREE.Mesh(planeGeo(Aw - 1.2, 1.9), glow(0xffc98a, 0.55));
  shopGlow.position.set((A.x0 + A.x1) / 2, 1.5, A.z0 - 0.02);
  shopGlow.rotation.y = Math.PI;
  G.add(shopGlow);
  const shopFrame = part(boxGeo(Aw - 0.8, 0.5, 0.25), toon(0x6b7078), { ol: 0.03, shadow: false });
  shopFrame.position.set((A.x0 + A.x1) / 2, 2.7, A.z0 - 0.12);
  G.add(shopFrame);
  const shopSign = new THREE.Mesh(planeGeo(3.6, 0.46), new THREE.MeshBasicMaterial({ map: texPoster(3), color: new THREE.Color(0xd8cfc0) }));
  shopSign.position.set((A.x0 + A.x1) / 2, 2.7, A.z0 - 0.26);
  shopSign.rotation.y = Math.PI;
  G.add(shopSign);
  const aLight = new THREE.PointLight(0xffc98a, 22, 14, 2);
  aLight.position.set((A.x0 + A.x1) / 2, 2.0, A.z0 - 1.6);
  G.add(aLight);
  // 楼上窗（朝街）
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      window_(G, A.x0 + 1.8 + i * 3.2, 6.2 - j * 2.7, A.z0 - 0.02, 1.25, 1.4, Math.PI, { lit: (i + j) % 2 === 0, intensity: 0.5 });
    }
  }
  // 山墙侧（东立面）窗
  for (let j = 0; j < 2; j++) {
    window_(G, A.x1 + 0.02, 6.0 - j * 2.7, A.z0 + 1.6, 1.1, 1.3, Math.PI / 2, { lit: j === 0, intensity: 0.45 });
  }
  // A 栋屋顶：女儿墙 + 水塔 + 天线
  const parA = part(boxGeo(Aw + 0.2, 0.5, Ad + 0.2), toon(0x6b7078), { ol: 0.05 });  parA.position.set((A.x0 + A.x1) / 2, A.h + 0.25, (A.z0 + A.z1) / 2);
  G.add(parA);
  cyl(G, 0.5, 0.5, 0.9, toon(0x7e848c), A.x0 + 2.2, A.h + 1.0, 19.6, { seg: 14, ol: 0.04 });
  cyl(G, 0.54, 0.54, 0.1, toon(0x6b7078), A.x0 + 2.2, A.h + 1.5, 19.6, { seg: 14, ol: 0.03, shadow: false });
  cyl(G, 0.03, 0.03, 2.0, matGalv, A.x1 - 2.0, A.h + 1.6, 18.6, { seg: 6, ol: 0.015 });
  box(G, 1.1, 0.65, 0.9, toon(0xb9bfc6), A.x0 + 5.6, A.h + 0.9, 18.4, { ol: 0.04 });

  // B 栋：低层民居（坡屋顶）
  const B = { x0: -10.6, x1: -2.2, z0: 18.6, z1: 21, h: 4.4 };
  const Bw = B.x1 - B.x0, Bd = B.z1 - B.z0;
  const houseMat = toon(0xa8a49a, { map: texFacade(0xa8a49a) });
  const hb = part(boxGeo(Bw, B.h, Bd), houseMat, { ol: 0.06 });
  hb.position.set((B.x0 + B.x1) / 2, B.h / 2, (B.z0 + B.z1) / 2);
  G.add(hb);
  // 坡屋顶（两片斜板）
  const roofMat2 = toon(0x4a4f57);
  for (const s of [-1, 1]) {
    const rp = part(boxGeo(Bw + 0.7, 0.2, Bd * 0.62), roofMat2, { ol: 0.05, shadow: true });
    rp.position.set((B.x0 + B.x1) / 2, B.h + 0.55, (B.z0 + B.z1) / 2 + s * Bd * 0.24);
    rp.rotation.x = s * 0.42;
    G.add(rp);
  }
  // 窗 + 门前灯
  window_(G, B.x0 + 3.0, 3.2, B.z0 - 0.02, 1.2, 1.2, Math.PI, { lit: true, intensity: 0.5 });
  window_(G, B.x0 + 6.4, 3.2, B.z0 - 0.02, 1.2, 1.2, Math.PI, { lit: false });
  const bDoor = part(boxGeo(0.95, 2.05, 0.16), toon(0x5a4a3c), { ol: 0.03 });
  bDoor.position.set(B.x0 + 1.2, 1.05, B.z0 - 0.04);
  G.add(bDoor);
  const bLamp = new THREE.Mesh(planeGeo(0.3, 0.16), glow(0xffd9a0, 0.9));
  bLamp.position.set(B.x0 + 1.2, 2.35, B.z0 - 0.12);
  bLamp.rotation.x = Math.PI / 2;
  G.add(bLamp);
  const bLight = new THREE.PointLight(0xffce90, 10, 7, 2);
  bLight.position.set(B.x0 + 1.2, 2.2, B.z0 - 0.9);
  G.add(bLight);

  // 底座剖切面一侧（南向）也点上几盏窗，避免出现大块死黑
  for (let i = 0; i < 3; i++) {
    window_(G, A.x0 + 2.2 + i * 3.2, 5.6, A.z1 + 0.02, 1.15, 1.3, 0, { lit: i !== 1, intensity: 0.42 });
    window_(G, A.x0 + 2.2 + i * 3.2, 2.9, A.z1 + 0.02, 1.15, 1.3, 0, { lit: i === 0, intensity: 0.36 });
  }
  window_(G, B.x0 + 2.4, 3.0, B.z1 + 0.02, 1.1, 1.1, 0, { lit: true, intensity: 0.4 });
  window_(G, B.x0 + 6.0, 3.0, B.z1 + 0.02, 1.1, 1.1, 0, { lit: false });

  /* ================= 后场（店后停车场）杂物 ================= */
  const card = toon(0xa8845c);
  const card2 = toon(0x8d6c48);
  const crate = (x, z, s, ry) => {
    box(G, 0.62 * s, 0.42 * s, 0.48 * s, srand() > 0.5 ? card : card2, x, 0.28 * s, z, { ol: 0.03, ry });
  };
  crate(1.0, -13.0, 1.0, 0.3);
  crate(1.7, -13.4, 0.85, -0.25);
  crate(0.7, -12.4, 0.9, 0.9);
  crate(5.2, -17.4, 1.1, 0.15);
  // 金属垃圾桶 + 水桶
  cyl(G, 0.34, 0.3, 0.86, toon(0x6b7078), -3.2, 0.48, -17.6, { seg: 14, ol: 0.04 });
  cyl(G, 0.2, 0.18, 0.38, toon(0x4a5a6a), 2.4, 0.24, -12.2, { seg: 12, ol: 0.03 });
  // 停放的自行车
  // （已在前方街区放置多辆，这里留出干净的空位线）

  runtime.neighbors = G;
  return G;
}
