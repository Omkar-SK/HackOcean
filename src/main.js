import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

// ═══════════════════════════════════════════════════════════════
// RENDERER & SCENE
// ═══════════════════════════════════════════════════════════════
const canvas = document.querySelector('#ocean-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
renderer.shadowMap.enabled = false; // OFF — no dark shadows, fully lit world

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x48B6FF);
scene.fog = new THREE.FogExp2(0x0A7FC0, 0.008); // lighter fog, more visibility

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 800);

// Camera rig — camGroup follows spline & faces forward
// camera (child) handles only mouse free-look
const camGroup = new THREE.Group();
scene.add(camGroup);
camGroup.add(camera);
camera.position.set(0, 0, 0);

// ═══════════════════════════════════════════════════════════════
// BRIGHT UNIFORM LIGHTING — no dark areas
// ═══════════════════════════════════════════════════════════════
// Strong ambient — fills everything evenly
const ambient = new THREE.AmbientLight(0xAADDFF, 3.5);
scene.add(ambient);

// Hemisphere — sky/ground gradient fill
const hemi = new THREE.HemisphereLight(0x7FCCFF, 0x3399BB, 2.0);
scene.add(hemi);

// Main sun from above — no shadows cast
const sunLight = new THREE.DirectionalLight(0xFFFFDD, 2.0);
sunLight.position.set(5, 80, 30);
sunLight.castShadow = false;
scene.add(sunLight);

// Fill light from below — eliminates any underside darkness
const fillBelow = new THREE.DirectionalLight(0x44AAFF, 1.2);
fillBelow.position.set(0, -50, 0);
scene.add(fillBelow);

// Scatter fill from sides
const fillLeft  = new THREE.DirectionalLight(0x88CCFF, 0.8);
fillLeft.position.set(-40, 0, -40);
scene.add(fillLeft);
const fillRight = new THREE.DirectionalLight(0x88CCFF, 0.8);
fillRight.position.set( 40, 0, -40);
scene.add(fillRight);

// Bioluminescent accent lights — added to scene after FLOOR_Y is defined below
const bioColors = [0x00FFCC, 0x00DDFF, 0xAA44FF, 0xFF44AA, 0x44FFAA];
const bioLights = [];

// ═══════════════════════════════════════════════════════════════
// UNIFORMS
// ═══════════════════════════════════════════════════════════════
const uTime = { value: 0 };

// ═══════════════════════════════════════════════════════════════
// WORLD DEPTH — camera descends to Y ≈ -110, seabed at -120
// ═══════════════════════════════════════════════════════════════
const FLOOR_Y = -120;

// Now create and add bio lights using FLOOR_Y
for (let i = 0; i < 20; i++) {
  const bl = new THREE.PointLight(bioColors[i % bioColors.length], 1.8, 22);
  bl.position.set(
    (Math.random() - 0.5) * 80,
    FLOOR_Y + 2 + Math.random() * 6,
    -120 - Math.random() * 80
  );
  bioLights.push(bl);
  scene.add(bl);
}

