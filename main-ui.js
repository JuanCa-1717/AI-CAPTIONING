// main-ui.js
// All UI-related JavaScript moved from index.html

function selectChat(element) {
  // Remove active class from all chat items
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.remove('active');
  });
  // Add active class to clicked item
  element.classList.add('active');
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('main-content-wrapper');
  const plusBtn = document.getElementById('plus-btn');
  sidebar.classList.toggle('collapsed');
  // Ajustar padding-left del main-content-wrapper según el estado del sidebar
  if (sidebar.classList.contains('collapsed')) {
    mainContent.style.paddingLeft = '60px';
    plusBtn.style.display = 'none';
  } else {
    mainContent.style.paddingLeft = '22vw';
    plusBtn.style.display = '';
  }
}
// Ajustar el padding inicial al cargar
// --- Mensaje modal helper global ---
function showMessage(msg) {
  const modal = document.getElementById('firebase-message-modal');
  const content = document.getElementById('firebase-message-content');
  if (content) content.textContent = msg;
  if (modal) modal.style.display = 'flex';
}

window.addEventListener('DOMContentLoaded', () => {
  // Toggle sidebar button
  const sidebarToggleBtn = document.getElementById('menu-btn');
  if (sidebarToggleBtn) {
    sidebarToggleBtn.onclick = toggleSidebar;
  }
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('main-content-wrapper');
  const plusBtn = document.getElementById('plus-btn');
  if (sidebar.classList.contains('collapsed')) {
    mainContent.style.paddingLeft = '60px';
    plusBtn.style.display = 'none';
  } else {
    mainContent.style.paddingLeft = '22vw';
    plusBtn.style.display = '';
  }
});

// --- Firebase Auth and UI Logic ---
// Variables globales para chats y chat seleccionado

let currentUser = null;
let chats = [];
let selectedChatId = null;
let userChatsKey = null;
let chatMessagesContainer = null; // Referencia global para mensajes
let firebaseAuthReady = false;

// --- Make saveChats and appendMessage globally accessible ---
function saveChats() {
  if (!userChatsKey || !chats.length) return;
  localStorage.setItem(userChatsKey, JSON.stringify(chats));
}

