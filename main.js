import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import Lenis from 'lenis'
import { gsap } from 'gsap'

// ─────────────────────────────────────────────────────────────
// SCENE SETUP
// ─────────────────────────────────────────────────────────────

const canvas = document.getElementById('ocean-canvas')
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
renderer.setClearColor(new THREE.Color('#006994'), 1)

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x006994, 0.018)

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 300)
camera.position.set(-5, 3, -2)

// Camera lookAt target
const cameraTarget = new THREE.Vector3(2, 0, -14)
camera.lookAt(cameraTarget)

// Mouse parallax & Cursor bubble trail effect
let mouseX = 0, mouseY = 0
let mouseTargetX = 0, mouseTargetY = 0
let lastBubbleTime = 0

function spawnMouseBubble(x, y) {
  const bubble = document.createElement('div')
  bubble.className = 'cursor-bubble'
  
  const size = Math.random() * 12 + 8 // 8px to 20px
  const driftX = (Math.random() - 0.5) * 35

  bubble.style.width = `${size}px`
  bubble.style.height = `${size}px`
  bubble.style.left = `${x}px`
  bubble.style.top = `${y}px`
  bubble.style.setProperty('--drift-x', `${driftX}px`)

  document.body.appendChild(bubble)

  setTimeout(() => {
    bubble.remove()
  }, 1100)
}

window.addEventListener('mousemove', (e) => {
  mouseTargetX = ((e.clientX / window.innerWidth) - 0.5) * 2
  mouseTargetY = -((e.clientY / window.innerHeight) - 0.5) * 2

  const now = performance.now()
  if (now - lastBubbleTime > 35) {
    lastBubbleTime = now
    spawnMouseBubble(e.clientX, e.clientY)
  }
})

// ─────────────────────────────────────────────────────────────
// LIGHTING — bright, beautiful, oceanic
// ─────────────────────────────────────────────────────────────

// Sun from above (filtered through water)
const sunLight = new THREE.DirectionalLight(0x90e0ef, 3.5)
sunLight.position.set(10, 40, 10)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(1024, 1024)
sunLight.shadow.camera.near = 0.5
sunLight.shadow.camera.far = 150
sunLight.shadow.camera.left = -60
sunLight.shadow.camera.right = 60
sunLight.shadow.camera.top = 60
sunLight.shadow.camera.bottom = -60
scene.add(sunLight)

// Ambient — overall underwater blue fill
const ambientLight = new THREE.AmbientLight(0x006994, 2.0)
scene.add(ambientLight)

// Hemisphere — sky/ground gradient
const hemiLight = new THREE.HemisphereLight(0x00b4d8, 0x004d73, 1.5)
scene.add(hemiLight)

// Blue fill from front
const fillLight = new THREE.PointLight(0x0096c7, 2.0, 80)
fillLight.position.set(0, 5, 5)
scene.add(fillLight)

// Accent lights scattered through scene
const accentLights = [
  { color: 0x00b4d8, pos: [-15, 2, -20], intensity: 1.5, dist: 40 },
  { color: 0x0077b6, pos: [20, -5, -40], intensity: 1.2, dist: 50 },
  { color: 0x023e8a, pos: [-10, -10, -60], intensity: 1.0, dist: 60 },
  { color: 0x0096c7, pos: [15, -3, -30], intensity: 1.3, dist: 45 },
  { color: 0x48cae4, pos: [0, 8, -15], intensity: 1.0, dist: 30 },
  { color: 0xff6040, pos: [8, -15, -18], intensity: 0.8, dist: 15 },  // coral glow
  { color: 0xff8020, pos: [-5, -15, -22], intensity: 0.6, dist: 12 }, // coral glow
]
accentLights.forEach(l => {
  const light = new THREE.PointLight(l.color, l.intensity, l.dist)
  light.position.set(...l.pos)
  scene.add(light)
})

// ─────────────────────────────────────────────────────────────
// WATER SURFACE (above camera — realistic moving water)
// ─────────────────────────────────────────────────────────────

const waterUniforms = {
  uTime: { value: 0 },
  uColor1: { value: new THREE.Color('#90e0ef') },
  uColor2: { value: new THREE.Color('#00b4d8') },
  uColor3: { value: new THREE.Color('#0077b6') },
  uSunDir: { value: new THREE.Vector3(0.5, 1, 0.3).normalize() },
}

