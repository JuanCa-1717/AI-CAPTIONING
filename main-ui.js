// main-ui.js
// All UI-related JavaScript moved from index.html
console.log('main-ui.js loaded', { version: 'debug-search-1' });

// --- Global modal message helper ---
function showMessage(msg) {
  const modal = document.getElementById('firebase-message-modal');
  const content = document.getElementById('firebase-message-content');
  if (content) content.textContent = msg;
  if (modal) modal.style.display = 'flex';
}

// --- Firebase Auth and UI Logic ---
// Global state for a single persistent conversation
const CONVERSATION_KEY_PREFIX = 'single_conversation_';
let currentUser = null;
let conversation = [];
let conversationKey = CONVERSATION_KEY_PREFIX + 'guest';
let chatMessagesContainer = null; // Referencia global para mensajes
let firebaseAuthReady = false;
let aiResponsePending = false;
let aiAbortController = null;
let chatInputContainerRef = null;
let mainTitleContainerRef = null;
// Selected images (data URLs) pending to be sent with the next message
let selectedImages = [];

function getConversationKeyForUser(user) {
  return user && user.uid ? `${CONVERSATION_KEY_PREFIX}${user.uid}` : `${CONVERSATION_KEY_PREFIX}guest`;
}

function loadConversation() {
  if (!conversationKey) return;
  const raw = localStorage.getItem(conversationKey);
  try {
    conversation = raw ? JSON.parse(raw) : [];
  } catch (e) {
    conversation = [];
  }
}

function saveConversation() {
  if (!conversationKey) return;
  localStorage.setItem(conversationKey, JSON.stringify(conversation));
}

function clearConversation() {
  conversation = [];
  saveConversation();
  if (chatMessagesContainer) {
    chatMessagesContainer.remove();
    chatMessagesContainer = null;
  }
  const preview = document.getElementById('attachment-preview');
  if (preview) preview.remove();
  selectedImages = [];
  setMainTitleVisible(true);
}

// Persist AI pending state across reloads so we can show modal if page reloads
function markAIPending() {
  try {
    localStorage.setItem('ai_response_pending', JSON.stringify({ pending: true, ts: Date.now() }));
  } catch (e) {}
}
function clearAIPending() {
  try { localStorage.removeItem('ai_response_pending'); } catch (e) {}
}

// Prevent accidental reload/navigation while AI response is pending
window.addEventListener('beforeunload', (e) => {
  try {
    const pending = aiResponsePending || (JSON.parse(localStorage.getItem('ai_response_pending') || 'null') || {}).pending;
    if (pending) {
      const msg = 'An AI response is in progress. Reloading or leaving will cancel it.';
      e.preventDefault();
      e.returnValue = msg; // Chrome requires returnValue to be set
      return msg;
    }
  } catch (err) {
    // ignore
  }
});

function getChatInputContainer() {
  return chatInputContainerRef || document.getElementById('chat-input-container');
}

function setMainTitleVisible(visible) {
  const el = mainTitleContainerRef || document.getElementById('main-title-container');
  if (!el) return;
  if (visible) {
    el.style.display = '';
    el.style.opacity = '1';
    el.style.transform = 'none';
    el.style.transition = '';
  } else {
    el.style.display = 'none';
  }
}

function ensureChatMessagesContainer() {
  if (chatMessagesContainer) return chatMessagesContainer;
  const chatInputContainer = getChatInputContainer();
  if (!chatInputContainer) return null;

  const container = document.createElement('div');
  container.id = 'chat-messages';
  container.style.width = '100%';
  container.style.maxWidth = '700px';
  container.style.margin = '0 auto';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '12px';
  container.style.padding = '32px 0 16px 0';
  container.style.maxHeight = '480px';
  container.style.minHeight = '220px';
  container.style.overflowY = 'auto';
  container.style.background = 'transparent';
  container.style.scrollbarWidth = 'thin';
  container.style.scrollbarColor = '#98a6a9 #232e36';
  chatInputContainer.parentElement.insertBefore(container, chatInputContainer);
  chatMessagesContainer = container;

  if (!document.getElementById('chat-messages-scrollbar-style')) {
    const style = document.createElement('style');
    style.id = 'chat-messages-scrollbar-style';
    style.innerHTML = `
      #chat-messages::-webkit-scrollbar {
        width: 10px;
        background: #232e36;
        border-radius: 8px;
      }
      #chat-messages::-webkit-scrollbar-thumb {
        background: #98a6a9;
        border-radius: 8px;
        min-height: 40px;
      }
      #chat-messages::-webkit-scrollbar-thumb:hover {
        background: #ccd0cf;
      }
    `;
    document.head.appendChild(style);
  }

  return chatMessagesContainer;
}

