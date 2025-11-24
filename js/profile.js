document.addEventListener('DOMContentLoaded', () => {
  // defensive DOM lookups - if any are missing, fail gracefully and log
  const aliasInput = document.getElementById('alias');
  const colorInput = document.getElementById('theme-color');
  const saveBtn = document.getElementById('save-btn');
  const clearBtn = document.getElementById('clear-btn');
  const openrouterInput = document.getElementById('openrouter-key');
  const achList = document.getElementById('ach-list');

  if (!aliasInput || !colorInput || !saveBtn || !clearBtn || !achList) {
    console.warn('Profile: missing expected DOM elements. Script will not run completely.');
    return;
  }

  function renderAchievements() {
    const raw = localStorage.getItem('achievements');
    let arr = [];
    try { arr = raw ? JSON.parse(raw) : []; } catch (e) { arr = []; }
    achList.innerHTML = '';
    if (!arr.length) {
      const p = document.createElement('div');
      p.textContent = 'No achievements yet. Start using the app to unlock achievements!';
      p.style.opacity = '0.7';
      p.style.fontStyle = 'italic';
      p.style.textAlign = 'center';
      p.style.padding = '2rem';
      achList.appendChild(p);
      return;
    }
    
    // Sort achievements by date (newest first)
    arr.sort((a, b) => b.date - a.date);
    
    arr.forEach((a, index) => {
      const d = document.createElement('div');
      d.className = 'ai-box achievement-item';
      d.style.background = 'rgba(255, 255, 255, 0.05)';
      d.style.border = '1px solid rgba(255, 255, 255, 0.1)';
      d.style.borderRadius = '8px';
      d.style.marginBottom = '0.8rem';
      d.style.position = 'relative';
      d.style.overflow = 'hidden';
      
      // Add achievement number badge
      const badge = document.createElement('div');
      badge.textContent = `#${index + 1}`;
      badge.style.position = 'absolute';
      badge.style.top = '0.5rem';
      badge.style.right = '0.5rem';
      badge.style.background = 'var(--accent)';
      badge.style.color = '#fff';
      badge.style.fontSize = '0.7rem';
      badge.style.padding = '0.2rem 0.4rem';
      badge.style.borderRadius = '12px';
      badge.style.fontWeight = 'bold';
      
      const content = document.createElement('div');
      content.style.paddingRight = '3rem';
      
      const title = document.createElement('div');
      title.textContent = a.title;
      title.style.fontWeight = 'bold';
      title.style.fontSize = '1rem';
      title.style.marginBottom = '0.3rem';
      title.style.color = '#e5e5e5';
      
      const desc = document.createElement('div');
      desc.textContent = a.desc;
      desc.style.fontSize = '0.9rem';
      desc.style.opacity = '0.9';
      desc.style.marginBottom = '0.5rem';
      desc.style.color = '#ccc';
      
      const date = document.createElement('div');
      date.textContent = `Unlocked: ${new Date(a.date).toLocaleString()}`;
      date.style.fontSize = '0.8rem';
      date.style.opacity = '0.7';
      date.style.color = '#aaa';
      
      content.appendChild(title);
      content.appendChild(desc);
      content.appendChild(date);
      
      d.appendChild(badge);
      d.appendChild(content);
      achList.appendChild(d);
    });
    
    // Add stats summary
    const stats = document.createElement('div');
    stats.style.textAlign = 'center';
    stats.style.marginTop = '1rem';
    stats.style.padding = '1rem';
    stats.style.background = 'rgba(255, 255, 255, 0.03)';
    stats.style.borderRadius = '8px';
    stats.style.color = '#ccc';
    stats.textContent = `Total Achievements: ${arr.length}`;
    achList.appendChild(stats);
  }

  // load profile safely; ensure a sensible default alias 'user'
  let profile = {};
  try { profile = JSON.parse(localStorage.getItem('profile') || '{}'); } catch (e) { profile = {}; }
  // default alias is 'user' when none provided; migrate legacy 'Player' -> 'user'
  if (profile && profile.alias === 'Player') {
    profile.alias = 'user';
    try { localStorage.setItem('profile', JSON.stringify(profile)); } catch (e) { /* ignore */ }
  }
  aliasInput.value = (profile && profile.alias) ? profile.alias : 'user';
  if (profile.color) colorInput.value = profile.color;

  // load stored OpenRouter key if present
  try {
    const stored = localStorage.getItem('openrouter_api_key') || '';
    if (openrouterInput) openrouterInput.value = stored;
  } catch (e) { /* ignore */ }

  // apply saved theme color if present
  if (profile.color) {
    document.documentElement.style.setProperty('--accent', profile.color);
  }

  saveBtn.addEventListener('click', () => {
    const p = { alias: aliasInput.value.trim() || 'user', color: colorInput.value };
    try {
      localStorage.setItem('profile', JSON.stringify(p));
      // store OpenRouter API key separately (user can leave blank to use fallback)
      if (openrouterInput) {
        try {
          if (openrouterInput.value && openrouterInput.value.trim()) {
            localStorage.setItem('openrouter_api_key', openrouterInput.value.trim());
          } else {
            localStorage.removeItem('openrouter_api_key');
          }
        } catch (e) { /* ignore */ }
      }
      // apply theme color locally by updating a CSS variable
      document.documentElement.style.setProperty('--accent', p.color);
      // also provide a small non-blocking feedback
      const saved = document.createElement('div');
      saved.textContent = 'Profile saved';
      saved.style.position = 'fixed';
      saved.style.right = '18px';
      saved.style.bottom = '18px';
      saved.style.padding = '8px 12px';
      saved.style.background = 'rgba(10,30,40,0.85)';
      saved.style.borderRadius = '8px';
      saved.style.boxShadow = '0 6px 18px rgba(0,0,0,0.5)';
      document.body.appendChild(saved);
      setTimeout(() => saved.remove(), 1400);
    } catch (e) {
      alert('Failed to save profile: ' + e.message);
    }
  });

  clearBtn.addEventListener('click', () => {
    if (!confirm('Clear all achievements?')) return;
    localStorage.removeItem('achievements');
    renderAchievements();
  });

  renderAchievements();
});