// ═══════════════════════════════════════════════════════════════
// WATER SURFACE — animated wave shader
// ═══════════════════════════════════════════════════════════════
const waterGeo = new THREE.PlaneGeometry(500, 500, 80, 80);
const waterMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime,
    uColorDeep:    { value: new THREE.Color(0x005588) },
    uColorShallow: { value: new THREE.Color(0x55D4FF) }
  },
  vertexShader: `
    uniform float uTime;
    varying float vElev;
    void main() {
      vec4 mPos = modelMatrix * vec4(position, 1.0);
      float e = sin(mPos.x * 0.22 + uTime * 0.85) * 0.7
              + sin(mPos.z * 0.32 + uTime * 0.65) * 0.5
              + sin((mPos.x + mPos.z) * 0.12 + uTime) * 0.3;
      mPos.y += e;
      vElev = e;
      gl_Position = projectionMatrix * viewMatrix * mPos;
    }
  `,
  fragmentShader: `
    uniform vec3 uColorDeep;
    uniform vec3 uColorShallow;
    varying float vElev;
    void main() {
      float t = clamp((vElev + 1.5) * 0.33, 0.0, 1.0);
      vec3 col = mix(uColorDeep, uColorShallow, t);
      gl_FragColor = vec4(col, 0.88);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false
});
const water = new THREE.Mesh(waterGeo, waterMat);
water.rotation.x = -Math.PI / 2;
water.position.y = 6;
scene.add(water);

// ═══════════════════════════════════════════════════════════════
// OCEAN FLOOR — large sand plane at Y = -120
// ═══════════════════════════════════════════════════════════════
const sandGeo = new THREE.PlaneGeometry(500, 350, 100, 70);
const sandPosAttr = sandGeo.attributes.position;
for (let i = 0; i < sandPosAttr.count; i++) {
  const x = sandPosAttr.getX(i);
  const z = sandPosAttr.getZ(i);
  const bump = Math.sin(x * 0.12) * 0.6 + Math.sin(z * 0.18) * 0.5 + (Math.random() - 0.5) * 0.4;
  sandPosAttr.setZ(i, sandPosAttr.getZ(i) + bump);
}
sandGeo.computeVertexNormals();
const sandMat = new THREE.MeshStandardMaterial({
  color: 0xC8A85A,
  roughness: 1.0,
  metalness: 0.0,
  emissive: 0x332200,
  emissiveIntensity: 0.05
});
const sand = new THREE.Mesh(sandGeo, sandMat);
sand.rotation.x = -Math.PI / 2;
sand.position.y = FLOOR_Y;
scene.add(sand);

// ═══════════════════════════════════════════════════════════════
// VOLUMETRIC GOD-RAY BEAMS — shader-based animated shafts
// Camera NEVER enters these (they are far from the path)
// ═══════════════════════════════════════════════════════════════
const godRayMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime,
    uColor: { value: new THREE.Color(0x99EEFF) },
    uOpacity: { value: 1.0 }
  },
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3  uColor;
    uniform float uTime;
    uniform float uOpacity;
    varying vec2  vUv;
    void main() {
      // Fade at top and bottom, shimmer in middle
      float fade  = vUv.y * (1.0 - vUv.y) * 4.0;
      float shimmer = 0.5 + 0.5 * sin(uTime * 1.2 + vUv.y * 8.0);
      float alpha = fade * shimmer * 0.12 * uOpacity;
      gl_FragColor = vec4(uColor, alpha);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
  depthWrite: false
});

// Place god-ray cylinders — far to the sides so camera never enters them
const rayPositions = [
  { x: -25, z: -15 }, { x:  20, z: -25 }, { x: -18, z: -42 },
  { x:  22, z: -55 }, { x: -20, z: -70 }, { x:  18, z: -85 },
  { x: -22, z: -100 },{ x:  16, z: -115 }
];
const godRayMeshes = [];
rayPositions.forEach(({ x, z }) => {
  const mat = godRayMat.clone();
  const rayGeo = new THREE.CylinderGeometry(1.5, 6, 60, 8, 1, true);
  const ray = new THREE.Mesh(rayGeo, mat);
  ray.position.set(x, -30, z);
  ray.rotation.z = (Math.random() - 0.5) * 0.15;
  ray.rotation.x = (Math.random() - 0.5) * 0.08;
  scene.add(ray);
  godRayMeshes.push({ mesh: ray, mat, baseX: x });
});

// ═══════════════════════════════════════════════════════════════
// PARTICLES — floating plankton / dust across entire world depth
// ═══════════════════════════════════════════════════════════════
const particleCount = 6000;
const pPos = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
  pPos[i * 3]     = (Math.random() - 0.5) * 200;
  pPos[i * 3 + 1] = FLOOR_Y + Math.random() * 140; // spread full depth
  pPos[i * 3 + 2] = -10 + (Math.random() - 0.5) * 200;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({
  size: 0.09,
  color: 0xAAEEFF,
  transparent: true,
  opacity: 0.5,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const particles = new THREE.Points(pGeo, pMat);
scene.add(particles);

// ═══════════════════════════════════════════════════════════════
// PROCEDURAL SCENERY HELPERS
// ═══════════════════════════════════════════════════════════════

function createCoral(x, y, z, color = 0xFF4499, h = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.7,
    emissive: color, emissiveIntensity: 0.35
  });
  const n = Math.floor(Math.random() * 5) + 5;
  for (let i = 0; i < n; i++) {
    const height = (0.7 + Math.random() * 1.6) * h;
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04 + Math.random() * 0.06, 0.08 + Math.random() * 0.1, height, 5),
      mat
    );
    branch.position.set((Math.random() - 0.5) * 2, height / 2, (Math.random() - 0.5) * 2);
    branch.rotation.set((Math.random() - 0.5) * 0.7, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.5);
    g.add(branch);
  }
  scene.add(g);
  return g;
}

function createSeaweed(x, y, z, color = 0x22CC55) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide, emissive: color, emissiveIntensity: 0.1 });
  const n = Math.floor(Math.random() * 4) + 3;
  for (let i = 0; i < n; i++) {
    const h = 1.5 + Math.random() * 3;
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.22, h, 1, 5), mat);
    blade.position.set((Math.random() - 0.5) * 0.6, h / 2, (Math.random() - 0.5) * 0.6);
    blade.rotation.y = Math.random() * Math.PI * 2;
    g.add(blade);
  }
  scene.add(g);
  return g;
}

function createRock(x, y, z, scale = 1) {
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i,
      pos.getX(i) * (0.8 + Math.random() * 0.4),
      pos.getY(i) * (0.6 + Math.random() * 0.4),
      pos.getZ(i) * (0.8 + Math.random() * 0.4)
    );
  }
  geo.computeVertexNormals();
  const col = new THREE.Color().setHSL(0.08 + Math.random() * 0.06, 0.3, 0.38 + Math.random() * 0.22);
  const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.92, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(scale * (0.8 + Math.random() * 0.4), scale * (0.5 + Math.random() * 0.35), scale * (0.8 + Math.random() * 0.4));
  mesh.rotation.set(Math.random() * 0.4, Math.random() * Math.PI * 2, Math.random() * 0.3);
  scene.add(mesh);
  return mesh;
}

function createStarfish(x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.x = -Math.PI / 2;
  const mat = new THREE.MeshStandardMaterial({ color: 0xFF5533, roughness: 0.9, emissive: 0x441100, emissiveIntensity: 0.3 });
  for (let i = 0; i < 5; i++) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.55, 3, 5), mat);
    arm.position.set(Math.cos(i / 5 * Math.PI * 2) * 0.36, Math.sin(i / 5 * Math.PI * 2) * 0.36, 0);
    arm.rotation.z = i / 5 * Math.PI * 2;
    g.add(arm);
  }
  scene.add(g);
}

// ═══════════════════════════════════════════════════════════════
// CAMERA PATH — DEEP S-CURVE DIVE
//
// Surface Y=6 → Seabed Y=-120 (depth of 126 units)
//
// Waypoints:
//  0  above ocean (y=14)
//  1  skimming surface (y=4)
//  2  entering water (y=-2)
//  3  reef zone, curve left (y=-14)    ← fish-01 group A
//  4  swing right, submarine (y=-22)   ← shark A patrols here
//  5  curve left, jellyfish (y=-35)    ← fish-01 group B on right
//  6  shark B crossing (y=-48)
//  7  curve right, fish-02 (y=-60)     ← fish-02 group A
//  8  deep zone, curve left (y=-75)    ← jellyfish mid, shark C
//  9  more fish-02 (y=-88)             ← fish-02 group B
// 10  seabed approach (y=-100)
// 11  final pan seabed (y=-108)
// 12  CTA — hovering (y=-112)
// ═══════════════════════════════════════════════════════════════
const splinePoints = [
  new THREE.Vector3(  0,  14,  60),   // 0  — above surface
  new THREE.Vector3(  0,   4,  20),   // 1  — surface
  new THREE.Vector3( -4,  -2,  -2),   // 2  — entering water
  new THREE.Vector3(-14, -14, -18),   // 3  — reef, curve left
  new THREE.Vector3(  4, -22, -35),   // 4  — submarine, swing right
  new THREE.Vector3(-12, -35, -52),   // 5  — jellyfish, curve left
  new THREE.Vector3(  8, -48, -68),   // 6  — shark B, swing right
  new THREE.Vector3(-10, -60, -84),   // 7  — fish-02, curve left
  new THREE.Vector3(  6, -75, -100),  // 8  — deep jellyfish, shark C
  new THREE.Vector3(-8,  -88, -116),  // 9  — fish-02 group B
  new THREE.Vector3( 4, -100, -132),  // 10 — seabed approach
  new THREE.Vector3(-4, -108, -146),  // 11 — final pan
  new THREE.Vector3( 0, -112, -158),  // 12 — CTA
];

const cameraCurve = new THREE.CatmullRomCurve3(splinePoints, false, 'catmullrom', 0.5);

// ═══════════════════════════════════════════════════════════════
// SCENE OBJECTS — placed intentionally around the spline
// ═══════════════════════════════════════════════════════════════

// ─── SHALLOW REEF (wp 2-4, y around -12 to -22) ───────────────
// Left wall of coral
for (const [cx, cy, cz, col] of [
  [-20, -15, -14, 0xFF3399], [-23, -15, -19, 0xFF6633], [-25, -15, -25, 0xFF2255],
  [-19, -15, -30, 0xDD44BB], [-22, -15, -35, 0xFF5599], [-18, -15, -40, 0xEE3377],
]) createCoral(cx, cy, cz, col, 1.8);

// Right wall
for (const [cx, cy, cz, col] of [
  [ 14, -15, -16, 0xFF8833], [ 16, -15, -22, 0xFFAA22], [ 12, -15, -28, 0xFF5511],
  [ 15, -15, -34, 0xFFCC44], [ 18, -15, -40, 0xFF7700],
]) createCoral(cx, cy, cz, col, 1.5);

// Seaweed carpet in reef
for (let i = 0; i < 40; i++) {
  createSeaweed(
    (Math.random() - 0.5) * 36 - 4,
    -16,
    -12 - Math.random() * 30,
    [0x22CC55, 0x44AA22, 0x11BB55, 0x33EE66][Math.floor(Math.random() * 4)]
  );
}

// Rocks on reef floor
for (let i = 0; i < 20; i++) {
  createRock((Math.random() - 0.5) * 38, -16, -12 - Math.random() * 30, 0.4 + Math.random() * 1.2);
}

// ─── MID-DEPTH ZONE (wp 5-7, y around -35 to -60) ────────────
for (let i = 0; i < 16; i++) {
  createCoral(
    (Math.random() - 0.5) * 40,
    -37,
    -50 - Math.random() * 35,
    [0xFF44AA, 0x44BBFF, 0xFFDD44, 0x44FFAA][Math.floor(Math.random() * 4)],
    1.2
  );
  createSeaweed(
    (Math.random() - 0.5) * 40,
    -37,
    -52 - Math.random() * 32,
    [0x22BB44, 0x11CC55, 0x44AA33][Math.floor(Math.random() * 3)]
  );
  createRock((Math.random() - 0.5) * 40, -37, -50 - Math.random() * 35, 0.3 + Math.random() * 1.5);
}

// ─── SEABED DEEP ZONE (wp 8-12, y around -75 to -120) ─────────
for (let i = 0; i < 50; i++) {
  createRock(
    (Math.random() - 0.5) * 80,
    FLOOR_Y,
    -110 - Math.random() * 80,
    0.5 + Math.random() * 2.5
  );
}
for (let i = 0; i < 35; i++) {
  createCoral(
    (Math.random() - 0.5) * 80,
    FLOOR_Y,
    -110 - Math.random() * 80,
    [0xFF4499, 0xFF8833, 0x44BBFF, 0xFFEE44, 0x44FF99, 0xFF44AA][Math.floor(Math.random() * 6)],
    0.9 + Math.random() * 1.4
  );
  createSeaweed(
    (Math.random() - 0.5) * 80,
    FLOOR_Y,
    -112 - Math.random() * 78
  );
}
for (let i = 0; i < 20; i++) {
  createStarfish(
    (Math.random() - 0.5) * 70,
    FLOOR_Y + 0.05,
    -110 - Math.random() * 75
  );
}

// ═══════════════════════════════════════════════════════════════
// GLB MODEL LOADING
// ═══════════════════════════════════════════════════════════════
const gltfLoader = new GLTFLoader();
const mixers = [];

// Arrays for per-frame animation
const fishSchool1A = [], fishSchool1B = [], fishSchool1C = [];
const fishSchool2A = [], fishSchool2B = [], fishSchool2C = [];
const jellyAll = [];
const sharks = []; // multiple shark instances

function loadModel(path, onLoad) {
  gltfLoader.load(path, onLoad, undefined, (err) => {
    console.warn('Model skipped:', path, err);
  });
}

// ─── SUBMARINE — large, beside wp4 ────────────────────────────
loadModel('/models/submarine/submarine.glb', (gltf) => {
  const sub = gltf.scene;
  sub.position.set(-18, -20, -38);
  sub.scale.setScalar(6);
  sub.rotation.set(0, 0.15, 0);
  // Brighten sub with emissive
  sub.traverse(c => {
    if (c.isMesh && c.material) {
      c.material = c.material.clone();
      c.material.emissive = new THREE.Color(0x111122);
      c.material.emissiveIntensity = 0.3;
    }
  });
  scene.add(sub);
  if (gltf.animations?.length) {
    const m = new THREE.AnimationMixer(sub);
    m.clipAction(gltf.animations[0]).play();
    mixers.push(m);
  }
});

// ─── FISH-01 — 3 groups at different depths ───────────────────
loadModel('/models/fish/fish-01.glb', (gltf) => {
  const base = gltf.scene;

  // Group A — reef zone, wp3, left side, 22 fish
  const A_center = new THREE.Vector3(-10, -16, -22);
  for (let i = 0; i < 22; i++) {
    const c = base.clone();
    c.position.set(
      A_center.x + (Math.random() - 0.5) * 14,
      A_center.y + (Math.random() - 0.5) * 6,
      A_center.z + (Math.random() - 0.5) * 14
    );
    c.rotation.y = Math.PI + (Math.random() - 0.5) * 0.8;
    c.scale.setScalar(0.32 + Math.random() * 0.18);
    scene.add(c);
    fishSchool1A.push({ mesh: c, offset: Math.random() * Math.PI * 2, basePos: c.position.clone() });
    if (gltf.animations?.length) {
      const m = new THREE.AnimationMixer(c);
      const a = m.clipAction(gltf.animations[0]);
      a.timeScale = 0.7 + Math.random() * 0.5;
      a.play();
      mixers.push(m);
    }
  }

  // Group B — mid zone right, wp6 area, 18 fish
  const B_center = new THREE.Vector3(14, -46, -64);
  for (let i = 0; i < 18; i++) {
    const c = base.clone();
    c.position.set(
      B_center.x + (Math.random() - 0.5) * 12,
      B_center.y + (Math.random() - 0.5) * 6,
      B_center.z + (Math.random() - 0.5) * 12
    );
    c.rotation.y = (Math.random() - 0.5) * Math.PI;
    c.scale.setScalar(0.3 + Math.random() * 0.2);
    scene.add(c);
    fishSchool1B.push({ mesh: c, offset: Math.random() * Math.PI * 2, basePos: c.position.clone() });
    if (gltf.animations?.length) {
      const m = new THREE.AnimationMixer(c);
      const a = m.clipAction(gltf.animations[0]);
      a.timeScale = 0.6 + Math.random() * 0.6;
      a.play();
      mixers.push(m);
    }
  }

  // Group C — deep zone, wp9, above seabed, 16 fish
  const C_center = new THREE.Vector3(12, -85, -118);
  for (let i = 0; i < 16; i++) {
    const c = base.clone();
    c.position.set(
      C_center.x + (Math.random() - 0.5) * 10,
      C_center.y + (Math.random() - 0.5) * 5,
      C_center.z + (Math.random() - 0.5) * 10
    );
    c.rotation.y = Math.PI * 0.5 + (Math.random() - 0.5) * 0.6;
    c.scale.setScalar(0.28 + Math.random() * 0.15);
    scene.add(c);
    fishSchool1C.push({ mesh: c, offset: Math.random() * Math.PI * 2, basePos: c.position.clone() });
    if (gltf.animations?.length) {
      const m = new THREE.AnimationMixer(c);
      const a = m.clipAction(gltf.animations[0]);
      a.timeScale = 0.5 + Math.random() * 0.7;
      a.play();
      mixers.push(m);
    }
  }
});

// ─── FISH-02 — 3 groups, mid-to-deep ──────────────────────────
loadModel('/models/fish/fish-02.glb', (gltf) => {
  const base = gltf.scene;

  // Group A — wp5 jellyfish zone, right side, 20 fish
  const A_center = new THREE.Vector3(16, -33, -55);
  for (let i = 0; i < 20; i++) {
    const c = base.clone();
    c.position.set(
      A_center.x + (Math.random() - 0.5) * 12,
      A_center.y + (Math.random() - 0.5) * 6,
      A_center.z + (Math.random() - 0.5) * 12
    );
    c.rotation.y = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.6;
    c.scale.setScalar(0.35 + Math.random() * 0.2);
    scene.add(c);
    fishSchool2A.push({ mesh: c, offset: Math.random() * Math.PI * 2, basePos: c.position.clone() });
    if (gltf.animations?.length) {
      const m = new THREE.AnimationMixer(c);
      const a = m.clipAction(gltf.animations[0]);
      a.timeScale = 0.7 + Math.random() * 0.5;
      a.play();
      mixers.push(m);
    }
  }

  // Group B — wp7 curve left, 22 fish
  const B_center = new THREE.Vector3(-14, -58, -88);
  for (let i = 0; i < 22; i++) {
    const c = base.clone();
    c.position.set(
      B_center.x + (Math.random() - 0.5) * 14,
      B_center.y + (Math.random() - 0.5) * 7,
      B_center.z + (Math.random() - 0.5) * 14
    );
    c.rotation.y = Math.PI + (Math.random() - 0.5) * 0.5;
    c.scale.setScalar(0.38 + Math.random() * 0.18);
    scene.add(c);
    fishSchool2B.push({ mesh: c, offset: Math.random() * Math.PI * 2, basePos: c.position.clone() });
    if (gltf.animations?.length) {
      const m = new THREE.AnimationMixer(c);
      const a = m.clipAction(gltf.animations[0]);
      a.timeScale = 0.6 + Math.random() * 0.5;
      a.play();
      mixers.push(m);
    }
  }

  // Group C — wp11, near seabed final pan, 18 fish
  const C_center = new THREE.Vector3(8, -104, -148);
  for (let i = 0; i < 18; i++) {
    const c = base.clone();
    c.position.set(
      C_center.x + (Math.random() - 0.5) * 12,
      C_center.y + (Math.random() - 0.5) * 5,
      C_center.z + (Math.random() - 0.5) * 12
    );
    c.rotation.y = (Math.random() - 0.5) * Math.PI * 2;
    c.scale.setScalar(0.33 + Math.random() * 0.17);
    scene.add(c);
    fishSchool2C.push({ mesh: c, offset: Math.random() * Math.PI * 2, basePos: c.position.clone() });
    if (gltf.animations?.length) {
      const m = new THREE.AnimationMixer(c);
      const a = m.clipAction(gltf.animations[0]);
      a.timeScale = 0.5 + Math.random() * 0.6;
      a.play();
      mixers.push(m);
    }
  }
});

// ─── JELLYFISH — spread across 3 zones, 6+6+5 = 17 total ─────
loadModel('/models/jellyfish/jellyfish.glb', (gltf) => {
  const base = gltf.scene;

  // Zone A — shallow/mid, around wp3-4
  const zoneA = [
    [-16, -18, -24], [-8, -24, -26], [ 12, -20, -28],
    [-14, -14, -32], [ 10, -26, -30], [ -6, -22, -36],
  ];
  // Zone B — mid depth, around wp5-6
  const zoneB = [
    [-18, -32, -52], [-6, -40, -56], [ 14, -36, -54],
    [-12, -28, -60], [  8, -44, -58], [-16, -38, -64],
  ];
  // Zone C — deep zone, around wp8-9
  const zoneC = [
    [ -14, -72, -102], [ 10, -80, -104], [ -8, -68, -108],
    [  16, -76, -112], [  0, -84, -106],
  ];

  [...zoneA, ...zoneB, ...zoneC].forEach(([x, y, z], idx) => {
    const c = base.clone();
    c.position.set(x, y, z);
    c.scale.setScalar(0.5 + Math.random() * 0.6);
    c.rotation.y = Math.random() * Math.PI * 2;
    // Give jellyfish emissive glow
    c.traverse(ch => {
      if (ch.isMesh && ch.material) {
        ch.material = ch.material.clone();
        const colors = [0x00FFCC, 0xAA55FF, 0x55AAFF, 0xFF55AA];
        ch.material.emissive = new THREE.Color(colors[idx % colors.length]);
        ch.material.emissiveIntensity = 0.5;
      }
    });
    scene.add(c);
    jellyAll.push({ mesh: c, baseY: y, offset: idx * 0.65 });
    if (gltf.animations?.length) {
      const m = new THREE.AnimationMixer(c);
      const a = m.clipAction(gltf.animations[0]);
      a.timeScale = 0.35 + Math.random() * 0.3;
      a.play();
      mixers.push(m);
    }
  });
});

// ─── SHARKS — 3 instances patrolling at S-curve turns ─────────
// Shark A — wp4 curve (y≈-22, z≈-35 zone)
// Shark B — wp6 curve (y≈-48, z≈-68 zone)
// Shark C — wp8 curve (y≈-75, z≈-100 zone)
const sharkDefs = [
  { startX:  22, y: -20, z: -40, dir: -1, range: 22, speed: 3.5, scale: 2.8 },
  { startX: -22, y: -46, z: -72, dir:  1, range: 22, speed: 4.0, scale: 3.0 },
  { startX:  20, y: -73, z: -104, dir: -1, range: 20, speed: 3.2, scale: 2.5 },
];

loadModel('/models/shark/shark.glb', (gltf) => {
  const base = gltf.scene;

  sharkDefs.forEach((def, idx) => {
    const s = idx === 0 ? base : base.clone();
    s.position.set(def.startX, def.y, def.z);
    s.scale.setScalar(def.scale);
    s.rotation.y = def.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    // Brighten shark
    s.traverse(c => {
      if (c.isMesh && c.material) {
        c.material = c.material.clone();
        c.material.emissiveIntensity = 0.05;
      }
    });
    scene.add(s);
    sharks.push({ mesh: s, ...def, x: def.startX });

    if (gltf.animations?.length) {
      const m = new THREE.AnimationMixer(s);
      m.clipAction(gltf.animations[0]).play();
      mixers.push(m);
    }
  });
});

// ─── ROCKS.GLB — multiple instances on seabed + reef ──────────
loadModel('/models/rocks/rocks.glb', (gltf) => {
  const base = gltf.scene;
  const placements = [
    // Reef area
    { pos: [-22, -17, -18], scale: 2.0, rot: 0.4 },
    { pos: [ 18, -17, -24], scale: 1.8, rot: 1.3 },
    { pos: [-20, -17, -38], scale: 1.5, rot: 2.2 },
    // Mid depth
    { pos: [-18, -37, -60], scale: 3.0, rot: 0.8 },
    { pos: [ 16, -37, -72], scale: 2.5, rot: 1.9 },
    // Deep seabed — big formations
    { pos: [-24, FLOOR_Y, -115], scale: 5.0, rot: 0.3 },
    { pos: [ 20, FLOOR_Y, -122], scale: 6.0, rot: 1.5 },
    { pos: [ -8, FLOOR_Y, -130], scale: 4.0, rot: 2.7 },
    { pos: [ 14, FLOOR_Y, -138], scale: 5.5, rot: 0.6 },
    { pos: [-18, FLOOR_Y, -145], scale: 4.5, rot: 1.1 },
    { pos: [  6, FLOOR_Y, -152], scale: 3.5, rot: 2.3 },
    { pos: [-10, FLOOR_Y, -158], scale: 3.0, rot: 0.9 },
  ];
  placements.forEach(({ pos, scale, rot }) => {
    const c = base.clone();
    c.position.set(...pos);
    c.scale.setScalar(scale);
    c.rotation.y = rot;
    scene.add(c);
  });
});

// ═══════════════════════════════════════════════════════════════
// LENIS SMOOTH SCROLL
// ═══════════════════════════════════════════════════════════════
const lenis = new Lenis({ duration: 1.8, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
lenis.on('scroll', ScrollTrigger.update);
(function lenisRaf(t) { lenis.raf(t); requestAnimationFrame(lenisRaf); })(0);

// ═══════════════════════════════════════════════════════════════
// DOM REFS
// ═══════════════════════════════════════════════════════════════
const depthValue = document.getElementById('depthValue');
const depthFill  = document.getElementById('depthFill');
const navSection = document.getElementById('navSectionName');
const panels     = document.querySelectorAll('.ui-panel');

const SECTION_NAMES = [
  'Surface', 'Our Fleet', 'Reef Systems', 'Marine Life',
  'Predators', 'Drifters', 'History', 'The Deep', 'Journey'
];

// ═══════════════════════════════════════════════════════════════
// SCROLL TRIGGER — camera path & UI
// ═══════════════════════════════════════════════════════════════
let scrollProgress = 0;
const dummy = new THREE.Object3D();

ScrollTrigger.create({
  trigger: '.scroll-driver',
  start: 'top top',
  end: 'bottom bottom',
  scrub: 2,
  onUpdate: (self) => {
    scrollProgress = self.progress;

    // Depth HUD — max 800m matches the deeper path
    const depth = Math.max(0, Math.floor(self.progress * 800));
    depthValue.innerText = `${depth}m`;
    depthFill.style.height = `${self.progress * 100}%`;

    // Nav section name
    const si = Math.min(Math.floor(self.progress * SECTION_NAMES.length), SECTION_NAMES.length - 1);
    navSection.innerText = SECTION_NAMES[si];

    // Camera position on spline
    const camPos = cameraCurve.getPointAt(self.progress);
    camGroup.position.copy(camPos);

    // Forward orientation — look slightly ahead on spline
    const ahead = Math.min(self.progress + 0.016, 1.0);
    const futurePos = cameraCurve.getPointAt(ahead);
    dummy.position.copy(camPos);
    dummy.lookAt(futurePos);
    camGroup.quaternion.slerp(dummy.quaternion, 0.14);

    // Fog & sky colour
    let bgColor;
    const p = self.progress;
    if (p < 0.1) {
      bgColor = new THREE.Color(0x48B6FF).lerp(new THREE.Color(0x1C7FBF), p / 0.1);
    } else if (p < 0.35) {
      bgColor = new THREE.Color(0x1C7FBF).lerp(new THREE.Color(0x0A4A7A), (p - 0.1) / 0.25);
    } else if (p < 0.65) {
      bgColor = new THREE.Color(0x0A4A7A).lerp(new THREE.Color(0x051E3E), (p - 0.35) / 0.3);
    } else {
      bgColor = new THREE.Color(0x051E3E).lerp(new THREE.Color(0x010811), (p - 0.65) / 0.35);
    }
    scene.background = bgColor;
    scene.fog.color.copy(bgColor);
    // Very gradual fog thickening — keep world visible
    scene.fog.density = 0.006 + p * 0.016;

    // God-ray opacity increases as we dive
    godRayMeshes.forEach(({ mat }) => {
      mat.uniforms.uOpacity.value = 0.4 + p * 1.2;
    });

    // UI panels
    const frac = 1 / panels.length;
    panels.forEach((panel, i) => {
      const center = (i + 0.5) * frac;
      const dist = Math.abs(self.progress - center);
      const visible = dist < frac * 0.38;
      panel.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      panel.style.opacity    = visible ? '1' : '0';
      panel.style.visibility = visible ? 'visible' : 'hidden';
      panel.style.transform  = visible ? 'translateY(0)' : 'translateY(18px)';
    });
  }
});

// Initial state
camGroup.position.copy(splinePoints[0]);
dummy.position.copy(splinePoints[0]);
dummy.lookAt(splinePoints[1]);
camGroup.quaternion.copy(dummy.quaternion);
panels[0].style.opacity    = '1';
panels[0].style.visibility = 'visible';
panels[0].style.transform  = 'translateY(0)';

// ═══════════════════════════════════════════════════════════════
// MOUSE FREE-LOOK
// ═══════════════════════════════════════════════════════════════
const mouseTarget  = { x: 0, y: 0 };
const mouseCurrent = { x: 0, y: 0 };
const MAX_YAW   = Math.PI / 6.5; // ~27°
const MAX_PITCH = Math.PI / 10;  // ~18°

window.addEventListener('mousemove', e => {
  mouseTarget.x = ((e.clientX / window.innerWidth)  - 0.5) * 2 * MAX_YAW;
  mouseTarget.y = ((e.clientY / window.innerHeight) - 0.5) * 2 * MAX_PITCH;
});

// ═══════════════════════════════════════════════════════════════
// RESIZE
// ═══════════════════════════════════════════════════════════════
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ═══════════════════════════════════════════════════════════════
// ANIMATE LOOP
// ═══════════════════════════════════════════════════════════════
const clock = new THREE.Clock();

// Fish school swimming helper — circular orbit + bob
function animateSchool(school, time, radius = 0.5, speed = 0.7) {
  school.forEach(({ mesh, offset, basePos }) => {
    const t = time * speed + offset;
    mesh.position.x = basePos.x + Math.sin(t) * radius;
    mesh.position.y = basePos.y + Math.sin(t * 1.3) * (radius * 0.5);
    // Face direction of x movement
    const vx = Math.cos(t) * radius;
    if (Math.abs(vx) > 0.01) {
      const targetY = vx > 0 ? 0 : Math.PI;
      mesh.rotation.y += (targetY - mesh.rotation.y) * 0.04;
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time  = clock.getElapsedTime();

  uTime.value = time;

  // All GLB animation mixers
  mixers.forEach(m => m.update(delta));

  // Fish schools — gentle orbital swim
  animateSchool(fishSchool1A, time, 1.2, 0.55);
  animateSchool(fishSchool1B, time, 1.0, 0.65);
  animateSchool(fishSchool1C, time, 0.9, 0.50);
  animateSchool(fishSchool2A, time, 1.3, 0.60);
  animateSchool(fishSchool2B, time, 1.1, 0.55);
  animateSchool(fishSchool2C, time, 1.0, 0.45);

  // Jellyfish — gentle vertical drift + slow rotation
  jellyAll.forEach(({ mesh, baseY, offset }) => {
    mesh.position.y = baseY + Math.sin(time * 0.3 + offset) * 1.5;
    mesh.rotation.y += delta * 0.12;
  });

  // Sharks — patrol their assigned range
  sharks.forEach(shark => {
    shark.x += shark.dir * shark.speed * delta;
    shark.mesh.position.x = shark.x;
    shark.mesh.position.y = shark.y + Math.sin(time * 0.5 + shark.startX) * 0.8;
    if (shark.x > shark.startX + shark.range)  shark.dir = -1;
    if (shark.x < shark.startX - shark.range)  shark.dir =  1;
    const targetRot = shark.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    shark.mesh.rotation.y += (targetRot - shark.mesh.rotation.y) * 0.06;
  });

  // God-ray shimmer (shader handles it via uTime)
  godRayMeshes.forEach(({ mesh }, i) => {
    mesh.rotation.y = Math.sin(time * 0.15 + i) * 0.04;
  });

  // Bioluminescent lights pulse
  bioLights.forEach((bl, i) => {
    bl.intensity = 1.2 + Math.sin(time * 1.2 + i * 0.9) * 0.8;
  });

  // Mouse free-look — applied only to camera child
  mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.07;
  mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.07;
  camera.rotation.order = 'YXZ';
  camera.rotation.y = -mouseCurrent.x;
  camera.rotation.x = -mouseCurrent.y;

  // Particles drift
  particles.rotation.y = time * 0.01;

  renderer.render(scene, camera);
}

animate();

// ═══════════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════════
const navBook      = document.getElementById('navBook');
const ctaBook      = document.getElementById('ctaBook');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose   = document.getElementById('modalClose');

function openModal()  { modalOverlay.classList.add('active');    lenis.stop(); }
function closeModal() { modalOverlay.classList.remove('active'); lenis.start(); }

navBook?.addEventListener('click', openModal);
ctaBook?.addEventListener('click', openModal);
modalClose?.addEventListener('click', closeModal);
modalOverlay?.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
