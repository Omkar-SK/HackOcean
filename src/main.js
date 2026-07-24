import "./style.css";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* =========================================================
   BASIC SETUP
========================================================= */
const canvas = document.querySelector("#webgl");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x087f9d);
scene.fog = new THREE.FogExp2(0x087f9d, 0.018);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 4, 18);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

/* =========================================================
   GLOBAL VARIABLES
========================================================= */
const clock = new THREE.Clock();
const mouse = new THREE.Vector2();
let scrollProgress = 0;
let targetMouseX = 0;
let targetMouseY = 0;

/* =========================================================
   ZONES / COLOR PROFILE
========================================================= */
const zones = [
  { progress: 0,    color: new THREE.Color(0x0c9fc1), fog: 0.012, exposure: 1.25, name: "SURFACE"       },
  { progress: 0.18, color: new THREE.Color(0x05647d), fog: 0.018, exposure: 1.05, name: "SUNLIGHT ZONE" },
  { progress: 0.38, color: new THREE.Color(0x02374c), fog: 0.024, exposure: 0.9,  name: "TWILIGHT ZONE" },
  { progress: 0.58, color: new THREE.Color(0x011a2c), fog: 0.030, exposure: 0.75, name: "MIDNIGHT ZONE" },
  { progress: 0.78, color: new THREE.Color(0x000b18), fog: 0.034, exposure: 0.62, name: "ABYSSAL ZONE"  },
  { progress: 1,    color: new THREE.Color(0x00040b), fog: 0.040, exposure: 0.50, name: "THE ABYSS"     },
];

/* =========================================================
   LIGHTING
========================================================= */
const ambientLight = new THREE.AmbientLight(0x63cbe5, 1.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xb9f5ff, 4);
sunLight.position.set(-8, 20, 5);
scene.add(sunLight);

const blueFill = new THREE.PointLight(0x00bfff, 20, 70);
blueFill.position.set(10, 0, 10);
scene.add(blueFill);

/* =========================================================
   OCEAN SURFACE
========================================================= */
const oceanGeometry = new THREE.PlaneGeometry(160, 160, 100, 100);
const oceanMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x1ca7c4, roughness: 0.22, metalness: 0.05,
  transparent: true, opacity: 0.72, transmission: 0.1,
  side: THREE.DoubleSide,
});
const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.rotation.x = -Math.PI / 2;
ocean.position.y = 11;
scene.add(ocean);

const oceanPositions = oceanGeometry.attributes.position;
const oceanOriginal = oceanPositions.array.slice();

function animateOcean(time) {
  const arr = oceanPositions.array;
  for (let i = 0; i < arr.length; i += 3) {
    const x = oceanOriginal[i];
    const y = oceanOriginal[i + 1];
    arr[i + 2] =
      Math.sin(x * 0.12 + time * 0.8) * 0.35 +
      Math.cos(y * 0.15 + time * 0.55) * 0.25 +
      Math.sin((x + y) * 0.07 + time) * 0.18;
  }
  oceanPositions.needsUpdate = true;
  oceanGeometry.computeVertexNormals();
}

/* =========================================================
   LIGHT RAYS
========================================================= */
const rayGroup = new THREE.Group();
scene.add(rayGroup);

function createLightRay(x, z, scale) {
  const geometry = new THREE.ConeGeometry(2.8 * scale, 30, 24, 1, true);
  const material = new THREE.MeshBasicMaterial({
    color: 0x9eefff, transparent: true, opacity: 0.035,
    side: THREE.DoubleSide, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ray = new THREE.Mesh(geometry, material);
  ray.position.set(x, 2, z);
  ray.rotation.z = Math.random() * 0.12 - 0.06;
  rayGroup.add(ray);
  return ray;
}

for (let i = 0; i < 12; i++) {
  createLightRay(
    THREE.MathUtils.randFloat(-35, 35),
    THREE.MathUtils.randFloat(-25, 10),
    THREE.MathUtils.randFloat(0.7, 1.8)
  );
}

/* =========================================================
   PARTICLES
========================================================= */
function createParticles(count, spread, size, color) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = THREE.MathUtils.randFloatSpread(spread);
    positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(spread);
    positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(spread);
    speeds[i] = Math.random() * 0.03 + 0.005;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color, size, transparent: true, opacity: 0.55, depthWrite: false,
  });
  const particles = new THREE.Points(geometry, material);
  particles.userData.speeds = speeds;
  scene.add(particles);
  return particles;
}

const particles = createParticles(4000, 100, 0.055, 0xa9e9f5);

