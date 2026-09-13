/**
 * main.js — 渲染器 / 相机 / 轨道控制 / 灯光 / 后期 / 主循环
 * 雨夜便利店街角 · 微缩三维模型
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { wetUniforms, clamp, lerp, reflectionStreaks, billboards } from './lib/core.js';
import { makeRainLayer, makeSky, buildEnvironment } from './lib/atmos.js';
import { buildGround } from './ground.js';
import { buildStore } from './store.js';
import { buildProps } from './props.js';
import { buildNeighbors } from './neighbors.js';
import { L, inRect } from './layout.js';

/* ------------------------------------------------------------------ *
 * 渲染器
 * ------------------------------------------------------------------ */
const canvasHost = document.getElementById('scene') || document.body;
const renderer = new THREE.WebGLRenderer({
  antialias: false,
  powerPreference: 'high-performance',
  stencil: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
canvasHost.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x121828, 0.0062);

const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.3, 500);
const HOME = { az: 0.78, el: 0.58, dist: 86 };
const target = new THREE.Vector3(-0.6, 4.4, -0.6);
function placeCamera(az, el, dist) {
  const r = dist * Math.cos(el);
  camera.position.set(
    target.x + Math.sin(az) * r,
    target.y + Math.sin(el) * dist,
    target.z + Math.cos(az) * r,
  );
  camera.lookAt(target);
}
placeCamera(HOME.az, HOME.el, HOME.dist);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(target);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.rotateSpeed = 0.85;
controls.zoomSpeed = 0.9;
controls.panSpeed = 0.7;
controls.minDistance = 12;
controls.maxDistance = 178;
controls.maxPolarAngle = 1.50;
controls.enablePan = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.18;
controls.screenSpacePanning = false;
let resumeTimer = 0;
controls.addEventListener('start', () => { controls.autoRotate = false; });
controls.addEventListener('end', () => { resumeTimer = 4.0; });

/* ------------------------------------------------------------------ *
 * 天空 / 灯光
 * ------------------------------------------------------------------ */
const runtime = {};

const sky = makeSky();
sky.userData.isSky = true;
scene.add(sky);
runtime.sky = sky;

const hemi = new THREE.HemisphereLight(0x354c80, 0x171d2a, 0.8);
scene.add(hemi);

const moon = new THREE.DirectionalLight(0x93b4ea, 1.3);
moon.position.set(-42, 58, -30);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = -26;
moon.shadow.camera.right = 26;
moon.shadow.camera.top = 26;
moon.shadow.camera.bottom = -26;
moon.shadow.camera.near = 20;
moon.shadow.camera.far = 130;
moon.shadow.camera.updateProjectionMatrix();
moon.shadow.bias = -0.0004;
moon.shadow.normalBias = 0.008;
scene.add(moon);
scene.add(moon.target);
moon.target.position.set(-2, 0, -2);

// 极弱的补光，避免暗部全黑
const fill = new THREE.DirectionalLight(0x63739e, 0.3);
fill.position.set(30, 22, 40);
scene.add(fill);

/* ------------------------------------------------------------------ *
 * 场景内容
 * ------------------------------------------------------------------ */
const ground = buildGround(scene, runtime);
const store = buildStore(scene, runtime);
const props = buildProps(scene, runtime);
const neighbors = buildNeighbors(scene, runtime);

/* ---------------- 雨 ---------------- */
const dryBox = [L.STORE.x0 - 0.35, L.STORE.x1 + 0.35, L.STORE.z0 - 0.35, L.STORE.z1 + 2.15];

// 每个雨点落地高度（人行道 / 路面 / 后场不同）
function floorAt(x, z) {
  const S = L;
  if (inRect(S.SW_FRONT, x, z) || inRect(S.SW_EAST, x, z) || inRect(S.SW_FAR_S, x, z) ||
    inRect(S.SW_FAR_E, x, z) || inRect(S.SW_NORTH, x, z) || (x > -21 && x < -12 && z > -2.2 && z < 3)) return S.CURB_H + 0.005;
  if (inRect(S.BACKLOT, x, z)) return 0.06;
  if (inRect(S.ALLEY, x, z)) return 0.06;
  return S.ROAD_Y + 0.01;
}

const rain = makeRainLayer({
  count: 3000, area: 20.6, height: 17, slant: [0.15, 0.05], speed: 21, spread: 11,
  width: 0.016, length: 1.8, alpha: 0.17, color: 0xc8dcf7, dry: dryBox, floorFn: floorAt,
});
scene.add(rain);
const splash = makeRainLayer({
  count: 900, area: 20.6, height: 1, slant: [0.1, 0.04], speed: 1, spread: 4,
  width: 0.018, length: 0.24, alpha: 0.14, color: 0xdfeeff, dry: dryBox, mode: 'splash', floorFn: floorAt,
});
scene.add(splash);
runtime.rain = rain;
runtime.splash = splash;

/* ---------------- 环境反射（一次性捕捉） ---------------- */
const hidden = [];
for (const o of [runtime.mirror, rain, splash]) { if (o) { hidden.push([o, o.visible]); o.visible = false; } }
try {
  const env = buildEnvironment(renderer, scene, { position: new THREE.Vector3(0, 9, 0), size: 256 });
  scene.environment = env;
  scene.environmentIntensity = 0.85;
} catch (e) {
  console.warn('environment capture failed', e);
}
for (const [o, v] of hidden) o.visible = v;

