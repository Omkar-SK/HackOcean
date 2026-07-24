import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { initAudio } from './audio.js'

initAudio()

// Data for gallery cards using verified Unsplash high-res ocean & marine life images
const cards = [
  { id: 1, url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80', title: 'Deep Sea Scuba Expedition' },
  { id: 2, url: 'https://images.unsplash.com/photo-1544551763-8dd44758c2dd?auto=format&fit=crop&w=600&q=80', title: 'Bioluminescent Jellyfish' },
  { id: 3, url: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&w=600&q=80', title: 'Gentle Whale Shark' },
  { id: 4, url: 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?auto=format&fit=crop&w=600&q=80', title: 'Ocean Sea Turtle' },
  { id: 5, url: 'https://images.unsplash.com/photo-1682687982501-1e5898cb8f4b?auto=format&fit=crop&w=600&q=80', title: 'Coral Reef Ecosystem' },
  { id: 6, url: 'https://images.unsplash.com/photo-1582967177930-fc8f1e56306b?auto=format&fit=crop&w=600&q=80', title: 'Sunken Shipwreck' },
  { id: 7, url: 'https://images.unsplash.com/photo-1518467166778-b88f373ffec7?auto=format&fit=crop&w=600&q=80', title: 'Deep Sea Creature Glow' },
  { id: 8, url: 'https://images.unsplash.com/photo-1516681100942-77d8e7f9dd97?auto=format&fit=crop&w=600&q=80', title: 'Lush Kelp Forest' },
  { id: 9, url: 'https://images.unsplash.com/photo-1520690214124-2405c5217146?auto=format&fit=crop&w=600&q=80', title: 'Giant Pacific Octopus' },
  { id: 10, url: 'https://images.unsplash.com/photo-1493962853295-a4b574212959?auto=format&fit=crop&w=600&q=80', title: 'Majestic Manta Ray' },
  { id: 11, url: 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=600&q=80', title: 'Floating Jelly Swarm' },
  { id: 12, url: 'https://images.unsplash.com/photo-1518099688173-108745d0c75c?auto=format&fit=crop&w=600&q=80', title: 'Stingray Glide' },
  { id: 13, url: 'https://images.unsplash.com/photo-1534080530737-2cd3b5f9db24?auto=format&fit=crop&w=600&q=80', title: 'Abyssal Thermal Vent' },
  { id: 14, url: 'https://images.unsplash.com/photo-1506450650965-08e08d66938a?auto=format&fit=crop&w=600&q=80', title: 'Mariana Trench Depth' },
  { id: 15, url: 'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&w=600&q=80', title: 'Deep Submersible Probe' },
  { id: 16, url: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=600&q=80', title: 'Underwater Cave Exploration' },
  { id: 17, url: 'https://images.unsplash.com/photo-1517409278479-7973059eb777?auto=format&fit=crop&w=600&q=80', title: 'Deep Ocean Squid' },
  { id: 18, url: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&w=600&q=80', title: 'Abyssal Sea Floor' },
  { id: 19, url: 'https://images.unsplash.com/photo-1498623116890-37e912163d5d?auto=format&fit=crop&w=600&q=80', title: 'Ocean Sun Rays' },
  { id: 20, url: 'https://images.unsplash.com/photo-1682687982185-531d09ec56fc?auto=format&fit=crop&w=600&q=80', title: 'Deep Blue Horizon' }
]

// ─────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('gallery-canvas')
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000)
camera.position.set(0, 0, 15)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0x020c1b, 1)
scene.background = new THREE.Color(0x020c1b)
scene.fog = new THREE.FogExp2(0x020c1b, 0.015)

// Controls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.minDistance = 5
controls.maxDistance = 40
controls.autoRotate = false

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
scene.add(ambientLight)
const pointLight1 = new THREE.PointLight(0xffffff, 0.6)
pointLight1.position.set(10, 10, 10)
scene.add(pointLight1)
const pointLight2 = new THREE.PointLight(0xffffff, 0.3)
pointLight2.position.set(-10, -10, -10)
scene.add(pointLight2)

// ─────────────────────────────────────────────────────────────
// STARFIELD (Glowing Star/Dot Particles)
// ─────────────────────────────────────────────────────────────
function createStarTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.2, 'rgba(224, 247, 250, 0.95)')
  gradient.addColorStop(0.5, 'rgba(72, 202, 228, 0.6)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(32, 32, 32, 0, Math.PI * 2)
  ctx.fill()

  return new THREE.CanvasTexture(canvas)
}

const starsGeometry = new THREE.BufferGeometry()
const starsCount = 2000
const positions = new Float32Array(starsCount * 3)

for (let i = 0; i < starsCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 140
  positions[i * 3 + 1] = (Math.random() - 0.5) * 140
  positions[i * 3 + 2] = (Math.random() - 0.5) * 140
}

starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))

const starsMaterial = new THREE.PointsMaterial({ 
  color: 0xffffff, 
  size: 0.85, 
  map: createStarTexture(),
  sizeAttenuation: true, 
  transparent: true, 
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false
})
const stars = new THREE.Points(starsGeometry, starsMaterial)
scene.add(stars)

// ─────────────────────────────────────────────────────────────
// WIREFRAME SPHERES
// ─────────────────────────────────────────────────────────────
const sphereConfigs = [
  { radius: 2, color: 0x1a1a2e, opacity: 0.15 },
  { radius: 12, color: 0x31b8c6, opacity: 0.05 },
  { radius: 16, color: 0x31b8c6, opacity: 0.03 },
  { radius: 20, color: 0x31b8c6, opacity: 0.02 }
]

sphereConfigs.forEach(config => {
  const geo = new THREE.SphereGeometry(config.radius, 32, 32)
  const mat = new THREE.MeshStandardMaterial({ 
    color: config.color, 
    transparent: true, 
    opacity: config.opacity, 
    wireframe: true 
  })
  scene.add(new THREE.Mesh(geo, mat))
})

// ─────────────────────────────────────────────────────────────
// CARD GALAXY
// ─────────────────────────────────────────────────────────────
const textureLoader = new THREE.TextureLoader()
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const cardMeshes = []
const cardGroup = new THREE.Group()
scene.add(cardGroup)

// Geometry for cards (4.5 x 6 ratio)
const planeGeo = new THREE.PlaneGeometry(3, 4)

const numCards = cards.length
const goldenRatio = (1 + Math.sqrt(5)) / 2

for (let i = 0; i < numCards; i++) {
  const y = 1 - (i / (numCards - 1)) * 2
  const radiusAtY = Math.sqrt(1 - y * y)
  const theta = (2 * Math.PI * i) / goldenRatio
  const x = Math.cos(theta) * radiusAtY
  const z = Math.sin(theta) * radiusAtY
  const layerRadius = 12 + (i % 3) * 4

  const px = x * layerRadius
  const py = y * layerRadius
  const pz = z * layerRadius

  const mat = new THREE.MeshBasicMaterial({ 
    color: 0x333333,
    side: THREE.DoubleSide
  })

  // Load texture asynchronously
  textureLoader.load(cards[i].url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace
    mat.map = tex
    mat.color.set(0xffffff)
    mat.needsUpdate = true
  })

  const mesh = new THREE.Mesh(planeGeo, mat)
  
  // Position and look outward
  mesh.position.set(px, py, pz)
  mesh.lookAt(0, 0, 0)
  
  // Custom data for raycasting
  mesh.userData = {
    id: cards[i].id,
    title: cards[i].title,
    url: cards[i].url,
    originalScale: 1,
    targetScale: 1
  }

  cardGroup.add(mesh)
  cardMeshes.push(mesh)
}