function renderConversation() {
  if (!conversation || !conversation.length) {
    if (chatMessagesContainer) {
      chatMessagesContainer.remove();
      chatMessagesContainer = null;
    }
    setMainTitleVisible(true);
    return;
  }

  const container = ensureChatMessagesContainer();
  if (!container) return;
  setMainTitleVisible(false);
  container.innerHTML = '';
  conversation.forEach(msg => appendMessage(msg.text, msg.from, false, msg.attachments || []));
}

function appendMessage(text, from, save = true, attachments = []) {
  const container = ensureChatMessagesContainer();
  if (!container) return;
  const msg = document.createElement('div');
  msg.className = from === 'user' ? 'chat-msg-user' : 'chat-msg-ai';
  msg.style.alignSelf = from === 'user' ? 'flex-end' : 'flex-start';
  msg.style.background = from === 'user' ? 'rgba(204,208,207,0.12)' : 'rgba(152,166,169,0.10)';
  msg.style.color = from === 'user' ? '#ccd0cf' : '#98a6a9';
  msg.style.borderRadius = '16px';
  msg.style.padding = '10px 16px';
  msg.style.maxWidth = '80%';
  msg.style.fontSize = '1rem';
  msg.style.boxShadow = '0 2px 8px 0 rgba(0,0,0,0.04)';

  // Text
  if (text) {
    const textNode = document.createElement('div');
    if (from === 'ai') {
      textNode.innerHTML = renderAiTextToHtml(text);
    } else {
      textNode.textContent = text;
    }
    msg.appendChild(textNode);
  }

  // Attachments (thumbnails)
  if (attachments && attachments.length) {
    const attachContainer = document.createElement('div');
    attachContainer.style.display = 'flex';
    attachContainer.style.flexWrap = 'wrap';
    attachContainer.style.gap = '8px';
    attachContainer.style.marginTop = text ? '8px' : '0';
    attachments.forEach(att => {
      const img = document.createElement('img');
      img.src = att;
      img.style.maxWidth = '240px';
      img.style.maxHeight = '240px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '8px';
      img.style.boxShadow = '0 1px 6px rgba(0,0,0,0.12)';
      attachContainer.appendChild(img);
    });
    msg.appendChild(attachContainer);
  }

  chatMessagesContainer.appendChild(msg);
  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  // Save message in the single conversation (store attachments as data URLs)
  if (save) {
    conversation.push({ text, from, attachments: attachments || [] });
    saveConversation();
  }
}

function setPendingMessageStyle(messageEl, isPending) {
  if (!messageEl) return;
  if (isPending) {
    messageEl.classList.add('ai-pending');
    messageEl.style.opacity = '0.7';
    messageEl.style.filter = 'grayscale(0.3)';
  } else {
    messageEl.classList.remove('ai-pending');
    messageEl.style.opacity = '';
    messageEl.style.filter = '';
  }
}

function ensureAiLinkStyle() {
  if (document.getElementById('ai-link-style')) return;
  const style = document.createElement('style');
  style.id = 'ai-link-style';
  style.innerHTML = `
    .ai-link {
      color: #7fd4ff;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .ai-link:visited {
      color: #6fbbe2;
    }
  `;
  document.head.appendChild(style);
}