/* =========================================================
   BUBBLES
========================================================= */
const bubbles = new THREE.Group();
scene.add(bubbles);
const bubbleGeometry = new THREE.SphereGeometry(0.08, 8, 8);
for (let i = 0; i < 180; i++) {
  const bubbleMaterial = new THREE.MeshBasicMaterial({
    color: 0xcdf7ff, transparent: true,
    opacity: THREE.MathUtils.randFloat(0.15, 0.5),
    wireframe: Math.random() > 0.45,
  });
  const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
  bubble.position.set(
    THREE.MathUtils.randFloatSpread(50),
    THREE.MathUtils.randFloat(-30, 15),
    THREE.MathUtils.randFloat(-30, 15)
  );
  const scale = THREE.MathUtils.randFloat(0.3, 1.8);
  bubble.scale.setScalar(scale);
  bubble.userData.speed = THREE.MathUtils.randFloat(0.01, 0.06);
  bubble.userData.offset = Math.random() * Math.PI * 2;
  bubbles.add(bubble);
}

/* =========================================================
   FISH
========================================================= */
const fishGroup = new THREE.Group();
scene.add(fishGroup);

function createFish(scale = 1, color = 0x74aeba) {
  const fish = new THREE.Group();
  const bodyGeometry = new THREE.SphereGeometry(0.5, 12, 8);
  bodyGeometry.scale(1.7, 0.65, 0.45);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
  fish.add(new THREE.Mesh(bodyGeometry, material));
  const tailGeometry = new THREE.ConeGeometry(0.45, 0.7, 3);
  const tail = new THREE.Mesh(tailGeometry, material);
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -1;
  fish.add(tail);
  fish.scale.setScalar(scale);
  return fish;
}

for (let i = 0; i < 65; i++) {
  const fish = createFish(THREE.MathUtils.randFloat(0.12, 0.38));
  fish.position.set(
    THREE.MathUtils.randFloat(-30, 30),
    THREE.MathUtils.randFloat(-12, 10),
    THREE.MathUtils.randFloat(-35, 5)
  );
  fish.userData.speed = THREE.MathUtils.randFloat(0.006, 0.025);
  fish.userData.offset = Math.random() * 100;
  fishGroup.add(fish);
}

/* =========================================================
   SUBMARINE
========================================================= */
function createSubmarine() {
  const submarine = new THREE.Group();
  const yellowMaterial = new THREE.MeshStandardMaterial({ color: 0xe2a724, roughness: 0.35, metalness: 0.45 });
  const darkMaterial   = new THREE.MeshStandardMaterial({ color: 0x17232a, roughness: 0.25, metalness: 0.8 });
  const glassMaterial  = new THREE.MeshPhysicalMaterial({
    color: 0x7edfff, emissive: 0x164b5a, emissiveIntensity: 1, roughness: 0.1, metalness: 0.2,
  });

  // Main hull
  const hullGeometry = new THREE.CapsuleGeometry(1.25, 4.8, 12, 24);
  const hull = new THREE.Mesh(hullGeometry, yellowMaterial);
  hull.rotation.z = Math.PI / 2;
  submarine.add(hull);

  // Front dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.05, 24, 16), glassMaterial);
  dome.scale.x = 0.6;
  dome.position.x = 3.1;
  submarine.add(dome);

  // Cabin
  const cabin = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.4, 8, 16), darkMaterial);
  cabin.rotation.z = Math.PI / 2;
  cabin.position.set(-0.3, 1.15, 0);
  submarine.add(cabin);

  // Periscope
  const periscope = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.1, 12), darkMaterial);
  periscope.position.set(-0.2, 2, 0);
  submarine.add(periscope);

  // Fin
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 1.8), yellowMaterial);
  fin.position.x = -1.5;
  submarine.add(fin);

  // Propeller
  const propellerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.5, 12), darkMaterial);
  propellerHub.rotation.z = Math.PI / 2;
  propellerHub.position.x = -3.5;
  submarine.add(propellerHub);

  const propeller = new THREE.Group();
  propeller.position.x = -3.8;
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.3), darkMaterial);
    blade.rotation.x = i * Math.PI / 2;
    propeller.add(blade);
  }
  submarine.add(propeller);
  submarine.userData.propeller = propeller;

  // Headlights
  const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xe6fbff });
  [-0.55, 0.55].forEach(z => {
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), headlightMaterial);
    light.position.set(3.45, 0, z);
    submarine.add(light);
  });

  return submarine;
}

const submarine = createSubmarine();
submarine.scale.setScalar(0.85);
submarine.position.set(15, 1, -8);
scene.add(submarine);