const waterGeo = new THREE.PlaneGeometry(600, 600, 128, 128)
const waterMat = new THREE.ShaderMaterial({
  uniforms: waterUniforms,
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying float vHeight;

    float wave(vec2 p, float freq, float speed, float amp) {
      return sin(p.x * freq + uTime * speed) * cos(p.y * freq * 0.7 + uTime * speed * 0.8) * amp;
    }

    void main() {
      vUv = uv;
      vec3 pos = position;
      float w  = wave(pos.xz, 0.25, 0.6, 1.2);
           w += wave(pos.xz * 1.7, 0.4,  0.9, 0.5);
           w += wave(pos.xz * 0.6, 0.15, 0.4, 0.3);
      pos.y += w;
      vHeight = (w + 2.0) * 0.25;

      // Finite-difference normal
      float eps = 0.5;
      float wx = wave(vec2(pos.x+eps,pos.z), 0.25,0.6,1.2)
               + wave(vec2(pos.x+eps,pos.z)*1.7,0.4,0.9,0.5);
      float wz = wave(vec2(pos.x,pos.z+eps), 0.25,0.6,1.2)
               + wave(vec2(pos.x,pos.z+eps)*1.7,0.4,0.9,0.5);
      vNormal = normalize(vec3(pos.y - wx, 1.0, pos.y - wz));

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform vec3 uSunDir;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying float vHeight;

    void main() {
      vec3 col = mix(uColor3, uColor2, vHeight);
      col = mix(col, uColor1, pow(vHeight, 3.0));

      // specular highlight from sun
      vec3 N = normalize(vNormal);
      float spec = pow(max(dot(N, uSunDir), 0.0), 80.0);
      col += vec3(1.0) * spec * 0.5;

      // foam at crests
      float foam = smoothstep(0.75, 1.0, vHeight) * 0.4;
      col = mix(col, vec3(0.85, 0.95, 1.0), foam);

      gl_FragColor = vec4(col, 0.85);
    }
  `,
  transparent: true,
  side: THREE.FrontSide,
})
const waterMesh = new THREE.Mesh(waterGeo, waterMat)
waterMesh.rotation.x = -Math.PI / 2
waterMesh.position.y = 14
scene.add(waterMesh)

// ─────────────────────────────────────────────────────────────
// SEABED TERRAIN
// ─────────────────────────────────────────────────────────────

// Noise function for seabed terrain generation
function hash(n) { return (Math.sin(n) * 43758.5453123) % 1 }
function noise(x, z) {
  const pX = Math.floor(x), pZ = Math.floor(z)
  const fX = x - pX, fZ = z - pZ
  const fX2 = fX * fX * (3.0 - 2.0 * fX)
  const fZ2 = fZ * fZ * (3.0 - 2.0 * fZ)
  const n = pX + pZ * 57.0
  return (
    hash(n) * (1.0 - fX2) * (1.0 - fZ2) +
    hash(n + 1.0) * fX2 * (1.0 - fZ2) +
    hash(n + 57.0) * (1.0 - fX2) * fZ2 +
    hash(n + 58.0) * fX2 * fZ2
  )
}
function fbm(x, z) {
  let v = 0.0, a = 0.5, shift = 100.0
  for (let i = 0; i < 4; i++) {
    v += a * noise(x, z)
    x = x * 2.0 + shift
    z = z * 2.0 + shift
    a *= 0.5
  }
  return v
}

// Sand shader — procedural ripple texture baked in fragment shader
const seabedMat = new THREE.ShaderMaterial({
  uniforms: {
    uFogColor: { value: new THREE.Color(0x004d73) },
    uFogNear: { value: 5.0 },
    uFogFar: { value: 55.0 },
  },
  vertexShader: `
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform vec3 uFogColor;
    uniform float uFogNear;
    uniform float uFogFar;
    varying vec3 vWorldPos;
    varying vec3 vNormal;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float sn(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p);
      vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
    }

    void main() {
      vec2 uv = vWorldPos.xz * 0.12;
      // 4-octave sand ripple noise
      float n  = sn(uv * 1.0)  * 0.48;
             n += sn(uv * 3.0)  * 0.24;
             n += sn(uv * 7.0)  * 0.16;
             n += sn(uv * 15.0) * 0.08;
             n += sn(uv * 31.0) * 0.04;
             
      // High-frequency rough texture
      float rough = sn(uv * 100.0) * 0.15 + sn(uv * 300.0) * 0.05;
      
      // Ripple lines — simulate underwater sand waves
      float ripple = sin(vWorldPos.x * 0.6 + vWorldPos.z * 0.4) * 0.5 + 0.5;
      ripple = pow(ripple, 3.0) * 0.18;
      n = clamp(n + ripple, 0.0, 1.0);

      // Dark bluish sand colour palette
      vec3 sandA = vec3(0.12, 0.28, 0.45); // base dark blue
      vec3 sandB = vec3(0.05, 0.15, 0.30); // deeper shadow blue
      vec3 sandC = vec3(0.20, 0.40, 0.55); // blue highlight
      vec3 col = mix(sandB, sandA, n);
      col = mix(col, sandC, pow(n, 4.0) * 0.4);
      
      // Apply roughness to color
      col *= 1.0 - rough;

      // Perturb normal for roughness effect in lighting
      vec3 modifiedNormal = normalize(vNormal + vec3(sn(uv * 80.0) * 0.2, 0.0, sn(uv * 80.0 + 15.0) * 0.2));

      // Directional diffuse light from above
      float diff = max(dot(modifiedNormal, normalize(vec3(0.2, 1.0, 0.3))), 0.0);
      col *= 0.5 + diff * 0.6; // Keep it bright so sand color is visible

      // Distance fog fade - less aggressive so sand color isn't completely washed out
      float depth = gl_FragCoord.z / gl_FragCoord.w;
      float fogF = smoothstep(uFogNear, uFogFar * 1.5, depth);
      col = mix(col, uFogColor, fogF * 0.6); // Reduced max fog opacity on the seabed

      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.FrontSide,
})

const seabedGeo = new THREE.PlaneGeometry(600, 600, 96, 96)

// Build gentle sand dunes using abs() so bumps always go upward and are visible
const sbPos = seabedGeo.attributes.position
for (let i = 0; i < sbPos.count; i++) {
  const x = sbPos.getX(i)
  const y = sbPos.getY(i) // PlaneGeometry is on the XY plane
  const dune = fbm(x * 0.012, y * 0.012) * 2.0 // Gentler dunes
  const grain = fbm(x * 0.1, y * 0.1) * 0.5
  sbPos.setZ(i, Math.abs(dune) + grain) // Displace Z, which becomes World Y after rotation
}
seabedGeo.computeVertexNormals()

const seabed = new THREE.Mesh(seabedGeo, seabedMat)
seabed.rotation.x = -Math.PI / 2
seabed.position.y = -22  // Lowered so it sits well below the camera and right beneath the rocks
seabed.receiveShadow = true
scene.add(seabed)

// God rays removed to prevent white-outs and improve performance

// ─────────────────────────────────────────────────────────────
// PARTICLES — plankton, dust, micro bubbles
// ─────────────────────────────────────────────────────────────

const PARTICLE_COUNT = 1500

const pPositions = new Float32Array(PARTICLE_COUNT * 3)
const pVelocities = new Float32Array(PARTICLE_COUNT * 3)
const pSizes = new Float32Array(PARTICLE_COUNT)
const pOpacities = new Float32Array(PARTICLE_COUNT)
const pTypes = new Float32Array(PARTICLE_COUNT) // 0=dust, 1=plankton, 2=bubble

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const i3 = i * 3
  pPositions[i3] = (Math.random() - 0.5) * 150
  pPositions[i3 + 1] = (Math.random() - 0.5) * 60
  pPositions[i3 + 2] = -100 + Math.random() * 220  // spread across full depth

  pVelocities[i3] = (Math.random() - 0.5) * 0.003
  pVelocities[i3 + 1] = Math.random() * 0.004 + 0.001
  pVelocities[i3 + 2] = (Math.random() - 0.5) * 0.003

  const t = Math.random()
  pTypes[i] = t < 0.6 ? 0 : t < 0.85 ? 1 : 2
  pSizes[i] = pTypes[i] === 2 ? Math.random() * 3 + 1.5 : Math.random() * 2 + 0.5
  pOpacities[i] = Math.random() * 0.5 + 0.15
}

