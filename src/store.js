/**
 * store.js — 便利店：外墙 / 玻璃 / 招牌雨棚 / 完整店内陈设
 */
import * as THREE from 'three';
import {
  PAL, TAU, srand, sr, sri, spick, box, cyl, decal, part, boxGeo, cylGeo,
  toon, glow, litMap, glassMat, decal as dec, texMainSign, texVertSign, texDoorSign,
  texFacade, texFloorIndoor, texGoods, texCoolerInside, texFreezerInside, texPoster,
  texCigCabinet, texBackDoor, texPriceStrip, texWindowBanner, texOdenSign,
  texFloorArrow, texCaution, texMagRack, texGlassStreak, lightPanel, halo, sphGeo,
  planeGeo, noRaycast,
} from './lib/core.js';
import { L } from './layout.js';
import { wetMat } from './lib/core.js';

const S = L.STORE;
const W = 0.26;                 // 墙厚
const IX0 = S.x0 + W, IX1 = S.x1 - W;     // 店内净宽 x
const IZ0 = S.z0 + W, IZ1 = S.z1 - W;     // 店内净深 z
const FY = S.floorY;            // 店内地面
const CY = S.ceilY;             // 店内天花

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
/** 两点间的细杆（屋面栏杆等） */
function linkRoof(parent, a, b, mat, r = 0.028) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const grp = part(new THREE.CylinderGeometry(r, r, len, 6), mat, { ol: 0, shadow: false });
  grp.position.copy(a).add(b).multiplyScalar(0.5);
  grp.userData.mesh.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.normalize());
  parent.add(grp);
  return grp;
}

