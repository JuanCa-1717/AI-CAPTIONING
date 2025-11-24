window.addEventListener('load', () => {
  const fileInput = document.getElementById('file-input');
  const langSelect = document.getElementById('lang-select');
  const userPrompt = document.getElementById('user-prompt');
  const startBtn = document.getElementById('start-btn');
  const aiSection = document.getElementById('ai-section');
  const aiOutput = document.getElementById('ai-output');
  const copyBtn = document.getElementById('copy-btn');
  const stopBtn = document.getElementById('stop-btn');
  const imageList = document.getElementById('image-list');
  const promptLabel = document.getElementById('prompt-label');
  const mainTitle = document.querySelector('.title');

  let ocrText = '';
  let imageUrls = [];
  let isProcessing = false;
  let currentAnimation = null;
  let ocrSuccessful = false;
  let animationText = '';
  let animationIndex = 0;

  // Apply saved profile color immediately so UI uses user's accent across pages
  try {
    const savedProfile = JSON.parse(localStorage.getItem('profile') || '{}');
    if (savedProfile && savedProfile.color) {
      document.documentElement.style.setProperty('--accent', savedProfile.color);
    }
  } catch (e) {
    console.warn('Could not read saved profile for accent color', e);
  }

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
    imageList.innerHTML = ''; // limpiar lista

    const files = Array.from(fileInput.files);
    // Award first upload achievement
    if (files.length > 0) {
      addAchievement('first_upload', 'Tu primera subida de imágenes', 'Subiste imágenes por primera vez');
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
  });

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

  try {
      const files = Array.from(fileInput.files);
      imageUrls = [];
      const extractedTexts = [];

      for (const file of files) {
        try {
          const compressedFile = await compressImage(file);
          const dataUrl = await fileToDataURL(compressedFile);
          imageUrls.push(dataUrl);

          try {
            const text = await extractOCR(compressedFile);
            if (hasValidText(text.trim())) {
              extractedTexts.push(`From ${file.name}:\n${text.trim()}`);
              console.log(`OCR successful for ${file.name}`);
            }
          } catch (e) {
            console.log(`OCR failed for ${file.name}:`, e.message);
          }
        } catch (e) {
          console.log(`Skipping ${file.name} due to processing error:`, e.message);
        }
      }

  ocrText = extractedTexts.join('\n\n---\n\n');
      ocrSuccessful = extractedTexts.length > 0;
      if (ocrSuccessful) {
        console.log('Some OCR text was extracted - including in prompt');
        // award first OCR achievement
        addAchievement('first_ocr', 'Tu primera extracción de texto', 'Has extraído texto de una imagen');
      } else {
        console.log('No useful OCR text extracted - image-only mode');
      }

      await sendToAI();
    } catch (err) {
      alert(t('error_processing') + err.message);
      resetButtonState();
    }
  });

  copyBtn.addEventListener('click', () => {
    if (!aiOutput.value) return;
    navigator.clipboard.writeText(aiOutput.value).then(() => {
      alert(t('copied'));
    }).catch(err => {
      alert(t('error_copy') + ': ' + err);
    });
  });

  stopBtn.addEventListener('click', () => {
    if (currentAnimation) {
      clearInterval(currentAnimation);
      currentAnimation = null;
      resetButtonState();
      stopBtn.style.display = 'none';
      copyBtn.style.display = 'inline-flex';
    }
  });

  function resetButtonState() {
    isProcessing = false;
    startBtn.disabled = false;
    startBtn.classList.remove('loading');
    btnTextSpan.textContent = '';
    spinner.style.display = 'none';
    iconSvg.style.display = 'inline'; // Mostrar icono nuevamente
  }

  function compressImage(file, maxWidth = 800, maxHeight = 600, quality = 0.8) {
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

  function extractOCR(file) {
    return new Promise((resolve, reject) => {
      const tessLang = getTessLang();
      Tesseract.recognize(file, tessLang, { logger: m => console.log(m) })
        .then(({ data: { text } }) => {
          if (!text || text.trim().length === 0) {
            reject(new Error('No text detected in image'));
            return;
          }
          resolve(text);
        }).catch(reject);
    });
  }

  async function query(data) {
    // If an OpenRouter key is present in localStorage use openrouter.ai so you
    // can pick different models (mistral, gemini, gemma, llama). Otherwise
    // fall back to the existing Hugging Face router.
    const openRouterKey = localStorage.getItem('openrouter_key');
    if (openRouterKey) {
      const headers = {
        Authorization: `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        // optional metadata used by openrouter for rankings/credits
        'HTTP-Referer': window.location.origin,
        'X-Title': document.title || ''
      };
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({ model: data.model, messages: data.messages || data.messages || data })
      });
      if (!resp.ok) {
        if (resp.status === 413) throw new Error('Image too large for API. Please use a smaller image.');
        const errText = await resp.text();
        throw new Error(`OpenRouter API Error ${resp.status}: ${errText}`);
      }
      return resp.json();
    }

    // Fallback: Hugging Face router (existing behaviour)
    const response = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        headers: {
          Authorization: "Bearer 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",
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      if (response.status === 413)
        throw new Error('Image too large for API. Please use a smaller image.');
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    return response.json();
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
    stopBtn.style.display = 'none';

  let messages;
  // Add a system instruction so the model replies in the selected language
  const selectedLang = getSelectedLang();
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

    const model = "google/gemma-3-27b-it";

    try {
      const data = await query({ messages, model });

      if (data?.choices?.length && data.choices[0].message?.content) {
        aiOutput.classList.remove('ai-output-loading');
        aiOutput.placeholder = '';
        // award first AI response achievement
        addAchievement('first_ai_response', 'Primera respuesta de la IA', 'Recibiste tu primera respuesta del modelo AI');
        animateAnswer(data.choices[0].message.content);
      } else if (data.error) {
        aiOutput.classList.remove('ai-output-loading');
        aiOutput.value = t('ai_error') + ' ' + data.error;
        aiOutput.placeholder = '';
        resetButtonState();
      } else {
        aiOutput.classList.remove('ai-output-loading');
        aiOutput.value = t('ai_no_response');
        aiOutput.placeholder = '';
        resetButtonState();
      }
    } catch (error) {
      aiOutput.classList.remove('ai-output-loading');
      aiOutput.value = t('error_calling_ai') + ': ' + error.message;
      aiOutput.placeholder = '';
      resetButtonState();
    }
  }

  function animateAnswer(text) {
    aiOutput.value = '';
    animationText = text;
    animationIndex = 0;

    stopBtn.style.display = 'inline-flex';
    copyBtn.style.display = 'none';

    currentAnimation = setInterval(() => {
      if (animationIndex >= animationText.length) {
        clearInterval(currentAnimation);
        currentAnimation = null;
        resetButtonState();
        stopBtn.style.display = 'none';
        copyBtn.style.display = 'inline-flex';
        iconSvg.style.display = 'inline'; // Mostrar icono al finalizar
        btnTextSpan.textContent = '';
        return;
      }
      aiOutput.value += animationText.charAt(animationIndex);
      aiOutput.style.height = aiOutput.scrollHeight + 'px';
      animationIndex++;
    }, 15);
  }
});