/* =========================================================
   SUBMARINE SEARCHLIGHTS
========================================================= */
function createSearchBeam(z) {
  const geometry = new THREE.ConeGeometry(3.5, 18, 24, 1, true);
  const material = new THREE.MeshBasicMaterial({
    color: 0xb9f6ff, transparent: true, opacity: 0.06,
    side: THREE.DoubleSide, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const beam = new THREE.Mesh(geometry, material);
  beam.rotation.z = -Math.PI / 2;
  beam.position.set(12, 1, z);
  submarine.add(beam);
  return beam;
}
createSearchBeam(-0.55);
createSearchBeam(0.55);

/* =========================================================
   JELLYFISH
========================================================= */
const jellyfishGroup = new THREE.Group();
scene.add(jellyfishGroup);

function createJellyfish(scale = 1) {
  const jelly = new THREE.Group();
  const bell = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: 0x6ae7ff, emissive: 0x147fa2, emissiveIntensity: 2,
      transparent: true, opacity: 0.65, roughness: 0.15,
    })
  );
  jelly.add(bell);

  const tentacleMaterial = new THREE.LineBasicMaterial({
    color: 0x67e8ff, transparent: true, opacity: 0.55,
  });
  for (let i = 0; i < 7; i++) {
    const x = THREE.MathUtils.randFloat(-0.4, 0.4);
    const z = THREE.MathUtils.randFloat(-0.4, 0.4);
    const points = [];
    for (let j = 0; j < 8; j++) {
      points.push(new THREE.Vector3(x + Math.sin(j * 0.8) * 0.06, -j * 0.35, z));
    }
    jelly.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), tentacleMaterial));
  }
  jelly.scale.setScalar(scale);
  jelly.userData.offset = Math.random() * 10;
  return jelly;
}

for (let i = 0; i < 24; i++) {
  const jelly = createJellyfish(THREE.MathUtils.randFloat(0.25, 0.8));
  jelly.position.set(
    THREE.MathUtils.randFloat(-22, 22),
    THREE.MathUtils.randFloat(-12, 8),
    THREE.MathUtils.randFloat(-28, -4)
  );
  jellyfishGroup.add(jelly);
}

/* =========================================================
   SEABED
========================================================= */
const seabedGeometry = new THREE.PlaneGeometry(140, 140, 60, 60);
const seabedPositions = seabedGeometry.attributes.position;
for (let i = 0; i < seabedPositions.count; i++) {
  const x = seabedPositions.getX(i);
  const y = seabedPositions.getY(i);
  seabedPositions.setZ(i,
    Math.sin(x * 0.12) * 0.6 +
    Math.cos(y * 0.09) * 0.7 +
    Math.sin((x + y) * 0.04) * 1.2 +
    Math.random() * 0.2
  );
}
seabedGeometry.computeVertexNormals();
const seabed = new THREE.Mesh(
  seabedGeometry,
  new THREE.MeshStandardMaterial({ color: 0x102d32, roughness: 1, metalness: 0 })
);
seabed.rotation.x = -Math.PI / 2;
seabed.position.y = -14;
scene.add(seabed);

/* =========================================================
   ROCKS
========================================================= */
const rockGroup = new THREE.Group();
scene.add(rockGroup);
const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x142e32, roughness: 0.95 });
for (let i = 0; i < 100; i++) {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(THREE.MathUtils.randFloat(0.25, 1.8), 0),
    rockMaterial
  );
  rock.position.set(
    THREE.MathUtils.randFloat(-45, 45),
    THREE.MathUtils.randFloat(-13.5, -12.5),
    THREE.MathUtils.randFloat(-50, 20)
  );
  rock.scale.y = THREE.MathUtils.randFloat(0.5, 1.8);
  rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  rockGroup.add(rock);
}

/* =========================================================
   BIOLUMINESCENT PLANTS
========================================================= */
const bioGroup = new THREE.Group();
scene.add(bioGroup);
const bioMaterial = new THREE.MeshStandardMaterial({
  color: 0x35e6ff, emissive: 0x00a8cc, emissiveIntensity: 4,
});
for (let i = 0; i < 100; i++) {
  const height = THREE.MathUtils.randFloat(0.2, 1.4);
  const plant = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), bioMaterial);
  plant.scale.set(1, height * 4, 1);
  plant.position.set(
    THREE.MathUtils.randFloat(-35, 35),
    -12.4,
    THREE.MathUtils.randFloat(-45, 5)
  );
  bioGroup.add(plant);
}