const pGeo = new THREE.BufferGeometry()
pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3))
pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1))
pGeo.setAttribute('aOpacity', new THREE.BufferAttribute(pOpacities, 1))
pGeo.setAttribute('aType', new THREE.BufferAttribute(pTypes, 1))

const pMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    attribute float aSize;
    attribute float aOpacity;
    attribute float aType;
    varying float vOpacity;
    varying float vType;
    uniform float uTime;
    void main() {
      vOpacity = aOpacity;
      vType = aType;
      vec3 pos = position;
      // gentle swirl
      pos.x += sin(uTime * 0.25 + position.z * 0.05) * 0.4;
      pos.z += cos(uTime * 0.18 + position.x * 0.05) * 0.4;
      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = aSize * (280.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    varying float vOpacity;
    varying float vType;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float alpha = (1.0 - d * 2.0) * vOpacity;
      vec3 col;
      if (vType < 0.5) {
        col = vec3(0.55, 0.85, 0.95); // dust — light blue
      } else if (vType < 1.5) {
        col = vec3(0.4, 1.0, 0.7);    // plankton — bioluminescent green
      } else {
        col = vec3(0.9, 0.97, 1.0);   // bubble — near white
      }
      gl_FragColor = vec4(col, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
})

const particles = new THREE.Points(pGeo, pMat)
scene.add(particles)

// ─────────────────────────────────────────────────────────────
// CORALS & SEAWEED (GLB loaded & cloned)
// ─────────────────────────────────────────────────────────────

const coralGroup = new THREE.Group()
scene.add(coralGroup)

// Note: loader is defined further down, but we will hoist it here or create a new instance
const staticLoader = new GLTFLoader()

const seaweedMeshes = []

// Seaweed (Procedural kept since no seaweed.glb was provided in the list)
const seaweedPositions = [
  [6, -20, -8], [-10, -20, 10], [16, -20, -16], [-7, -20, -22],
  [22, -20, 7], [-24, -20, -8], [3, -20, 17], [-16, -20, -30],
  [10, -20, -48], [-3, -20, -56], [18, -20, -65], [-8, -20, -75],
  [5, -20, -88], [-20, -20, -100], [12, -20, -112], [-14, -20, -125],
  [8, -20, -145], [-22, -20, -155], [16, -20, -168], [-6, -20, -180],
]

seaweedPositions.forEach(([sx, sy, sz]) => {
  const segCount = 5 + Math.floor(Math.random() * 4)
  const group = new THREE.Group()
  group.position.set(sx, sy, sz)
  for (let s = 0; s < segCount; s++) {
    const geo = new THREE.CylinderGeometry(0.06, 0.1, 0.9, 4, 1)
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.37 + Math.random() * 0.05, 0.7, 0.25),
      roughness: 0.9,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.y = s * 0.85
    mesh.castShadow = true
    group.add(mesh)
    seaweedMeshes.push({ mesh, offset: Math.random() * Math.PI * 2, segIndex: s })
  }
  scene.add(group)
})

// ─────────────────────────────────────────────────────────────
// ROCKS (GLB loaded & cloned)
// ─────────────────────────────────────────────────────────────

const rockGroup = new THREE.Group()
scene.add(rockGroup)

const rockPositions = [
  [14, -20, -10, 3.5, 2.5, 4], [-18, -20, 6, 5, 3.5, 5.5],
  [5, -20, -35, 7, 5, 6], [-9, -20, -45, 4.5, 3, 5],
  [28, -20, -55, 6, 4, 5.5], [-32, -20, -62, 8, 5.5, 7],
  [24, -20, -78, 3, 2, 3.5], [-4, -20, -85, 4.5, 3, 4.5],
  [9, -20, -108, 9, 6.5, 8], [-22, -20, -118, 5.5, 4, 6],
  [16, -20, -135, 6, 5, 7], [-10, -20, -148, 8, 6, 8],
  [20, -20, -170, 5, 4, 5.5], [-15, -20, -185, 7, 5, 6.5],
]