/* ------------------------------------------------------------------ *
 * 后期
 * ------------------------------------------------------------------ */
const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
const rt = new THREE.WebGLRenderTarget(size.x, size.y, {
  samples: 4, type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace,
});
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.42, 0.6, 0.80);
composer.addPass(bloom);

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: 0.85 },
    uSaturation: { value: 1.1 },
    uContrast: { value: 1.05 },
    uLift: { value: new THREE.Color(0x0a1224) },
    uLiftAmt: { value: 0.06 },
    uWarm: { value: new THREE.Color(0xffe9cf) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uVignette, uSaturation, uContrast, uLiftAmt;
    uniform vec3 uLift, uWarm;
    varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      // 对比
      col = (col - 0.5) * uContrast + 0.5;
      // 饱和
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation);
      // 暗部抬色（青蓝）
      col += uLift * uLiftAmt * (1.0 - smoothstep(0.0, 0.35, l));
      // 亮部微暖
      col *= mix(vec3(1.0), uWarm, smoothstep(0.55, 1.0, l) * 0.35);
      // 暗角
      vec2 d = vUv - 0.5;
      float v = 1.0 - dot(d, d) * uVignette;
      col *= clamp(v, 0.0, 1.0);
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};
const gradePass = new ShaderPass(GradeShader);
composer.addPass(gradePass);
composer.addPass(new OutputPass());

/* ------------------------------------------------------------------ *
 * 交互 / 循环
 * ------------------------------------------------------------------ */
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  const pr = renderer.getPixelRatio();
  bloom.resolution.set(w * pr, h * pr);
}
window.addEventListener('resize', resize);

const clock = new THREE.Clock();
let introT = 0;
const streaks = [];
let perfFrames = 0, perfAcc = 0, perfStep = 0;
let curPixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // 自适应画质：帧率不足时先降采样，再关掉镜面反射
  perfFrames++; perfAcc += dt;
  if (perfFrames >= 90) {
    const fps = perfFrames / perfAcc;
    if (fps < 34 && perfStep === 0) {
      perfStep = 1;
      curPixelRatio = Math.max(1, curPixelRatio - 0.35);
      renderer.setPixelRatio(curPixelRatio);
      resize();
    } else if (fps < 26 && perfStep === 1) {
      perfStep = 2;
      if (runtime.mirror) runtime.mirror.visible = false;
    }
    perfFrames = 0; perfAcc = 0;
  }

  // 相机开场推进
  if (introT < 1) {
    introT = Math.min(1, introT + dt / 2.2);
    const e = 1 - Math.pow(1 - introT, 3);
    if (!controls.userInteracted) {
      const d = lerp(HOME.dist * 1.42, HOME.dist, e);
      placeCamera(HOME.az, HOME.el + (1 - e) * 0.06, d);
    }
  }

  // 自动旋转恢复
  if (resumeTimer > 0) {
    resumeTimer -= dt;
    if (resumeTimer <= 0) controls.autoRotate = true;
  }

  controls.update();
  // 限制观察目标在底座范围内（保持主体在画面里）
  controls.target.x = clamp(controls.target.x, -12, 12);
  controls.target.z = clamp(controls.target.z, -12, 12);
  controls.target.y = clamp(controls.target.y, 1.5, 20);

  // 时间 uniform
  wetUniforms.uTime.value = t;
  sky.userData.uniforms.uTime.value = t;
  rain.userData.uniforms.uTime.value = t;
  splash.userData.uniforms.uTime.value = t;

  // 地面反光条轻微晃动
  for (let i = 0; i < streakList.length; i++) {
    const s = streakList[i];
    const w = 1 + Math.sin(t * 1.6 + s.seed) * 0.06;
    s.m.scale.x = w;
    s.m.material.opacity = s.base * (0.88 + Math.sin(t * 2.3 + s.seed * 2.0) * 0.12);
  }

  // 灯珠光晕始终面向相机
  for (let i = 0; i < billboards.length; i++) {
    const b = billboards[i];
    if (b.visible) b.lookAt(camera.position);
  }

  // 小巷壁灯闪烁
  if (runtime.flickerLights) {
    for (const fl of runtime.flickerLights) {
      const n = Math.sin(t * 11.3) * Math.sin(t * 3.7) * Math.sin(t * 27.1);
      const on = n > -0.25 ? 1 : 0.25 + Math.abs(n) * 0.6;
      fl.light.intensity = 14 * on;
      if (fl.mesh) fl.mesh.material.color.setScalar(1.2 * on);
    }
  }

  // 霓虹/灯箱轻微呼吸
  bloom.strength = 0.42 + Math.sin(t * 0.7) * 0.014;

  composer.render();
  requestAnimationFrame(frame);
}

// 地面反光条（ground.js 已登记）
const streakList = reflectionStreaks;

// 调试用视角接口（无 UI）
window.__view = (az, el, dist) => {
  controls.autoRotate = false;
  controls.userInteracted = true;
  introT = 1;
  placeCamera(az, el, dist);
  controls.target.copy(target);
  controls.update();
  camera.updateProjectionMatrix();
};
window.__home = () => window.__view(HOME.az, HOME.el, HOME.dist);

renderer.domElement.addEventListener('pointerdown', () => { controls.userInteracted = true; });
renderer.domElement.addEventListener('wheel', () => { controls.userInteracted = true; }, { passive: true });

frame();
requestAnimationFrame(() => { document.body.classList.add('ready'); window.__ready = true; });
