export function initAudio() {
  const audio = new Audio('/water-ambient.mp3');
  audio.loop = true;
  audio.volume = 0.3;
  
  const isMusicOn = localStorage.getItem('abyss-music') === 'on';
  
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'sound-toggle-btn';
  toggleBtn.setAttribute('aria-label', 'Toggle Sound');
  
  const iconOn = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 3v18l-7-5H2V8h3l7-5zm5.7 1.5l1.4-1.4c3.4 3.4 3.4 9 0 12.4l-1.4-1.4c2.6-2.6 2.6-6.8 0-9.6zm-2.8 2.8l1.4-1.4c1.8 1.8 1.8 4.8 0 6.6l-1.4-1.4c1-1 1-2.6 0-3.8z"/></svg>`;
  const iconOff = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 3v18l-7-5H2V8h3l7-5z"/><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  
  toggleBtn.innerHTML = isMusicOn ? iconOn : iconOff;
  
  Object.assign(toggleBtn.style, {
    background: 'rgba(0, 180, 216, 0.1)',
    border: '1px solid rgba(0, 180, 216, 0.4)',
    color: 'var(--blue-bright)',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    marginRight: '1rem',
    transition: 'all 0.3s ease'
  });
  
  toggleBtn.addEventListener('mouseenter', () => {
    toggleBtn.style.background = 'rgba(0, 180, 216, 0.2)';
    toggleBtn.style.boxShadow = '0 0 10px rgba(0, 180, 216, 0.4)';
  });
  
  toggleBtn.addEventListener('mouseleave', () => {
    toggleBtn.style.background = 'rgba(0, 180, 216, 0.1)';
    toggleBtn.style.boxShadow = 'none';
  });

  const actionsContainer = document.querySelector('.mini-navbar-actions');
  if (actionsContainer) {
    actionsContainer.prepend(toggleBtn);
  }

  if (isMusicOn) {
    audio.play().catch(() => {
      const startOnInteraction = () => {
        audio.play();
        document.removeEventListener('click', startOnInteraction);
      };
      document.addEventListener('click', startOnInteraction);
    });
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audio.paused) {
      audio.play();
      localStorage.setItem('abyss-music', 'on');
      toggleBtn.innerHTML = iconOn;
    } else {
      audio.pause();
      localStorage.setItem('abyss-music', 'off');
      toggleBtn.innerHTML = iconOff;
    }
  });
  
  if (localStorage.getItem('abyss-music') === null) {
      const startOnInteraction = () => {
        audio.play().catch(e => console.log('Audio blocked', e));
        localStorage.setItem('abyss-music', 'on');
        toggleBtn.innerHTML = iconOn;
        document.removeEventListener('click', startOnInteraction);
      };
      document.addEventListener('click', startOnInteraction, { once: true });
  }
}