staticLoader.load('/models/rocks.glb', (gltf) => {
  const baseRock = gltf.scene
  rockPositions.forEach(([rx, ry, rz, sx, sy, sz]) => {
    const clone = baseRock.clone()
    clone.position.set(rx, ry, rz)
    clone.scale.set(sx, sy, sz)
    clone.rotation.set(0, Math.random() * Math.PI * 2, 0)
    clone.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } })
    rockGroup.add(clone)
  })
})

// ─────────────────────────────────────────────────────────────
// BUBBLE STREAMS (rising from seabed)
// ─────────────────────────────────────────────────────────────

const BUBBLE_COUNT = 200
const bubblePositions = new Float32Array(BUBBLE_COUNT * 3)
const bubbleSpeeds = new Float32Array(BUBBLE_COUNT)
const bubbleOffsets = new Float32Array(BUBBLE_COUNT)
const bubbleOrigins = new Float32Array(BUBBLE_COUNT * 3)

for (let i = 0; i < BUBBLE_COUNT; i++) {
  const i3 = i * 3
  const ox = (Math.random() - 0.5) * 60
  const oz = -Math.random() * 200  // spread bubbles across the full depth
  bubbleOrigins[i3] = ox
  bubbleOrigins[i3 + 1] = -19
  bubbleOrigins[i3 + 2] = oz
  bubblePositions[i3] = ox
  bubblePositions[i3 + 1] = -19 + Math.random() * 30
  bubblePositions[i3 + 2] = oz
  bubbleSpeeds[i] = 0.015 + Math.random() * 0.025
  bubbleOffsets[i] = Math.random() * Math.PI * 2
}

const bubbleGeo = new THREE.BufferGeometry()
bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePositions, 3))

const bubbleMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    uniform float uTime;
    void main() {
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = max(1.5, 4.0 * (60.0 / -mvPos.z));
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float alpha = (0.5 - d) * 0.7;
      gl_FragColor = vec4(0.8, 0.95, 1.0, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
})

const bubbles = new THREE.Points(bubbleGeo, bubbleMat)
scene.add(bubbles)

// ─────────────────────────────────────────────────────────────
// GLB MODEL LOADER (auto-loads from /public/models/)
// ─────────────────────────────────────────────────────────────

const loader = new GLTFLoader()
const allMixers = []

function tryLoadModel(name, onLoaded) {
  loader.load(
    `/models/${name}`,
    (gltf) => {
      const model = gltf.scene
      model.traverse(node => {
        if (node.isMesh) {
          node.castShadow = true
          node.receiveShadow = true
          if (node.material) {
            const m = node.material
            m.envMapIntensity = 0.5
          }
        }
      })
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(model)
        const action = mixer.clipAction(gltf.animations[0])
        action.time = Math.random() * gltf.animations[0].duration
        action.play()
        allMixers.push(mixer)
      }
      scene.add(model)
      onLoaded(model)
    },
    undefined,
    () => { /* silently skip if model not found */ }
  )
}