/* =========================================================
   SHIPWRECK
========================================================= */
function createShipwreck() {
  const wreck = new THREE.Group();
  const rustMaterial = new THREE.MeshStandardMaterial({ color: 0x45372e, roughness: 1, metalness: 0.25 });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(12, 2.4, 4), rustMaterial);
  hull.rotation.z = -0.12;
  wreck.add(hull);

  const bow = new THREE.Mesh(new THREE.ConeGeometry(2.1, 4, 4), rustMaterial);
  bow.rotation.z = -Math.PI / 2;
  bow.position.x = 7;
  wreck.add(bow);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 3), rustMaterial);
  cabin.position.set(-1, 2.2, 0);
  wreck.add(cabin);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 8, 10), rustMaterial);
  mast.position.set(0, 6, 0);
  mast.rotation.z = 0.2;
  wreck.add(mast);

  return wreck;
}

const shipwreck = createShipwreck();
shipwreck.position.set(12, -11.7, -22);
shipwreck.rotation.y = -0.5;
shipwreck.visible = false;
scene.add(shipwreck);

/* =========================================================
   ANGLERFISH
========================================================= */
function createAnglerFish() {
  const angler = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x172126, roughness: 0.8 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.4, 18, 12), bodyMaterial);
  body.scale.set(1.3, 0.8, 0.85);
  angler.add(body);

  const toothMaterial = new THREE.MeshBasicMaterial({ color: 0xe7f3e8 });
  for (let i = 0; i < 8; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 6), toothMaterial);
    tooth.rotation.z = -Math.PI / 2;
    tooth.position.set(1.45, -0.45 + i * 0.12, (i % 2 === 0 ? 1 : -1) * 0.25);
    angler.add(tooth);
  }

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.4, 0.9, 0),
    new THREE.Vector3(0.8, 1.8, 0),
    new THREE.Vector3(1.7, 2.1, 0),
  ]);
  angler.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.035, 6, false), bodyMaterial));

  const lureMaterial = new THREE.MeshStandardMaterial({
    color: 0x8ffaff, emissive: 0x22d9ff, emissiveIntensity: 8,
  });
  const lure = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), lureMaterial);
  lure.position.set(1.7, 2.1, 0);
  angler.add(lure);

  const lureLight = new THREE.PointLight(0x4eeeff, 8, 8);
  lureLight.position.copy(lure.position);
  angler.add(lureLight);

  return angler;
}

const anglerFish = createAnglerFish();
anglerFish.position.set(-8, -4, -14);
anglerFish.scale.setScalar(0.7);
anglerFish.visible = false;
scene.add(anglerFish);

/* =========================================================
   CAMERA PATH
========================================================= */
const cameraPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0,   4,  18),
  new THREE.Vector3(-2,  1,  12),
  new THREE.Vector3(2,  -2,   9),
  new THREE.Vector3(-3, -5,   6),
  new THREE.Vector3(3,  -8,   4),
  new THREE.Vector3(0, -10,   0),
  new THREE.Vector3(5, -10,  -8),
  new THREE.Vector3(-4, -9, -15),
  new THREE.Vector3(2,  -8, -24),
]);

/* =========================================================
   SCROLL
========================================================= */
const depthElement        = document.querySelector("#depth");
const zoneElement         = document.querySelector("#zone-name");
const depthTrackProgress  = document.querySelector("#depth-track-progress");

ScrollTrigger.create({
  trigger: "main",
  start: "top top",
  end: "bottom bottom",
  scrub: 1.2,
  onUpdate: self => { scrollProgress = self.progress; },
});

/* =========================================================
   STORY CARD OBSERVER
========================================================= */
const cards = document.querySelectorAll(".story-card");
const observer = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
  { threshold: 0.3 }
);
cards.forEach(card => observer.observe(card));

/* =========================================================
   MOUSE PARALLAX
========================================================= */
window.addEventListener("mousemove", event => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  targetMouseX = mouse.x;
  targetMouseY = mouse.y;
});