function appendMessage(text, from, save = true) {
  if (!chatMessagesContainer) return;
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
  msg.textContent = text;
  chatMessagesContainer.appendChild(msg);
  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  // Guardar mensaje en el chat seleccionado
  if (save && selectedChatId) {
    const chat = chats.find(c => c.id === selectedChatId);
    if (chat) {
      if (!chat.messages) chat.messages = [];
      chat.messages.push({ text, from });
      saveChats();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // Firebase config and initialization
  const firebaseConfig = {
    apiKey: "AIzaSyCxW--usdfHZK6NJw9SiADLzwtozvSjm2w",
    authDomain: "sightforgen.firebaseapp.com",
    projectId: "sightforgen",
    storageBucket: "sightforgen.firebasestorage.app",
    messagingSenderId: "337444110932",
    appId: "1:337444110932:web:16fe01dc63902d7e39e3c1",
    measurementId: "G-VYFQ1DVGDY"
  };
  if (window.firebase && firebase.initializeApp) {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();

    function updateFirebaseUI(user) {
      if (user) {
        document.getElementById('firebase-profile').style.display = 'flex';
        document.getElementById('firebase-avatar').src = user.photoURL || 'https://www.gravatar.com/avatar?d=mp';
        document.getElementById('firebase-name').textContent = user.displayName || user.email;
        document.getElementById('firebase-login-btn').style.display = 'none';
        document.getElementById('firebase-register-open-btn').style.display = 'none';
      } else {
        document.getElementById('firebase-profile').style.display = 'none';
        document.getElementById('firebase-login-btn').style.display = '';
        document.getElementById('firebase-register-open-btn').style.display = '';
      }
    }
    auth.onAuthStateChanged(user => {
      currentUser = user;
      updateFirebaseUI(user);
      firebaseAuthReady = true;
    });

    // Login modal open
    document.getElementById('firebase-login-btn').onclick = () => {
      document.getElementById('firebase-login-modal').style.display = 'flex';
    };
    // Email login
    document.getElementById('firebase-email-login-btn').onclick = async () => {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      if (!email || !password) {
        showMessage('Please enter email and password');
        return;
      }
      try {
        await auth.signInWithEmailAndPassword(email, password);
        document.getElementById('firebase-login-modal').style.display = 'none';
      } catch (e) {
        if (e.code === 'auth/invalid-email') {
          showMessage('Please enter a valid email address.');
        } else if (e.code === 'auth/invalid-credential') {
          showMessage('The credentials are invalid or have expired. Please try again.');
        } else {
          showMessage('Error: ' + e.message);
        }
      }
    };
    // Register modal open
    document.getElementById('firebase-register-open-btn').onclick = () => {
      document.getElementById('firebase-register-modal').style.display = 'flex';
    };
    // Register modal close
    document.getElementById('firebase-close-register-modal').onclick = () => {
      document.getElementById('firebase-register-modal').style.display = 'none';
    };
    // Register submit
    document.getElementById('firebase-register-submit-btn').onclick = async () => {
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      if (!email || !password) { showMessage('Please enter email and password'); return; }
      try {
        await auth.createUserWithEmailAndPassword(email, password);
        document.getElementById('firebase-register-modal').style.display = 'none';
        showMessage('Account created successfully.');
      } catch (e) {
        if (e.code === 'auth/invalid-email') {
          showMessage('Please enter a valid email address.');
        } else if (e.code === 'auth/invalid-credential') {
          showMessage('The credentials are invalid or have expired. Please try again.');
        } else {
          showMessage('Error: ' + e.message);
        }
      }
    };
    // Register with Google
    document.getElementById('firebase-register-google-btn').onclick = async () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      try {
        const result = await auth.signInWithPopup(provider);
        const isNew = result?.additionalUserInfo?.isNewUser;
        if (isNew) {
          document.getElementById('firebase-register-modal').style.display = 'none';
          showMessage('Account created successfully with Google.');
        } else {
          await auth.signOut();
          showMessage('That account already exists. Please log in.');
        }
      } catch (e) {
        if (e.code !== 'auth/cancelled-popup-request' && e.code !== 'auth/popup-closed-by-user') {
          showMessage('Error: ' + e.message);
        }
      }
    };
    // Login with Google
    document.getElementById('firebase-google-login-btn').onclick = async () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      try {
        const result = await auth.signInWithPopup(provider);
        const isNew = result?.additionalUserInfo?.isNewUser;
        if (isNew) {
          try {
            const user = auth.currentUser;
            if (user) {
              await user.delete();
            }
          } catch (delErr) {
            await auth.signOut();
          }
          showMessage('That Google account is not registered. Please register first.');
        } else {
          document.getElementById('firebase-login-modal').style.display = 'none';
        }
      } catch (e) {
        if (e.code !== 'auth/cancelled-popup-request' && e.code !== 'auth/popup-closed-by-user') {
          showMessage('Error: ' + e.message);
        }
      }
    };
    // Login modal close
    document.getElementById('firebase-close-login-modal').onclick = () => {
      document.getElementById('firebase-login-modal').style.display = 'none';
    };
    // Message modal helper
    // ...existing code...
    document.getElementById('firebase-message-close').onclick = () => {
      document.getElementById('firebase-message-modal').style.display = 'none';
    };
    // Logout
    document.getElementById('firebase-logout-btn').onclick = async () => {
      await auth.signOut();
    };
    // On load, update UI
    updateFirebaseUI(auth.currentUser);
  }

  // --- Chat List Logic ---
  function getChatsKeyForUser(user) {
    return user && user.uid ? `userChats_${user.uid}` : null;
  }

  function loadChats() {
    if (!userChatsKey) { chats = []; return; }
    const raw = localStorage.getItem(userChatsKey);
    chats = raw ? JSON.parse(raw) : [];
    // Restaurar el chat seleccionado desde localStorage
    const lastSelectedId = localStorage.getItem(userChatsKey + '_selected');
    if (chats.length) {
      if (lastSelectedId && chats.some(c => c.id === lastSelectedId)) {
        selectedChatId = lastSelectedId;
      } else {
        selectedChatId = chats[0].id;
      }
    }
  }
  function saveChats() {
    if (!userChatsKey || !chats.length) return;
    localStorage.setItem(userChatsKey, JSON.stringify(chats));
    // Guardar el chat seleccionado
    if (selectedChatId) {
      localStorage.setItem(userChatsKey + '_selected', selectedChatId);
    }
  }
  function clearChats() {
    if (userChatsKey) localStorage.removeItem(userChatsKey);
    chats = [];
    selectedChatId = null;
    if (chatMessagesContainer) chatMessagesContainer.innerHTML = '';
  }

  function renderChats() {
    let chatList = document.getElementById('chat-list');
    if (!chatList) {
      // Si no existe el contenedor, créalo dinámicamente (esto es útil para AJAX)
      chatList = document.createElement('div');
      chatList.id = 'chat-list';
      // Insertar en el DOM, por ejemplo, en el sidebar
      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        sidebar.appendChild(chatList);
      } else {
        document.body.appendChild(chatList);
      }
    }
    chatList.innerHTML = '';
    if (!chats.length) {
      const empty = document.createElement('div');
      empty.className = 'text-[#98a6a9] px-2 py-2';
      empty.textContent = 'No chats yet.';
      chatList.appendChild(empty);
      if (chatMessagesContainer) chatMessagesContainer.innerHTML = '';
      return;
    }
    chats.forEach(chat => {
      const btn = document.createElement('button');
      btn.className = 'chat-item flex items-center gap-4 px-1.5 py-1 relative self-stretch w-full flex-[0_0_auto] rounded-lg hover:bg-[#ffffff1a] cursor-pointer' + (chat.id === selectedChatId ? ' active' : '');
      btn.onclick = () => selectChatBtn(chat.id);
      // Menú contextual para eliminar chat
      btn.oncontextmenu = (e) => {
        e.preventDefault();
        // Eliminar menú contextual anterior si existe
        const oldMenu = document.getElementById('chat-context-menu');
        if (oldMenu) oldMenu.remove();
        // Crear menú contextual
        const menu = document.createElement('div');
        menu.id = 'chat-context-menu';
        menu.style.position = 'fixed';
        menu.style.top = e.clientY + 'px';
        menu.style.left = e.clientX + 'px';
        menu.style.background = '#232e36';
        menu.style.color = '#ccd0cf';
        menu.style.padding = '8px 16px';
        menu.style.borderRadius = '8px';
        menu.style.boxShadow = '0 2px 8px 0 rgba(0,0,0,0.12)';
        menu.style.zIndex = 9999;
        menu.style.cursor = 'pointer';
        menu.textContent = 'Eliminar chat';
        menu.onmousedown = (ev) => { ev.stopPropagation(); };
        menu.onclick = () => {
          // Eliminar chat
          const idx = chats.findIndex(c => c.id === chat.id);
          if (idx !== -1) {
            chats.splice(idx, 1);
            if (selectedChatId === chat.id) {
              selectedChatId = chats.length ? chats[0].id : null;
            }
            saveChats();
            // Si ya no quedan chats, eliminar la referencia y los datos en localStorage
            if (!chats.length && userChatsKey) {
              localStorage.removeItem(userChatsKey + '_selected');
              localStorage.removeItem(userChatsKey);
              selectedChatId = null;
            }
            renderChats();
          }
          menu.remove();
        };
        document.body.appendChild(menu);
        // Cerrar menú contextual al hacer clic fuera
        const closeMenu = (ev) => {
          if (menu && !menu.contains(ev.target)) menu.remove();
          document.removeEventListener('mousedown', closeMenu);
        };
        setTimeout(() => {
          document.addEventListener('mousedown', closeMenu);
        }, 0);
      };
      const indicator = document.createElement('div');
      indicator.className = 'chat-indicator relative h-6 bg-[#ccd0cf]';
      const text = document.createElement('div');
      text.className = 'chat-text relative flex-1 [font-family:\'Inter\',Helvetica] text-base tracking-[0] leading-[22.4px] text-left';
      text.textContent = chat.title;
      btn.appendChild(indicator);
      btn.appendChild(text);
      chatList.appendChild(btn);
    });
    // Mostrar mensajes del chat seleccionado
    renderChatMessages();
  }

  function renderChatMessages() {
    if (!chatMessagesContainer) chatMessagesContainer = document.getElementById('chat-messages');
    if (!chatMessagesContainer) return;
    chatMessagesContainer.innerHTML = '';
    const chat = chats.find(c => c.id === selectedChatId);
    // Ocultar el main title si hay chat seleccionado o mensajes
    const mainTitleContainer = document.getElementById('main-title-container');
    if (mainTitleContainer) {
      if (chat && chat.messages && chat.messages.length) {
        mainTitleContainer.style.display = 'none';
      } else {
        mainTitleContainer.style.display = '';
      }
    }
    if (!chat || !chat.messages || !chat.messages.length) return;
    chat.messages.forEach(msg => {
      // Solo renderiza, no guarda ni sincroniza
      appendMessage(msg.text, msg.from, false);
    });
  }

  function selectChatBtn(chatId) {
    selectedChatId = chatId;
    // Guardar el chat seleccionado
    if (userChatsKey && selectedChatId) {
      localStorage.setItem(userChatsKey + '_selected', selectedChatId);
    }
    saveChats();
    // Renderiza la lista y los mensajes del chat seleccionado
    renderChats();
    // Limpiar input al cambiar de chat
    const chatInputContainer = document.getElementById('chat-input-container');
    if (chatInputContainer) {
      const chatInput = chatInputContainer.querySelector('input[type="text"]');
      if (chatInput) chatInput.value = '';
    }
    // Renderizar mensajes del chat seleccionado (asegura que se muestre el historial correcto)
    renderChatMessages();
  }

  function createNewChat() {
    if (!currentUser) {
      showMessage('You must be logged in to create a new chat.');
      return;
    }
    const title = prompt('Enter a name for your new chat:');
    if (!title) return;
    const newChat = { id: 'chat_' + Date.now(), title: title.trim(), messages: [] };
    chats.unshift(newChat);
    selectedChatId = newChat.id;
    saveChats();
    renderChats();
  }

  // Plus button creates new chat
  const plusBtn = document.getElementById('plus-btn');
  if (plusBtn) plusBtn.onclick = createNewChat;

  // Listen for auth state to enable/disable chat creation
  if (window.firebase && firebase.auth) {
    firebase.auth().onAuthStateChanged(user => {
      currentUser = user;
      userChatsKey = getChatsKeyForUser(user);
      if (user) {
        loadChats();
        renderChats();
      } else {
        clearChats();
        renderChats();
      }
    });
  } else {
    clearChats();
    renderChats();
  }
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
  const mainTitleContainer = document.getElementById('main-title-container');

  // Mensajes del chat (simple, solo para UI)
  chatMessagesContainer = document.getElementById('chat-messages');
  if (!chatMessagesContainer) {
    chatMessagesContainer = document.createElement('div');
    chatMessagesContainer.id = 'chat-messages';
    chatMessagesContainer.style.width = '100%';
    chatMessagesContainer.style.maxWidth = '700px';
    chatMessagesContainer.style.margin = '0 auto';
    chatMessagesContainer.style.display = 'flex';
    chatMessagesContainer.style.flexDirection = 'column';
    chatMessagesContainer.style.gap = '12px';
    chatMessagesContainer.style.padding = '32px 0 16px 0';
    chatMessagesContainer.style.maxHeight = '480px'; // Más grande
    chatMessagesContainer.style.minHeight = '220px';
    chatMessagesContainer.style.overflowY = 'auto';
    chatMessagesContainer.style.background = 'transparent';
    // Custom scrollbar
    chatMessagesContainer.style.scrollbarWidth = 'thin';
    chatMessagesContainer.style.scrollbarColor = '#98a6a9 #232e36';
    chatInputContainer.parentElement.insertBefore(chatMessagesContainer, chatInputContainer);
  }
  // Custom scrollbar for Webkit browsers
  const style = document.createElement('style');
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

  // Mostrar mensaje en el chat
  function appendMessage(text, from, save = true) {
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
    msg.textContent = text;
    chatMessagesContainer.appendChild(msg);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    // Guardar mensaje en el chat seleccionado
    if (save && selectedChatId) {
      const chat = chats.find(c => c.id === selectedChatId);
      if (chat) {
        if (!chat.messages) chat.messages = [];
        chat.messages.push({ text, from });
        saveChats();
      }
    }
  }

  // Simular respuesta de IA (puedes reemplazar por llamada real a backend/AI)
  function fakeAIResponse(userText) {
    // Aquí puedes llamar a tu backend o IA real
    return new Promise(resolve => {
      setTimeout(() => {
        resolve('AI: ' + userText.split('').reverse().join(''));
      }, 900);
    });
  }

  // Message send handler
  async function handleSendMessage() {
    // Guardar el valor del input ANTES de limpiar
    const text = chatInput.value.trim();
    if (!text) return;
    // Esperar a que Firebase Auth esté listo
    if (!firebaseAuthReady || typeof currentUser === 'undefined') {
      showMessage('Espere a que la autenticación esté lista.');
      return;
    }
    // Limpiar input inmediatamente tras leer el valor
    chatInput.value = '';
    chatInput.blur();
    // Si no hay chats o chat seleccionado, mostrar advertencia y no enviar
    if (!chats.length || !selectedChatId) {
      showMessage('Please create a chat before sending messages.');
      return;
    }
    // Hide main title with animation if visible
    if (mainTitleContainer && mainTitleContainer.style.display !== 'none') {
      hideMainTitleAnimated();
    }
    appendMessage(text, 'user');
    // Si el chat fue creado automáticamente, actualizar el título en la lista si el usuario edita el primer mensaje (opcional)
    if (autoCreatedChat) {
      // Actualizar el título del chat en la UI sin recargar
      const chat = chats.find(c => c.id === selectedChatId);
      if (chat) {
        chat.title = text;
        saveChats();
        renderChats();
      }
    }
    // Mostrar mensaje de IA
    appendMessage('...', 'ai', false);
    const aiMsgDiv = chatMessagesContainer.lastChild;
    const aiText = await fakeAIResponse(text);
    aiMsgDiv.textContent = aiText;
    // Guardar respuesta de IA en el chat
    if (selectedChatId) {
      const chat = chats.find(c => c.id === selectedChatId);
      if (chat) {
        if (!chat.messages) chat.messages = [];
        chat.messages.push({ text: aiText, from: 'ai' });
        saveChats();
      }
    }
  }

  // Enter key sends message
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  });
  // Send button click
  if (sendBtn) sendBtn.addEventListener('click', handleSendMessage);

  // Image, attach, mic buttons (show alert for now)
  if (imageBtn) imageBtn.addEventListener('click', () => alert('Image upload not implemented.'));
  if (attachBtn) attachBtn.addEventListener('click', () => alert('File attachment not implemented.'));
  if (micBtn) micBtn.addEventListener('click', () => alert('Voice input not implemented.'));
});