// Model configurations — ONLY files confirmed in /public/models/:
// submarine.glb, dolphin.glb, rocks.glb, fish.glb
const modelConfigs = [
  // ── Submarine 1 ────────────────────────────────────────
  {
    file: 'submarine.glb',
    pos: [40, -5, -30],
    rot: [0, -Math.PI * 0.6, 0],
    scale: [0.9, 0.9, 0.9],
    animate: (m, t) => {
      m.position.y = -5 + Math.sin(t * 0.4) * 0.25
      m.rotation.z = Math.sin(t * 0.3) * 0.02
    },
  },
  // ── Large Submarine 2 ───────────────────────────────────
  {
    file: 'submarine2.glb',
    pos: [50, -6, -95],
    rot: [0, -Math.PI * 0.75, 0],
    scale: [4, 4, 4],
    animate: (m, t) => {
      m.position.y = -12 + Math.sin(t * 0.35 + 1.0) * 0.4
      m.rotation.z = Math.sin(t * 0.25) * 0.03
    },
  },
  // ── Dolphin (directly in camera path) ─────────────────
  {
    file: 'dolphin.glb',
    pos: [-14, -6, -96],
    rot: [0, 0.8, 0],
    scale: [1.2, 1.2, 1.2],
    animate: (m, t) => {
      m.position.x = -14 + Math.sin(t * 0.45) * 3
      m.position.y = -6 + Math.sin(t * 0.65) * 1.5
      m.rotation.y = 0.8 + Math.sin(t * 0.45) * 0.4
    },
  },
  // ── Sunken Plane Wreck on the Seabed ─────────────────
  {
    file: 'plane.glb',
    pos: [28, -17.5, -140],
    rot: [0.15, -0.6, -0.1],
    scale: [0.35, 0.35, 0.35],
    animate: null,
  },
  // ── Rocks on the seabed (scattered along the journey) ─────
  { file: 'rocks.glb', pos: [-8, -18, -15], rot: [0, 0.4, 0], scale: [2, 2, 2], animate: null },
  { file: 'rocks.glb', pos: [12, -18, -28], rot: [0, 1.8, 0], scale: [3, 3, 3], animate: null },
  { file: 'rocks.glb', pos: [-20, -18, -45], rot: [0, 0.9, 0], scale: [2.5, 2.5, 2.5], animate: null },
  { file: 'rocks.glb', pos: [18, -18, -60], rot: [0, 2.3, 0], scale: [1.8, 1.8, 1.8], animate: null },
  { file: 'rocks.glb', pos: [-5, -18, -75], rot: [0, 1.1, 0], scale: [3.2, 3.2, 3.2], animate: null },
  { file: 'rocks.glb', pos: [22, -18, -95], rot: [0, 0.3, 0], scale: [2, 2, 2], animate: null },
  { file: 'rocks.glb', pos: [-15, -18, -110], rot: [0, 1.7, 0], scale: [2.8, 2.8, 2.8], animate: null },
  { file: 'rocks.glb', pos: [8, -18, -130], rot: [0, 2.1, 0], scale: [2.2, 2.2, 2.2], animate: null },

  // ── Underwater Plants (dynamically populated below) ───────

  // ── Jellyfish Cluster on Seabed Ground at the End ("Ready to Descend?") ─────
  {
    file: 'jellyfish.glb',
    pos: [-8, -15, -204],
    rot: [0.1, 0.5, -0.08],
    scale: [0.009, 0.009, 0.009],
    animate: (m, t) => {
      m.position.y = -15 + Math.sin(t * 0.45) * 0.4
      m.rotation.z = -0.08 + Math.sin(t * 0.3) * 0.03
    },
  },
  {
    file: 'jellyfish.glb',
    pos: [10, -14, -209],
    rot: [-0.12, 1.8, 0.1],
    scale: [0.011, 0.011, 0.011],
    animate: (m, t) => {
      m.position.y = -14 + Math.sin(t * 0.38 + 1.5) * 0.5
      m.rotation.x = -0.12 + Math.cos(t * 0.35 + 1.0) * 0.04
    },
  },
  {
    file: 'jellyfish.glb',
    pos: [-14, -16, -214],
    rot: [0.15, 3.2, -0.15],
    scale: [0.008, 0.008, 0.008],
    animate: (m, t) => {
      m.position.y = -16 + Math.sin(t * 0.52 + 2.8) * 0.35
      m.rotation.z = -0.15 + Math.sin(t * 0.4 + 2.0) * 0.04
    },
  },
  {
    file: 'jellyfish.glb',
    pos: [4, -13, -217],
    rot: [-0.08, 4.5, 0.05],
    scale: [0.012, 0.012, 0.012],
    animate: (m, t) => {
      m.position.y = -13 + Math.sin(t * 0.4 + 4.1) * 0.45
      m.rotation.z = 0.05 + Math.cos(t * 0.32 + 3.5) * 0.03
    },
  },
  {
    file: 'jellyfish.glb',
    pos: [-2, -17, -220],
    rot: [0.18, 0.9, 0.12],
    scale: [0.0095, 0.0095, 0.0095],
    animate: (m, t) => {
      m.position.y = -17 + Math.sin(t * 0.48 + 0.7) * 0.4
      m.rotation.x = 0.18 + Math.sin(t * 0.35 + 0.5) * 0.03
    },
  },
  {
    file: 'jellyfish.glb',
    pos: [14, -15, -223],
    rot: [-0.15, 2.4, -0.1],
    scale: [0.0105, 0.0105, 0.0105],
    animate: (m, t) => {
      m.position.y = -15 + Math.sin(t * 0.42 + 5.0) * 0.5
      m.rotation.z = -0.1 + Math.sin(t * 0.38 + 4.2) * 0.04
    },
  },
  // ── Upper Jellyfish Cluster (lowered height) ─────
  {
    file: 'jellyfish.glb',
    pos: [-12, -8, -200],
    rot: [0.1, 1.2, 0],
    scale: [0.012, 0.012, 0.012],
    animate: (m, t) => {
      m.position.y = -8 + Math.sin(t * 0.7) * 1.5
      m.rotation.z = Math.sin(t * 0.4) * 0.06
    },
  },
  {
    file: 'jellyfish.glb',
    pos: [12, -5, -208],
    rot: [-0.1, 2.1, 0.05],
    scale: [0.014, 0.014, 0.014],
    animate: (m, t) => {
      m.position.y = -5 + Math.sin(t * 0.65 + 1.2) * 1.8
      m.rotation.x = Math.cos(t * 0.35) * 0.05
    },
  },
  {
    file: 'jellyfish.glb',
    pos: [-4, -10, -212],
    rot: [0.05, 0.4, -0.1],
    scale: [0.01, 0.01, 0.01],
    animate: (m, t) => {
      m.position.y = -10 + Math.sin(t * 0.8 + 2.4) * 1.4
      m.rotation.z = -0.1 + Math.sin(t * 0.5 + 1.0) * 0.05
    },
  },
  {
    file: 'jellyfish.glb',
    pos: [6, -6, -218],
    rot: [-0.08, 3.8, 0.08],
    scale: [0.013, 0.013, 0.013],
    animate: (m, t) => {
      m.position.y = -6 + Math.sin(t * 0.75 + 3.8) * 1.6
      m.rotation.x = Math.sin(t * 0.4 + 2.0) * 0.06
    },
  },
  {
    file: 'jellyfish.glb',
    pos: [-8, -4, -224],
    rot: [0.12, 4.2, -0.05],
    scale: [0.0115, 0.0115, 0.0115],
    animate: (m, t) => {
      m.position.y = -4 + Math.sin(t * 0.6 + 4.5) * 1.8
      m.rotation.z = Math.cos(t * 0.45 + 3.0) * 0.05
    },
  },
]

