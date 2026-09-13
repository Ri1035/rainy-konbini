/**
 * optimize.js — 静态几何合并
 * 把成百上千个静态小网格按「材质 + renderOrder」合并成少量网格，draw call 降低一个数量级。
 * 只处理真正静态的物体；雨、光晕、地面反光条、闪烁灯等动态对象必须排除。
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { outlineMatFor } from './core.js';

/** 描边网格判定（反向外壳 ShaderMaterial） */
const isOutlineMat = (m) => !!(m && m.isShaderMaterial && m.uniforms && m.uniforms.uWidth);

export function mergeStatic(root, opt = {}) {
  root.updateMatrixWorld(true);

  const buckets = new Map();   // key -> { material, renderOrder, geos:[], cast, receive }
  const victims = [];
  let scanned = 0, skipped = 0;

  root.traverse((o) => {
    if (!o.isMesh) return;
    scanned++;
    const m = o.material;
    if (Array.isArray(m)) { skipped++; return; }
    // 动态 / 特殊对象一律不合并
    if (o.userData.noMerge || o.userData.alwaysFace) { skipped++; return; }
    if (o.isInstancedMesh || o.geometry.isInstancedBufferGeometry) { skipped++; return; }
    if (m.blending === THREE.AdditiveBlending) { skipped++; return; }  // 光晕、反光条（会动）
    if (m.isShaderMaterial && m.uniforms && m.uniforms.tDiffuse) { skipped++; return; } // Reflector
    if (o.geometry.attributes.position && o.geometry.attributes.position.count < 3) { skipped++; return; }

    // 所有描边合并成同一批（线宽统一，draw call 少一半）
    const outline = isOutlineMat(m);
    const key = outline ? 'OUTLINE' : (m.uuid + '|' + (o.renderOrder || 0));
    let b = buckets.get(key);
    if (!b) {
      b = {
        material: outline ? outlineMatFor(0.045) : m,
        renderOrder: o.renderOrder || 0,
        geos: [], cast: false, receive: false,
      };
      buckets.set(key, b);
    }
    b.cast = b.cast || o.castShadow;
    b.receive = b.receive || o.receiveShadow;

    let g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);          // 烘焙世界变换
    if (g.index) g = g.toNonIndexed();
    // 统一属性集合，避免 mergeGeometries 报错
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) {
      const n = g.attributes.position.count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    }
    g.morphAttributes = {};
    b.geos.push(g);
    victims.push(o);
  });

  const merged = new THREE.Group();
  merged.name = 'mergedStatic';
  let outCount = 0, outVerts = 0;

  for (const b of buckets.values()) {
    if (b.geos.length === 0) continue;
    let geo = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false);
    if (!geo) { continue; }
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, b.material);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    mesh.renderOrder = b.renderOrder;
    mesh.matrixAutoUpdate = false;
    merged.add(mesh);
    outCount++;
    outVerts += geo.attributes.position.count;
  }

  for (const v of victims) if (v.parent) v.parent.remove(v);
  root.add(merged);

  // 清理空壳 Group（递归从底向上）
  let pruned = 0;
  for (let pass = 0; pass < 6; pass++) {
    const dead = [];
    root.traverse((o) => { if (o.isGroup && o.children.length === 0 && o !== merged) dead.push(o); });
    if (!dead.length) break;
    for (const d of dead) { if (d.parent) d.parent.remove(d); pruned++; }
  }
  root.updateMatrixWorld(true);

  return { scanned, skipped, buckets: outCount, verts: outVerts, mergedMeshes: victims.length, pruned, stats: merged };
}