// ─────────────────────────────────────────────────────────────
// INTERACTION & RAYCASTING
// ─────────────────────────────────────────────────────────────
let hoveredCard = null

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
})

window.addEventListener('click', () => {
  if (hoveredCard) {
    openCardModal(hoveredCard.userData)
  }
})

// ─────────────────────────────────────────────────────────────
// MODAL LOGIC
// ─────────────────────────────────────────────────────────────
const cardModalOverlay = document.getElementById('cardModalOverlay')
const cardModalClose = document.getElementById('cardModalClose')
const cardModalTilt = document.getElementById('cardModalTilt')
const modalImage = document.getElementById('modalImage')
const modalTitle = document.getElementById('modalTitle')
const heartBtn = document.getElementById('heartBtn')
const heartIcon = heartBtn?.querySelector('svg')
let isFavorited = false

function openCardModal(data) {
  modalImage.src = data.url
  modalTitle.textContent = data.title
  cardModalOverlay.classList.add('open')
  isFavorited = false
  updateHeartIcon()
}

function closeCardModal() {
  cardModalOverlay.classList.remove('open')
  // reset tilt
  if (cardModalTilt) {
    cardModalTilt.style.transform = `rotateX(0deg) rotateY(0deg)`
  }
}

if (cardModalClose) cardModalClose.addEventListener('click', closeCardModal)
if (cardModalOverlay) {
  cardModalOverlay.addEventListener('click', (e) => {
    if (e.target === cardModalOverlay) closeCardModal()
  })
}