// Dynamically add plants near every rock (plant02.glb & plant03.glb)
const rocks = modelConfigs.filter(cfg => cfg.file === 'rocks.glb')
rocks.forEach((rock, idx) => {

  // Multiple plant02.glb around EVERY rock (large & upside down)
  const plant02Offsets = [
    [-3.5, 0, -1.5, 1.8],
    [3.2, 0, -3.0, 2.2],
    [-2.8, 0, 3.5, 2.0],
  ]

  plant02Offsets.forEach(([ox, oy, oz, sc]) => {
    modelConfigs.push({
      file: 'plant02.glb',
      pos: [rock.pos[0] + ox, rock.pos[1] + oy, rock.pos[2] + oz],
      rot: [Math.PI, Math.random() * Math.PI * 2, Math.PI],
      scale: [rock.scale[0] * sc, rock.scale[1] * sc, rock.scale[2] * sc],
      animate: null
    })
  })

  // Multiple plant03.glb around EVERY rock (balanced smaller size)
  const plant03Offsets = [
    [4.5, 0, 1.8, 0.35],
    [-4.0, 0, -4.2, 0.4],
    [1.8, 0, -3.5, 0.3],
  ]

  plant03Offsets.forEach(([ox, oy, oz, sc]) => {
    modelConfigs.push({
      file: 'plant03.glb',
      pos: [rock.pos[0] + ox, rock.pos[1] + oy, rock.pos[2] + oz],
      rot: [Math.PI, Math.random() * Math.PI * 2, Math.PI],
      scale: [rock.scale[0] * sc, rock.scale[1] * sc, rock.scale[2] * sc],
      animate: null
    })
  })

  // Dense plant02.glb & plant03.glb thickets near later rocks (Z < -50)
  if (rock.pos[2] < -50) {
    const extraOffsets = [
      ['plant02.glb', 1.5, 0, -5.5, 2.6],
      ['plant03.glb', -5.2, 0, 2.0, 0.38],
      ['plant02.glb', 5.0, 0, -1.2, 2.2],
      ['plant03.glb', -1.8, 0, -6.0, 0.42],
    ]
    extraOffsets.forEach(([file, ox, oy, oz, sc]) => {
      modelConfigs.push({
        file,
        pos: [rock.pos[0] + ox, rock.pos[1] + oy, rock.pos[2] + oz],
        rot: [Math.PI, Math.random() * Math.PI * 2, Math.PI],
        scale: [rock.scale[0] * sc, rock.scale[1] * sc, rock.scale[2] * sc],
        animate: null
      })
    })
  }
})



const modelAnimators = []

modelConfigs.forEach(cfg => {
  tryLoadModel(cfg.file, (model) => {
    model.position.set(...cfg.pos)
    model.rotation.set(...cfg.rot)
    model.scale.set(...cfg.scale)
    if (cfg.animate) {
      modelAnimators.push({ model, fn: cfg.animate })
    }
  })
})

// ─────────────────────────────────────────────────────────────
// SCHOOL OF FISH (instanced GLB model)
// ─────────────────────────────────────────────────────────────

const FISH_COUNT = 150
let fishMesh = null

const fishData = Array.from({ length: FISH_COUNT }, () => ({
  angle: Math.PI * 2,
  radius: 2 + Math.random() * 5,
  yOffset: (Math.random() - 0.5) * 3,
  speed: 0.3 + Math.random() * 0.4,
  phase: Math.random() * Math.PI * 2,
  zPhase: Math.random() * Math.PI * 2,
}))

// Fish school center updated to match new waypoints
const fishCenter = new THREE.Vector3(-6, -10, -80)
const fishDummy = new THREE.Object3D()

// Load fish model asynchronously — uses fish.glb which exists in /public/models/
staticLoader.load('/models/fish.glb', (gltf) => {
  let fishGeo = null
  let fishMat = null

  gltf.scene.traverse(node => {
    if (node.isMesh && !fishGeo) {
      fishGeo = node.geometry.clone()
      fishGeo.scale(0.0625, 0.0625, 0.0625)
      fishGeo.rotateY(Math.PI)
      fishGeo.rotateX(Math.PI / 2)
      fishMat = node.material
    }
  })

  if (!fishGeo) {
    // Fallback to cone if GLB doesn't have a mesh for some reason
    fishGeo = new THREE.ConeGeometry(0.08, 0.35, 4)
    fishGeo.rotateX(Math.PI / 2)
    fishMat = new THREE.MeshStandardMaterial({ color: 0x90e0ef, metalness: 0.5, roughness: 0.3 })
  }

  fishMesh = new THREE.InstancedMesh(fishGeo, fishMat, FISH_COUNT)
  fishMesh.castShadow = false
  scene.add(fishMesh)
})

function updateFishSchool(time) {
  if (!fishMesh) return // wait until loaded

  for (let i = 0; i < FISH_COUNT; i++) {
    const f = fishData[i]
    f.angle += f.speed * 0.01
    const x = fishCenter.x + Math.cos(f.angle + f.phase) * f.radius
    const z = fishCenter.z + Math.sin(f.angle + f.zPhase) * f.radius
    const y = fishCenter.y + f.yOffset + Math.sin(time * 1.5 + f.phase) * 0.4

    fishDummy.position.set(x, y, z)
    // facing tangent direction
    const nextX = fishCenter.x + Math.cos(f.angle + f.phase + 0.1) * f.radius
    const nextZ = fishCenter.z + Math.sin(f.angle + f.zPhase + 0.1) * f.radius
    fishDummy.lookAt(nextX, y, nextZ)

    fishDummy.updateMatrix()
    fishMesh.setMatrixAt(i, fishDummy.matrix)
  }
  fishMesh.instanceMatrix.needsUpdate = true
}

// ─────────────────────────────────────────────────────────────
// CINEMATIC WAYPOINTS & SCROLL CAMERA DRIVE
// ─────────────────────────────────────────────────────────────

