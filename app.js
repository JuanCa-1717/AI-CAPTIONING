window.addEventListener('load', () => {
  // Tab Navigation System
  // Activate a tab by id (hides other tab contents and sets the active nav-tab)
  function activateTab(tabId, tabElement) {
    const navTabs = document.querySelectorAll('.nav-tab');
    const dashCards = document.querySelectorAll('.dash-card');
    const tabContents = document.querySelectorAll('.tab-content');

    // Remove active class from all nav tabs / dashboard cards and hide all contents
    navTabs.forEach(t => t.classList.remove('active'));
    dashCards.forEach(c => c.classList.remove('active'));
    tabContents.forEach(content => {
      content.classList.remove('active');
      // enforce display none so previously visible sections are hidden even if inline styles exist
      try { content.style.display = 'none'; } catch (e) { /* ignore */ }
    });

    // Mark the requested tab active and show its content
  if (tabElement) tabElement.classList.add('active');
    const targetContent = document.getElementById(tabId);
    if (targetContent) {
      targetContent.classList.add('active');
      try { targetContent.style.display = 'block'; } catch (e) { /* ignore */ }
    }

      // If we have a tiles selector, hide it when a specific tool/tab is opened
      try {
        const tiles = document.getElementById('tiles-container');
        const backBtn = document.getElementById('back-button');
        if (tiles && targetContent) {
        tiles.style.display = 'none';
        document.body.classList.remove('showing-tiles');
        if (backBtn) backBtn.style.display = 'inline-flex';
        // show per-tool back button inside the opened tab
        const toolBack = targetContent.querySelector('.tool-back');
        if (toolBack) toolBack.style.display = 'inline-flex';
        }
      } catch (e) { /* ignore */ }

    // Update page title based on active tab
    const tabName = (tabElement && tabElement.querySelector('span')) ? tabElement.querySelector('span').textContent : 'AIWORK';
    document.title = `${tabName} - AIWORK`;

    // Award navigation achievement
    addAchievement('tab_explorer', 'Explorador de pestañas', 'Navegaste entre diferentes módulos de la aplicación');
  }

  function initTabNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const dashCards = document.querySelectorAll('.dash-card');
    const itemTiles = document.querySelectorAll('.items');
    const ctaLinks = document.querySelectorAll('.cta');

    // Tab switching functionality
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        activateTab(targetTab, tab);
      });
    });

    // Dashboard card switching
    dashCards.forEach(card => {
      card.addEventListener('click', () => {
        const targetTab = card.dataset.tab;
        activateTab(targetTab, card);
      });
    });

    // New: items (tiles) switching
    itemTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        const targetTab = tile.dataset.tab;
        activateTab(targetTab, tile);
      });
      // keyboard accessibility
      tile.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tile.click(); }
      });
    });

    // CTA links inside tiles should also activate tab and not navigate
    ctaLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.dataset.tab || link.getAttribute('data-tab');
        if (target) activateTab(target, link.closest('.items'));
      });
    });

    // Robust delegation: handle any .cta added later without re-running init
    document.addEventListener('click', (e) => {
      const cta = e.target.closest && e.target.closest('.cta');
      if (!cta) return;
      // If it's a link inside another control, we still intercept
      e.preventDefault();
      const target = cta.dataset.tab || cta.getAttribute('data-tab');
      if (target) {
        const tile = cta.closest('.items');
        activateTab(target, tile || cta);
      }
    });

    // Back button handler (returns to tiles selector)
    const backBtn = document.getElementById('back-button');
    if (backBtn) {
      backBtn.addEventListener('click', () => { showTiles(); });
    }

    // Per-tool back buttons inside each tab-content
    document.querySelectorAll('.tab-content .tool-back').forEach(btn => {
      btn.addEventListener('click', (e) => { e.preventDefault(); showTiles(); });
    });
  }
  
  // Initialize tab navigation
  initTabNavigation();

  // Ensure initial state: show tiles selector if present, otherwise open first nav-tab
  (function ensureInitialTab(){
    const tiles = document.getElementById('tiles-container');
    if (tiles) {
      // hide any tab-content and show tiles
      document.querySelectorAll('.tab-content').forEach(c => { c.classList.remove('active'); try { c.style.display = 'none'; } catch(e){} });
      tiles.style.display = '';
      const backBtn = document.getElementById('back-button'); if (backBtn) backBtn.style.display = 'none';
      document.body.classList.add('showing-tiles');
      document.title = 'AIWORK';
      return;
    }

    // fallback behavior if no tiles selector
    const activeDash = document.querySelector('.dash-card.active');
    const activeNav = document.querySelector('.nav-tab.active') || document.querySelector('.nav-tab');
    if (activeDash && activeDash.dataset && activeDash.dataset.tab) {
      activateTab(activeDash.dataset.tab, activeDash);
    } else if (activeNav && activeNav.dataset && activeNav.dataset.tab) {
      activateTab(activeNav.dataset.tab, activeNav);
    }
  })();

  // Helper to show the tiles selector and hide any open tool panels
  function showTiles() {
    try {
      // hide all tab contents
      const tabContents = document.querySelectorAll('.tab-content');
      tabContents.forEach(content => { content.classList.remove('active'); try { content.style.display = 'none'; } catch(e){} });

      // show tiles
      const tiles = document.getElementById('tiles-container');
      if (tiles) tiles.style.display = '';

      // hide back button
      const backBtn = document.getElementById('back-button'); if (backBtn) backBtn.style.display = 'none';

      // mark showing tiles state so decorative overlays are hidden
      document.body.classList.add('showing-tiles');

      // hide per-tool back buttons
      document.querySelectorAll('.tab-content .tool-back').forEach(b => { b.style.display = 'none'; });

      // clear active classes from nav/dash/items
      document.querySelectorAll('.nav-tab, .dash-card, .items').forEach(el => el.classList.remove('active'));

      document.title = 'AIWORK';
    } catch (e) { console.warn('Could not show tiles selector', e); }
  }

  // Robust fallback: event-delegation on navbar-tabs to ensure tab switching works
  (function attachNavDelegation(){
    const navContainer = document.querySelector('.navbar-tabs');
    if (!navContainer) return;
    navContainer.addEventListener('click', (e) => {
      const tab = e.target.closest('.nav-tab');
      if (!tab) return;
      const targetTab = tab.dataset.tab;
      activateTab(targetTab, tab);
    }, false);
  })();

  // Register service worker for PWA functionality only on secure origins (not file://)
  if ('serviceWorker' in navigator) {
    const isSecureOrigin = (location.protocol === 'https:') || (location.hostname === 'localhost') || (location.hostname === '127.0.0.1');
    if (isSecureOrigin) {
      navigator.serviceWorker.register('./sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration.scope);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    } else {
      console.warn('Service Worker not registered: insecure origin (service workers require https or localhost).');
    }
  }

  const fileInput = document.getElementById('file-input');
  const langSelect = document.getElementById('lang-select');
  const modelSelect = document.getElementById('model-select');
  const userPrompt = document.getElementById('user-prompt');
  const startBtn = document.getElementById('start-btn');
  const aiSection = document.getElementById('ai-section');
  const aiOutput = document.getElementById('ai-output');
  const copyBtn = document.getElementById('copy-btn');
  const downloadBtn = document.getElementById('download-btn');
  const shareBtn = document.getElementById('share-btn');
  const stopBtn = document.getElementById('stop-btn');
  const imageList = document.getElementById('image-list');
  const promptLabel = document.getElementById('prompt-label');
  const mainTitle = document.querySelector('.title');

  // The single allowed multimodal model for this app
  const NEMOTRON_MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free';
  // Only NVIDIA Nemotron is supported for multimodal requests in this app.
  // Note: Removed auto-writing and special handling of a secondary Google OpenRouter key
  // to ensure only the primary API key (if present) is used. If you need per-provider
  // keys later, add them explicitly via the profile UI and wiring in `js/profile.js`.

  // Chat reply word limit to keep replies concise and natural
  const CHAT_REPLY_WORD_LIMIT = 120;

  // Global loading overlay controls
  const globalLoadingOverlay = document.getElementById('global-loading-overlay');
  let _loadingAnimationTimers = [];

  function startLoadingAnimation() {
    // No visual animation. Keep placeholder for potential future lightweight indicator.
    // Clear any previous timers to be safe.
    _loadingAnimationTimers.forEach(t => clearTimeout(t));
    _loadingAnimationTimers = [];
  }

  function stopLoadingAnimation() {
    // clear timers (no visual animation to clean up)
    _loadingAnimationTimers.forEach(t => clearTimeout(t));
    _loadingAnimationTimers = [];
  }

  function showGlobalLoading(buttonId) {
    // Overlay intentionally disabled to preserve UX. This function is a no-op.
    // Kept for backward compatibility so callers don't throw errors.
    try { /* no-op */ } catch (e) { /* ignore */ }
  }

  function hideGlobalLoading(buttonId) {
    // Overlay intentionally disabled; no-op for compatibility.
    try { /* no-op */ } catch (e) { /* ignore */ }
  }

  let ocrText = '';
  let imageUrls = [];
  let isProcessing = false;
  let currentAnimation = null;
  let ocrSuccessful = false;
  let animationText = '';
  let animationIndex = 0;
  let ocrWorker = null;
  // Pool of active dedicated OCR workers (for concurrency control / termination)
  let activeOCRWorkers = new Set();
  // Controller for current AI network request so we can cancel it from UI
  let currentAIController = null;
  let progressSection = null;
  let overallProgressFill = null;
  let overallProgressText = null;
  let currentTaskText = null;
  let imageProgressList = null;

  // Apply saved profile color immediately so UI uses user's accent across pages
  try {
    const savedProfile = JSON.parse(localStorage.getItem('profile') || '{}');
    if (savedProfile && savedProfile.color) {
      document.documentElement.style.setProperty('--accent', savedProfile.color);
    }
  } catch (e) {
    console.warn('Could not read saved profile for accent color', e);
  }

  // Initialize progress elements
  progressSection = document.getElementById('progress-section');
  overallProgressFill = document.getElementById('overall-progress-fill');
  overallProgressText = document.getElementById('overall-progress-text');
  currentTaskText = document.getElementById('current-task');
  imageProgressList = document.getElementById('image-progress-list');

  // Achievement helper: stores achievements in localStorage if not present
  function addAchievement(id, title, desc) {
    try {
      const raw = localStorage.getItem('achievements');
      const arr = raw ? JSON.parse(raw) : [];
      if (!arr.find(a => a.id === id)) {
        arr.push({ id, title, desc, date: Date.now() });
        localStorage.setItem('achievements', JSON.stringify(arr));
        // lightweight notification
        try { alert(`Logro desbloqueado: ${title}`); } catch (e) { console.log('Achievement:', title); }
      }
    } catch (e) { console.warn('Failed to add achievement', e); }
  }

  // Progress tracking functions
  function showProgress() {
    if (progressSection) {
      progressSection.style.display = 'block';
    }
  }

  function hideProgress() {
    if (progressSection) {
      progressSection.style.display = 'none';
    }
  }

  function updateOverallProgress(percent, text = '') {
    if (overallProgressFill) {
      overallProgressFill.style.width = `${percent}%`;
    }
    if (overallProgressText) {
      overallProgressText.textContent = `${Math.round(percent)}%`;
    }
    if (currentTaskText && text) {
      currentTaskText.textContent = text;
    }
  }

  function createImageProgressItem(file, index) {
    const item = document.createElement('div');
    item.className = 'image-progress-item';
    item.id = `image-progress-${index}`;
    
    const img = document.createElement('img');
    const reader = new FileReader();
    reader.onload = e => img.src = e.target.result;
    reader.readAsDataURL(file);
    
    const info = document.createElement('div');
    info.className = 'image-progress-info';
    
    const name = document.createElement('div');
    name.className = 'image-progress-name';
    name.textContent = file.name;
    
    const status = document.createElement('div');
    status.className = 'image-progress-status';
    status.textContent = 'Waiting...';
    
    info.appendChild(name);
    info.appendChild(status);
    
    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'image-progress-bar';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'image-progress-fill';
    progressBar.style.width = '0%';
    
    progressBarContainer.appendChild(progressBar);
    
    item.appendChild(img);
    item.appendChild(info);
    item.appendChild(progressBarContainer);
    
    return item;
  }

  function updateImageProgress(index, percent, status) {
    const item = document.getElementById(`image-progress-${index}`);
    if (item) {
      const statusElement = item.querySelector('.image-progress-status');
      const progressBar = item.querySelector('.image-progress-fill');
      
      if (statusElement) statusElement.textContent = status;
      if (progressBar) progressBar.style.width = `${percent}%`;
    }
  }

  // Language support
  const translations = {
    en: {
      title: 'Upload your image and ask a question',
      prompt_label: 'Your question',
      ai_heading: 'AI Response:',
      donate: 'Donate',
      prompt_placeholder: 'Type your question about the image here',
      please_select_image: 'Please select at least one image first to extract text.',
      please_enter_prompt: 'Please enter a prompt for the AI.',
      processing: 'Processing...',
      connecting: 'Connecting to AI...',
      copied: 'Text copied to clipboard',
      error_copy: 'Error copying to clipboard',
      error_processing: 'Error processing images: ',
      ai_error: 'AI Error: ',
      ai_no_response: 'AI did not return a valid response.',
      error_calling_ai: 'Error calling AI',
    },
    es: {
      title: 'Sube tu imagen y haz una pregunta',
      prompt_label: 'Tu pregunta',
      ai_heading: 'Respuesta de la IA:',
      donate: 'Donar',
      prompt_placeholder: 'Escribe tu pregunta sobre la imagen aquí',
      please_select_image: 'Por favor selecciona al menos una imagen antes de extraer texto.',
      please_enter_prompt: 'Por favor introduce una pregunta para la IA.',
      processing: 'Procesando...',
      connecting: 'Conectando con la IA...',
      copied: 'Texto copiado al portapapeles',
      error_copy: 'Error al copiar al portapapeles',
      error_processing: 'Error procesando imágenes: ',
      ai_error: 'Error de la IA: ',
      ai_no_response: 'La IA no devolvió una respuesta válida.',
      error_calling_ai: 'Error llamando a la IA',
    },
    fr: {
      title: 'Téléchargez votre image et posez une question',
      prompt_label: 'Votre question',
      ai_heading: "Réponse de l'IA:",
      donate: 'Faire un don',
      prompt_placeholder: 'Tapez votre question concernant l\'image ici',
      please_select_image: 'Veuillez sélectionner au moins une image pour extraire le texte.',
      please_enter_prompt: "Veuillez saisir une question pour l'IA.",
      processing: 'Traitement...',
      connecting: "Connexion à l'IA...",
      copied: 'Texte copié dans le presse-papiers',
      error_copy: 'Erreur lors de la copie',
      error_processing: 'Erreur lors du traitement des images: ',
      ai_error: 'Erreur IA: ',
      ai_no_response: "L'IA n'a pas renvoyé de réponse valide.",
      error_calling_ai: "Erreur lors de l'appel à l'IA",
    },
    de: {
      title: 'Lade dein Bild hoch und stelle eine Frage',
      prompt_label: 'Deine Frage',
      ai_heading: 'KI-Antwort:',
      donate: 'Spenden',
      prompt_placeholder: 'Geben Sie hier Ihre Frage zum Bild ein',
      please_select_image: 'Bitte wähle mindestens ein Bild aus, um Text zu extrahieren.',
      please_enter_prompt: 'Bitte gib eine Frage für die KI ein.',
      processing: 'Verarbeite...',
      connecting: 'Verbinde mit der KI...',
      copied: 'Text in die Zwischenablage kopiert',
      error_copy: 'Fehler beim Kopieren in die Zwischenablage',
      error_processing: 'Fehler beim Verarbeiten von Bildern: ',
      ai_error: 'KI-Fehler: ',
      ai_no_response: 'Die KI hat keine gültige Antwort zurückgegeben.',
      error_calling_ai: 'Fehler beim Aufruf der KI',
    },
    pt: {
      title: 'Envie sua imagem e faça uma pergunta',
      prompt_label: 'Sua pergunta',
      ai_heading: 'Resposta da IA:',
      donate: 'Doar',
      prompt_placeholder: 'Digite sua pergunta sobre a imagem aqui',
      please_select_image: 'Por favor selecione pelo menos uma imagem para extrair o texto.',
      please_enter_prompt: 'Por favor insira uma pergunta para a IA.',
      processing: 'Processando...',
      connecting: 'Conectando à IA...',
      copied: 'Texto copiado para a área de transferência',
      error_copy: 'Erro ao copiar para a área de transferência',
      error_processing: 'Erro ao processar imagens: ',
      ai_error: 'Erro da IA: ',
      ai_no_response: 'A IA não retornou uma resposta válida.',
      error_calling_ai: 'Erro ao chamar a IA',
    }
  };

  const languageNames = { en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch', pt: 'Português' };

  function getSelectedLang() {
    return (langSelect && langSelect.value) ? langSelect.value : 'en';
  }

  function t(key) {
    const lang = getSelectedLang();
    return (translations[lang] && translations[lang][key]) || translations['en'][key] || key;
  }

  // Map UI language to Tesseract language code (ISO 639-2 where available)
  const tessMap = { en: 'eng', es: 'spa', fr: 'fra', de: 'deu', pt: 'por' };

  function getTessLang() {
    const lang = getSelectedLang();
    return tessMap[lang] || 'eng';
  }

  // Apply initial UI translations
  if (mainTitle) mainTitle.textContent = t('title');
  if (promptLabel) promptLabel.textContent = t('prompt_label');
  if (userPrompt) userPrompt.placeholder = t('prompt_placeholder');
  const aiHeading = document.getElementById('ai-heading');
  const donateLink = document.getElementById('donate-link');
  if (aiHeading) aiHeading.textContent = t('ai_heading') || 'AI Response:';
  if (donateLink) donateLink.textContent = t('donate') || donateLink.textContent;

  // Update UI when language changes
  if (langSelect) {
    langSelect.addEventListener('change', () => {
      if (mainTitle) mainTitle.textContent = t('title');
      if (promptLabel) promptLabel.textContent = t('prompt_label');
      if (userPrompt) userPrompt.placeholder = t('prompt_placeholder');
      if (aiHeading) aiHeading.textContent = t('ai_heading') || 'AI Response:';
      if (donateLink) donateLink.textContent = t('donate') || donateLink.textContent;
      // update placeholder
      if (aiOutput && aiOutput.classList.contains('ai-output-loading')) {
        aiOutput.placeholder = t('connecting');
      }
    });
  }

  // Mostrar imágenes en lista conforme se seleccionan
  fileInput.addEventListener('change', () => {
    processFiles(Array.from(fileInput.files));
  });

  // Drag and drop functionality
  const container = document.querySelector('.container');
  
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.classList.add('drag-over');
  });

  container.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!container.contains(e.relatedTarget)) {
      container.classList.remove('drag-over');
    }
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      // Update file input with dropped files
      const dt = new DataTransfer();
      files.forEach(file => dt.items.add(file));
      fileInput.files = dt.files;
      
      processFiles(files);
    }
  });

  // Paste functionality
  document.addEventListener('paste', async (e) => {
    // Only handle paste when not in input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    e.preventDefault();
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length > 0) {
      const files = [];
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          // Create a new file with a proper name
          const timestamp = Date.now();
          const newFile = new File([file], `pasted-image-${timestamp}.png`, {
            type: file.type,
            lastModified: timestamp
          });
          files.push(newFile);
        }
      }
      
      if (files.length > 0) {
        // Update file input with pasted files
        const dt = new DataTransfer();
        files.forEach(file => dt.items.add(file));
        fileInput.files = dt.files;
        
        processFiles(files);
        addAchievement('paste_master', 'Maestro del pegado', 'Pegaste una imagen desde el portapapeles');
      }
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Start processing with Enter (when not in input/textarea)
    if (e.key === 'Enter' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault();
      if (!isProcessing && fileInput.files.length > 0) {
        startBtn.click();
      }
    }
    
    // Stop processing with Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      if (currentAnimation) {
        stopBtn.click();
      }
    }
    
    // Copy with Ctrl+C (when AI output is visible and active)
    if (e.ctrlKey && e.key === 'c' && aiOutput.value && document.activeElement !== userPrompt) {
      e.preventDefault();
      copyBtn.click();
      addAchievement('keyboard_master', 'Maestro del teclado', 'Usaste atajos de teclado para interactuar');
    }
  });

  function processFiles(files) {
    imageList.innerHTML = ''; // limpiar lista

    // Award first upload achievement
    if (files.length > 0) {
      addAchievement('first_upload', 'Tu primera subida de imágenes', 'Subiste imágenes por primera vez');
      
      // Award multiple upload achievement
      if (files.length >= 3) {
        addAchievement('multi_upload', 'Subida múltiple', 'Subiste 3 o más imágenes a la vez');
      }
      
      // Award drag and drop achievement if files came from drop
      if (files.some(f => f.name.includes('drag') || f.size > 1024 * 1024)) {
        addAchievement('drag_master', 'Maestro del arrastrar y soltar', 'Usaste la funcionalidad de arrastrar y soltar');
      }
    }
    files.forEach(file => {
      const li = document.createElement('li');
      const img = document.createElement('img');
      img.alt = `Preview of ${file.name}`;
      li.appendChild(img);
      imageList.appendChild(li);

      const reader = new FileReader();
      reader.onload = e => img.src = e.target.result;
      reader.readAsDataURL(file);
    });
  }

  // Guardar texto original y el span para el texto del botón
  const btnTextSpan = document.createElement('span');
  btnTextSpan.className = 'btn-text';
  btnTextSpan.textContent = '';

  // Limpiar contenido y añadir el span + icono para startBtn
  startBtn.textContent = '';
  startBtn.appendChild(btnTextSpan);
  const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  iconSvg.setAttribute('width', '16');
  iconSvg.setAttribute('height', '16');
  iconSvg.setAttribute('fill', 'currentColor');
  iconSvg.setAttribute('viewBox', '0 0 16 16');
  iconSvg.classList.add('bi', 'bi-arrow-right-square-fill');
  iconSvg.setAttribute('aria-hidden', 'true');
  iconSvg.innerHTML = '<path d="M0 14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2zm4.5-6.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5a.5.5 0 0 1 0-1"/>';
  startBtn.appendChild(iconSvg);
  // Spinner element to show while processing (hidden by default)
  const spinner = document.createElement('span');
  spinner.className = 'spinner';
  spinner.style.display = 'none';
  startBtn.appendChild(spinner);

  startBtn.addEventListener('click', async () => {
    if (fileInput.files.length === 0) {
      alert(t('please_select_image'));
      return;
    }
    if (isProcessing) return;

    isProcessing = true;
    startBtn.disabled = true;
    startBtn.classList.add('loading');
    // Mostrar spinner en lugar de texto/icono
    spinner.style.display = 'inline-block';
    iconSvg.style.display = 'none';

    copyBtn.style.display = 'none';
    stopBtn.style.display = 'none';
    
    // Show progress section
    showProgress();
    updateOverallProgress(0, 'Initializing...');

    try {
      const files = Array.from(fileInput.files);
      imageUrls = [];
      const extractedTexts = [];
      
      // Clear and populate image progress list
      if (imageProgressList) {
        imageProgressList.innerHTML = '';
        files.forEach((file, index) => {
          const progressItem = createImageProgressItem(file, index);
          imageProgressList.appendChild(progressItem);
        });
      }

      updateOverallProgress(10, 'Compressing images...');

      // Compress images in parallel with a small concurrency limit to speed things up
      const compressConcurrency = 3;
      const compressTasks = files.map((file, index) => async () => {
        updateImageProgress(index, 0, 'Compressing...');
        const compressed = await compressImage(file);
        updateImageProgress(index, 50, 'Compressed');
        const dataUrl = await fileToDataURL(compressed);
        updateImageProgress(index, 60, 'Ready for OCR');
        // update aggregate progress (approx)
        const overallProgress = 10 + ((index + 1) / files.length) * 40; // 10-50
        updateOverallProgress(overallProgress, `Processing image ${index + 1} of ${files.length}...`);
        return { compressed, dataUrl, index, original: file };
      });

      const compressedResults = await runTasksWithConcurrency(compressTasks, compressConcurrency);

      // Fill imageUrls in original order (tasks return by index)
      imageUrls = new Array(files.length);
      const compressedFiles = new Array(files.length);
      compressedResults.forEach(res => {
        if (res && !res.__error) {
          imageUrls[res.index] = res.dataUrl;
          compressedFiles[res.index] = res.compressed;
        }
      });

      updateOverallProgress(50, 'Extracting text from images...');

      // Process OCR with a modest concurrency (creating dedicated workers per file)
      const ocrConcurrency = 2;
      const ocrTasks = compressedFiles.map((cfile, index) => async () => {
        if (!cfile) return { index, error: new Error('No compressed file') };
        try {
          const text = await extractOCRDedicated(cfile, index);
          return { index, text };
        } catch (err) {
          return { index, error: err };
        }
      });

      const ocrResults = await runTasksWithConcurrency(ocrTasks, ocrConcurrency);

      // Collect valid OCR results and update progress
      for (let i = 0; i < ocrResults.length; i++) {
        const r = ocrResults[i];
        const overallProgress = 50 + ((i + 1) / files.length) * 30; // 50-80
        if (r && !r.__error && r.text) {
          if (hasValidText(r.text.trim())) {
            extractedTexts.push(`From ${files[r.index].name}:\n${r.text.trim()}`);
            console.log(`OCR successful for ${files[r.index].name}`);
          } else {
            console.log(`OCR produced no useful text for ${files[r.index].name}`);
          }
        } else if (r && r.error) {
          console.log(`OCR failed for ${files[r.index] ? files[r.index].name : i}:`, r.error && r.error.message ? r.error.message : r.error);
          updateImageProgress(r.index || i, 100, 'Error');
        }
        updateOverallProgress(overallProgress, `OCR completed for image ${i + 1} of ${files.length}`);
      }

      ocrText = extractedTexts.join('\n\n---\n\n');
      ocrSuccessful = extractedTexts.length > 0;
      
      if (ocrSuccessful) {
        console.log('Some OCR text was extracted - including in prompt');
        addAchievement('first_ocr', 'Tu primera extracción de texto', 'Has extraído texto de una imagen');
      } else {
        console.log('No useful OCR text extracted - image-only mode');
      }

      updateOverallProgress(80, 'Sending to AI...');
      await sendToAI();
      
    } catch (err) {
      alert(t('error_processing') + err.message);
        hideGlobalLoading('pdf-analyze-btn');
      resetButtonState();
      hideProgress();
    }
  });

  copyBtn.addEventListener('click', () => {
    if (!aiOutput.value) return;
    navigator.clipboard.writeText(aiOutput.value).then(() => {
      alert(t('copied'));
      addAchievement('copy_master', 'Maestro de la copia', 'Copiaste una respuesta de la IA');
    }).catch(err => {
      alert(t('error_copy') + ': ' + err);
    });
  });

  downloadBtn.addEventListener('click', () => {
    if (!aiOutput.value) return;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ai-response-${timestamp}.txt`;
    const content = aiOutput.value;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addAchievement('download_master', 'Maestro de las descargas', 'Descargaste una respuesta como archivo TXT');
  });

  shareBtn.addEventListener('click', async () => {
    if (!aiOutput.value) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI Response from AIWORK',
          text: aiOutput.value,
          url: window.location.href
        });
        addAchievement('share_master', 'Maestro del compartir', 'Compartiste una respuesta de la IA');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      // Fallback: copy link with response to clipboard
      const shareText = `Check out this AI response from AIWORK:\n\n${aiOutput.value}\n\nGenerated at: ${window.location.href}`;
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Response and link copied to clipboard for sharing!');
        addAchievement('share_master', 'Maestro del compartir', 'Compartiste una respuesta de la IA');
      }).catch(err => {
        alert('Error copying to clipboard: ' + err);
      });
    }
  });

  stopBtn.addEventListener('click', () => {
    if (currentAnimation) {
      clearInterval(currentAnimation);
      currentAnimation = null;
      resetButtonState();
      stopBtn.style.display = 'none';
      copyBtn.style.display = 'inline-flex';
      downloadBtn.style.display = 'inline-flex';
      shareBtn.style.display = 'inline-flex';
    }
    // Abort any in-flight AI request
    try {
      if (currentAIController) {
        currentAIController.abort();
        currentAIController = null;
      }
    } catch (e) { /* ignore */ }

    // Terminate any active dedicated OCR workers
    try {
      activeOCRWorkers.forEach(w => {
        try { w.terminate(); } catch (e) {}
      });
      activeOCRWorkers.clear();
      if (ocrWorker) {
        try { ocrWorker.terminate(); } catch (e) {}
        ocrWorker = null;
      }
    } catch (e) { /* ignore */ }

    // Hide progress and ensure UI is reset
    hideProgress();
    isProcessing = false;
  });

  function resetButtonState() {
    isProcessing = false;
    startBtn.disabled = false;
    startBtn.classList.remove('loading');
    btnTextSpan.textContent = '';
    spinner.style.display = 'none';
    iconSvg.style.display = 'inline'; // Mostrar icono nuevamente
  }

  function compressImage(file, maxWidth = 720, maxHeight = 480, quality = 0.7) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  // Run an array of async task functions with a concurrency limit.
  // tasks: Array<() => Promise>  Returns array of results (in original order).
  async function runTasksWithConcurrency(tasks, limit = 3) {
    const results = new Array(tasks.length);
    let idx = 0;

    async function worker() {
      while (true) {
        const i = idx++;
        if (i >= tasks.length) return;
        try {
          results[i] = await tasks[i]();
        } catch (e) {
          results[i] = { __error: true, error: e };
        }
      }
    }

    const workers = [];
    for (let i = 0; i < Math.min(limit, tasks.length); i++) workers.push(worker());
    await Promise.all(workers);
    return results;
  }

  // Create a dedicated OCR worker for a single file and terminate it when done.
  function extractOCRDedicated(file, index = 0) {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker('js/ocr-worker.js');
        activeOCRWorkers.add(worker);

        const tessLang = getTessLang();
        const fileId = Date.now() + '_' + Math.random();

        const handleMessage = (e) => {
          const { type, text, error, id, progress, status } = e.data;
          if (id !== fileId) return;
          switch (type) {
            case 'success':
              worker.removeEventListener('message', handleMessage);
              try { worker.terminate(); } catch (e) {}
              activeOCRWorkers.delete(worker);
              updateImageProgress(index, 100, 'Complete');
              if (!text || text.trim().length === 0) {
                reject(new Error('No text detected in image'));
                return;
              }
              resolve(text);
              break;
            case 'error':
              worker.removeEventListener('message', handleMessage);
              try { worker.terminate(); } catch (e) {}
              activeOCRWorkers.delete(worker);
              updateImageProgress(index, 100, 'Error');
              reject(new Error(error));
              break;
            case 'progress':
              const percent = Math.round(progress * 100);
              updateImageProgress(index, percent, status);
              break;
          }
        };

        worker.addEventListener('message', handleMessage);
        updateImageProgress(index, 0, 'Starting OCR...');

        const reader = new FileReader();
        reader.onload = () => {
          worker.postMessage({ type: 'process', imageData: reader.result, language: tessLang, id: fileId });
        };
        reader.onerror = () => {
          try { worker.terminate(); } catch (e) {}
          activeOCRWorkers.delete(worker);
          reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
      } catch (err) {
        reject(err);
      }
    });
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      if (file.size > 1024 * 1024) {
        reject(new Error('Image still too large after compression. Please use a smaller image.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function extractOCR(file, index = 0) {
    return new Promise((resolve, reject) => {
      if (!ocrWorker) {
        ocrWorker = new Worker('js/ocr-worker.js');
      }
      
      const tessLang = getTessLang();
      const fileId = Date.now() + '_' + Math.random();
      
      // Handle worker messages
      const handleMessage = (e) => {
        const { type, text, error, id, progress, status } = e.data;
        
        if (id !== fileId) return; // Ignore messages for other files
        
        switch (type) {
          case 'success':
            ocrWorker.removeEventListener('message', handleMessage);
            updateImageProgress(index, 100, 'Complete');
            if (!text || text.trim().length === 0) {
              reject(new Error('No text detected in image'));
              return;
            }
            resolve(text);
            break;
            
          case 'error':
            ocrWorker.removeEventListener('message', handleMessage);
            updateImageProgress(index, 100, 'Error');
            reject(new Error(error));
            break;
            
          case 'progress':
            const percent = Math.round(progress * 100);
            updateImageProgress(index, percent, status);
            console.log(`OCR Progress: ${percent}% - ${status}`);
            break;
        }
      };
      
      ocrWorker.addEventListener('message', handleMessage);
      updateImageProgress(index, 0, 'Starting OCR...');
      
      // Convert file to data URL for worker
      const reader = new FileReader();
      reader.onload = () => {
        ocrWorker.postMessage({
          type: 'process',
          imageData: reader.result,
          language: tessLang,
          id: fileId
        });
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  async function query(data, retries = 2, signal = null) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
          const response = await fetch("api.php", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              messages: data.messages,
            }),
            signal
          });

        if (!response.ok) {
          // Try to parse JSON error payload from OpenRouter to provide helpful messages
          let payloadText = await response.text().catch(() => null);
          let payloadJson = null;
          try { payloadJson = payloadText ? JSON.parse(payloadText) : null; } catch (e) { payloadJson = null; }

          // Specific helpful cases
          if (response.status === 413) {
            throw new Error('Image too large for API. Please use a smaller image.');
          }

          // Rate limit / upstream provider limited (429)
          if (response.status === 429) {
            const providerMsg = payloadJson?.error?.metadata?.raw || payloadText || 'Rate limited by provider.';
            throw new Error(`Rate limited by provider (429). Suggestion: add your own OpenRouter API key in Profile or retry later. Provider message: ${providerMsg}`);
          }

          // Provider-specific developer instruction disabled (Google models)
          if (response.status === 400 && payloadJson?.error?.metadata?.raw && payloadJson.error.metadata.raw.includes('Developer instruction is not enabled')) {
            throw new Error('Selected model does not accept developer instructions via this endpoint (developer instruction not enabled). Try a different model or add your own OpenRouter key with proper access.');
          }

          // Meta / unsupported mime type when sending data URLs to image_url
          if (response.status === 400 && payloadJson?.error?.metadata?.raw && payloadJson.error.metadata.raw.includes('Unsupported mime type')) {
            throw new Error('Provider rejected image data (unsupported mime type). Use publicly accessible image URLs instead of data URLs, or host images externally.');
          }

          // Retry on 5xx (temporary server issues)
          if (response.status >= 500 && attempt < retries) {
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`API error ${response.status}, retrying in ${delay}ms... (attempt ${attempt}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          // Fallback: include parsed message if available
          const errText = payloadText || `HTTP ${response.status} ${response.statusText}`;
          throw new Error(`API Error ${response.status}: ${errText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`API attempt ${attempt} failed:`, error);
        if (error.name === 'AbortError') throw error;
        if (attempt === retries) throw error;
        const delay = Math.min(5000, Math.pow(2, attempt) * 500);
        console.log(`Network error, retrying in ${delay}ms... (attempt ${attempt}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  function hasValidText(text) {
    if (!text || text.length < 3) return false;
    const cleanText = text.replace(/[^\w\s]/g, '').trim();
    if (cleanText.length < 3) return false;
    const specialCharCount = (text.match(/[^\w\s]/g) || []).length;
    const noiseRatio = specialCharCount / text.length;
    if (noiseRatio > 0.5) return false;
    return true;
  }

  async function sendToAI() {
    const prompt = userPrompt.value.trim();
    if (!prompt) {
      alert(t('please_enter_prompt'));
      resetButtonState();
      return;
    }

    aiSection.style.display = 'block';
    aiSection.classList.add('visible');
    aiOutput.value = '';
    aiOutput.classList.add('ai-output-loading');
    aiOutput.placeholder = t('connecting');

    // Ensure spinner is visible while awaiting AI
    spinner.style.display = 'inline-block';
    iconSvg.style.display = 'none'; // Ocultar icono mientras responde

    copyBtn.style.display = 'none';
    downloadBtn.style.display = 'none';
    shareBtn.style.display = 'none';
    stopBtn.style.display = 'none';

  const model = modelSelect && modelSelect.value ? modelSelect.value : "nvidia/nemotron-nano-12b-v2-vl:free";
    const selectedLang = getSelectedLang();
    
    // Only NVIDIA Nemotron is supported by this app now. Treat it as the sole multimodal model.
    const NEMOTRON_MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free';
    const multimodalModels = [NEMOTRON_MODEL];
    const isMultimodal = multimodalModels.includes(model);
    
    let messages;
    
    if (isMultimodal) {
      // Use multimodal format for compatible models
      const systemContent = [{ type: 'text', text: `Please respond in ${languageNames[selectedLang]}.` }];
      
      if (ocrSuccessful && ocrText) {
        const content = [{
          type: "text",
          text: `Here's the text I extracted from the provided images:\n\n${ocrText}\n\nBased on the images and the extracted text, please answer: ${prompt}`,
        }];
        for (const url of imageUrls) {
          content.push({ type: "image_url", image_url: { url } });
        }
        messages = [{ role: 'system', content: systemContent }, { role: "user", content }];
      } else {
        const content = [{
          type: "text",
          text: `Please analyze the provided images and answer: ${prompt}`,
        }];
        for (const url of imageUrls) {
          content.push({ type: "image_url", image_url: { url } });
        }
        messages = [{ role: 'system', content: systemContent }, { role: "user", content }];
      }
    } else {
      // Use text-only format for text-only models
      const systemMessage = `Please respond in ${languageNames[selectedLang]}.`;
      
      if (ocrSuccessful && ocrText) {
        const userMessage = `I have extracted the following text from some images using OCR:\n\n${ocrText}\n\nBased on this extracted text, please answer: ${prompt}`;
        messages = [
          { role: 'system', content: systemMessage }, 
          { role: "user", content: userMessage }
        ];
      } else {
        const userMessage = `I have uploaded some images but no readable text could be extracted from them. Please answer this question as best as you can: ${prompt}`;
        messages = [
          { role: 'system', content: systemMessage }, 
          { role: "user", content: userMessage }
        ];
      }
    }

    try {
      // Show global loading overlay and mark the start button
      // Create an AbortController so user can cancel the AI request
      const controller = new AbortController();
      currentAIController = controller;
      showGlobalLoading('start-btn');
      let data;
      try {
        data = await query({ messages, model }, 2, controller.signal);
      } finally {
        // hide overlay as soon as we have data or error
        hideGlobalLoading('start-btn');
        currentAIController = null;
      }

      if (data?.choices?.length && data.choices[0].message?.content) {
        aiOutput.classList.remove('ai-output-loading');
        aiOutput.placeholder = '';
        updateOverallProgress(100, 'AI response received!');
        setTimeout(() => hideProgress(), 2000); // Hide progress after 2 seconds
        // award first AI response achievement
        addAchievement('first_ai_response', 'Primera respuesta de la IA', 'Recibiste tu primera respuesta del modelo AI');
        animateAnswer(data.choices[0].message.content);
      } else if (data.error) {
        aiOutput.classList.remove('ai-output-loading');
        aiOutput.value = t('ai_error') + ' ' + data.error;
        aiOutput.placeholder = '';
        hideProgress();
        resetButtonState();
      } else {
        aiOutput.classList.remove('ai-output-loading');
        aiOutput.value = t('ai_no_response');
        aiOutput.placeholder = '';
        hideProgress();
        resetButtonState();
      }
    } catch (error) {
      hideGlobalLoading('start-btn');
      aiOutput.classList.remove('ai-output-loading');
      aiOutput.value = t('error_calling_ai') + ': ' + error.message;
      aiOutput.placeholder = '';
      hideProgress();
      resetButtonState();
    }
  }

  function animateAnswer(text) {
    aiOutput.value = '';
    animationText = text;
    animationIndex = 0;

    stopBtn.style.display = 'inline-flex';
    copyBtn.style.display = 'none';
    downloadBtn.style.display = 'none';
    shareBtn.style.display = 'none';

    // Faster animation: append multiple characters per tick and throttle DOM updates
    const chunkSize = 3; // number of characters appended per tick
    let ticksSinceHeightUpdate = 0;
    currentAnimation = setInterval(() => {
      if (animationIndex >= animationText.length) {
        clearInterval(currentAnimation);
        currentAnimation = null;
        resetButtonState();
        stopBtn.style.display = 'none';
        copyBtn.style.display = 'inline-flex';
        downloadBtn.style.display = 'inline-flex';
        shareBtn.style.display = 'inline-flex';
        iconSvg.style.display = 'inline'; // Mostrar icono al finalizar
        btnTextSpan.textContent = '';
        return;
      }
      const nextIndex = Math.min(animationText.length, animationIndex + chunkSize);
      aiOutput.value += animationText.slice(animationIndex, nextIndex);
      animationIndex = nextIndex;
      // throttle height updates to every 3 ticks to reduce layout thrashing
      ticksSinceHeightUpdate++;
      if (ticksSinceHeightUpdate >= 3 || animationIndex >= animationText.length) {
        aiOutput.style.height = aiOutput.scrollHeight + 'px';
        ticksSinceHeightUpdate = 0;
      }
    }, 20);
  }

  // ===== TEXT GENERATOR MODULE =====
  function initTextGenerator() {
    const textLangSelect = document.getElementById('text-lang-select');
    const textModelSelect = document.getElementById('text-model-select');
    const textTypeSelect = document.getElementById('text-type-select');
    const textPrompt = document.getElementById('text-prompt');
    const textGenerateBtn = document.getElementById('text-generate-btn');
    const textAiSection = document.getElementById('text-ai-section');
    const textAiOutput = document.getElementById('text-ai-output');
    const textCopyBtn = document.getElementById('text-copy-btn');
    const textDownloadBtn = document.getElementById('text-download-btn');
    const textShareBtn = document.getElementById('text-share-btn');
    const textStopBtn = document.getElementById('text-stop-btn');

    let textIsProcessing = false;
    let textCurrentAnimation = null;
    let textAnimationText = '';
    let textAnimationIndex = 0;

    // Text type templates
    const textTypeTemplates = {
      creative: "Write a creative piece about: ",
      email: "Write a professional email about: ",
      blog: "Write a blog post about: ",
      story: "Write a short story about: ",
      article: "Write an informative article about: ",
      summary: "Create a summary of: ",
      custom: ""
    };

    // Sync language with main selector
    if (langSelect) {
      langSelect.addEventListener('change', () => {
        if (textLangSelect) {
          textLangSelect.value = langSelect.value;
        }
      });
    }

    if (textLangSelect) {
      textLangSelect.addEventListener('change', () => {
        if (langSelect) {
          langSelect.value = textLangSelect.value;
        }
      });
    }

    function getTextSelectedLang() {
      return (textLangSelect && textLangSelect.value) ? textLangSelect.value : 'en';
    }

    // Generate button functionality
    if (textGenerateBtn) {
      // Setup button with spinner
      const textBtnTextSpan = document.createElement('span');
      textBtnTextSpan.className = 'btn-text';
      textBtnTextSpan.textContent = '';

      textGenerateBtn.textContent = '';
      textGenerateBtn.appendChild(textBtnTextSpan);
      
      const textIconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      textIconSvg.setAttribute('width', '16');
      textIconSvg.setAttribute('height', '16');
      textIconSvg.setAttribute('fill', 'currentColor');
      textIconSvg.setAttribute('viewBox', '0 0 16 16');
      textIconSvg.classList.add('bi', 'bi-arrow-right-square-fill');
      textIconSvg.setAttribute('aria-hidden', 'true');
      textIconSvg.innerHTML = '<path d="M0 14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2zm4.5-6.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5a.5.5 0 0 1 0-1"/>';
      textGenerateBtn.appendChild(textIconSvg);

      const textSpinner = document.createElement('span');
      textSpinner.className = 'spinner';
      textSpinner.style.display = 'none';
      textGenerateBtn.appendChild(textSpinner);

      textGenerateBtn.addEventListener('click', async () => {
        if (!textPrompt.value.trim()) {
          alert('Please enter a prompt for text generation.');
          return;
        }
        if (textIsProcessing) return;

        textIsProcessing = true;
        textGenerateBtn.disabled = true;
        textGenerateBtn.classList.add('loading');
        textSpinner.style.display = 'inline-block';
        textIconSvg.style.display = 'none';

        textCopyBtn.style.display = 'none';
        textDownloadBtn.style.display = 'none';
        textShareBtn.style.display = 'none';
        textStopBtn.style.display = 'none';

        try {
          await generateText();
        } catch (err) {
          alert('Error generating text: ' + err.message);
          resetTextButtonState();
        }
      });

      function resetTextButtonState() {
        textIsProcessing = false;
        textGenerateBtn.disabled = false;
        textGenerateBtn.classList.remove('loading');
        textBtnTextSpan.textContent = '';
        textSpinner.style.display = 'none';
        textIconSvg.style.display = 'inline';
      }

      async function generateText() {
        const prompt = textPrompt.value.trim();
        const textType = textTypeSelect ? textTypeSelect.value : 'custom';
        const template = textTypeTemplates[textType] || '';
        const fullPrompt = template + prompt;

        textAiSection.style.display = 'block';
        textAiSection.classList.add('visible');
        textAiOutput.value = '';
        textAiOutput.classList.add('ai-output-loading');
        textAiOutput.placeholder = 'Generating text...';

        textSpinner.style.display = 'inline-block';
        textIconSvg.style.display = 'none';

  const model = textModelSelect && textModelSelect.value ? textModelSelect.value : "nvidia/nemotron-nano-12b-v2-vl:free";
        const selectedLang = getTextSelectedLang();
        
        // Text-only format for text generation models
        const systemMessage = `Please respond in ${languageNames[selectedLang]}. Generate high-quality, coherent text based on the user's request.`;
        const userMessage = fullPrompt;
        
        const messages = [
          { role: 'system', content: systemMessage }, 
          { role: "user", content: userMessage }
        ];

        try {
          showGlobalLoading('text-generate-btn');
          const data = await query({ messages, model });
          hideGlobalLoading('text-generate-btn');

          if (data?.choices?.length && data.choices[0].message?.content) {
            textAiOutput.classList.remove('ai-output-loading');
            textAiOutput.placeholder = '';
            addAchievement('text_generator', 'Generador de texto', 'Generaste tu primer texto con IA');
            animateTextAnswer(data.choices[0].message.content);
          } else if (data.error) {
            textAiOutput.classList.remove('ai-output-loading');
            textAiOutput.value = 'AI Error: ' + data.error;
            textAiOutput.placeholder = '';
            resetTextButtonState();
          } else {
            textAiOutput.classList.remove('ai-output-loading');
            textAiOutput.value = 'AI did not return a valid response.';
            textAiOutput.placeholder = '';
            resetTextButtonState();
          }
        } catch (error) {
          hideGlobalLoading('text-generate-btn');
          textAiOutput.classList.remove('ai-output-loading');
          textAiOutput.value = 'Error calling AI: ' + error.message;
          textAiOutput.placeholder = '';
          resetTextButtonState();
        }
      }

      function animateTextAnswer(text) {
        textAiOutput.value = '';
        textAnimationText = text;
        textAnimationIndex = 0;

        textStopBtn.style.display = 'inline-flex';
        textCopyBtn.style.display = 'none';
        textDownloadBtn.style.display = 'none';
        textShareBtn.style.display = 'none';

        textCurrentAnimation = setInterval(() => {
          if (textAnimationIndex >= textAnimationText.length) {
            clearInterval(textCurrentAnimation);
            textCurrentAnimation = null;
            resetTextButtonState();
            textStopBtn.style.display = 'none';
            textCopyBtn.style.display = 'inline-flex';
            textDownloadBtn.style.display = 'inline-flex';
            textShareBtn.style.display = 'inline-flex';
            textIconSvg.style.display = 'inline';
            textBtnTextSpan.textContent = '';
            return;
          }
          textAiOutput.value += textAnimationText.charAt(textAnimationIndex);
          textAiOutput.style.height = textAiOutput.scrollHeight + 'px';
          textAnimationIndex++;
        }, 15);
      }

      // Action buttons
      if (textCopyBtn) {
        textCopyBtn.addEventListener('click', () => {
          if (!textAiOutput.value) return;
          navigator.clipboard.writeText(textAiOutput.value).then(() => {
            alert('Text copied to clipboard');
            addAchievement('text_copy_master', 'Maestro del copiado de texto', 'Copiaste texto generado por IA');
          }).catch(err => {
            alert('Error copying to clipboard: ' + err);
          });
        });
      }

      if (textDownloadBtn) {
        textDownloadBtn.addEventListener('click', () => {
          if (!textAiOutput.value) return;
          
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const textType = textTypeSelect ? textTypeSelect.value : 'text';
          const filename = `ai-generated-${textType}-${timestamp}.txt`;
          const content = textAiOutput.value;
          
          const blob = new Blob([content], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          addAchievement('text_download_master', 'Maestro de descarga de texto', 'Descargaste texto generado por IA');
        });
      }

      if (textShareBtn) {
        textShareBtn.addEventListener('click', async () => {
          if (!textAiOutput.value) return;
          
          if (navigator.share) {
            try {
              await navigator.share({
                title: 'AI Generated Text from AIWORK',
                text: textAiOutput.value,
                url: window.location.href
              });
              addAchievement('text_share_master', 'Maestro del compartir texto', 'Compartiste texto generado por IA');
            } catch (err) {
              if (err.name !== 'AbortError') {
                console.error('Error sharing:', err);
              }
            }
          } else {
            const shareText = `Check out this AI generated text from AIWORK:\n\n${textAiOutput.value}\n\nGenerated at: ${window.location.href}`;
            navigator.clipboard.writeText(shareText).then(() => {
              alert('Text and link copied to clipboard for sharing!');
              addAchievement('text_share_master', 'Maestro del compartir texto', 'Compartiste texto generado por IA');
            }).catch(err => {
              alert('Error copying to clipboard: ' + err);
            });
          }
        });
      }

      if (textStopBtn) {
        textStopBtn.addEventListener('click', () => {
          if (textCurrentAnimation) {
            clearInterval(textCurrentAnimation);
            textCurrentAnimation = null;
            resetTextButtonState();
            textStopBtn.style.display = 'none';
            textCopyBtn.style.display = 'inline-flex';
            textDownloadBtn.style.display = 'inline-flex';
            textShareBtn.style.display = 'inline-flex';
          }
        });
      }
    }
  }

  // ===== CHAT BOT MODULE =====
  function initChatBot() {
    const chatLangSelect = document.getElementById('chat-lang-select');
    const chatModelSelect = document.getElementById('chat-model-select');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatImageInput = document.getElementById('chat-image-input');
    const chatImagePreview = document.getElementById('chat-image-preview');
    const chatClearBtn = document.getElementById('chat-clear-btn');
    const chatExportBtn = document.getElementById('chat-export-btn');
    const chatShareBtn = document.getElementById('chat-share-btn');

    // Máximo de caracteres mostrados inicialmente en la UI para respuestas del bot
    const MAX_CHAT_RESPONSE_LENGTH = 1200;

    let chatHistory = [];
    let chatIsProcessing = false;
    let chatCurrentImage = null;

    // Sync language with main selector
    if (langSelect) {
      langSelect.addEventListener('change', () => {
        if (chatLangSelect) {
          chatLangSelect.value = langSelect.value;
        }
      });
    }

    if (chatLangSelect) {
      chatLangSelect.addEventListener('change', () => {
        if (langSelect) {
          langSelect.value = chatLangSelect.value;
        }
      });
    }

    function getChatSelectedLang() {
      return (chatLangSelect && chatLangSelect.value) ? chatLangSelect.value : 'en';
    }

    function formatTime() {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Truncate a text to a maximum number of words and append ellipsis if truncated
    function truncateWords(text, maxWords) {
      if (!text) return text;
      const words = text.trim().split(/\s+/);
      if (words.length <= maxWords) return text;
      return words.slice(0, maxWords).join(' ') + '...';
    }

    // Handle image upload — only allow when NVIDIA Nemotron model is selected
    if (chatImageInput) {
      function updateChatImageAvailability() {
        const selectedModel = (chatModelSelect && chatModelSelect.value) ? chatModelSelect.value : NEMOTRON_MODEL;
        const allowed = selectedModel === NEMOTRON_MODEL;
        try { chatImageInput.disabled = !allowed; } catch (e) {}
        if (!allowed) {
          chatCurrentImage = null;
          if (chatImagePreview) {
            chatImagePreview.style.display = 'none';
            chatImagePreview.innerHTML = '';
          }
          try { chatImageInput.value = ''; } catch (e) {}
        }
      }

      if (chatModelSelect) chatModelSelect.addEventListener('change', updateChatImageAvailability);
      updateChatImageAvailability();

      chatImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const selectedModel = (chatModelSelect && chatModelSelect.value) ? chatModelSelect.value : NEMOTRON_MODEL;
        if (selectedModel !== NEMOTRON_MODEL) {
          alert('Image uploads are only supported when using the NVIDIA Nemotron model. Please select that model to send images.');
          try { chatImageInput.value = ''; } catch (err) {}
          return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
          chatCurrentImage = ev.target.result;
          showImagePreview(file);
        };
        reader.readAsDataURL(file);
      });
    }

    function showImagePreview(file) {
      if (chatImagePreview) {
        chatImagePreview.style.display = 'flex';
        chatImagePreview.innerHTML = `
          <div class="chat-image-item">
            <img src="${chatCurrentImage}" alt="Preview" />
            <button class="remove-image" onclick="removeImagePreview()">×</button>
          </div>
        `;
      }
    }

    // Make removeImagePreview global so it can be called from onclick
    window.removeImagePreview = function() {
      chatCurrentImage = null;
      if (chatImagePreview) {
        chatImagePreview.style.display = 'none';
        chatImagePreview.innerHTML = '';
      }
      if (chatImageInput) {
        chatImageInput.value = '';
      }
    };

    function addMessage(content, isBot = false, isTyping = false, imageUrl = null) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${isBot ? 'bot-message' : 'user-message'}`;
      
      const avatar = document.createElement('div');
      avatar.className = 'message-avatar';
      avatar.innerHTML = isBot ? 
        `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM12 14.2C9.5 14.2 7.5 16.2 7.5 18.7V20H16.5V18.7C16.5 16.2 14.5 14.2 12 14.2ZM12 7C14.21 7 16 8.79 16 11C16 13.21 14.21 15 12 15C9.79 15 8 13.21 8 11C8 8.79 9.79 7 12 7Z"/>
        </svg>` : 
        `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM12 14.2C9.5 14.2 7.5 16.2 7.5 18.7V20H16.5V18.7C16.5 16.2 14.5 14.2 12 14.2ZM12 7C14.21 7 16 8.79 16 11C16 13.21 14.21 15 12 15C9.79 15 8 13.21 8 11C8 8.79 9.79 7 12 7Z"/>
        </svg>`;
      
      const messageContent = document.createElement('div');
      messageContent.className = 'message-content';
      
      // Add image if present
      if (imageUrl) {
        const imageElement = document.createElement('img');
        imageElement.src = imageUrl;
        imageElement.style.cssText = 'max-width: 200px; max-height: 150px; border-radius: 8px; margin-bottom: 0.5rem; display: block;';
        messageContent.appendChild(imageElement);
      }
      
  // Use a container that can hold block-level HTML produced from markdown
  const messageText = document.createElement('div');
  messageText.className = 'message-text';

  // Mostrar siempre el texto completo para mensajes del bot (sin animación ni botones)
  // If content is string, render markdown -> HTML (sanitized), otherwise stringify
  const raw = (typeof content === 'string') ? content : String(content);
  messageText.innerHTML = renderMarkdownToHtml(raw);
      
      const messageTime = document.createElement('span');
      messageTime.className = 'message-time';
      messageTime.textContent = formatTime();
      
      messageContent.appendChild(messageText);
      messageContent.appendChild(messageTime);

      // No agregar botones extra ni truncar: el chat mostrará la respuesta completa de inmediato
      
      messageDiv.appendChild(avatar);
      messageDiv.appendChild(messageContent);
      
      if (isTyping) {
        messageDiv.classList.add('typing');
      }
      
      chatMessages.appendChild(messageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      
      return messageDiv;
    }

    function animateBotMessage(messageDiv, fullText) {
      // For the chat bot we no longer animate typing: just show full text immediately
      const textElement = messageDiv.querySelector('.message-text');
      messageDiv.classList.remove('typing');
      const raw = fullText || '';
      textElement.innerHTML = renderMarkdownToHtml(raw);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Lightweight markdown -> sanitized HTML renderer (supports **bold**, *italic*, `code`, ```code blocks```, links, lists)
    function escapeHtml(str) {
      return str.replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    }

    function renderMarkdownToHtml(md) {
      if (!md) return '';
      // If marked + DOMPurify are available prefer them for full-featured parsing + secure sanitization
      try {
        if (typeof window !== 'undefined' && window.marked && window.DOMPurify) {
          // marked.parse returns HTML string
          const rawHtml = window.marked.parse(md);
          return window.DOMPurify.sanitize(rawHtml, {USE_PROFILES: {html: true}});
        }
      } catch (e) {
        // fall back to lightweight renderer below on any error
        console.warn('Marked/DOMPurify render failed, falling back:', e);
      }

      // Fallback lightweight renderer (keeps previous behavior)
      // Normalize line endings
      let s = md.replace(/\r\n?/g, '\n');
      s = escapeHtml(s);
      s = s.replace(/```([\s\S]*?)```/g, (m, code) => '<pre><code>' + code.replace(/</g, '&lt;') + '</code></pre>');
      s = s.replace(/`([^`]+)`/g, (m, code) => `<code>${code}</code>`);
      s = s.replace(/\*\*([^*]+)\*\*/g, (m, t) => `<strong>${t}</strong>`);
      s = s.replace(/__([^_]+)__/g, (m, t) => `<strong>${t}</strong>`);
      s = s.replace(/\*([^*]+)\*/g, (m, t) => `<em>${t}</em>`);
      s = s.replace(/_([^_]+)_/g, (m, t) => `<em>${t}</em>`);
      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, url) => {
        const safeUrl = url.replace(/"/g, '');
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      });
      const lines = s.split('\n');
      let out = [];
      let inList = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (/^[-*]\s+/.test(trimmed)) {
          if (!inList) { out.push('<ul>'); inList = true; }
          out.push('<li>' + trimmed.replace(/^[-*]\s+/, '') + '</li>');
        } else {
          if (inList) { out.push('</ul>'); inList = false; }
          if (trimmed === '') {
            out.push('<p></p>');
          } else {
            out.push('<p>' + trimmed + '</p>');
          }
        }
      }
      if (inList) out.push('</ul>');
      let html = out.join('');
      html = html.replace(/<p><\/p>/g, '');
      html = html.replace(/<p>(.*?)<\/p>/g, (m, p) => '<p>' + p.replace(/\n/g, '<br>') + '</p>');
      return html;
    }

    

    async function sendMessage() {
      const message = chatInput.value.trim();
      if (!message || chatIsProcessing) return;

      chatIsProcessing = true;
      chatSendBtn.disabled = true;

      // Add user message visually (preview in chat). The actual API payload will be prepared after
      // we check which model is selected (to determine if images are allowed).
      addMessage(message, false, false, chatCurrentImage);
      const hasImage = !!chatCurrentImage;
      const currentImageUrl = chatCurrentImage;

      // Add typing indicator
      const typingMessage = addMessage('Typing...', true, true);

      try {
  // Use selected chat model (fall back to NVIDIA Nemotron Vision)
  const model = (chatModelSelect && chatModelSelect.value) ? chatModelSelect.value : "nvidia/nemotron-nano-12b-v2-vl:free";
        const selectedLang = getChatSelectedLang();
        
        // Decide whether to include image in the API payload depending on selected model
        let userMessageContent;
        if (hasImage && model === NEMOTRON_MODEL) {
          userMessageContent = [];
          userMessageContent.push({ type: 'text', text: message });
          userMessageContent.push({ type: 'image_url', image_url: { url: currentImageUrl } });
        } else {
          if (hasImage && model !== NEMOTRON_MODEL) {
            // Inform user that image won't be sent with the selected model
            alert('Image uploads are only supported when using the NVIDIA Nemotron model. The image will not be sent with this request.');
          }
          userMessageContent = message;
        }

        // Push the prepared user content to history and clear the input/preview
        const systemMessage = `You are a helpful AI assistant. Please respond in ${languageNames[selectedLang]}. Be conversational, friendly, and helpful. Keep answers concise and focused. Limit responses to ~200 words or ${MAX_CHAT_RESPONSE_LENGTH} characters. If more detail is needed, provide a short summary first and offer to expand.`;
        
        let messages;
        if (hasImage) {
          // For image messages, use multimodal format like the image analyzer
          const systemContent = [{ type: 'text', text: systemMessage }];
          // push the user message content we prepared
          chatHistory.push({ role: 'user', content: userMessageContent });
          messages = [
            { role: 'system', content: systemContent },
            ...chatHistory
          ];
        } else {
          // For text-only messages, use same format but without images
          const systemContent = [{ type: 'text', text: systemMessage }];
          // push the user message content we prepared
          chatHistory.push({ role: 'user', content: userMessageContent });
          messages = [
            { role: 'system', content: systemContent },
            ...chatHistory
          ];
        }

        // Clear input and any image preview after the message was recorded
        chatInput.value = '';
        chatInput.style.height = 'auto';
        if (hasImage) {
          window.removeImagePreview();
        }

  // Show overlay while waiting for chat response
  showGlobalLoading('chat-send-btn');
  const data = await query({ messages, model });
  // Remove typing indicator
  chatMessages.removeChild(typingMessage);
  // Hide overlay after we get a response
  hideGlobalLoading('chat-send-btn');
        if (data?.choices?.length && data.choices[0].message?.content) {
          // Normalize the AI response to a string
          let raw = data.choices[0].message.content;
          if (Array.isArray(raw)) {
            raw = raw.map(item => (typeof item === 'string' ? item : JSON.stringify(item))).join(' ');
          } else if (typeof raw !== 'string') {
            raw = String(raw);
          }

          // Truncate to the configured word limit for natural-length replies
          const safeReply = truncateWords(raw, CHAT_REPLY_WORD_LIMIT);

          // Store truncated display content and keep full content available if needed
          chatHistory.push({ role: 'assistant', content: safeReply, fullContent: raw, time: Date.now() });

          // Add bot message (no typing animation)
          addMessage(safeReply, true);

          addAchievement('chat_master', 'Maestro del chat', 'Tuviste tu primera conversación con el chat bot');
        } else {
          // Show error when no valid response
          addMessage('Sorry, I encountered an error. Please try again.', true);
        }
      } catch (error) {
        // Remove typing indicator
        chatMessages.removeChild(typingMessage);
        hideGlobalLoading('chat-send-btn');
        addMessage('Sorry, I encountered an error: ' + error.message, true);
      }

      chatIsProcessing = false;
      chatSendBtn.disabled = false;
    }

    // Send button functionality
    if (chatSendBtn) {
      chatSendBtn.addEventListener('click', sendMessage);
    }

    // Enter key to send
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      // Auto-resize textarea
      chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
      });
    }

    // Clear chat functionality
    if (chatClearBtn) {
      chatClearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the chat history?')) {
          chatHistory = [];
          chatMessages.innerHTML = `
            <div class="message bot-message">
              <div class="message-avatar">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM12 14.2C9.5 14.2 7.5 16.2 7.5 18.7V20H16.5V18.7C16.5 16.2 14.5 14.2 12 14.2ZM12 7C14.21 7 16 8.79 16 11C16 13.21 14.21 15 12 15C9.79 15 8 13.21 8 11C8 8.79 9.79 7 12 7Z"/>
                </svg>
              </div>
              <div class="message-content">
                <p>Hello! I'm your AI assistant. How can I help you today?</p>
                <span class="message-time">${formatTime()}</span>
              </div>
            </div>
          `;
          addAchievement('chat_cleaner', 'Limpiador de chat', 'Limpiaste el historial de chat');
        }
      });
    }

    // Export chat functionality
    if (chatExportBtn) {
      chatExportBtn.addEventListener('click', () => {
        if (chatHistory.length === 0) {
          alert('No chat history to export.');
          return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `chat-history-${timestamp}.txt`;
        
        let content = `Chat History - AIWORK\nGenerated on: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;
        
        chatHistory.forEach((msg, index) => {
          const role = msg.role === 'user' ? 'You' : 'AI Assistant';
          content += `${role}: ${msg.content}\n\n`;
        });
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addAchievement('chat_export_master', 'Maestro de exportación de chat', 'Exportaste tu historial de chat');
      });
    }

    // Share chat functionality
    if (chatShareBtn) {
      chatShareBtn.addEventListener('click', async () => {
        if (chatHistory.length === 0) {
          alert('No chat history to share.');
          return;
        }

        let shareText = 'Check out my AI chat conversation from AIWORK:\n\n';
        
        chatHistory.slice(-3).forEach((msg) => {
          const role = msg.role === 'user' ? 'Me' : 'AI';
          shareText += `${role}: ${msg.content}\n\n`;
        });
        
        shareText += `\nGenerated at: ${window.location.href}`;

        if (navigator.share) {
          try {
            await navigator.share({
              title: 'AI Chat Conversation from AIWORK',
              text: shareText,
              url: window.location.href
            });
            addAchievement('chat_share_master', 'Maestro del compartir chat', 'Compartiste tu conversación de chat');
          } catch (err) {
            if (err.name !== 'AbortError') {
              console.error('Error sharing:', err);
            }
          }
        } else {
          navigator.clipboard.writeText(shareText).then(() => {
            alert('Chat conversation copied to clipboard for sharing!');
            addAchievement('chat_share_master', 'Maestro del compartir chat', 'Compartiste tu conversación de chat');
          }).catch(err => {
            alert('Error copying to clipboard: ' + err);
          });
        }
      });
    }
  }

  // Initialize modules when tabs are accessed
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-tab="chat-bot"]') || e.target.closest('[data-tab="chat-bot"]')) {
      setTimeout(initChatBot, 100); // Small delay to ensure DOM is ready
    }
    if (e.target.matches('[data-tab="pdf-analyzer"]') || e.target.closest('[data-tab="pdf-analyzer"]')) {
      setTimeout(initPDFAnalyzer, 100); // Initialize PDF analyzer
    }
    if (e.target.matches('[data-tab="code-assistant"]') || e.target.closest('[data-tab="code-assistant"]')) {
      setTimeout(() => {
        console.log('Code Assistant tab clicked, initializing...');
        initCodeAssistant();
      }, 100); // Initialize Code Assistant
    }
  });

  // ===== PDF ANALYZER MODULE =====
  function initPDFAnalyzer() {
    const pdfInput = document.getElementById('pdf-input');
    const pdfLangSelect = document.getElementById('pdf-lang-select');
    const pdfModelSelect = document.getElementById('pdf-model-select');
    const pdfPrompt = document.getElementById('pdf-prompt');
    const pdfAnalyzeBtn = document.getElementById('pdf-analyze-btn');
    const pdfPreview = document.getElementById('pdf-preview');
    const pdfPagesContainer = document.getElementById('pdf-pages-container');
    const pdfProgressSection = document.getElementById('pdf-progress-section');
    const pdfProgressFill = document.getElementById('pdf-progress-fill');
    const pdfProgressText = document.getElementById('pdf-progress-text');
    const pdfCurrentTask = document.getElementById('pdf-current-task');
    const pdfAiSection = document.getElementById('pdf-ai-section');
    const pdfAiOutput = document.getElementById('pdf-ai-output');
    const pdfCopyBtn = document.getElementById('pdf-copy-btn');
    const pdfDownloadBtn = document.getElementById('pdf-download-btn');
    const pdfShareBtn = document.getElementById('pdf-share-btn');

    let pdfDoc = null;
    let pdfPageImages = [];
    let isPdfProcessing = false;

    // Configure PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    }

    // Sync language selectors
    if (langSelect) {
      langSelect.addEventListener('change', () => {
        if (pdfLangSelect) pdfLangSelect.value = langSelect.value;
      });
    }
    if (pdfLangSelect) {
      pdfLangSelect.addEventListener('change', () => {
        if (langSelect) langSelect.value = pdfLangSelect.value;
      });
    }

    function getPdfSelectedLang() {
      return (pdfLangSelect && pdfLangSelect.value) ? pdfLangSelect.value : 'en';
    }

    // Handle PDF file upload
    if (pdfInput) {
      pdfInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
          await loadPDF(file);
        }
      });
    }

    async function loadPDF(file) {
      try {
        if (!pdfjsLib) {
          throw new Error('PDF.js library not loaded');
        }

        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        await renderPDFPages();
        
        if (pdfAnalyzeBtn) {
          pdfAnalyzeBtn.disabled = false;
        }
        
        addAchievement('pdf_loader', 'Cargador de PDF', 'Subiste tu primer documento PDF');
      } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF. Please try with a different file.');
      }
    }

    async function renderPDFPages() {
      if (!pdfDoc) return;

      pdfPagesContainer.innerHTML = '';
      pdfPageImages = [];
      
      if (pdfPreview) {
        pdfPreview.style.display = 'block';
      }

      const maxPages = Math.min(pdfDoc.numPages, 10); // Limit to 10 pages for performance
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 0.5 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          // Convert canvas to data URL
          const imageDataUrl = canvas.toDataURL('image/png');
          pdfPageImages.push(imageDataUrl);

          // Create preview element
          const pagePreview = document.createElement('div');
          pagePreview.className = 'pdf-page-preview';
          pagePreview.innerHTML = `
            <canvas width="${canvas.width}" height="${canvas.height}"></canvas>
            <p>Page ${pageNum}</p>
          `;
          
          const previewCanvas = pagePreview.querySelector('canvas');
          const previewContext = previewCanvas.getContext('2d');
          previewContext.drawImage(canvas, 0, 0);
          
          pdfPagesContainer.appendChild(pagePreview);
        } catch (error) {
          console.error(`Error rendering page ${pageNum}:`, error);
        }
      }
    }

    // Handle PDF analysis
    if (pdfAnalyzeBtn) {
      pdfAnalyzeBtn.addEventListener('click', analyzePDF);
    }

    async function analyzePDF() {
      if (isPdfProcessing) return;
      if (!pdfPageImages.length) {
        alert('Please upload a PDF first (Selecciona un PDF primero)');
        return;
      }

      const prompt = pdfPrompt.value.trim() || 'Please analyze this PDF document and summarize its content.';
      
      isPdfProcessing = true;
      pdfAnalyzeBtn.disabled = true;

      // Show progress
      if (pdfProgressSection) {
        pdfProgressSection.style.display = 'block';
      }
      if (pdfCurrentTask) {
        pdfCurrentTask.textContent = 'Analyzing PDF pages...';
      }

      try {
        const selectedLang = getPdfSelectedLang();
        const model = "nvidia/nemotron-nano-12b-v2-vl:free";

        // Prepare content for API
        const content = [{
          type: "text",
          text: `Please analyze the PDF document shown in these ${pdfPageImages.length} page images and answer: ${prompt}. Please respond in ${languageNames[selectedLang]}.`
        }];

        // Add all page images
        pdfPageImages.forEach((imageUrl, index) => {
          content.push({
            type: "image_url",
            image_url: { url: imageUrl }
          });
        });

        const systemContent = [{ type: 'text', text: `You are a helpful AI assistant that analyzes PDF documents. Please respond in ${languageNames[selectedLang]}.` }];
        
        const messages = [
          { role: 'system', content: systemContent },
          { role: 'user', content: content }
        ];

  updateProgress(50, 'Sending to AI...');
  showGlobalLoading('pdf-analyze-btn');
  const data = await query({ messages, model });
  hideGlobalLoading('pdf-analyze-btn');
  updateProgress(100, 'Complete!');

        // Hide progress, show results
        setTimeout(() => {
          if (pdfProgressSection) {
            pdfProgressSection.style.display = 'none';
          }
        }, 1000);

        if (data?.choices?.length && data.choices[0].message?.content) {
          const response = data.choices[0].message.content;
          
          if (pdfAiOutput) {
            pdfAiOutput.value = response;
          }
          
          if (pdfAiSection) {
            pdfAiSection.style.display = 'block';
          }
          
          // Show action buttons
          [pdfCopyBtn, pdfDownloadBtn, pdfShareBtn].forEach(btn => {
            if (btn) btn.style.display = 'inline-block';
          });

          addAchievement('pdf_analyzer', 'Analizador de PDF', 'Analizaste tu primer documento PDF con IA');
        } else {
          throw new Error('No response from AI');
        }
      } catch (error) {
        console.error('Error analyzing PDF:', error);
        alert('Error analyzing PDF: ' + error.message);
        
        if (pdfProgressSection) {
          pdfProgressSection.style.display = 'none';
        }
      }

      isPdfProcessing = false;
      pdfAnalyzeBtn.disabled = false;
    }

    function updateProgress(percentage, task) {
      if (pdfProgressFill) {
        pdfProgressFill.style.width = percentage + '%';
      }
      if (pdfProgressText) {
        pdfProgressText.textContent = percentage + '%';
      }
      if (pdfCurrentTask) {
        pdfCurrentTask.textContent = task;
      }
    }

    // Copy functionality
    if (pdfCopyBtn) {
      pdfCopyBtn.addEventListener('click', () => {
        if (pdfAiOutput) {
          navigator.clipboard.writeText(pdfAiOutput.value);
          addAchievement('copier', 'Copiador', 'Copiaste texto al portapapeles');
        }
      });
    }

    // Download functionality
    if (pdfDownloadBtn) {
      pdfDownloadBtn.addEventListener('click', () => {
        if (pdfAiOutput) {
          const blob = new Blob([pdfAiOutput.value], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'pdf-analysis.txt';
          a.click();
          URL.revokeObjectURL(url);
          addAchievement('downloader', 'Descargador', 'Descargaste un archivo de texto');
        }
      });
    }

    // Share functionality
    if (pdfShareBtn) {
      pdfShareBtn.addEventListener('click', () => {
        if (navigator.share && pdfAiOutput) {
          navigator.share({
            title: 'PDF Analysis Result',
            text: pdfAiOutput.value
          });
        }
      });
    }
  }

  // ===== CODE ASSISTANT MODULE =====
  function initCodeAssistant() {
    console.log('=== INITIALIZING CODE ASSISTANT ===');
    
    const codeLangSelect = document.getElementById('code-lang-select');
    const codeTaskSelect = document.getElementById('code-task-select');
    const codeModelSelect = document.getElementById('code-model-select');
    const codePrompt = document.getElementById('code-prompt');
    const existingCode = document.getElementById('existing-code');
    const existingCodeGroup = document.getElementById('existing-code-group');
    const codeGenerateBtn = document.getElementById('code-generate-btn');
    const codeAiSection = document.getElementById('code-ai-section');
    const codeAiOutput = document.getElementById('code-ai-output');
    const codeLanguageIndicator = document.getElementById('code-language-indicator');
    const codeCopyBtn = document.getElementById('code-copy-btn');
    const codeDownloadBtn = document.getElementById('code-download-btn');
    const codeShareBtn = document.getElementById('code-share-btn');
    
    console.log('Code Assistant elements found:', {
      codeLangSelect: !!codeLangSelect,
      codeTaskSelect: !!codeTaskSelect,
      codePrompt: !!codePrompt,
      codeGenerateBtn: !!codeGenerateBtn,
      codeAiSection: !!codeAiSection,
      codeAiOutput: !!codeAiOutput,
      codeLanguageIndicator: !!codeLanguageIndicator
    });

    let isCodeProcessing = false;

    // Language mappings for file extensions and Prism
    const languageMap = {
      'javascript': { ext: 'js', prism: 'javascript', name: 'JavaScript' },
      'python': { ext: 'py', prism: 'python', name: 'Python' },
      'html': { ext: 'html', prism: 'html', name: 'HTML' },
      'css': { ext: 'css', prism: 'css', name: 'CSS' },
      'java': { ext: 'java', prism: 'java', name: 'Java' },
      'cpp': { ext: 'cpp', prism: 'cpp', name: 'C++' },
      'csharp': { ext: 'cs', prism: 'csharp', name: 'C#' },
      'php': { ext: 'php', prism: 'php', name: 'PHP' },
      'sql': { ext: 'sql', prism: 'sql', name: 'SQL' },
      'other': { ext: 'txt', prism: 'text', name: 'Text' }
    };

    // Show/hide existing code field based on task type
    if (codeTaskSelect) {
      codeTaskSelect.addEventListener('change', () => {
        const task = codeTaskSelect.value;
        const showExistingCode = ['debug', 'optimize', 'explain', 'convert'].includes(task);
        
        if (existingCodeGroup) {
          existingCodeGroup.style.display = showExistingCode ? 'block' : 'none';
        }
      });
    }

    // Update language indicator when language changes
    if (codeLangSelect) {
      codeLangSelect.addEventListener('change', () => {
        if (codeLanguageIndicator) {
          const lang = codeLangSelect.value;
          codeLanguageIndicator.textContent = languageMap[lang]?.name || 'Text';
        }
      });
    }

    // Handle code generation
    if (codeGenerateBtn) {
      console.log('Code generate button found, adding event listener');
      
      // Remove any existing event listeners to prevent duplicates
      codeGenerateBtn.removeEventListener('click', generateCode);
      codeGenerateBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Code generate button clicked');
        generateCode();
      });
      
      console.log('Event listener added to code generate button');
    } else {
      console.error('Code generate button not found');
    }

    async function generateCode() {
      console.log('Generate code function called');
      
      if (!codePrompt) {
        console.error('Code prompt element not found');
        return;
      }
      
      if (isCodeProcessing) {
        console.log('Already processing, ignoring click');
        return;
      }

      const prompt = codePrompt.value.trim();
      console.log('Prompt value:', prompt);
      
      if (!prompt) {
        alert('Please describe what you want to code.');
        return;
      }

      isCodeProcessing = true;
      codeGenerateBtn.disabled = true;
      console.log('Starting code generation process...');

      try {
  const language = codeLangSelect?.value || 'javascript';
  const task = codeTaskSelect?.value || 'function';
  const existing = existingCode?.value?.trim() || '';
  const model = (codeModelSelect && codeModelSelect.value) ? codeModelSelect.value : "nvidia/nemotron-nano-12b-v2-vl:free";

        // Build the prompt based on task type
        let fullPrompt = '';
        const langName = languageMap[language]?.name || language;

        switch (task) {
          case 'function':
            fullPrompt = `Create a ${langName} function that ${prompt}. Provide clean, well-commented code with proper error handling.`;
            break;
          case 'class':
            fullPrompt = `Create a ${langName} class that ${prompt}. Include constructor, methods, and proper documentation.`;
            break;
          case 'algorithm':
            fullPrompt = `Write a ${langName} algorithm that ${prompt}. Focus on efficiency and clarity.`;
            break;
          case 'debug':
            fullPrompt = `Debug this ${langName} code and fix any issues:\n\n${existing}\n\nProblem: ${prompt}\n\nProvide the corrected code with explanations.`;
            break;
          case 'optimize':
            fullPrompt = `Optimize this ${langName} code for better performance:\n\n${existing}\n\nOptimization goal: ${prompt}\n\nProvide the optimized version.`;
            break;
          case 'explain':
            fullPrompt = `Explain this ${langName} code in detail:\n\n${existing}\n\nSpecific question: ${prompt}`;
            break;
          case 'convert':
            fullPrompt = `Convert this code to ${langName}:\n\n${existing}\n\nAdditional requirements: ${prompt}`;
            break;
          default:
            fullPrompt = `${prompt} in ${langName}. Provide clean, well-documented code.`;
        }

        // Prepare messages for API - use simple text format for code assistant
        const systemMessage = `You are an expert programmer. Always provide complete, working code with proper formatting, comments, and best practices. Format your response as clean code without markdown code blocks - just the raw code.`;
        
        const messages = [
          { role: 'system', content: systemMessage },
          { role: 'user', content: fullPrompt }
        ];

  console.log('Sending API request with:', { messages, model });
  showGlobalLoading('code-generate-btn');
  const data = await query({ messages, model });
  hideGlobalLoading('code-generate-btn');
        console.log('API response received:', data);

        if (data?.choices?.length && data.choices[0].message?.content) {
          let response = data.choices[0].message.content;
          console.log('Raw response:', response);
          
          // Clean up the response - remove markdown code blocks if present
          response = response.replace(/```[\w]*\n?/g, '').replace(/```/g, '');
          response = response.trim();
          console.log('Cleaned response:', response);
          
          // Update the code output
          if (codeAiOutput && codeLanguageIndicator) {
            console.log('Updating code output elements');
            const codeElement = codeAiOutput.querySelector('code');
            if (codeElement) {
              codeElement.textContent = response;
              codeElement.className = `language-${languageMap[language]?.prism || 'text'}`;
              console.log('Code element updated with class:', codeElement.className);
            } else {
              console.error('Code element not found inside codeAiOutput');
            }
            
            // Update language indicator
            codeLanguageIndicator.textContent = languageMap[language]?.name || 'Text';
            console.log('Language indicator updated to:', languageMap[language]?.name || 'Text');
            
            // Apply syntax highlighting if Prism is available
            if (typeof Prism !== 'undefined') {
              console.log('Applying Prism syntax highlighting');
              Prism.highlightElement(codeElement);
            } else {
              console.log('Prism not available for syntax highlighting');
            }
          } else {
            console.error('Code output elements not found:', { codeAiOutput: !!codeAiOutput, codeLanguageIndicator: !!codeLanguageIndicator });
          }
          
          // Show results section
          if (codeAiSection) {
            console.log('Showing code AI section');
            codeAiSection.style.display = 'block';
          } else {
            console.error('Code AI section not found');
          }
          
          // Show action buttons
          [codeCopyBtn, codeDownloadBtn, codeShareBtn].forEach(btn => {
            if (btn) {
              btn.style.display = 'inline-block';
              console.log('Showed button:', btn.id);
            }
          });

          addAchievement('code_generator', 'Generador de código', 'Generaste tu primer código con IA');
          console.log('Code generation completed successfully');
        } else {
          console.error('No valid response from AI:', data);
          throw new Error('No response from AI');
        }
      } catch (error) {
        console.error('Error generating code:', error);
        alert('Error generating code: ' + error.message);
      }

      isCodeProcessing = false;
      codeGenerateBtn.disabled = false;
    }

    // Copy functionality
    if (codeCopyBtn) {
      codeCopyBtn.addEventListener('click', () => {
        const codeElement = codeAiOutput?.querySelector('code');
        if (codeElement) {
          navigator.clipboard.writeText(codeElement.textContent);
          addAchievement('copier', 'Copiador', 'Copiaste código al portapapeles');
        }
      });
    }

    // Download functionality
    if (codeDownloadBtn) {
      codeDownloadBtn.addEventListener('click', () => {
        const codeElement = codeAiOutput?.querySelector('code');
        if (codeElement) {
          const language = codeLangSelect?.value || 'javascript';
          const extension = languageMap[language]?.ext || 'txt';
          const blob = new Blob([codeElement.textContent], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `generated-code.${extension}`;
          a.click();
          URL.revokeObjectURL(url);
          addAchievement('downloader', 'Descargador', 'Descargaste un archivo de código');
        }
      });
    }

    // Share functionality
    if (codeShareBtn) {
      codeShareBtn.addEventListener('click', () => {
        const codeElement = codeAiOutput?.querySelector('code');
        if (navigator.share && codeElement) {
          navigator.share({
            title: 'Generated Code',
            text: codeElement.textContent
          });
        }
      });
    }
  }

  function createOcrWorker() {
    const workerUrl = new URL('js/ocr-worker.js', location.href).href;
    return new Worker(workerUrl);
  }
});