function escapeHtml(str) {
  return str.replace(/[&<>\"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

function linkifyText(text) {
  const urlRegex = /(https?:\/\/[^\s)\]]+)/g;
  return text.replace(urlRegex, (url) => {
    const safeUrl = url.replace(/"/g, '');
    return `<a class="ai-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`;
  });
}

function renderAiTextToHtml(text) {
  ensureAiLinkStyle();
  let safe = escapeHtml(String(text || ''));
  safe = safe.replace(/\s*target=&quot;_blank&quot;\s*rel=&quot;noopener noreferrer&quot;&gt;/g, '');
  safe = safe.replace(/\s*target="_blank"\s*rel="noopener noreferrer">/g, '');
  safe = safe.replace(/\s*target="_blank"\s*rel="noopener noreferrer"/g, '');
  safe = safe.replace(/\s*target=&quot;_blank&quot;\s*rel=&quot;noopener noreferrer&quot;/g, '');
  safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1');
  safe = safe.replace(/\[([^\]]+)\]\(\s*\)/g, '$1');
  safe = safe.replace(/https?:\/\/[^\s)\]]+/g, '');
  safe = safe.replace(/\(\s*\)/g, '');
  safe = safe.replace(/\*\*([^*]+)\*\*/g, (m, txt) => `<strong>${txt}</strong>`);
  safe = safe.replace(/\(?en\s+espa[nñ]ol\)?/gi, (m) => {
    return `<strong>${m.replace(/\(|\)/g, '')}</strong>`;
  });
  safe = safe.replace(/\s{2,}/g, ' ');
  safe = safe.replace(/\s+([,.;:])/g, '$1');
  safe = safe.replace(/([,.;:]){2,}/g, '$1');
  const lines = safe.split('\n');
  let out = [];
  let inList = false;
  let inOrderedList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^#{1,3}\s+/.test(trimmed)) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inOrderedList) { out.push('</ol>'); inOrderedList = false; }
      const headingText = trimmed.replace(/^#{1,3}\s+/, '');
      out.push('<p><strong>' + headingText + '</strong></p>');
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      if (inOrderedList) { out.push('</ol>'); inOrderedList = false; }
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push('<li>' + trimmed.replace(/^[-*]\s+/, '') + '</li>');
      continue;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (!inOrderedList) { out.push('<ol>'); inOrderedList = true; }
      out.push('<li>' + trimmed.replace(/^\d+\.\s+/, '') + '</li>');
      continue;
    }
    if (/^(---|\*\*\*|___)$/.test(trimmed)) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inOrderedList) { out.push('</ol>'); inOrderedList = false; }
      out.push('<hr>');
      continue;
    }
    if (inList) { out.push('</ul>'); inList = false; }
    if (inOrderedList) { out.push('</ol>'); inOrderedList = false; }
    if (trimmed === '') {
      out.push('<p></p>');
    } else {
      out.push('<p>' + trimmed + '</p>');
    }
  }
  if (inList) out.push('</ul>');
  if (inOrderedList) out.push('</ol>');
  let html = out.join('');
  html = html.replace(/<p><\/p>/g, '');
  return html;
}

function normalizeUrlLines(text) {
  const urlRegex = /(https?:\/\/[^\s)\]]+)/g;
  const lines = text.split('\n');
  const out = [];

  for (const line of lines) {
    if (line.includes('__AI_LINK_')) {
      out.push(line);
      continue;
    }

    const urls = line.match(urlRegex) || [];
    if (urls.length > 1) {
      const label = line.replace(urlRegex, '').trim().replace(/[:\-\s]+$/g, '');
      if (label) out.push(label + ':');
      urls.forEach(u => out.push(`- ${u}`));
      continue;
    }

    out.push(line);
  }

  return out.join('\n');
}

function renderSourcesHtml(webResults) {
  if (!Array.isArray(webResults) || !webResults.length) return '';
  const uniqueUrls = new Set();
  const items = [];
  webResults.forEach(item => {
    const url = item && item.url ? String(item.url).trim() : '';
    const title = item && item.title ? String(item.title).trim() : '';
    if (!url || uniqueUrls.has(url)) return;
    uniqueUrls.add(url);
    const label = title || url;
    items.push(`<li><a class="ai-link" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a></li>`);
  });
  if (!items.length) return '';
  return `<p><strong>Fuentes</strong></p><ol>${items.join('')}</ol>`;
}


// If page was reloaded while an AI response was pending, show modal
window.addEventListener('DOMContentLoaded', () => {
  try {
    const pending = JSON.parse(localStorage.getItem('ai_response_pending') || 'null');
    if (pending && pending.pending) {
      // Delay slightly to ensure UI has been restored
      setTimeout(() => {
        // Show a modal similar to the in-app force dialog
        let existing = document.getElementById('reload-pending-modal');
        if (existing) existing.remove();
        const modal = document.createElement('div');
        modal.id = 'reload-pending-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.background = 'rgba(0,0,0,0.35)';
        modal.style.zIndex = 10003;

        const box = document.createElement('div');
        box.style.background = '#232e36';
        box.style.color = '#ccd0cf';
        box.style.padding = '20px';
        box.style.borderRadius = '10px';
        box.style.minWidth = '320px';
        box.style.textAlign = 'center';

        const txt = document.createElement('div');
        txt.textContent = 'An AI response was in progress before reloading. The request may have been cancelled. Do you want to wait or cancel it?';
        txt.style.marginBottom = '14px';
        box.appendChild(txt);

        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.gap = '10px';
        btnRow.style.justifyContent = 'center';

        const waitBtn = document.createElement('button');
        waitBtn.textContent = 'Wait';
        waitBtn.style.padding = '8px 14px';
        waitBtn.style.border = '1px solid #98a6a9';
        waitBtn.style.background = '#232e36';
        waitBtn.style.color = '#ccd0cf';
        waitBtn.style.borderRadius = '6px';
        waitBtn.onclick = () => { modal.remove(); };

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.padding = '8px 14px';
        cancelBtn.style.border = 'none';
        cancelBtn.style.background = '#e74c3c';
        cancelBtn.style.color = '#fff';
        cancelBtn.style.borderRadius = '6px';
        cancelBtn.onclick = () => {
          try { clearAIPending(); aiResponsePending = false; } catch (e) {}
          try {
            if (chatMessagesContainer && chatMessagesContainer.lastChild && chatMessagesContainer.lastChild.textContent === '...') {
              chatMessagesContainer.lastChild.remove();
            }
          } catch (e) {}
          modal.remove();
        };

        btnRow.appendChild(waitBtn);
        btnRow.appendChild(cancelBtn);
        box.appendChild(btnRow);
        modal.appendChild(box);
        document.body.appendChild(modal);
      }, 60);
    }
  } catch (e) {}
});

