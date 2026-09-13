/**
 * atmos.js — 雨、天空、雾气、环境反射
 */
import * as THREE from 'three';
import { canvasTex, sr, srand, TAU } from './core.js';

/* ------------------------------------------------------------------ *
 * 通用雨层：实例化面片，在视图空间内保持恒定宽度，形成细密雨丝
 * cfg: { count, area, height, slant:[x,z], speed, width, length, alpha, color, dry:[minX,maxX,minZ,maxZ], mode }
 * ------------------------------------------------------------------ */
export function makeRainLayer(cfg) {
  const {
    count = 3500, area = 21, height = 26, slant = [0.16, 0.05],
    speed = 26, spread = 8, width = 0.022, length = 1.6, alpha = 0.42,
    color = 0xcfe2ff, dry = null, mode = 'fall', floor = 0.0,
  } = cfg;

  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.attributes.position);
  geo.setAttribute('uv', base.attributes.uv);

  const seed = new Float32Array(count * 3);
  const param = new Float32Array(count * 3);
  const tint = new Float32Array(count);
  const flr = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const x = (srand() * 2 - 1) * area;
    const z = (srand() * 2 - 1) * area;
    seed[i * 3 + 0] = x;
    seed[i * 3 + 1] = srand();
    seed[i * 3 + 2] = z;
    param[i * 3 + 0] = speed * (1 + (srand() * 2 - 1) * (spread / 40));
    param[i * 3 + 1] = width * (0.7 + srand() * 0.8);
    param[i * 3 + 2] = length * (0.6 + srand() * 0.9);
    tint[i] = 0.55 + srand() * 0.45;
    flr[i] = cfg.floorFn ? cfg.floorFn(x, z) : floor;
  }
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 3));
  geo.setAttribute('aParam', new THREE.InstancedBufferAttribute(param, 3));
  geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 1));
  geo.setAttribute('aFloor', new THREE.InstancedBufferAttribute(flr, 1));
  geo.instanceCount = count;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), area * 2.2);
  base.dispose();

  const uniforms = {
    uTime: { value: 0 },
    uHeight: { value: height },
    uSlant: { value: new THREE.Vector2(slant[0], slant[1]) },
    uColor: { value: new THREE.Color(color) },
    uAlpha: { value: alpha },
    uFloor: { value: floor },
    uDry: { value: dry ? new THREE.Vector4(dry[0], dry[1], dry[2], dry[3]) : new THREE.Vector4(999, 999, 999, 999) },
    uHasDry: { value: dry ? 1 : 0 },
    uMode: { value: mode === 'splash' ? 1 : 0 },
    uFade: { value: cfg.fade ?? 4.0 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aSeed;
      attribute vec3 aParam;
      attribute float aTint;
      attribute float aFloor;
      uniform float uTime, uHeight, uMode, uFade;
      uniform vec2 uSlant;
      varying float vAlpha;
      varying float vTint;
      varying vec3 vWorld;
      void main(){
        float speed = aParam.x;
        vec3 dir = normalize(vec3(uSlant.x, 1.0, uSlant.y));

        float y;
        float life;
        if (uMode < 0.5) {
          y = aFloor + mod(aSeed.y * uHeight - uTime * speed, uHeight);
          life = (y - aFloor) / uHeight;
          // 顶端与底端淡出
          vAlpha = smoothstep(0.0, 0.06, life) * (1.0 - smoothstep(0.78, 1.0, life));
        } else {
          // 溅落：贴地快速闪烁
          float t = fract(uTime * (1.7 + aSeed.y * 1.4) + aSeed.y * 3.3);
          y = aFloor + 0.01 + t * 0.32;
          vAlpha = pow(1.0 - t, 3.0) * 1.1;
          dir = normalize(vec3(uSlant.x * 0.4, 1.0, uSlant.y * 0.4));
        }

        vec3 center = vec3(aSeed.x, y, aSeed.z);
        vWorld = center;
        vTint = aTint;

        vec4 mv = modelViewMatrix * vec4(center, 1.0);
        vec3 vdir = normalize((viewMatrix * vec4(dir, 0.0)).xyz);
        vec2 perp = normalize(vec2(vdir.y, -vdir.x) + vec2(1e-5));
        mv.xy += perp * position.x * aParam.y;
        mv.xy += vdir.xy * position.y * aParam.z * (uMode < 0.5 ? 1.0 : 0.42);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uAlpha, uHasDry, uFade, uMode;
      uniform vec4 uDry;
      varying float vAlpha;
      varying float vTint;
      varying vec3 vWorld;
      void main(){
        if (uHasDry > 0.5) {
          if (vWorld.x > uDry.x && vWorld.x < uDry.y && vWorld.z > uDry.z && vWorld.z < uDry.w) discard;
        }
        float a = uAlpha * vAlpha;
        if (uMode > 0.5) a *= 0.75;
        gl_FragColor = vec4(uColor * vTint * (uMode > 0.5 ? 1.5 : 1.0), a);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  mesh.userData.uniforms = uniforms;
  return mesh;
}

/* ------------------------------------------------------------------ *
 * 天空穹顶：夜空渐变 + 云层噪声 + 城市光污染
 * ------------------------------------------------------------------ */
export function makeSky() {
  const geo = new THREE.SphereGeometry(260, 32, 20);
  const uniforms = {
    uTime: { value: 0 },
    cTop: { value: new THREE.Color(0x070a14) },
    cMid: { value: new THREE.Color(0x131c33) },
    cHorizon: { value: new THREE.Color(0x2a3350) },
    cGlow: { value: new THREE.Color(0x5a4a6a) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vDir;
      void main(){
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 cTop, cMid, cHorizon, cGlow;
      uniform float uTime;
      varying vec3 vDir;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
      }
      float fbm(vec2 p){
        float v = 0.0, a = 0.5;
        for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.03; a *= 0.5; }
        return v;
      }
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(cHorizon, cMid, smoothstep(-0.02, 0.42, h));
        col = mix(col, cTop, smoothstep(0.34, 0.92, h));
        // 地平线暖色光污染：偏向店铺一侧（+z / +x）
        float glowDir = clamp((d.x * 0.5 + d.z * 0.5) * 0.5 + 0.5, 0.0, 1.0);
        float band = exp(-abs(h) * 5.0) * (0.35 + glowDir * 0.85);
        col += cGlow * band * 0.5;
        // 云层
        vec2 uv = d.xz / max(abs(h) + 0.28, 0.28) * 0.75;
        float n = fbm(uv * 1.25 + vec2(uTime * 0.006, uTime * 0.003));
        float cloud = smoothstep(0.44, 0.78, n) * smoothstep(0.0, 0.42, h);
        col = mix(col, vec3(0.10, 0.12, 0.19) + cGlow * 0.16, cloud * 0.75);
        // 星点（云缝里）
        float star = step(0.9975, hash(floor(d.xz * 620.0)));
        col += vec3(0.65, 0.72, 0.9) * star * smoothstep(0.18, 0.75, h) * (1.0 - cloud);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.frustumCulled = false;
  sky.userData.uniforms = uniforms;
  return sky;
}

/* ------------------------------------------------------------------ *
 * 环境反射：一次性 cube 捕捉 + PMREM，用于湿地面 / 玻璃 / 金属
 * ------------------------------------------------------------------ */
export function buildEnvironment(renderer, scene, { position = new THREE.Vector3(0, 7, 0), size = 256 } = {}) {
  const rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType });
  const cubeCam = new THREE.CubeCamera(0.5, 500, rt);
  cubeCam.position.copy(position);
  const prevSkyVisible = [];
  scene.traverse((o) => { if (o.userData.isSky) prevSkyVisible.push(o); });
  cubeCam.update(renderer, scene);
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileCubemapShader();
  const env = pmrem.fromCubemap(rt.texture);
  pmrem.dispose();
  rt.dispose();
  return env.texture;
}
