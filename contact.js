import { initAudio } from './audio.js'
initAudio()

// ─────────────────────────────────────────────────────────────
// ENTRANCE ANIMATIONS
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Give a tiny delay so the browser can paint the initial state before animating
  setTimeout(() => {
    const fadeElements = document.querySelectorAll('.fade-up')
    fadeElements.forEach(el => {
      el.classList.add('loaded')
    })
  }, 100)
})

// ─────────────────────────────────────────────────────────────
// MOUSE FOLLOWER LIGHT
// ─────────────────────────────────────────────────────────────
const mouseLight = document.getElementById('mouseLight')

// Start mouse in center
let mouseX = window.innerWidth / 2
let mouseY = window.innerHeight / 2

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX
  mouseY = e.clientY
  
  if (mouseLight) {
    // The CSS defines top: -12rem and left: -12rem (which is -192px),
    // so we just add the clientX and clientY to center the 384x384px light orb.
    // However, translating it via CSS transforms is more performant than left/top.
    mouseLight.style.transform = `translate(${mouseX}px, ${mouseY}px)`
  }
})

// ─────────────────────────────────────────────────────────────
// NAVBAR LOGIC (Reused)
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

// ─────────────────────────────────────────────────────────────
// BOOKING MODAL LOGIC (Reused)
// ─────────────────────────────────────────────────────────────
const bookingOverlay = document.getElementById('modalOverlay')
const navBookBtn = document.getElementById('navBook')
const navBookMobileBtn = document.getElementById('navBookMobile')
const bookingCloseBtn = document.getElementById('modalClose')
const bookingForm = document.getElementById('bookingForm')

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

if (bookingForm) {
  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault()
    alert('Thank you for your interest! An ABYSS expedition specialist will contact you within 48 hours.')
    closeBookingModal()
    bookingForm.reset()
  })
}