// ─── SCENE OBJECT POSITIONS (match camera lookAt targets) ──────────
// Submarine: placed at [18, -5, -30] — camera passes on the left side looking right
// Fish school: center at [-6, -10, -60]
// Dolphin: placed at [-18, -6, -90] — camera on the right side
// Whale: placed at [25, -8, -135]
// Shipwreck: placed at [-16, -18, -165]

const waypoints = [
  // 0: Hero — starting upper position
  { progress: 0.00, cam: [-5, 3, -2], target: [2, 0, -14], depth: 100, section: '01 — Submersibles', panel: 'panel-hero' },
  // 1: Immediate descent towards submersible depth
  { progress: 0.08, cam: [-12, -1, -15], target: [8, -3, -25], depth: 300, section: '01 — Submersibles', panel: 'panel-hero' },
  // 2: Submarine — camera is far LEFT, looking RIGHT at sub on the right side
  { progress: 0.18, cam: [-20, -4, -25], target: [18, -5, -30], depth: 480, section: '01 — Submersibles', panel: 'panel-submarine' },
  // 3: Slowly orbit past submarine, camera crosses behind
  { progress: 0.24, cam: [-8, -7, -42], target: [12, -5, -30], depth: 700, section: '01 — Submersibles', panel: 'panel-submarine' },
  // 4: Coral Reef floor — camera skims low over the reef
  { progress: 0.32, cam: [-5, -14, -58], target: [4, -16, -65], depth: 1000, section: '02 — Coral Forests', panel: 'panel-coral' },
  // 5: Fish school — camera on the right looking at school to the left
  { progress: 0.40, cam: [14, -9, -70], target: [-6, -10, -80], depth: 1350, section: '03 — Marine Life', panel: 'panel-fish' },
  // 6: Pass through fish school — camera in centre briefly
  { progress: 0.46, cam: [2, -10, -82], target: [-8, -9, -92], depth: 1600, section: '03 — Marine Life', panel: 'panel-fish' },
  // 7: Dolphin — camera is very close, right next to dolphin
  { progress: 0.54, cam: [-10, -5, -96], target: [-18, -6, -100], depth: 1900, section: '04 — Cetaceans', panel: 'panel-dolphin' },
  // 8: Whale — camera below-left, looking up-right at whale silhouette above
  { progress: 0.63, cam: [-8, -14, -122], target: [25, -6, -135], depth: 2400, section: '05 — Blue Whale', panel: 'panel-whale' },
  // 9: Pass the whale, diving deeper
  { progress: 0.70, cam: [5, -16, -142], target: [0, -15, -155], depth: 2800, section: '05 — Blue Whale', panel: 'panel-whale' },
  // 10: Shipwreck — camera on the right looking at wreck on the left
  { progress: 0.78, cam: [18, -17, -158], target: [-16, -18, -165], depth: 3100, section: '06 — Ghost Fleet', panel: 'panel-wreck' },
  // 11: Abyss — deep dark, floating in the void
  { progress: 0.88, cam: [0, -17, -182], target: [0, -18, -195], depth: 3600, section: '07 — The Abyss', panel: 'panel-abyss' },
  // 12: CTA — near total darkness
  { progress: 1.00, cam: [0, -15, -205], target: [0, -16, -215], depth: 3800, section: 'Expedition', panel: 'panel-cta' },
]

function interpolateWaypoints(progress) {
  const p = Math.max(0, Math.min(1, progress))
  for (let i = 0; i < waypoints.length - 1; i++) {
    const w1 = waypoints[i]
    const w2 = waypoints[i + 1]
    if (p >= w1.progress && p <= w2.progress) {
      const factor = (p - w1.progress) / (w2.progress - w1.progress)
      const smoothFactor = gsap.parseEase('power2.inOut')(factor)

      const camX = THREE.MathUtils.lerp(w1.cam[0], w2.cam[0], smoothFactor)
      const camY = THREE.MathUtils.lerp(w1.cam[1], w2.cam[1], smoothFactor)
      const camZ = THREE.MathUtils.lerp(w1.cam[2], w2.cam[2], smoothFactor)

      const tarX = THREE.MathUtils.lerp(w1.target[0], w2.target[0], smoothFactor)
      const tarY = THREE.MathUtils.lerp(w1.target[1], w2.target[1], smoothFactor)
      const tarZ = THREE.MathUtils.lerp(w1.target[2], w2.target[2], smoothFactor)

      const depth = Math.round(THREE.MathUtils.lerp(w1.depth, w2.depth, factor))

      return { camPos: [camX, camY, camZ], targetPos: [tarX, tarY, tarZ], depth, activeWaypointIndex: factor > 0.5 ? i + 1 : i }
    }
  }
  const last = waypoints[waypoints.length - 1]
  return { camPos: last.cam, targetPos: last.target, depth: last.depth, activeWaypointIndex: waypoints.length - 1 }
}

// ─────────────────────────────────────────────────────────────
// SMOOTH SCROLL ENGINE (Lenis)
// ─────────────────────────────────────────────────────────────

const lenis = new Lenis({
  duration: 1.4,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
})

let scrollProgress = 0
const targetCamPos = new THREE.Vector3(0, 10, 20)
const currentCamPos = new THREE.Vector3(0, 10, 20)
const targetLookAt = new THREE.Vector3(0, 8, 0)
const currentLookAt = new THREE.Vector3(0, 8, 0)

// DOM Elements
const depthValueEl = document.getElementById('depthValue')
const depthFillEl = document.getElementById('depthFill')
const navSectionNameEl = document.getElementById('navSectionName')
const allPanels = document.querySelectorAll('.ui-panel')