// --- Chat Input and Message Send Logic ---
window.addEventListener('DOMContentLoaded', () => {
  // Chat input elements
  const chatInputContainer = document.getElementById('chat-input-container');
  if (!chatInputContainer) return;
  const chatInput = chatInputContainer.querySelector('input[type="text"]');
  const sendBtn = chatInputContainer.querySelector('button > img[alt="Send message"]')?.parentElement;
  const imageBtn = chatInputContainer.querySelector('button > img[alt="Upload image"]')?.parentElement;
  const attachBtn = chatInputContainer.querySelector('button > img[alt="Attach file"]')?.parentElement;
  const micBtn = chatInputContainer.querySelector('button > img[alt="Voice input"]')?.parentElement;
  const clearBtn = document.getElementById('clear-conversation-btn');
  const mainTitleContainer = document.getElementById('main-title-container');
  chatInputContainerRef = chatInputContainer;
  mainTitleContainerRef = mainTitleContainer;

  if (!conversationKey) conversationKey = getConversationKeyForUser(currentUser);
  loadConversation();
  renderConversation();

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (aiResponsePending) {
        showMessage('An AI response is in progress. Please wait before clearing.');
        return;
      }
      if (!conversation.length) return;
      if (confirm('Clear the entire conversation?')) {
        clearConversation();
      }
    });
  }

  // Ensure the global message modal close button always works,
  // even if Firebase code path didn't run. Some environments
  // may not initialize the Firebase block, leaving the button
  // without a handler.
  const firebaseMessageCloseBtn = document.getElementById('firebase-message-close');
  if (firebaseMessageCloseBtn) firebaseMessageCloseBtn.onclick = () => {
    const modal = document.getElementById('firebase-message-modal');
    if (modal) modal.style.display = 'none';
  };
  // Helper: Animate and hide main title
  function hideMainTitleAnimated() {
    if (!mainTitleContainer) return;
    mainTitleContainer.style.transition = 'opacity 0.5s, transform 0.5s';
    mainTitleContainer.style.opacity = '0';
    mainTitleContainer.style.transform = 'translateY(-30px)';
    setTimeout(() => {
      mainTitleContainer.style.display = 'none';
    }, 500);
  }

  // Helper: create thumbnail dataURL from a File (max dimension)
  function createThumbnail(file, maxDim = 240) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > maxDim) { h = Math.round(h * (maxDim / w)); w = maxDim; }
          } else {
            if (h > maxDim) { w = Math.round(w * (maxDim / h)); h = maxDim; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Extract OCR text from dataURL images using the bundled worker
  async function extractOcrTexts(dataUrls, language = 'eng') {
    if (!dataUrls || !dataUrls.length) return [];
    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      try { showMessage('OCR is disabled when opening the app via file://. Run a local server to enable OCR.'); } catch (e) {}
      return [];
    }
    const results = [];
    for (let i = 0; i < dataUrls.length; i++) {
      const dataUrl = dataUrls[i];
      try {
        const worker = new Worker('js/ocr-worker.js');
        const text = await new Promise((resolve, reject) => {
          const id = String(i);
          const onMessage = (e) => {
            const d = e.data;
            if (!d) return;
            if (d.type === 'success' && d.id === id) {
              resolve(d.text || '');
              cleanup();
            } else if (d.type === 'error' && d.id === id) {
              reject(new Error(d.error || 'OCR error'));
              cleanup();
            }
          };
          const onError = (ev) => { reject(new Error('Worker error')); cleanup(); };
          const cleanup = () => {
            worker.removeEventListener('message', onMessage);
            worker.removeEventListener('error', onError);
            try { worker.terminate(); } catch (e) {}
          };
          worker.addEventListener('message', onMessage);
          worker.addEventListener('error', onError);
          // send image data to worker
          worker.postMessage({ type: 'process', imageData: dataUrl, language: language, id });
          // safety timeout
          setTimeout(() => {
            reject(new Error('OCR timeout'));
            cleanup();
          }, 30000);
        });
        results.push(text.trim());
      } catch (err) {
        console.warn('OCR failed for image', i, err);
        results.push('');
      }
    }
    return results;
  }

  async function fetchDuckDuckGoResults(query, maxResults = 5) {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];
    const needsNews = !/\bnoticias\b|\bnews\b/i.test(trimmed);
    const enrichedQuery = needsNews ? `${trimmed} noticias` : trimmed;
    console.log('Search: query', { original: trimmed, enriched: enrichedQuery });
    const response = await fetch(`/search?q=${encodeURIComponent(enrichedQuery)}`, { method: 'GET' });
    console.log('Search: response', { status: response.status });
    if (!response.ok) throw new Error(`Search proxy error ${response.status}`);
    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results : [];
    console.log('Search: results', results);
    return results.slice(0, maxResults);
  }

  // Render attachment previews under the input and allow removal
  function renderAttachmentPreview() {
    let preview = document.getElementById('attachment-preview');
    if (!preview) {
      preview = document.createElement('div');
      preview.id = 'attachment-preview';
      preview.style.display = 'flex';
      preview.style.gap = '8px';
      preview.style.flexWrap = 'wrap';
      preview.style.margin = '8px 0 6px 0';
      chatInputContainer.insertBefore(preview, chatInputContainer.firstChild);
    }
    preview.innerHTML = '';
    selectedImages.forEach((dataUrl, idx) => {
      const holder = document.createElement('div');
      holder.style.position = 'relative';
      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.width = '96px';
      img.style.height = '96px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '8px';
      img.style.boxShadow = '0 1px 6px rgba(0,0,0,0.12)';
      holder.appendChild(img);
      const remove = document.createElement('button');
      remove.textContent = '×';
      remove.title = 'Remove image';
      remove.style.position = 'absolute';
      remove.style.top = '2px';
      remove.style.right = '2px';
      remove.style.background = 'rgba(0,0,0,0.6)';
      remove.style.color = '#fff';
      remove.style.border = 'none';
      remove.style.borderRadius = '50%';
      remove.style.width = '22px';
      remove.style.height = '22px';
      remove.style.cursor = 'pointer';
      remove.onclick = (e) => { e.stopPropagation(); selectedImages.splice(idx, 1); renderAttachmentPreview(); };
      holder.appendChild(remove);
      preview.appendChild(holder);
    });
    // disable attach button if reached limit
    if (attachBtn) attachBtn.disabled = selectedImages.length >= 5;
  }

  // Simular respuesta de IA (puedes reemplazar por llamada real a backend/AI)
  // Llamada real a la API PHP para obtener respuesta de IA
  // --- API PHP SIMULADA EN JS PARA PRUEBAS ---
  // Simulación fiel de la lógica de api.php y OpenRouter
  // Implementación directa de la API PHP en JS usando fetch a OpenRouter
  async function callAIAPI(userText, ocrSummary = '', attachments = [], options = {}) {
    // API keys should be injected from backend or user input, not hardcoded in frontend code.
    // Example: fetch from backend endpoint or prompt user for their key.
    const api_key = window.OPENROUTER_API_KEY || '';
    const fallback_key = window.OLLAMA_API_KEY || '';
    const fallbackModels = [
      'ollama/llava:13b',
      'ollama/llava:7b',
      'ollama/bakllava:7b'
    ];
    const onFallbackNotice = options && options.onFallbackNotice;

    // Build conversation history with multimodal content for the latest user message
    const model = 'nvidia/nemotron-nano-12b-v2-vl:free';
    const systemMsg = { role: 'system', content: 'Eres un asistente útil. Responde en el idioma en que el usuario escriba. Si la entrada usa otro idioma, responde en el mismo idioma del usuario. Usa SOLO las fuentes web proporcionadas cuando existan y NO inventes datos ni fechas. Organiza la respuesta en secciones cortas con viñetas. NO incluyas links en el cuerpo; solo en una seccion "Fuentes" con links claros. Usa links especificos a articulos, no a paginas de inicio. No te limites a un solo enfoque: cubre los puntos clave de forma breve y clara. Si no hay fuentes disponibles o las fuentes no son recientes, dilo.' };
    const history = Array.isArray(options.history) ? options.history : [];
    const webContext = options.webContext && String(options.webContext).trim() ? String(options.webContext).trim() : '';
    const appendWebContext = (text) => {
      if (!webContext) return text;
      return `${text}\n\nFuentes web:\n${webContext}`;
    };

    const messages = [systemMsg];
    const lastUserIndex = (() => {
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i] && history[i].from === 'user') return i;
      }
      return -1;
    })();

    history.forEach((entry, idx) => {
      if (!entry || !entry.text) return;
      const role = entry.from === 'ai' ? 'assistant' : 'user';
      if (role === 'user' && idx === lastUserIndex) {
        const content = [{ type: 'text', text: appendWebContext(entry.text + (ocrSummary ? '\n\nAttached images OCR:\n' + ocrSummary : '')) }];
        if (attachments && attachments.length) {
          for (const url of attachments) {
            content.push({ type: 'image_url', image_url: { url } });
          }
        }
        messages.push({ role: 'user', content });
      } else {
        messages.push({ role, content: entry.text });
      }
    });

    if (lastUserIndex === -1) {
      const content = [{ type: 'text', text: appendWebContext(userText + (ocrSummary ? '\n\nAttached images OCR:\n' + ocrSummary : '')) }];
      if (attachments && attachments.length) {
        for (const url of attachments) {
          content.push({ type: 'image_url', image_url: { url } });
        }
      }
      messages.push({ role: 'user', content });
    }

    const data = { model, messages };

    function extractAIText(result) {
      if (!result) return '';
      const choice = (result.choices && result.choices[0]) || null;
      let content = choice?.message?.content || choice?.text || choice || null;
      if (Array.isArray(content)) {
        const maybeText = content.map(item => {
          if (typeof item === 'string') return item;
          if (!item) return '';
          return item.text || item.content || (item.message && item.message.content) || '';
        }).join('\n').trim();
        if (maybeText) return maybeText;
      }
      if (typeof content === 'string' && content.trim()) return content;

      if (typeof result.output_text === 'string' && result.output_text.trim()) return result.output_text;
      if (typeof result.response === 'string' && result.response.trim()) return result.response;
      if (result.data && typeof result.data === 'object') {
        const maybe = result.data.text || result.data.output || result.data.response;
        if (typeof maybe === 'string' && maybe.trim()) return maybe;
      }

      return '';
    }

    async function fetchOpenRouter(apiKey, modelName) {
      const opts = {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
          'X-Title': 'AIWORK'
        },
        body: JSON.stringify({ model: modelName, messages }),
        signal: aiAbortController.signal
      };

      let response;
      try {
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', opts);
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://openrouter.ai/api/v1/chat/completions');
        response = await fetch(proxyUrl, opts);
      }

      let result;
      try { result = await response.json(); } catch (e) { result = null; }
      return { response, result };
    }
    // Use AbortController so requests can be cancelled (e.g. when user forces chat switch)
    try {
      if (aiAbortController) {
        try { aiAbortController.abort(); } catch (e) {}
      }
      aiAbortController = new AbortController();
      const { response, result } = await fetchOpenRouter(api_key, model);
      if (!response) throw new Error('No response from AI endpoint');

      if (response.status === 401) {
        const msg = (result && result.error && result.error.message) ? result.error.message : 'Unauthorized (401)';
        return 'AI error: ' + msg + '. Check the API key or use a backend proxy.';
      }

      if (response.status === 429) {
        if (typeof onFallbackNotice === 'function') {
          try { onFallbackNotice(); } catch (e) { /* ignore */ }
        }

        let lastStatus = response.status;
        for (const fallbackModel of fallbackModels) {
          const { response: fbResponse, result: fbResult } = await fetchOpenRouter(fallback_key, fallbackModel);
          if (fbResponse.status === 401) {
            return 'AI error: Unauthorized (401). Check the API key or use a backend proxy.';
          }
          lastStatus = fbResponse.status;
          if (!fbResponse.ok) continue;

          const fbText = extractAIText(fbResult);
          if (fbText) return fbText;
          if (fbResult && fbResult.error) return 'AI error: ' + (fbResult.error.message || JSON.stringify(fbResult.error));
        }

        return 'AI error: HTTP ' + lastStatus;
      }

      // Try multiple known response shapes
      if (result) {
        const extracted = extractAIText(result);
        if (extracted) return extracted;
        if (result.error) return 'AI error: ' + (result.error.message || JSON.stringify(result.error));
      }

      if (!response.ok) return 'AI error: HTTP ' + response.status;

      console.error('AI: unexpected empty response', { status: response.status, result });
      return 'AI error: no response';
    } catch (e) {
      if (e.name === 'AbortError') return 'AI cancelled';
      return 'AI error: ' + e.message;
    } finally {
      // clear controller after completion
      try { aiAbortController = null; } catch (e) {}
    }
  }
  window.callAIAPI = callAIAPI;

  // Fallback local AI response so UI always shows something if API fails
  async function fakeAIResponse(userText) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve('AI: ' + userText.split('').reverse().join(''));
      }, 700);
    });
  }

  // Message send handler
  async function handleSendMessage() {
      aiResponsePending = true;
    // Guardar el valor del input ANTES de limpiar
    const text = chatInput.value.trim();
    if (!text && (!selectedImages || !selectedImages.length)) return;
    // Wait only if Firebase is present and not ready yet
    if (window.firebase && firebase.auth && !firebaseAuthReady) {
      showMessage('Please wait for authentication to be ready.');
      return;
    }
    // Limpiar input inmediatamente tras leer el valor
    chatInput.value = '';
    chatInput.blur();
    // Si el div chat-messages no existe (porque no había mensajes), crearlo dinámicamente
    let chatMessagesDiv = document.getElementById('chat-messages');
    if (!chatMessagesDiv) {
      // Crear el div y agregarlo antes del input
      const chatInputContainer = document.getElementById('chat-input-container');
      if (chatInputContainer) {
        chatMessagesDiv = document.createElement('div');
        chatMessagesDiv.id = 'chat-messages';
        chatMessagesDiv.style.width = '100%';
        chatMessagesDiv.style.maxWidth = '700px';
        chatMessagesDiv.style.margin = '0 auto';
        chatMessagesDiv.style.display = 'flex';
        chatMessagesDiv.style.flexDirection = 'column';
        chatMessagesDiv.style.gap = '12px';
        chatMessagesDiv.style.padding = '32px 0 16px 0';
        chatMessagesDiv.style.maxHeight = '480px';
        chatMessagesDiv.style.minHeight = '220px';
        chatMessagesDiv.style.overflowY = 'auto';
        chatMessagesDiv.style.background = 'transparent';
        chatMessagesDiv.style.scrollbarWidth = 'thin';
        chatMessagesDiv.style.scrollbarColor = '#98a6a9 #232e36';
        chatInputContainer.parentElement.insertBefore(chatMessagesDiv, chatInputContainer);
        // Custom scrollbar for Webkit browsers
        if (!document.getElementById('chat-messages-scrollbar-style')) {
          const style = document.createElement('style');
          style.id = 'chat-messages-scrollbar-style';
          style.innerHTML = `
            #chat-messages::-webkit-scrollbar {
              width: 10px;
              background: #232e36;
              border-radius: 8px;
            }
            #chat-messages::-webkit-scrollbar-thumb {
              background: #98a6a9;
              border-radius: 8px;
              min-height: 40px;
            }
            #chat-messages::-webkit-scrollbar-thumb:hover {
              background: #ccd0cf;
            }
          `;
          document.head.appendChild(style);
        }
      }
      chatMessagesContainer = chatMessagesDiv;
    } else {
      chatMessagesContainer = chatMessagesDiv;
    }
    // Hide main title with animation if visible
    if (mainTitleContainer && mainTitleContainer.style.display !== 'none') {
      hideMainTitleAnimated();
    }
    // Agregar mensaje del usuario (incluye attachments seleccionadas)
    const attachmentsForSend = selectedImages.slice();
    appendMessage(text, 'user', true, attachmentsForSend);
    // Clear selected images and preview immediately (like text)
    selectedImages = [];
    const previewEl = document.getElementById('attachment-preview');
    if (previewEl) previewEl.remove();
    if (attachBtn) attachBtn.disabled = false;
    // Show AI message placeholder
    let aiMsgDiv = null;
    if (chatInput) chatInput.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
    const pendingCheckInterval = setInterval(() => {
      if (!aiResponsePending) {
        clearInterval(pendingCheckInterval);
        if (chatInput) chatInput.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
      }
    }, 1000);
    appendMessage('...', 'ai', false);
    aiMsgDiv = chatMessagesContainer ? chatMessagesContainer.lastChild : null;
    setPendingMessageStyle(aiMsgDiv, true);
    // Persist the pending AI state so we can detect page reloads
    try { markAIPending(); } catch (e) {}
    // Do not add OCR text; models with vision handle images directly
    const ocrSummary = '';
    let webContext = '';
    let webResults = [];
    try {
      console.log('Search: start', { query: text });
      webResults = await fetchDuckDuckGoResults(text, 5);
      console.log('Search: done', { count: webResults.length });
      if (webResults.length) {
        webContext = webResults.map(item => {
          const snippet = item.snippet ? ` (${item.snippet})` : '';
          return `- ${item.title}: ${item.url}${snippet}`;
        }).join('\n');
      }
    } catch (e) {
      console.warn('Search: failed', e && e.message ? e.message : e);
      console.warn('DuckDuckGo search failed', e);
    }
    let aiText = '';
    try {
      console.log('AI request start');
      // ensure pending marker is set (defensive)
      try { markAIPending(); } catch (e) {}
      const onFallbackNotice = () => {
        if (aiMsgDiv) aiMsgDiv.textContent = 'cambiando a modelo de Ollama';
      };
      const historySnapshot = conversation.slice();
      aiText = await callAIAPI(text, ocrSummary, attachmentsForSend, { onFallbackNotice, history: historySnapshot, webContext });
      console.log('AI response received', { aiText });
    } catch (err) {
      console.error('AI call failed', err);
      aiText = 'AI error: ' + (err && err.message ? err.message : String(err));
    } finally {
      aiResponsePending = false;
      try { clearAIPending(); } catch (e) {}
    }
    // If AI returned an error or empty response, fallback to local fake response
    const isCancelled = aiText === 'AI cancelled';
    const isAIError = typeof aiText === 'string' && aiText.startsWith('AI error:');
    if (!isCancelled && (isAIError || !aiText || aiText.trim() === '')) {
      try {
        const fallback = await fakeAIResponse(text);
        aiText = fallback;
        console.warn('Using fallback AI response');
      } catch (e) {
        console.error('Fallback AI also failed', e);
      }
    }
    // No fixed delay; UI unlocks via the polling interval above
    // Save AI response in the correct chat unless it was cancelled
    if (!isCancelled && aiText) {
      conversation.push({ text: aiText, from: 'ai' });
      saveConversation();
    }
    // Update UI placeholder or render messages depending on outcome
    if (isCancelled) {
      // Remove placeholder silently
      try { if (aiMsgDiv) aiMsgDiv.remove(); } catch (e) {}
    } else if (isAIError) {
      // Show transient error in placeholder but do not save to chat history
      if (aiMsgDiv) {
        setPendingMessageStyle(aiMsgDiv, false);
        aiMsgDiv.innerHTML = renderAiTextToHtml(aiText);
      }
    } else {
      if (aiMsgDiv) {
        setPendingMessageStyle(aiMsgDiv, false);
        aiMsgDiv.innerHTML = renderAiTextToHtml(aiText);
        const sourcesHtml = renderSourcesHtml(webResults);
        if (sourcesHtml) {
          const sourcesEl = document.createElement('div');
          sourcesEl.className = 'ai-sources';
          sourcesEl.innerHTML = sourcesHtml;
          aiMsgDiv.appendChild(sourcesEl);
        }
      }
    }

    // Clear selected images and preview after sending
    selectedImages = [];
    const preview = document.getElementById('attachment-preview');
    if (preview) preview.remove();
    if (attachBtn) attachBtn.disabled = false;
  }

  // Enter key sends message
  if (chatInput) {
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }
  // Send button click
  if (sendBtn) sendBtn.addEventListener('click', () => {
    if (!sendBtn.disabled) handleSendMessage();
  });

  // Image/attach buttons: open hidden file input for images (max 5)
  let fileInput = document.getElementById('file-attach-input');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'file-attach-input';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
  }
  fileInput.onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const allow = Math.max(0, 5 - selectedImages.length);
    if (files.length > allow) {
      showMessage(`You can attach up to 5 images. Only the first ${allow} will be added.`);
    }
    const toProcess = files.slice(0, allow);
    for (const f of toProcess) {
      if (!f.type.startsWith('image/')) continue;
      try {
        const thumb = await createThumbnail(f, 240);
        selectedImages.push(thumb);
      } catch (err) {
        console.warn('Thumbnail error', err);
      }
    }
    renderAttachmentPreview();
    fileInput.value = '';
  };
  if (imageBtn) imageBtn.addEventListener('click', () => fileInput.click());
  if (attachBtn) attachBtn.addEventListener('click', () => fileInput.click());
  if (micBtn) micBtn.addEventListener('click', () => alert('Voice input not implemented.'));
});
