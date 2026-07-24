document.addEventListener('DOMContentLoaded', () => {
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
      
      // Swap classes
      if (frontCard && clickedPosClass) {
        frontCard.classList.remove('pos-1')
        frontCard.classList.add(clickedPosClass)
        // Reset transform style from mousemove if any
        frontCard.style.transform = ''
        
        card.classList.remove(clickedPosClass)
        card.classList.add('pos-1')
        card.style.transform = ''
      }
    })

    // 3D Hover Tilt logic
    card.addEventListener('mousemove', (e) => {
      if (!card.classList.contains('pos-1')) return // Only tilt the front card
      
      const rect = card.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      
      // Map mouse position to rotation (max 10 degrees)
      const rotateX = ((y - centerY) / centerY) * -10
      const rotateY = ((x - centerX) / centerX) * 10
      
      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateX(0%) translateY(-5%) translateZ(20px)`
    })

    card.addEventListener('mouseleave', () => {
      if (!card.classList.contains('pos-1')) return
      // Reset transform when mouse leaves
      card.style.transform = `rotateX(0deg) rotateY(0deg) translateX(0%) translateY(-5%) translateZ(20px)`
    })
  })
})