lenis.on('scroll', (e) => {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  scrollProgress = maxScroll > 0 ? e.scroll / maxScroll : 0
})

function updateScrollState() {
  const state = interpolateWaypoints(scrollProgress)

  targetCamPos.set(...state.camPos)
  targetLookAt.set(...state.targetPos)

  // Smooth lerp camera towards target position
  currentCamPos.lerp(targetCamPos, 0.06)
  currentLookAt.lerp(targetLookAt, 0.06)

  // Smooth mouse parallax
  mouseX = THREE.MathUtils.lerp(mouseX, mouseTargetX, 0.05)
  mouseY = THREE.MathUtils.lerp(mouseY, mouseTargetY, 0.05)

  // Apply mouse parallax as an offset perpendicular to the look direction
  // so it feels like the camera is peeking left/right/up/down without leaving the path
  const lookDir = new THREE.Vector3().subVectors(currentLookAt, currentCamPos).normalize()
  const right = new THREE.Vector3().crossVectors(lookDir, new THREE.Vector3(0, 1, 0)).normalize()
  const up = new THREE.Vector3().crossVectors(right, lookDir).normalize()

  const finalCamPos = currentCamPos.clone()
    .addScaledVector(right, mouseX * 2.5)
    .addScaledVector(up, mouseY * 1.5)

  camera.position.copy(finalCamPos)
  camera.lookAt(currentLookAt)

  // Update HUD
  depthValueEl.textContent = `${state.depth}m`
  depthFillEl.style.height = `${scrollProgress * 100}%`

  // Update Nav Section Name & Panel Visibility
  const currentWp = waypoints[state.activeWaypointIndex]
  if (navSectionNameEl) {
    navSectionNameEl.textContent = currentWp.section
  }

  allPanels.forEach(panel => {
    if (panel.id === currentWp.panel) {
      panel.classList.add('visible')
    } else {
      panel.classList.remove('visible')
    }
  })

  // Fog & background color darkening with depth
  const fogDensity = 0.016 + scrollProgress * 0.018
  scene.fog.density = fogDensity

  const bgTop = new THREE.Color('#006994').lerp(new THREE.Color('#000d1a'), scrollProgress)
  renderer.setClearColor(bgTop, 1)
  scene.fog.color.copy(bgTop)
}

// ─────────────────────────────────────────────────────────────
// MODAL & INTERACTION HANDLERS
// ─────────────────────────────────────────────────────────────

const modalOverlay = document.getElementById('modalOverlay')
const navBookBtn = document.getElementById('navBook')
const navBookMobileBtn = document.getElementById('navBookMobile')
const ctaBookBtn = document.getElementById('ctaBook')
const modalCloseBtn = document.getElementById('modalClose')
const bookingForm = document.getElementById('bookingForm')

function openModal() { modalOverlay.classList.add('open') }
function closeModal() { modalOverlay.classList.remove('open') }

if (navBookBtn) navBookBtn.addEventListener('click', openModal)
if (navBookMobileBtn) navBookMobileBtn.addEventListener('click', openModal)
if (ctaBookBtn) ctaBookBtn.addEventListener('click', openModal)
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal)

// Mobile Menu Toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle')
const mainNav = document.getElementById('mainNav')
const menuIconOpen = document.getElementById('menuIconOpen')
const menuIconClose = document.getElementById('menuIconClose')

if (mobileMenuToggle) {
  mobileMenuToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open')
    if (isOpen) {
      menuIconOpen.classList.add('hidden')
      menuIconClose.classList.remove('hidden')
    } else {
      menuIconOpen.classList.remove('hidden')
      menuIconClose.classList.add('hidden')
    }
  })
}

if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal()
  })
}

if (bookingForm) {
  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault()
    alert('Thank you for your interest! An ABYSS expedition specialist will contact you within 48 hours.')
    closeModal()
    bookingForm.reset()
  })
}

// ─────────────────────────────────────────────────────────────
// ANIMATION LOOP & RESIZE
// ─────────────────────────────────────────────────────────────

const clock = new THREE.Clock()

function animate(time) {
  requestAnimationFrame(animate)

  lenis.raf(time)

  const elapsedTime = clock.getElapsedTime()

  // Update shaders
  waterUniforms.uTime.value = elapsedTime
  pMat.uniforms.uTime.value = elapsedTime

  // Sway seaweed
  seaweedMeshes.forEach(s => {
    s.mesh.rotation.z = Math.sin(elapsedTime * 1.5 + s.offset + s.segIndex * 0.2) * 0.12
  })

  // Animate model mesh helpers
  modelAnimators.forEach(item => item.fn(item.model, elapsedTime))

  // Update loaded GLTF mixers for all models (all 6 jellyfish, dolphins, submarine, etc.)
  allMixers.forEach(mixer => mixer.update(0.016))

  // Update procedural bubble stream rise
  const posAttr = bubbleGeo.attributes.position
  for (let i = 0; i < BUBBLE_COUNT; i++) {
    const i3 = i * 3
    let y = posAttr.getY(i)
    y += bubbleSpeeds[i]
    if (y > 14) y = -19
    posAttr.setY(i, y)
    posAttr.setX(i, bubbleOrigins[i3] + Math.sin(elapsedTime * 2.0 + bubbleOffsets[i]) * 0.3)
  }
  posAttr.needsUpdate = true

  // Update instanced fish school
  updateFishSchool(elapsedTime)

  // Camera & HUD sync
  updateScrollState()

  // Render scene
  renderer.render(scene, camera)
}

// Window resize listener
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Start loop
requestAnimationFrame(animate)
