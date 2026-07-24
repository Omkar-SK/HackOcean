document.addEventListener('DOMContentLoaded', () => {
  // ── MOUSE FOLLOW LIGHT ─────────────────────────
  const mouseLight = document.getElementById('mouseLight')
  if (mouseLight) {
    window.addEventListener('mousemove', (e) => {
      mouseLight.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
    })
  }

  // ── 3D CARD STACK INTERACTION ──────────────────
  const aboutCards = document.querySelectorAll('.about-card')
  
  aboutCards.forEach((card) => {
    // Card Click Sorting (Simple class swap logic)
    card.addEventListener('click', () => {
      // If clicking the front card, do nothing
      if (card.classList.contains('pos-1')) return
      
      // Find the card that is currently in front (pos-1)
      const frontCard = document.querySelector('.about-card.pos-1')
      
      // Figure out what position the clicked card currently has
      let clickedPosClass = ''
      card.classList.forEach(cls => {
        if (cls.startsWith('pos-')) clickedPosClass = cls
      })
      
      // Swap classes between front card and clicked card
      if (frontCard && clickedPosClass) {
        frontCard.classList.remove('pos-1')
        frontCard.classList.add(clickedPosClass)
        frontCard.style.transform = ''
        
        card.classList.remove(clickedPosClass)
        card.classList.add('pos-1')
        card.style.transform = ''
      }
    })

    // 3D Hover Tilt logic for front card
    card.addEventListener('mousemove', (e) => {
      if (!card.classList.contains('pos-1')) return
      
      const rect = card.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      
      // Map mouse position to rotation (max 12 degrees)
      const rotateX = ((y - centerY) / centerY) * -12
      const rotateY = ((x - centerX) / centerX) * 12
      
      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateX(0%) translateY(-2%) translateZ(30px)`
    })

    card.addEventListener('mouseleave', () => {
      if (!card.classList.contains('pos-1')) return
      // Reset transform on mouse leave
      card.style.transform = `rotateX(0deg) rotateY(0deg) translateX(0%) translateY(-2%) translateZ(30px)`
    })
  })
})