/* =========================================================
   ZONE INTERPOLATION
========================================================= */
function updateEnvironment(progress) {
  let current = zones[0];
  let next    = zones[zones.length - 1];
  for (let i = 0; i < zones.length - 1; i++) {
    if (progress >= zones[i].progress && progress <= zones[i + 1].progress) {
      current = zones[i];
      next    = zones[i + 1];
      break;
    }
  }
  const range = next.progress - current.progress;
  const local = range === 0 ? 0 : (progress - current.progress) / range;

  // Interpolate scene background & fog
  const lerpColor = new THREE.Color().lerpColors(current.color, next.color, local);
  scene.background.copy(lerpColor);
  scene.fog.color.copy(lerpColor);
  scene.fog.density = THREE.MathUtils.lerp(current.fog, next.fog, local);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(current.exposure, next.exposure, local);

  // Depth display
  const depth = Math.round(progress * 6000);
  depthElement.textContent = String(depth).padStart(4, "0");
  depthTrackProgress.style.height = `${progress * 100}%`;

  // Zone name
  const name = local > 0.5 ? next.name : current.name;
  if (zoneElement.textContent !== name) zoneElement.textContent = name;

  // Reveal objects based on depth
  rayGroup.visible    = progress < 0.45;
  sunLight.intensity  = THREE.MathUtils.lerp(4, 0.2, Math.min(progress / 0.5, 1));
  ambientLight.intensity = THREE.MathUtils.lerp(1.5, 0.3, progress);

  shipwreck.visible   = progress > 0.55;
  anglerFish.visible  = progress > 0.72;

  // Bioluminescence ramp
  const bioIntensity = THREE.MathUtils.lerp(0, 8, Math.max(0, (progress - 0.5) / 0.5));
  bioMaterial.emissiveIntensity = bioIntensity;
}

/* =========================================================
   LOADER
========================================================= */
const loader      = document.querySelector("#loader");
const loaderBar   = document.querySelector(".loader-progress");
let loadProgress  = 0;

function simulateLoad() {
  const interval = setInterval(() => {
    loadProgress += Math.random() * 12 + 4;
    loaderBar.style.width = `${Math.min(loadProgress, 100)}%`;
    if (loadProgress >= 100) {
      clearInterval(interval);
      setTimeout(() => loader.classList.add("hidden"), 600);
    }
  }, 120);
}
simulateLoad();

/* =========================================================
   RESIZE
========================================================= */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* =========================================================
   ANIMATION LOOP
========================================================= */
const pathPoint  = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
let smoothMouseX = 0;
let smoothMouseY = 0;

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();

  // Ocean
  animateOcean(time);

  // Camera path
  const t = Math.min(scrollProgress, 0.9999);
  cameraPath.getPoint(t, pathPoint);
  camera.position.lerp(pathPoint, 0.05);

  // Mouse parallax
  smoothMouseX += (targetMouseX - smoothMouseX) * 0.06;
  smoothMouseY += (targetMouseY - smoothMouseY) * 0.06;
  cameraPath.getPoint(Math.min(t + 0.01, 0.9999), lookTarget);
  camera.lookAt(
    lookTarget.x + smoothMouseX * 2.5,
    lookTarget.y + smoothMouseY * 1.5,
    lookTarget.z
  );

  // Environment
  updateEnvironment(scrollProgress);

  // Particles drift
  const pPos = particles.geometry.attributes.position;
  const speeds = particles.userData.speeds;
  for (let i = 0; i < speeds.length; i++) {
    pPos.array[i * 3 + 1] += speeds[i] * 0.5;
    if (pPos.array[i * 3 + 1] > 50) pPos.array[i * 3 + 1] = -50;
  }
  pPos.needsUpdate = true;

  // Bubbles
  bubbles.children.forEach(b => {
    b.position.y += b.userData.speed;
    b.position.x += Math.sin(time + b.userData.offset) * 0.008;
    if (b.position.y > 15) b.position.y = -30;
  });

  // Fish
  fishGroup.children.forEach(fish => {
    const s = fish.userData.speed;
    const o = fish.userData.offset;
    fish.position.x += Math.cos(time * s * 0.8 + o) * 0.025;
    fish.position.y += Math.sin(time * s * 0.4 + o) * 0.008;
    fish.rotation.y = Math.cos(time * s + o) * 0.3;
  });

  // Jellyfish
  jellyfishGroup.children.forEach(jelly => {
    const o = jelly.userData.offset;
    jelly.position.y += Math.sin(time * 0.4 + o) * 0.005;
    jelly.rotation.y += 0.003;
  });

  // Submarine
  submarine.position.y = 1 + Math.sin(time * 0.55) * 0.25;
  submarine.rotation.z = Math.sin(time * 0.35) * 0.04;
  submarine.userData.propeller.rotation.x = time * 8;

  // Light rays flicker
  rayGroup.children.forEach((ray, idx) => {
    ray.material.opacity = 0.025 + Math.sin(time * 1.2 + idx) * 0.012;
  });

  // Anglerfish lure pulse
  if (anglerFish.visible) {
    const lureLight = anglerFish.children.find(c => c.isPointLight);
    if (lureLight) lureLight.intensity = 6 + Math.sin(time * 3) * 3;
    anglerFish.position.x = -8 + Math.sin(time * 0.4) * 2;
    anglerFish.position.y = -4 + Math.sin(time * 0.6) * 0.6;
  }

  renderer.render(scene, camera);
}

animate();