// Tilt effect on mousemove over the modal tilt wrapper
if (cardModalTilt) {
  cardModalTilt.addEventListener('mousemove', (e) => {
    const rect = cardModalTilt.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = (y - centerY) / 15
    const rotateY = (centerX - x) / 15
    
    cardModalTilt.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
  })
  
  cardModalTilt.addEventListener('mouseleave', () => {
    cardModalTilt.style.transition = 'transform 0.5s ease-out'
    cardModalTilt.style.transform = `rotateX(0deg) rotateY(0deg)`
  })
  
  cardModalTilt.addEventListener('mouseenter', () => {
    cardModalTilt.style.transition = 'none'
  })
}

// Favorite toggle
if (heartBtn) {
  heartBtn.addEventListener('click', () => {
    isFavorited = !isFavorited
    updateHeartIcon()
  })
}

function updateHeartIcon() {
  if (!heartIcon) return
  if (isFavorited) {
    heartIcon.setAttribute('fill', 'currentColor')
  } else {
    heartIcon.setAttribute('fill', 'none')
  }
}

// ─────────────────────────────────────────────────────────────
// NAVBAR LOGIC (Reused from main page)
// ─────────────────────────────────────────────────────────────
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

const bookingOverlay = document.getElementById('modalOverlay')
const navBookBtn = document.getElementById('navBook')
const navBookMobileBtn = document.getElementById('navBookMobile')
const bookingCloseBtn = document.getElementById('modalClose')

function openBookingModal() { bookingOverlay.classList.add('open') }
function closeBookingModal() { bookingOverlay.classList.remove('open') }

if (navBookBtn) navBookBtn.addEventListener('click', openBookingModal)
if (navBookMobileBtn) navBookMobileBtn.addEventListener('click', openBookingModal)
if (bookingCloseBtn) bookingCloseBtn.addEventListener('click', closeBookingModal)
if (bookingOverlay) {
  bookingOverlay.addEventListener('click', (e) => {
    if (e.target === bookingOverlay) closeBookingModal()
  })
}

// ─────────────────────────────────────────────────────────────
// ANIMATION LOOP
// ─────────────────────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()

  // Rotate starfield slowly
  stars.rotation.y += 0.0001
  stars.rotation.x += 0.00005

  // Make cards always face camera
  cardMeshes.forEach(mesh => {
    mesh.lookAt(camera.position)
    
    // Smooth scaling
    mesh.scale.lerp(new THREE.Vector3(mesh.userData.targetScale, mesh.userData.targetScale, 1), 0.1)
  })

  // Raycasting for hover
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(cardMeshes)

  // Reset previously hovered card if needed
  if (intersects.length > 0) {
    const hit = intersects[0].object
    if (hoveredCard !== hit) {
      if (hoveredCard) hoveredCard.userData.targetScale = 1
      hoveredCard = hit
      hoveredCard.userData.targetScale = 1.15
      document.body.style.cursor = 'pointer'
    }
  } else {
    if (hoveredCard) {
      hoveredCard.userData.targetScale = 1
      hoveredCard = null
      document.body.style.cursor = 'auto'
    }
  }

  if (stars) {
    stars.rotation.y += 0.0004
    stars.rotation.x += 0.00015
  }

  controls.update()
  renderer.render(scene, camera)
}
animate()

// ─────────────────────────────────────────────────────────────
// RESIZE HANDLER
// ─────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