export function buildStore(scene, runtime) {
  const g = new THREE.Group();
  scene.add(g);

  /* ================= 材质 ================= */
  const matWall = toon(PAL.wall, { map: texFacade(PAL.wall) });
  const matWallSide = toon(0xc9c4bb, { map: texFacade(0xc9c4bb) });
  const matConcrete = toon(PAL.concrete);
  const matDark = toon(0x33383f);
  const matMetal = toon(PAL.metal);
  const matSteel = toon(PAL.steel);
  const matFrame = toon(0x9ea5ad);
  const matRubber = toon(PAL.rubber);
  const matFloor = toon(0xe8e6e0, { map: texFloorIndoor() });
  const matWhite = toon(0xf2f2ee);
  const matPlastic = toon(0xdfe3e6);
  const matWarmWood = toon(0xa8804f);
  const glass = glassMat(0xbfe6ff, 0.13);
  const glassPanel = glassMat(0xd8f0ff, 0.1);

  /* ================= 地板 / 天花 / 屋面 ================= */
  // 店内地面
  const floor = new THREE.Mesh(planeGeo(IX1 - IX0 + 0.6, IZ1 - IZ0 + 0.6), matFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((IX0 + IX1) / 2, FY + 0.002, (IZ0 + IZ1) / 2);
  floor.receiveShadow = true;
  g.add(floor);
  // 店内湿滑地砖（微弱反光）
  const floorWet = new THREE.Mesh(planeGeo(IX1 - IX0 + 0.6, IZ1 - IZ0 + 0.6), wetMat(0xdfe0dd, {
    roughness: 0.28, metalness: 0.35, envMapIntensity: 0.5,
  }));
  floorWet.rotation.x = -Math.PI / 2;
  floorWet.position.copy(floor.position).setY(FY + 0.006);
  floorWet.rotation.z = 0.0;
  g.add(floorWet);

  // 地面垫层（结构）
  box(g, S.x1 - S.x0, 0.36, S.z1 - S.z0, matConcrete, (S.x0 + S.x1) / 2, 0.18, (S.z0 + S.z1) / 2, { ol: 0.05, shadow: false });

  // 天花
  box(g, IX1 - IX0 + 0.6, 0.22, IZ1 - IZ0 + 0.6, matWhite, (IX0 + IX1) / 2, CY + 0.11, (IZ0 + IZ1) / 2, { ol: 0.03, shadow: false });
  // 屋面板
  box(g, S.x1 - S.x0 + 0.5, 0.3, S.z1 - S.z0 + 0.5, toon(0x666b74), (S.x0 + S.x1) / 2, S.wall + 0.15, (S.z0 + S.z1) / 2, { ol: 0.06 });
  // 屋面防水层
  const roofMat = toon(0x4c515a);
  const roofPlane = new THREE.Mesh(planeGeo(S.x1 - S.x0 - 0.1, S.z1 - S.z0 - 0.1), roofMat);
  roofPlane.rotation.x = -Math.PI / 2;
  roofPlane.position.set((S.x0 + S.x1) / 2, S.wall + 0.31, (S.z0 + S.z1) / 2);
  roofPlane.receiveShadow = true;
  g.add(roofPlane);
  // 女儿墙
  const paraMat = toon(0xbfbab2, { map: texFacade(0xbfbab2) });
  const paraH = S.para - S.wall;
  box(g, S.x1 - S.x0 + 0.5, paraH, 0.3, paraMat, (S.x0 + S.x1) / 2, S.wall + 0.15 + paraH / 2, S.z1 + 0.1, { ol: 0.05 });
  box(g, S.x1 - S.x0 + 0.5, paraH, 0.3, paraMat, (S.x0 + S.x1) / 2, S.wall + 0.15 + paraH / 2, S.z0 - 0.1, { ol: 0.05 });
  box(g, 0.3, paraH, S.z1 - S.z0 + 0.5, paraMat, S.x0 - 0.1, S.wall + 0.15 + paraH / 2, (S.z0 + S.z1) / 2, { ol: 0.05 });
  box(g, 0.3, paraH, S.z1 - S.z0 + 0.5, paraMat, S.x1 + 0.1, S.wall + 0.15 + paraH / 2, (S.z0 + S.z1) / 2, { ol: 0.05 });

  /* ================= 墙体 ================= */
  // 西侧实墙
  box(g, W, S.wall - 0.36, S.z1 - S.z0, matWallSide, S.x0 + W / 2, 0.36 + (S.wall - 0.36) / 2, (S.z0 + S.z1) / 2, { ol: 0.05 });
  // 北侧（店后）实墙 + 后门洞
  const backDoor = { x0: 3.2, x1: 4.4 };
  box(g, (backDoor.x0 - S.x0), S.wall - 0.36, W, matWall, (S.x0 + backDoor.x0) / 2, 0.36 + (S.wall - 0.36) / 2, S.z0 + W / 2, { ol: 0.05 });
  box(g, (S.x1 - backDoor.x1), S.wall - 0.36, W, matWall, (backDoor.x1 + S.x1) / 2, 0.36 + (S.wall - 0.36) / 2, S.z0 + W / 2, { ol: 0.05 });
  box(g, backDoor.x1 - backDoor.x0, S.wall - 2.5, W, matWall, (backDoor.x0 + backDoor.x1) / 2, 2.5 + (S.wall - 2.5) / 2, S.z0 + W / 2, { ol: 0.05 });
  // 后门（门扇）
  const bd = part(boxGeo(backDoor.x1 - backDoor.x0 - 0.06, 2.16, 0.1), toon(0xd4d9dd, { map: texBackDoor() }), { ol: 0.03 });
  bd.position.set((backDoor.x0 + backDoor.x1) / 2, FY + 1.08, S.z0 + 0.16);
  g.add(bd);
  // 前墙：玻璃下裙墙 + 上梁
  const skirtH = 0.95;
  box(g, S.x1 - S.x0, skirtH - 0.3, W, matWall, (S.x0 + S.x1) / 2, 0.3 + (skirtH - 0.3) / 2, S.z1 - W / 2, { ol: 0.05 });
  box(g, S.x1 - S.x0, S.wall - 4.16, W, matWall, (S.x0 + S.x1) / 2, 4.16 + (S.wall - 4.16) / 2, S.z1 - W / 2, { ol: 0.05 });
  // 东墙：玻璃上下的实墙
  box(g, W, skirtH - 0.3, S.z1 - S.z0, matWallSide, S.x1 - W / 2, 0.3 + (skirtH - 0.3) / 2, (S.z0 + S.z1) / 2, { ol: 0.05 });
  box(g, W, S.wall - 4.16, S.z1 - S.z0, matWallSide, S.x1 - W / 2, 4.16 + (S.wall - 4.16) / 2, (S.z0 + S.z1) / 2, { ol: 0.05 });
  // 转角柱
  box(g, 0.5, S.wall - 0.36, 0.5, matWall, S.x1 - 0.25, 0.36 + (S.wall - 0.36) / 2, S.z1 - 0.25, { ol: 0.05 });

  /* ================= 玻璃幕墙 ================= */
  const glassTop = 4.16, glassBot = skirtH;
  const glassY = (glassTop + glassBot) / 2, glassH = glassTop - glassBot;
  const mullMat = matFrame;

  function glassWall(axis, fixed, a0, a1, skip = []) {
    // axis: 'z' 表示沿 x 方向的正面玻璃（法线 z）；'x' 表示沿 z 方向的侧面玻璃
    const spans = [];
    let cur = a0;
    for (const s of skip) {
      if (s[0] > cur) spans.push([cur, s[0]]);
      cur = Math.max(cur, s[1]);
    }
    if (a1 > cur) spans.push([cur, a1]);
    for (const [s0, s1] of spans) {
      const len = s1 - s0;
      const n = Math.max(1, Math.round(len / 2.3));
      const pw = len / n;
      for (let i = 0; i < n; i++) {
        const c = s0 + pw * (i + 0.5);
        const wPlane = pw - 0.09;
        if (axis === 'z') {
          const m = new THREE.Mesh(planeGeo(wPlane, glassH), glassPanel);
          m.position.set(c, glassY, fixed);
          m.renderOrder = 8;
          g.add(m);
          // 玻璃反光
          if (i % 2 === 0) {
            const st = new THREE.Mesh(planeGeo(wPlane * 0.9, glassH * 0.9), new THREE.MeshBasicMaterial({
              map: texGlassStreak(), transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
            }));
            st.position.set(c, glassY, fixed + 0.03);
            st.renderOrder = 9;
            g.add(st);
          }
          // 竖梃
          const mu = part(boxGeo(0.09, glassH, 0.16), mullMat, { ol: 0.02, shadow: false });
          mu.position.set(s0 + pw * i, glassY, fixed);
          g.add(mu);
        } else {
          const m = new THREE.Mesh(planeGeo(wPlane, glassH), glassPanel);
          m.rotation.y = Math.PI / 2;
          m.position.set(fixed, glassY, c);
          m.renderOrder = 8;
          g.add(m);
          const mu = part(boxGeo(0.16, glassH, 0.09), mullMat, { ol: 0.02, shadow: false });
          mu.position.set(fixed, glassY, s0 + pw * i);
          g.add(mu);
        }
      }
      if (axis === 'z') {
        const mu = part(boxGeo(0.09, glassH, 0.16), mullMat, { ol: 0.02, shadow: false });
        mu.position.set(s1, glassY, fixed); g.add(mu);
        // 上下横框
        box(g, len, 0.12, 0.2, mullMat, (s0 + s1) / 2, glassTop, fixed, { ol: 0.02, shadow: false });
        box(g, len, 0.12, 0.2, mullMat, (s0 + s1) / 2, glassBot, fixed, { ol: 0.02, shadow: false });
      } else {
        const mu = part(boxGeo(0.16, glassH, 0.09), mullMat, { ol: 0.02, shadow: false });
        mu.position.set(fixed, glassY, s1); g.add(mu);
        box(g, 0.2, 0.12, len, mullMat, fixed, glassTop, (s0 + s1) / 2, { ol: 0.02, shadow: false });
        box(g, 0.2, 0.12, len, mullMat, fixed, glassBot, (s0 + s1) / 2, { ol: 0.02, shadow: false });
      }
    }
  }
  // 正面玻璃（预留自动门洞口）
  glassWall('z', S.z1 - W / 2 - 0.02, S.x0 + 0.5, S.x1 - 0.5, [[L.DOOR.x0 - 0.1, L.DOOR.x1 + 0.1]]);
  // 东侧玻璃
  glassWall('x', S.x1 - W / 2 - 0.02, S.z0 + 0.5, S.z1 - 0.5, []);

  /* ============ 自动门 ============ */
  const doorY0 = skirtH, doorH = 2.55;
  const doorW = L.DOOR.x1 - L.DOOR.x0;
  // 门框
  box(g, 0.16, doorH + 0.1, 0.22, mullMat, L.DOOR.x0, doorY0 + doorH / 2, S.z1 - W / 2 - 0.02, { ol: 0.02, shadow: false });
  box(g, 0.16, doorH + 0.1, 0.22, mullMat, L.DOOR.x1, doorY0 + doorH / 2, S.z1 - W / 2 - 0.02, { ol: 0.02, shadow: false });
  box(g, doorW + 0.3, 0.18, 0.26, mullMat, (L.DOOR.x0 + L.DOOR.x1) / 2, doorY0 + doorH + 0.09, S.z1 - W / 2 - 0.02, { ol: 0.02, shadow: false });
  box(g, doorW + 0.3, 0.08, 0.26, matMetal, (L.DOOR.x0 + L.DOOR.x1) / 2, doorY0 - 0.02, S.z1 - W / 2 - 0.02, { ol: 0.02, shadow: false });
  // 两扇玻璃门（一扇滑开）
  const doorPanel = (xc, open) => {
    const p = part(boxGeo(doorW / 2 - 0.06, doorH, 0.07), glassPanel, { ol: 0, shadow: false });
    p.position.set(xc, doorY0 + doorH / 2, S.z1 - W / 2 - 0.02 + (open ? 0.36 : 0));
    g.add(p);
    const fT = part(boxGeo(doorW / 2 - 0.02, 0.07, 0.09), mullMat, { ol: 0.02, shadow: false });
    fT.position.set(xc, doorY0 + doorH - 0.05, S.z1 - W / 2 - 0.02 + (open ? 0.36 : 0)); g.add(fT);
    const fB = part(boxGeo(doorW / 2 - 0.02, 0.09, 0.09), mullMat, { ol: 0.02, shadow: false });
    fB.position.set(xc, doorY0 + 0.07, S.z1 - W / 2 - 0.02 + (open ? 0.36 : 0)); g.add(fB);
    const fL = part(boxGeo(0.07, doorH, 0.09), mullMat, { ol: 0.02, shadow: false });
    fL.position.set(xc - doorW / 4 + 0.03, doorY0 + doorH / 2, S.z1 - W / 2 - 0.02 + (open ? 0.36 : 0)); g.add(fL);
    const fR = part(boxGeo(0.07, doorH, 0.09), mullMat, { ol: 0.02, shadow: false });
    fR.position.set(xc + doorW / 4 - 0.03, doorY0 + doorH / 2, S.z1 - W / 2 - 0.02 + (open ? 0.36 : 0)); g.add(fR);
  };
  doorPanel(L.DOOR.x0 + doorW / 4, false);
  doorPanel(L.DOOR.x1 - doorW / 4, true);
  // 门上方灯箱
  const dl = part(boxGeo(doorW + 0.5, 0.52, 0.16), toon(0xf2f5f2), { ol: 0.03, shadow: false });
  dl.position.set((L.DOOR.x0 + L.DOOR.x1) / 2, 3.86, S.z1 + 0.06); g.add(dl);
  decal(g, doorW + 0.3, 0.44, new THREE.MeshBasicMaterial({ map: texDoorSign() }), (L.DOOR.x0 + L.DOOR.x1) / 2, 3.86, S.z1 + 0.15);
  // 自动门感应器
  box(g, 0.5, 0.1, 0.16, matDark, (L.DOOR.x0 + L.DOOR.x1) / 2, doorY0 + doorH + 0.22, S.z1 + 0.06, { ol: 0.02, shadow: false });
  // 门口地垫
  const matMat = toon(0x6a4a42);
  const matMesh = new THREE.Mesh(planeGeo(3.6, 1.5), matMat);
  matMesh.rotation.x = -Math.PI / 2;
  matMesh.position.set((L.DOOR.x0 + L.DOOR.x1) / 2, 0.355, S.z1 + 1.15);
  matMesh.receiveShadow = true;
  g.add(matMesh);
  // 地垫条纹
  for (let i = 0; i < 7; i++) {
    const st = new THREE.Mesh(planeGeo(3.4, 0.1), toon(0x50362f));
    st.rotation.x = -Math.PI / 2;
    st.position.set((L.DOOR.x0 + L.DOOR.x1) / 2, 0.357, S.z1 + 0.55 + i * 0.2);
    g.add(st);
  }

  /* ============ 招牌 ============ */
  // 横招牌：背板 + 发光面板
  const signY = 4.62, signH = 1.0;
  box(g, S.x1 - S.x0 + 0.2, signH + 0.1, 0.3, toon(0xd8dcd8), (S.x0 + S.x1) / 2, signY, S.z1 + 0.16, { ol: 0.05 });
  const signFace = new THREE.Mesh(planeGeo(S.x1 - S.x0 - 0.1, signH - 0.08), new THREE.MeshBasicMaterial({ map: texMainSign() }));
  signFace.position.set((S.x0 + S.x1) / 2, signY, S.z1 + 0.315);
  g.add(signFace);
  const signUnder = new THREE.Mesh(planeGeo(S.x1 - S.x0 - 0.1, 0.3), new THREE.MeshBasicMaterial({
    map: texMainSign(), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  signUnder.position.set((S.x0 + S.x1) / 2, signY - 0.7, S.z1 + 0.31);
  signUnder.scale.y = -1;
  signUnder.renderOrder = 3;
  g.add(signUnder);
  // 东侧招牌延续
  const signE = new THREE.Mesh(planeGeo(S.z1 - S.z0 - 0.2, signH - 0.08), new THREE.MeshBasicMaterial({ map: texMainSign() }));
  signE.rotation.y = Math.PI / 2;
  signE.position.set(S.x1 + 0.315, signY, (S.z0 + S.z1) / 2);
  g.add(signE);
  box(g, 0.3, signH + 0.1, S.z1 - S.z0 + 0.2, toon(0xd8dcd8), S.x1 + 0.16, signY, (S.z0 + S.z1) / 2, { ol: 0.05 });

  // 转角竖向灯箱
  const vs = new THREE.Group();
  const vsBody = part(boxGeo(0.34, 3.5, 1.15), toon(0xeef2ee), { ol: 0.05, shadow: false });
  vs.add(vsBody);
  const vsTex = texVertSign();
  for (const [rx, ry, x, z] of [[0, 0, 0, 0.58], [0, Math.PI, 0, -0.58]]) {
    const f = new THREE.Mesh(planeGeo(1.05, 3.4), new THREE.MeshBasicMaterial({ map: vsTex }));
    f.position.set(0, 0, z);
    f.rotation.y = ry;
    vs.add(f);
  }
  const fEast = new THREE.Mesh(planeGeo(0.32, 3.4), new THREE.MeshBasicMaterial({ map: vsTex }));
  fEast.position.set(0.18, 0, 0); fEast.rotation.y = Math.PI / 2; vs.add(fEast);
  const fWest = new THREE.Mesh(planeGeo(0.32, 3.4), new THREE.MeshBasicMaterial({ map: vsTex }));
  fWest.position.set(-0.18, 0, 0); fWest.rotation.y = -Math.PI / 2; vs.add(fWest);
  vs.position.set(S.x1 + 0.55, 3.45, S.z1 + 0.35);
  g.add(vs);
  // 灯箱支架
  box(g, 1.0, 0.12, 0.12, matSteel, S.x1 + 0.1, 5.05, S.z1 + 0.35, { ol: 0.02, shadow: false });
  box(g, 0.12, 0.12, 0.16, matSteel, S.x1 + 0.55, 5.05, S.z1 + 0.05, { ol: 0.02, shadow: false });

  /* ============ 屋檐雨棚 ============ */
  const awMat = toon(PAL.awning);
  const awD = 1.85;
  const aw = new THREE.Group();
  const awBody = part(boxGeo(S.x1 - S.x0 + 0.4, 0.2, awD), awMat, { ol: 0.06 });
  aw.add(awBody);
  // 雨棚前缘亮边
  const awEdge = part(boxGeo(S.x1 - S.x0 + 0.4, 0.1, 0.1), toon(PAL.awningEdge), { ol: 0.03, shadow: false });
  awEdge.position.set(0, -0.02, awD / 2);
  aw.add(awEdge);
  // 雨棚下发光条
  const awLight = new THREE.Mesh(planeGeo(S.x1 - S.x0 - 0.6, awD - 0.4), new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xffe0b0).multiplyScalar(0.42), transparent: true, opacity: 0.6,
  }));
  awLight.rotation.x = Math.PI / 2;
  awLight.position.set(0, -0.11, 0);
  aw.add(awLight);
  aw.position.set((S.x0 + S.x1) / 2, 3.72, S.z1 + awD / 2 - 0.2);
  aw.rotation.x = -0.055;
  g.add(aw);
  // 雨棚支柱
  for (const x of [S.x0 + 1.4, S.x0 + 7.0, 4.2, S.x1 - 1.4]) {
    cyl(g, 0.07, 0.07, 3.6, matSteel, x, 1.8, S.z1 + 1.72, { ol: 0.02, seg: 8, shadow: true });
  }
  // 东侧小雨棚
  const awE = part(boxGeo(1.7, 0.18, S.z1 - S.z0 - 0.6), awMat, { ol: 0.05 });
  awE.position.set(S.x1 + 0.85, 3.72, (S.z0 + S.z1) / 2);
  awE.rotation.z = 0.055;
  g.add(awE);

  // 玻璃后横幅
  const banner = new THREE.Mesh(planeGeo(13, 0.55), new THREE.MeshBasicMaterial({ map: texWindowBanner(), color: new THREE.Color(0x9a9284) }));
  banner.position.set(-4.6, 3.42, S.z1 - 0.5);
  banner.rotation.y = Math.PI;
  g.add(banner);

  /* ================= 店内陈设 ================= */
  const I = new THREE.Group();
  g.add(I);

  const mShelfBody = toon(0xe6e2d8);
  const mShelfEdge = toon(0xc9c4b8);
  const mMetalShelf = toon(0xb9bfc6);
  const mBasket = toon(0xd8453c);

  // --- 中央货架（零食 / 泡面 / 日用） ---
  const gondola = (x0, x1, z, kind, rows = 3) => {
    const w = x1 - x0, h = 1.88;
    const body = part(boxGeo(w, h, 0.9), mShelfBody, { ol: 0.035 });
    body.position.set((x0 + x1) / 2, FY + h / 2, z);
    I.add(body);
    // 层板（前后面）
    for (let r = 0; r < rows; r++) {
      const y = FY + 0.42 + r * 0.48;
      const bd = part(boxGeo(w + 0.06, 0.05, 0.98), mShelfEdge, { ol: 0.02, shadow: false });
      bd.position.set((x0 + x1) / 2, y, z);
      I.add(bd);
      // 商品面（前后）
      const t = texGoods(kind, Math.max(4, Math.round(w / 0.42)), 1, r + Math.round(x0));
      for (const [zz, ry] of [[0.52, 0], [-0.52, Math.PI]]) {
        const f = new THREE.Mesh(planeGeo(w - 0.06, 0.44), litMap(t, 0.24));
        f.position.set((x0 + x1) / 2, y + 0.245, z + zz);
        f.rotation.y = ry;
        I.add(f);
      }
    }
    // 端头挡板
    for (const x of [x0, x1]) {
      const e = part(boxGeo(0.06, h + 0.06, 0.94), mShelfEdge, { ol: 0.02, shadow: false });
      e.position.set(x, FY + h / 2, z);
      I.add(e);
    }
    // 顶部价格牌
    const strip = new THREE.Mesh(planeGeo(w - 0.1, 0.16), new THREE.MeshBasicMaterial({ map: texPriceStrip(), transparent: true }));
    strip.position.set((x0 + x1) / 2, FY + h + 0.1, z + 0.5);
    I.add(strip);
    return body;
  };
  gondola(-8.6, 0.6, -3.7, 'snack', 3);
  gondola(-8.6, 0.6, -5.95, 'noodle', 3);
  gondola(-8.6, 0.6, -8.2, 'drink', 3);

  // --- 后墙：饮料冷藏柜 ---
  const cooler = new THREE.Group();
  const cw = 6.4, cd = 0.95, ch = 2.42;
  const cBody = part(boxGeo(cw, ch, cd), toon(0xdfe4e8), { ol: 0.05 });
  cBody.position.set(-4.5, FY + ch / 2, IZ0 + cd / 2);
  I.add(cBody);
  // 内部发光面
  const cInside = new THREE.Mesh(planeGeo(cw - 0.2, ch - 0.5), litMap(texCoolerInside(), 0.55));
  cInside.position.set(-4.5, FY + ch / 2 - 0.05, IZ0 + 0.36);
  I.add(cInside);
  // 玻璃门 + 门框
  for (let i = 0; i < 3; i++) {
    const x = -4.5 + (i - 1) * (cw / 3 - 0.03);
    const gl = new THREE.Mesh(planeGeo(cw / 3 - 0.16, ch - 0.42), glassMat(0xd8f2ff, 0.11));
    gl.position.set(x, FY + ch / 2 - 0.04, IZ0 + cd - 0.02);
    gl.renderOrder = 8;
    I.add(gl);
    const fr = part(boxGeo(cw / 3 - 0.08, 0.12, 0.1), mMetalShelf, { ol: 0.02, shadow: false });
    fr.position.set(x, FY + ch - 0.12, IZ0 + cd - 0.01); I.add(fr);
    const fr2 = part(boxGeo(cw / 3 - 0.08, 0.1, 0.1), mMetalShelf, { ol: 0.02, shadow: false });
    fr2.position.set(x, FY + 0.14, IZ0 + cd - 0.01); I.add(fr2);
    const hd = part(boxGeo(0.06, ch - 0.42, 0.12), mMetalShelf, { ol: 0.02, shadow: false });
    hd.position.set(x + (cw / 6) - 0.07, FY + ch / 2, IZ0 + cd - 0.01); I.add(hd);
  }
  // 冷藏柜顶部灯箱
  const cb = part(boxGeo(cw, 0.42, 0.24), toon(0x1f4f7a), { ol: 0.03, shadow: false });
  cb.position.set(-4.5, FY + ch + 0.22, IZ0 + cd + 0.05); I.add(cb);
  decal(I, cw - 0.2, 0.34, new THREE.MeshBasicMaterial({ map: texGoods('drink', 6, 1, 5) }), -4.5, FY + ch + 0.22, IZ0 + cd + 0.18);
  // 冷柜侧板
  box(I, 0.12, ch, cd, mMetalShelf, -4.5 + cw / 2, FY + ch / 2, IZ0 + cd / 2, { ol: 0.02, shadow: false });

  // --- 后墙：冰淇淋冰柜 ---
  const frz = new THREE.Group();
  const fw = 3.0, fh = 2.1;
  const fBody = part(boxGeo(fw, fh, 0.9), toon(0xe4e9ec), { ol: 0.05 });
  fBody.position.set(1.9, FY + fh / 2, IZ0 + 0.45);
  I.add(fBody);
  const fIn = new THREE.Mesh(planeGeo(fw - 0.2, fh - 0.5), litMap(texFreezerInside(), 0.5));
  fIn.position.set(1.9, FY + fh / 2 - 0.05, IZ0 + 0.34);
  I.add(fIn);
  for (let i = 0; i < 2; i++) {
    const x = 1.9 + (i - 0.5) * (fw / 2 - 0.02);
    const gl = new THREE.Mesh(planeGeo(fw / 2 - 0.14, fh - 0.42), glassMat(0xe4f4ff, 0.12));
    gl.position.set(x, FY + fh / 2 - 0.04, IZ0 + 0.88);
    gl.renderOrder = 8;
    I.add(gl);
    const hd = part(boxGeo(0.06, fh - 0.42, 0.12), mMetalShelf, { ol: 0.02, shadow: false });
    hd.position.set(x + (fw / 4) - 0.05, FY + fh / 2, IZ0 + 0.88); I.add(hd);
  }
  const fb = part(boxGeo(fw, 0.38, 0.24), toon(0x2b6fa8), { ol: 0.03, shadow: false });
  fb.position.set(1.9, FY + fh + 0.2, IZ0 + 0.5); I.add(fb);
  decal(I, fw - 0.2, 0.3, new THREE.MeshBasicMaterial({ map: texGoods('bento', 4, 1, 2) }), 1.9, FY + fh + 0.2, IZ0 + 0.63);

  // --- 后场门上方安全出口灯 ---
  const exitSign = new THREE.Mesh(planeGeo(0.6, 0.24), glow(PAL.neonGreen, 1.35));
  exitSign.position.set(3.8, FY + 2.35, IZ0 + 0.1);
  I.add(exitSign);

  // --- 收银台（L 形） ---
  const mCounter = toon(0xd9d5cb);
  const mCounterTop = toon(0xb8b2a4);
  const reg = new THREE.Group();
  // 主台面
  const ctopH = 1.0;
  const ct = part(boxGeo(5.2, ctopH, 1.15), mCounter, { ol: 0.05 });
  ct.position.set(4.5, FY + ctopH / 2, -1.75);
  reg.add(ct);
  const ctt = part(boxGeo(5.4, 0.1, 1.3), mCounterTop, { ol: 0.03, shadow: false });
  ctt.position.set(4.5, FY + ctopH + 0.05, -1.75);
  reg.add(ctt);
  // 侧台（面向门口）
  const cs = part(boxGeo(1.15, ctopH, 2.6), mCounter, { ol: 0.05 });
  cs.position.set(2.1, FY + ctopH / 2, -0.5);
  reg.add(cs);
  const cst = part(boxGeo(1.3, 0.1, 2.8), mCounterTop, { ol: 0.03, shadow: false });
  cst.position.set(2.1, FY + ctopH + 0.05, -0.5);
  reg.add(cst);
  // 收银机
  const rBody = part(boxGeo(0.55, 0.42, 0.5), toon(0x3d434a), { ol: 0.03 });
  rBody.position.set(3.2, FY + ctopH + 0.31, -1.8); reg.add(rBody);
  const rScr = new THREE.Mesh(planeGeo(0.46, 0.32), glow(0x8ee8c8, 1.0));
  rScr.position.set(3.2, FY + ctopH + 0.62, -1.75);
  rScr.rotation.x = -0.5;
  reg.add(rScr);
  // 客显
  const cDisp = new THREE.Mesh(planeGeo(0.4, 0.26), glow(0x9fd8ff, 0.9));
  cDisp.position.set(5.5, FY + ctopH + 0.5, -1.3);
  cDisp.rotation.x = -0.35; cDisp.rotation.y = Math.PI;
  reg.add(cDisp);
  // 读卡器 / 小物
  box(reg, 0.2, 0.12, 0.16, toon(0x2f353b), 4.1, FY + ctopH + 0.16, -1.7, { ol: 0.02, shadow: false });
  box(reg, 0.3, 0.16, 0.24, toon(0x50565c), 5.9, FY + ctopH + 0.18, -1.9, { ol: 0.02, shadow: false });
  box(reg, 0.22, 0.3, 0.22, toon(0xd8dce0), 6.4, FY + ctopH + 0.25, -1.7, { ol: 0.02, shadow: false });
  // 柜台前购物篮堆
  for (let i = 0; i < 4; i++) {
    const b = part(boxGeo(0.52, 0.16, 0.36), mBasket, { ol: 0.025, shadow: false });
    b.position.set(6.1, FY + 0.1 + i * 0.17, -1.0);
    reg.add(b);
  }
  // 店员凳
  const stool = new THREE.Group();
  cyl(stool, 0.2, 0.22, 0.1, toon(0x2f353b), 0, 0.62, 0, { seg: 10, ol: 0.02 });
  cyl(stool, 0.05, 0.05, 0.6, matSteel, 0, 0.3, 0, { seg: 8, ol: 0.02 });
  stool.position.set(5.2, FY, -3.0);
  reg.add(stool);
  I.add(reg);

  // --- 后柜：香烟柜 + 咖啡机 + 关东煮 ---
  const back = new THREE.Group();
  const bctH = 0.95;
  const bc = part(boxGeo(6.2, bctH, 0.7), mCounter, { ol: 0.05 });
  bc.position.set(4.4, FY + bctH / 2, -4.3);
  back.add(bc);
  const bct = part(boxGeo(6.4, 0.1, 0.85), mCounterTop, { ol: 0.03, shadow: false });
  bct.position.set(4.4, FY + bctH + 0.05, -4.3);
  back.add(bct);
  // 香烟柜（贴后墙）
  const cab = part(boxGeo(2.6, 1.85, 0.42), toon(0xe8e4dc, { map: texCigCabinet() }), { ol: 0.04 });
  cab.position.set(6.2, FY + 1.0 + 0.42, IZ0 + 0.24);
  back.add(cab);
  const cabGl = new THREE.Mesh(planeGeo(2.5, 1.7), glassMat(0xe8f4ff, 0.1));
  cabGl.position.set(6.2, FY + 1.42, IZ0 + 0.46);
  cabGl.renderOrder = 8;
  back.add(cabGl);
  // 咖啡机
  const cm = new THREE.Group();
  const cmB = part(boxGeo(0.72, 1.55, 0.6), toon(0x2f353b), { ol: 0.04 });
  cm.add(cmB);
  const cmT = new THREE.Mesh(planeGeo(0.46, 0.6), glow(0xffb45a, 1.4));
  cmT.position.set(0, 0.42, 0.31);
  cm.add(cmT);
  const cmC = new THREE.Mesh(planeGeo(0.4, 0.16), glow(0x9fe8ff, 1.1));
  cmC.position.set(0, -0.2, 0.31);
  cm.add(cmC);
  const cmTr = part(boxGeo(0.7, 0.16, 0.42), toon(0x50565c), { ol: 0.02, shadow: false });
  cmTr.position.set(0, -0.42, 0.12);
  cm.add(cmTr);
  cm.position.set(4.1, FY + 0.95 + 0.775, -4.55);
  back.add(cm);
  // 咖啡杯架
  for (let i = 0; i < 3; i++) {
    cyl(back, 0.12, 0.12, 0.1, matWhite, 3.5, FY + 1.05, -4.6 + i * 0.001, { seg: 10, ol: 0.02, shadow: false });
  }
  // 关东煮柜台
  const oden = new THREE.Group();
  const odenB = part(boxGeo(1.7, 0.85, 1.0), toon(0xdfe4e8), { ol: 0.04 });
  oden.add(odenB);
  const odenTop = part(boxGeo(1.8, 0.1, 1.1), matSteel, { ol: 0.03, shadow: false });
  odenTop.position.set(0, 0.48, 0);
  oden.add(odenTop);
  // 汤锅
  const pot = cyl(oden, 0.32, 0.32, 0.3, matSteel, -0.35, 0.66, 0, { seg: 14, ol: 0.02, shadow: false });
  const broth = new THREE.Mesh(new THREE.CircleGeometry(0.29, 14), toon(0xc89a5a));
  broth.rotation.x = -Math.PI / 2;
  broth.position.set(-0.35, 0.815, 0);
  oden.add(broth);
  // 锅里的串（小圆柱）
  for (let i = 0; i < 7; i++) {
    const a = srand() * TAU, r = srand() * 0.2;
    cyl(oden, 0.035, 0.035, 0.34, toon(spick([0xd8b06a, 0xc87a4a, 0xe8d8b0])), -0.35 + Math.cos(a) * r, 0.9 + srand() * 0.04, Math.sin(a) * r, { seg: 6, ol: 0, shadow: false });
  }
  // 防沫玻璃罩
  const guard = new THREE.Mesh(planeGeo(1.5, 0.5), glassMat(0xdff0ff, 0.12));
  guard.position.set(0, 0.86, 0.5);
  oden.add(guard);
  const guard2 = new THREE.Mesh(planeGeo(1.5, 0.5), glassMat(0xdff0ff, 0.12));
  guard2.position.set(0, 0.86, 0.5); guard2.rotation.y = 0.5;
  oden.add(guard2);
  oden.position.set(2.15, FY, -4.5);
  back.add(oden);
  // 关东煮标牌
  decal(back, 0.9, 0.24, new THREE.MeshBasicMaterial({ map: texOdenSign() }), 2.15, FY + 1.5, -4.0);
  // 热食灯
  const odenLamp = new THREE.Mesh(planeGeo(1.4, 0.06), glow(0xffd9a0, 1.8));
  odenLamp.position.set(2.15, FY + 1.62, -4.42);
  back.add(odenLamp);
  I.add(back);

  // --- 东墙：便当冷藏柜（多段敞开式） ---
  const bento = new THREE.Group();
  const bh = 1.78, bd0 = 1.25;
  const bb = part(boxGeo(bd0, bh, 5.0), toon(0xe2e6ea), { ol: 0.05 });
  bb.position.set(IX1 - bd0 / 2 - 0.05, FY + bh / 2, -6.1);
  bento.add(bb);
  for (let r = 0; r < 3; r++) {
    const y = FY + 0.42 + r * 0.45;
    const t = texGoods('bento', 4, 1, r * 2 + 1);
    const f = new THREE.Mesh(planeGeo(4.8, 0.42), litMap(t, 0.26));
    f.position.set(IX1 - bd0 - 0.1, y + 0.23, -6.1);
    f.rotation.y = -Math.PI / 2;
    bento.add(f);
    const sh = part(boxGeo(bd0 - 0.1, 0.05, 5.02), mMetalShelf, { ol: 0.02, shadow: false });
    sh.position.set(IX1 - bd0 / 2 - 0.05, y, -6.1);
    bento.add(sh);
  }
  // 柜内灯光
  for (const z of [-4.2, -6.1, -8.0]) {
    const lp = new THREE.Mesh(planeGeo(0.9, 0.1), glow(0xfff0d0, 1.6));
    lp.position.set(IX1 - bd0 - 0.08, FY + 1.55, z); lp.rotation.y = -Math.PI / 2;
    bento.add(lp);
  }
  // 顶部横幅
  const bbTop = part(boxGeo(0.24, 0.4, 5.0), toon(0xd8a13a), { ol: 0.03, shadow: false });
  bbTop.position.set(IX1 - 0.28, FY + bh + 0.2, -6.1);
  bento.add(bbTop);
  decal(bento, 4.9, 0.32, new THREE.MeshBasicMaterial({ map: texGoods('bento', 4, 1, 0) }), IX1 - 0.41, FY + bh + 0.2, -6.1, 0, -Math.PI / 2);
  // 柜体朝东侧玻璃的一面：贴一条简洁海报，避免大块空白
  decal(bento, 4.4, 0.62, new THREE.MeshBasicMaterial({ map: texWindowBanner(), color: new THREE.Color(0xa8a196) }), IX1 - 0.03, FY + 1.3, -6.1, 0, Math.PI / 2);
  decal(bento, 1.0, 0.7, litMap(texPoster(4), 0.3), IX1 - 0.03, FY + 0.95, -4.0, 0, Math.PI / 2);
  decal(bento, 1.0, 0.7, litMap(texPoster(1), 0.3), IX1 - 0.03, FY + 0.95, -8.2, 0, Math.PI / 2);
  I.add(bento);

  // --- 东墙前：饭团 / 三明治柜 ---
  const oni = new THREE.Group();
  const oh = 1.32;
  const ob = part(boxGeo(0.95, oh, 2.0), toon(0xe6eaee), { ol: 0.04 });
  ob.position.set(IX1 - 0.6, FY + oh / 2, -2.6);
  oni.add(ob);
  const oIn = new THREE.Mesh(planeGeo(1.8, 0.6), litMap(texGoods('onigiri', 4, 1, 3), 0.3));
  oIn.position.set(IX1 - 1.09, FY + 0.92, -2.6);
  oIn.rotation.y = -Math.PI / 2;
  oni.add(oIn);
  const oSh = part(boxGeo(0.95, 0.05, 2.0), mMetalShelf, { ol: 0.02, shadow: false });
  oSh.position.set(IX1 - 0.6, FY + 0.6, -2.6);
  oni.add(oSh);
  const oGl = new THREE.Mesh(planeGeo(1.9, 0.52), glassMat(0xe8f6ff, 0.12));
  oGl.position.set(IX1 - 1.13, FY + 0.95, -2.6); oGl.rotation.y = -Math.PI / 2;
  oGl.renderOrder = 8;
  oni.add(oGl);
  I.add(oni);

  // --- 西墙：壁面货架（日用 / 罐头） ---
  const wshelf = new THREE.Group();
  for (let r = 0; r < 4; r++) {
    const y = FY + 0.5 + r * 0.55;
    const sh = part(boxGeo(0.5, 0.06, 7.6), mShelfEdge, { ol: 0.02, shadow: false });
    sh.position.set(IX0 + 0.3, y, -5.4);
    wshelf.add(sh);
    const f = new THREE.Mesh(planeGeo(7.5, 0.46), litMap(texGoods(r % 2 ? 'house' : 'noodle', 18, 1, r * 3), 0.24));
    f.position.set(IX0 + 0.57, y + 0.26, -5.4);
    f.rotation.y = Math.PI / 2;
    wshelf.add(f);
  }
  // 立柱
  for (const z of [-9.2, -5.4, -1.6]) {
    const p = part(boxGeo(0.1, 2.6, 0.1), mMetalShelf, { ol: 0.02, shadow: false });
    p.position.set(IX0 + 0.55, FY + 1.3, z);
    wshelf.add(p);
  }
  I.add(wshelf);

  // --- 入口左侧：杂志架 + 报刊 ---
  const mag = new THREE.Group();
  const mgB = part(boxGeo(1.1, 0.9, 2.2), toon(0xd9d5cb), { ol: 0.04 });
  mgB.position.set(IX0 + 0.65, FY + 0.45, 1.0);
  mag.add(mgB);
  for (let r = 0; r < 3; r++) {
    const f = new THREE.Mesh(planeGeo(2.0, 0.26), litMap(texGoods('magazine', 5, 1, r * 4), 0.3));
    f.position.set(IX0 + 1.22, FY + 0.3 + r * 0.32, 1.0);
    f.rotation.set(-0.35, Math.PI / 2, 0);
    mag.add(f);
    const sh = part(boxGeo(0.16, 0.04, 2.0), mShelfEdge, { ol: 0.015, shadow: false });
    sh.position.set(IX0 + 1.18, FY + 0.2 + r * 0.32, 1.0);
    mag.add(sh);
  }
  // 上层杂志展示板
  const magU = part(boxGeo(0.2, 0.7, 2.2), toon(0xe6e2d8), { ol: 0.03 });
  magU.position.set(IX0 + 0.3, FY + 1.5, 1.0);
  mag.add(magU);
  const mf = new THREE.Mesh(planeGeo(2.1, 0.62), litMap(texMagRack(), 0.3));
  mf.position.set(IX0 + 0.43, FY + 1.5, 1.0); mf.rotation.y = Math.PI / 2;
  mag.add(mf);
  I.add(mag);

  // --- 店内海报 ---
  const posterSpots = [
    [IX0 + 0.16, 2.5, -9.6, Math.PI / 2], [IX0 + 0.16, 1.5, 2.2, Math.PI / 2],
    [-8.0, 3.3, IZ0 + 0.16, 0], [-1.0, 3.3, IZ0 + 0.16, 0],
    [S.x1 - W - 0.02, 3.2, -1.0, -Math.PI / 2], [S.x1 - W - 0.02, 1.4, 2.2, -Math.PI / 2],
  ];
  posterSpots.forEach(([x, y, z, ry], i) => {
    decal(I, 0.72, 1.05, litMap(texPoster(i), 0.34), x, FY + y, z, 0, ry);
  });
  // 收银台上方横幅
  decal(I, 4.4, 0.6, new THREE.MeshBasicMaterial({ map: texWindowBanner() }), 4.5, FY + 3.4, -1.75, 0, Math.PI);

  // --- 天花灯盘 ---
  const lampPos = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const x = IX0 + 3.0 + i * 5.0;
      const z = IZ0 + 3.4 + j * 3.6;
      const lp = new THREE.Mesh(planeGeo(2.4, 0.5), glow(0xffeec8, 0.85));
      lp.rotation.x = Math.PI / 2;
      lp.position.set(x, CY - 0.03, z);
      I.add(lp);
      const boxl = part(boxGeo(2.6, 0.1, 0.62), matWhite, { ol: 0.02, shadow: false });
      boxl.position.set(x, CY - 0.02, z);
      I.add(boxl);
      lampPos.push([x, z]);
    }
  }
  // 天花小设备
  cyl(I, 0.12, 0.12, 0.12, toon(0x2f353b), -6.0, CY - 0.05, -1.4, { seg: 10, ol: 0.02, shadow: false });
  const dome = new THREE.Mesh(sphGeo(0.16, 12, 8, 0, TAU, 0, Math.PI / 2), toon(0x22262c));
  dome.position.set(2.4, CY - 0.1, -1.6); dome.rotation.x = Math.PI;
  I.add(dome);
  box(I, 0.5, 0.12, 0.3, matWhite, 6.2, CY - 0.08, -6.0, { ol: 0.02, shadow: false });
  // 吊挂价签条
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(planeGeo(0.5, 0.14), new THREE.MeshBasicMaterial({ map: texPriceStrip(), transparent: true }));
    s.position.set(IX0 + 1.4 + (i % 4) * 4.6, 2.85, IZ0 + 4.4 + Math.floor(i / 4) * 4.6);
    s.rotation.y = Math.PI / 2;
    I.add(s);
  }

  // --- 地面导视 / 警示 ---
  decal(I, 0.6, 1.2, new THREE.MeshBasicMaterial({ map: texFloorArrow(), transparent: true }), -3.2, FY + 0.012, 1.2, -Math.PI / 2, 0, 0);
  decal(I, 0.6, 1.2, new THREE.MeshBasicMaterial({ map: texFloorArrow(), transparent: true }), 0.8, FY + 0.012, 0.4, -Math.PI / 2, 0, Math.PI / 2);
  const caution = new THREE.Group();
  const cauMat = new THREE.MeshBasicMaterial({ map: texCaution(), side: THREE.DoubleSide });
  const c1 = new THREE.Mesh(planeGeo(0.34, 0.42), cauMat); c1.position.y = 0.42; c1.rotation.x = -0.12;
  caution.add(c1);
  const c2 = new THREE.Mesh(planeGeo(0.34, 0.42), cauMat); c2.position.y = 0.42; c2.rotation.set(-0.12, Math.PI / 2, 0);
  caution.add(c2);
  caution.position.set(-1.0, FY, -0.4);
  I.add(caution);
  // 地砖导视亮条（入口到收银）
  const guide = new THREE.Mesh(planeGeo(9.0, 0.08), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe0a8).multiplyScalar(0.7) }));
  guide.rotation.x = -Math.PI / 2;
  guide.position.set(2.0, FY + 0.01, -0.9);
  I.add(guide);

  /* ================= 店内灯光 ================= */
  const lights = [];
  const mkPoint = (x, y, z, color, intensity, dist) => {
    const p = new THREE.PointLight(color, intensity, dist, 2);
    p.position.set(x, y, z);
    g.add(p);
    lights.push(p);
    return p;
  };
  mkPoint(-6.5, CY - 0.6, -2.0, 0xffdcae, 28, 19);
  mkPoint(-3.0, CY - 0.6, -8.0, 0xffdcae, 26, 19);
  mkPoint(3.5, CY - 0.6, -5.5, 0xffdcae, 26, 19);
  mkPoint(5.0, CY - 0.6, -1.6, 0xffe4c0, 20, 13);
  mkPoint(-4.5, FY + 2.0, IZ0 + 1.0, 0xcfe6ff, 12, 8);
  // 店外：檐下与门口补光（让人行道有暖光溢出）
  mkPoint(-1.0, 3.3, 4.8, 0xffd9a8, 15, 12);
  mkPoint(-7.6, 3.3, 4.6, 0xffd0a0, 9, 9);
  // 店后通道补光
  mkPoint(4.0, 3.0, S.z0 - 1.6, 0xffce9a, 10, 12);

  /* ================= 屋顶设备 ================= */
  const acShell = toon(0x828a93);
  const acFan = toon(0x3d434a);
  const rooftopAC = (x, z, w, d, h, ry) => {
    const grp = new THREE.Group();
    const b = part(boxGeo(w, h, d), acShell, { ol: 0.04 });
    grp.add(b);
    for (const [fx, fz] of [[0, d / 2 + 0.01], [0, -d / 2 - 0.01]]) {
      const f = new THREE.Mesh(new THREE.CircleGeometry(w * 0.3, 16), acFan);
      f.position.set(fx, 0, fz);
      f.rotation.set(fz > 0 ? 0 : Math.PI, 0, 0);
      grp.add(f);
      const fg = new THREE.Mesh(new THREE.RingGeometry(w * 0.3, w * 0.34, 16), acShell);
      fg.position.set(fx, 0, fz + Math.sign(fz) * 0.01);
      fg.rotation.set(fz > 0 ? 0 : Math.PI, 0, 0);
      grp.add(fg);
    }
    grp.position.set(x, S.wall + 0.15 + h / 2 + 0.16, z);
    grp.rotation.y = ry || 0;
    g.add(grp);
    return grp;
  };
  rooftopAC(-6.5, -6.0, 1.3, 1.0, 0.85);
  rooftopAC(-3.4, -6.2, 1.1, 0.9, 0.7, 0.2);
  rooftopAC(4.0, -8.4, 1.2, 0.95, 0.75, Math.PI / 2);
  // 通风管 + 天窗
  cyl(g, 0.22, 0.22, 0.9, matSteel, 1.0, S.wall + 0.15 + 0.61, -2.0, { seg: 12, ol: 0.03 });
  cyl(g, 0.30, 0.30, 0.16, matSteel, 1.0, S.wall + 0.15 + 1.14, -2.0, { seg: 12, ol: 0.02, shadow: false });
  box(g, 2.2, 0.5, 1.8, toon(0xc9cfd5), -9.0, S.wall + 0.15 + 0.41, -8.5, { ol: 0.05 });
  decal(g, 1.9, 1.5, new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6fd8ff).multiplyScalar(0.35), transparent: true, opacity: 0.5 }), -9.0, S.wall + 0.15 + 0.67, -8.5, -Math.PI / 2);
  // 天线
  cyl(g, 0.035, 0.035, 2.2, matSteel, 6.4, S.wall + 0.15 + 1.26, -9.4, { seg: 6, ol: 0.015 });
  box(g, 0.5, 0.04, 0.04, matSteel, 6.4, S.wall + 0.15 + 2.2, -9.4, { ol: 0, shadow: false });
  // 检修爬梯
  const ladderMat = matSteel;
  for (let i = 0; i < 9; i++) {
    box(g, 0.42, 0.04, 0.04, ladderMat, S.x0 + 1.1, 1.2 + i * 0.5, S.z1 - 0.35, { ol: 0, shadow: false });
  }
  cyl(g, 0.03, 0.03, 4.6, ladderMat, S.x0 + 0.92, 3.2, S.z1 - 0.35, { seg: 6, ol: 0, shadow: false });
  cyl(g, 0.03, 0.03, 4.6, ladderMat, S.x0 + 1.28, 3.2, S.z1 - 0.35, { seg: 6, ol: 0, shadow: false });
  // 屋面设备房（楼梯间）+ 栏杆 + 避雷针
  const roofY = S.wall + 0.15 + 0.16;
  const ph = part(boxGeo(2.6, 1.5, 2.4), toon(0xb8b3aa, { map: texFacade(0xb8b3aa) }), { ol: 0.05 });
  ph.position.set(3.4, roofY + 0.75, -0.6);
  g.add(ph);
  const phDoor = new THREE.Mesh(planeGeo(0.8, 1.5), toon(0x8d949c, { map: texBackDoor() }));
  phDoor.position.set(3.4, roofY + 0.75, -0.6 + 1.21);
  g.add(phDoor);
  const phRoof = part(boxGeo(2.9, 0.16, 2.7), toon(0x5a5f68), { ol: 0.04, shadow: false });
  phRoof.position.set(3.4, roofY + 1.58, -0.6);
  g.add(phRoof);
  // 屋面栏杆（设备区）
  const railMat = matSteel;
  for (let i = 0; i < 9; i++) {
    const p = part(boxGeo(0.05, 0.62, 0.05), railMat, { ol: 0, shadow: false });
    p.position.set(-11.4 + i * 0.62, roofY + 0.31, -9.4);
    g.add(p);
  }
  linkRoof(g, V3(-11.4, roofY + 0.62, -9.4), V3(-6.4, roofY + 0.62, -9.4), railMat);
  for (const x of [-11.4, -6.4]) {
    const p = part(boxGeo(0.05, 0.62, 0.05), railMat, { ol: 0, shadow: false });
    p.position.set(x, roofY + 0.31, -9.4);
    g.add(p);
  }
  // 避雷针
  cyl(g, 0.02, 0.02, 1.6, matSteel, -11.2, roofY + 0.8, 2.2, { seg: 6, ol: 0.01, shadow: false });
  cyl(g, 0.05, 0.05, 0.24, matSteel, -11.2, roofY + 0.12, 2.2, { seg: 8, ol: 0.02, shadow: false });

  /* ================= 外墙面细节 ================= */
  // 空调外机（东墙）
  const wallAC = (x, y, z, w, h, d, ry) => {
    const grp = new THREE.Group();
    const b = part(boxGeo(w, h, d), acShell, { ol: 0.035 });
    grp.add(b);
    const grill = new THREE.Mesh(new THREE.CircleGeometry(Math.min(w, h) * 0.34, 16), acFan);
    grill.position.set(0, 0, d / 2 + 0.012);
    grp.add(grill);
    const bracket = part(boxGeo(w * 1.1, 0.06, d + 0.1), toon(0x6b7078), { ol: 0.02, shadow: false });
    bracket.position.set(0, -h / 2 - 0.06, 0);
    grp.add(bracket);
    grp.position.set(x, y, z);
    grp.rotation.y = ry || 0;
    g.add(grp);
    return grp;
  };
  wallAC(S.x1 + 0.42, 2.9, -3.4, 0.9, 0.66, 0.42, Math.PI / 2);
  wallAC(S.x1 + 0.42, 2.9, -6.2, 0.9, 0.66, 0.42, Math.PI / 2);
  wallAC(S.x0 - 0.42, 3.0, -7.0, 0.9, 0.66, 0.42, Math.PI / 2);
  // 落水管
  const pipeMat = toon(0x9aa1a8);
  for (const [x, z] of [[S.x1 + 0.16, S.z1 - 0.4], [S.x0 - 0.16, S.z1 - 0.4], [S.x1 + 0.16, S.z0 + 0.4]]) {
    cyl(g, 0.09, 0.09, S.wall + 0.2, pipeMat, x, (S.wall + 0.2) / 2, z, { seg: 8, ol: 0.02, shadow: false });
  }
  // 墙面壁灯
  for (const x of [S.x0 + 3.0, 2.6, S.x1 - 3.0]) {
    const b = part(boxGeo(0.26, 0.16, 0.22), toon(0x4c525a), { ol: 0.02, shadow: false });
    b.position.set(x, 4.24, S.z1 + 0.12);
    g.add(b);
    const lp = new THREE.Mesh(planeGeo(0.2, 0.1), glow(0xffe6bb, 1.4));
    lp.position.set(x, 4.16, S.z1 + 0.12);
    lp.rotation.x = Math.PI / 2;
    g.add(lp);
  }
  // 墙面 "MART 24" 小灯箱（东侧）
  const sE2 = new THREE.Mesh(planeGeo(1.6, 0.5), new THREE.MeshBasicMaterial({ map: texMainSign() }));
  sE2.rotation.y = Math.PI / 2;
  sE2.position.set(S.x1 + 0.02, 3.6, -8.6);
  g.add(sE2);

  /* ---- 西墙（面向小巷）：后台门 / 管道 / 表箱 / 壁灯 ---- */
  const westX = S.x0 - 0.02;
  // 后台铁门
  const svcGroup = new THREE.Group();
  const svcDoor = part(boxGeo(0.14, 2.15, 1.1), toon(0xb8bec4, { map: texBackDoor() }), { ol: 0.04 });
  svcDoor.position.set(westX - 0.06, FY + 1.07, 1.2);
  svcGroup.add(svcDoor);
  const svcFrame = part(boxGeo(0.16, 2.4, 1.34), toon(0x8d949c), { ol: 0.03 });
  svcFrame.position.set(westX - 0.04, FY + 1.2, 1.2);
  svcGroup.add(svcFrame);
  // 门前台阶
  box(svcGroup, 0.5, 0.16, 1.3, toon(0x9aa0a6), westX - 0.32, FY + 0.08, 1.2, { ol: 0.03, shadow: false });
  // 壁灯
  const wl = part(boxGeo(0.24, 0.14, 0.3), toon(0x4c525a), { ol: 0.02, shadow: false });
  wl.position.set(westX - 0.16, FY + 2.7, 1.2);
  svcGroup.add(wl);
  const wlGlow = new THREE.Mesh(planeGeo(0.18, 0.1), glow(0xffdca8, 1.1));
  wlGlow.rotation.x = Math.PI / 2; wlGlow.rotation.z = Math.PI / 2;
  wlGlow.position.set(westX - 0.16, FY + 2.62, 1.2);
  svcGroup.add(wlGlow);
  // 立管 + 表箱
  for (const z of [0.2, -2.6, -5.4]) {
    cyl(svcGroup, 0.07, 0.07, S.wall, toon(0x9aa1a8), westX - 0.12, S.wall / 2, z, { seg: 8, ol: 0.02 });
  }
  const wm = part(boxGeo(0.16, 0.44, 0.34), toon(0xb2b8be), { ol: 0.025, shadow: false });
  wm.position.set(westX - 0.12, 1.7, -1.4);
  svcGroup.add(wm);
  // 墙上小牌
  const wp = new THREE.Mesh(planeGeo(0.7, 0.36), new THREE.MeshBasicMaterial({ map: texDoorSign(), color: new THREE.Color(0xb9b2a4) }));
  wp.rotation.y = -Math.PI / 2;
  wp.position.set(westX - 0.03, FY + 2.5, 1.2);
  svcGroup.add(wp);
  // 墙面污渍
  const grime = new THREE.MeshBasicMaterial({ color: 0x3a3a34, transparent: true, opacity: 0.28, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(planeGeo(sr(0.8, 2.0), sr(0.6, 1.6)), grime);
    m.rotation.y = -Math.PI / 2;
    m.position.set(westX - 0.01, sr(0.4, 2.2), sr(-9.0, 2.0));
    svcGroup.add(m);
    }
  g.add(svcGroup);

  runtime.interiorLights = lights;
  runtime.store = g;
  return { group: g, glass, points: lights };
}
