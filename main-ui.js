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
// Adjust initial padding on load
// --- Global modal message helper ---
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
// Helper to enable/disable input and send button globally
function setChatInputEnabled(enabled) {
  const chatInputContainer = document.getElementById('chat-input-container');
  if (!chatInputContainer) return;
  const chatInput = chatInputContainer.querySelector('input[type="text"]');
  const sendBtn = chatInputContainer.querySelector('button > img[alt="Send message"]')?.parentElement;
  if (chatInput) chatInput.disabled = !enabled;
  if (sendBtn) sendBtn.disabled = !enabled;
  if (!enabled && chatInput) {
    chatInput.value = '';
  }
}
// Global variables for chats and selected chat

let currentUser = null;
let chats = [];
let selectedChatId = null;
let userChatsKey = null;
let chatMessagesContainer = null; // Referencia global para mensajes
let firebaseAuthReady = false;
let aiResponsePending = false;
let aiAbortController = null;
// Selected images (data URLs) pending to be sent with the next message
let selectedImages = [];

// Persist AI pending state across reloads so we can show modal if page reloads
function markAIPending(chatId) {
  try {
    localStorage.setItem('ai_response_pending', JSON.stringify({ pending: true, chatId: chatId, ts: Date.now() }));
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

// --- Make saveChats and appendMessage globally accessible ---
function saveChats() {
  if (!userChatsKey || !chats.length) return;
  localStorage.setItem(userChatsKey, JSON.stringify(chats));
}

function appendMessage(text, from, save = true, attachments = []) {
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

  // Text
  if (text) {
    const textNode = document.createElement('div');
    textNode.textContent = text;
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
  // Save message in the selected chat (store attachments as data URLs)
  if (save && selectedChatId) {
    const chat = chats.find(c => c.id === selectedChatId);
    if (chat) {
      if (!chat.messages) chat.messages = [];
      chat.messages.push({ text, from, attachments: attachments || [] });
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
    return user && user.uid ? `userChats_${user.uid}` : 'userChats_guest';
  }

  function loadChats() {
    if (!userChatsKey) { chats = []; selectedChatId = null; return; }
    const raw = localStorage.getItem(userChatsKey);
    chats = raw ? JSON.parse(raw) : [];
    // Restore selected chat from localStorage
    const lastSelectedId = localStorage.getItem(userChatsKey + '_selected');
    if (chats.length) {
      if (lastSelectedId && chats.some(c => c.id === lastSelectedId)) {
        selectedChatId = lastSelectedId;
      } else {
        selectedChatId = chats[0].id;
      }
    } else {
      selectedChatId = null;
    }
  }
  function saveChats() {
    if (!userChatsKey || !chats.length) return;
    localStorage.setItem(userChatsKey, JSON.stringify(chats));
    // Save selected chat
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
      // If the container doesn't exist, create it dynamically (useful for AJAX)
      chatList = document.createElement('div');
      chatList.id = 'chat-list';
      // Insert into the DOM, e.g., in the sidebar
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
      // Do NOT show any chat name input if there are no chats
      return;
    }
    chats.forEach(chat => {
      const btn = document.createElement('button');
      btn.className = 'chat-item flex items-center gap-4 px-1.5 py-1 relative self-stretch w-full flex-[0_0_auto] rounded-lg hover:bg-[#ffffff1a] cursor-pointer' + (chat.id === selectedChatId ? ' active' : '');
      btn.onclick = () => selectChatBtn(chat.id);
      // Context menu for chat actions
      btn.oncontextmenu = (e) => {
        e.preventDefault();
        // Remove previous context menu if exists
        const oldMenu = document.getElementById('chat-context-menu');
        if (oldMenu) oldMenu.remove();
        // Create context menu
        const menu = document.createElement('div');
        menu.id = 'chat-context-menu';
        menu.style.position = 'fixed';
        menu.style.top = e.clientY + 'px';
        menu.style.left = e.clientX + 'px';
        menu.style.background = '#232e36';
        menu.style.color = '#ccd0cf';
        menu.style.padding = '0';
        menu.style.borderRadius = '8px';
        menu.style.boxShadow = '0 2px 8px 0 rgba(0,0,0,0.12)';
        menu.style.zIndex = 9999;
        menu.style.cursor = 'pointer';

        // Option: Edit name
        const editOption = document.createElement('div');
        editOption.textContent = 'Edit name';
        editOption.style.padding = '8px 16px';
        editOption.style.borderBottom = '1px solid #333a';
        editOption.onmousedown = (ev) => { ev.stopPropagation(); };
        editOption.onclick = () => {
          // Switch chat to edit mode
          chat.title = '__editing__';
          saveChats();
          renderChats();
          menu.remove();
        };
        menu.appendChild(editOption);

        // Option: Delete chat
        const deleteOption = document.createElement('div');
        deleteOption.textContent = 'Delete chat';
        deleteOption.style.padding = '8px 16px';
        deleteOption.onmousedown = (ev) => { ev.stopPropagation(); };
        deleteOption.onclick = () => {
          // Show confirmation modal before deleting
          showDeleteChatModal(chat.id);
          menu.remove();
        };
        menu.appendChild(deleteOption);

        document.body.appendChild(menu);
        // Close context menu when clicking outside
        const closeMenu = (ev) => {
          if (menu && !menu.contains(ev.target)) menu.remove();
          document.removeEventListener('mousedown', closeMenu);
        };
        setTimeout(() => {
          document.addEventListener('mousedown', closeMenu);
        }, 0);
      };
      // --- Modal for chat deletion confirmation ---
      function showDeleteChatModal(chatId) {
        // Remove any existing modal
        let modal = document.getElementById('delete-chat-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'delete-chat-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.35)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = 10000;

        const box = document.createElement('div');
        box.style.background = '#232e36';
        box.style.color = '#ccd0cf';
        box.style.padding = '32px 28px';
        box.style.borderRadius = '12px';
        box.style.boxShadow = '0 2px 16px 0 rgba(0,0,0,0.18)';
        box.style.display = 'flex';
        box.style.flexDirection = 'column';
        box.style.alignItems = 'center';
        box.style.minWidth = '320px';

        const msg = document.createElement('div');
        msg.textContent = 'Are you sure you want to delete this chat?';
        msg.style.marginBottom = '24px';
        msg.style.fontSize = '1.1rem';
        box.appendChild(msg);

        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.gap = '18px';

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Delete';
        confirmBtn.style.background = '#e74c3c';
        confirmBtn.style.color = '#fff';
        confirmBtn.style.border = 'none';
        confirmBtn.style.padding = '8px 22px';
        confirmBtn.style.borderRadius = '6px';
        confirmBtn.style.fontWeight = 'bold';
        confirmBtn.style.cursor = 'pointer';
        confirmBtn.onclick = () => {
          // Actually delete the chat
          const idx = chats.findIndex(c => c.id === chatId);
          if (idx !== -1) {
            chats.splice(idx, 1);
            if (selectedChatId === chatId) {
              selectedChatId = chats.length ? chats[0].id : null;
            }
            saveChats();
            if (!chats.length && userChatsKey) {
              localStorage.removeItem(userChatsKey + '_selected');
              localStorage.removeItem(userChatsKey);
              selectedChatId = null;
            }
            if (typeof renderChats === 'function') renderChats();
            // If there's no selected chat after deletion, show the main title
            // (e.g. "How can I help you today?") and remove the messages area.
            if (!selectedChatId) {
              const mainTitleContainer = document.getElementById('main-title-container');
              if (mainTitleContainer) {
                mainTitleContainer.style.display = '';
                mainTitleContainer.style.opacity = '1';
                mainTitleContainer.style.transform = 'none';
                mainTitleContainer.style.transition = '';
              }
              // Disable the chat input since there's no active chat
              try { setChatInputEnabled(false); } catch (e) {}
              if (chatMessagesContainer) {
                chatMessagesContainer.remove();
                chatMessagesContainer = null;
              }
            }
          }
          modal.remove();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.background = '#232e36';
        cancelBtn.style.color = '#ccd0cf';
        cancelBtn.style.border = '1px solid #98a6a9';
        cancelBtn.style.padding = '8px 22px';
        cancelBtn.style.borderRadius = '6px';
        cancelBtn.style.fontWeight = 'bold';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.onclick = () => {
          modal.remove();
        };

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(confirmBtn);
        box.appendChild(btnRow);
        modal.appendChild(box);
        document.body.appendChild(modal);
      }
      const indicator = document.createElement('div');
      indicator.className = 'chat-indicator relative h-6 bg-[#ccd0cf]';
      // If the chat has no title, show editable input
      if (!chat.title || chat.title === '__editing__') {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'chat-title-input flex-1 px-2 py-1 rounded bg-[#232e36] text-[#ccd0cf] border border-[#98a6a9]';
        input.placeholder = 'Chat name...';
        input.autofocus = true;
        input.value = '';

        // ⭐ ANTI-SPACE and ANTI-SELF-CLICK: Flags
        let justPressedSpace = false;
        let justClickedInput = false;

        // Function to save/delete
        function saveOrDelete() {
          const val = input.value.trim();
          if (val) {
            chat.title = val;
            saveChats();
            renderChats();
          } else {
            const idx = chats.findIndex(c => c.id === chat.id);
            if (idx !== -1) {
              chats.splice(idx, 1);
              saveChats();
              renderChats();
            }
          }
        }

        // ⭐ BLOCK SPACE on keydown (prevents the whole problem)
        input.addEventListener('keydown', (e) => {
          if (e.key === ' ') {
            e.preventDefault(); // BLOCK space completely
            justPressedSpace = true;
            // Insert space manually
            const start = input.selectionStart;
            const end = input.selectionEnd;
            input.value = input.value.slice(0, start) + ' ' + input.value.slice(end);
            input.setSelectionRange(start + 1, start + 1);
            return false;
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            saveOrDelete();
          }
        });

        // ⭐ Prevent save on self-click
        input.addEventListener('mousedown', () => {
          justClickedInput = true;
        });

        // ⭐ Only save on REAL blur (not space or self-click)
        input.addEventListener('blur', (e) => {
          setTimeout(() => {
            if (!justPressedSpace && !justClickedInput) {
              saveOrDelete();
            }
            justPressedSpace = false;
            justClickedInput = false;
          }, 10);
        });

        // Reset flag on normal typing
        input.addEventListener('input', () => {
          justPressedSpace = false;
        });

        btn.appendChild(indicator);
        btn.appendChild(input);
        setTimeout(() => { input.focus(); }, 0);
      } else {
        const text = document.createElement('div');
        text.className = 'chat-text relative flex-1 [font-family:\'Inter\',Helvetica] text-base tracking-[0] leading-[22.4px] text-left';
        text.textContent = chat.title;
        btn.appendChild(indicator);
        btn.appendChild(text);
      }
      chatList.appendChild(btn);
    });
    // Enable/disable input depending on chat selection
    setChatInputEnabled(!!selectedChatId);
    // Show messages for the selected chat
    renderChatMessages();
    // Initial state: disable if no chat selected
    setChatInputEnabled(!!selectedChatId);
  }

  function renderChatMessages() {
    // Remove the chat-messages div if it exists and there is no active chat or no messages
    let container = document.getElementById('chat-messages');
    const chat = chats.find(c => c.id === selectedChatId);
    if (!chat || !chat.messages || !chat.messages.length) {
      if (container) {
        container.remove();
        chatMessagesContainer = null;
      }
      // Show the main title if there is no active chat or no messages
      const mainTitleContainer = document.getElementById('main-title-container');
      if (mainTitleContainer) {
        mainTitleContainer.style.display = '';
        mainTitleContainer.style.opacity = '1';
        mainTitleContainer.style.transform = 'none';
        mainTitleContainer.style.transition = '';
      }
      return;
    }
    // If there is a chat and messages, ensure the div exists
    if (!container) {
      // Insert the div before chatInputContainer
      const chatInputContainer = document.getElementById('chat-input-container');
      if (chatInputContainer) {
        container = document.createElement('div');
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
    }
    chatMessagesContainer = container;
    chatMessagesContainer.innerHTML = '';
    // Hide the main title if there is a selected chat and messages
    const mainTitleContainer = document.getElementById('main-title-container');
    if (mainTitleContainer) mainTitleContainer.style.display = 'none';
    chat.messages.forEach(msg => {
      // Only render, do not save or sync
      appendMessage(msg.text, msg.from, false, msg.attachments || []);
    });
  }

  function selectChatBtn(chatId) {
    // Internal: perform the actual selection logic
    function doSelect(id) {
      selectedChatId = id;
      if (userChatsKey && selectedChatId) {
        localStorage.setItem(userChatsKey + '_selected', selectedChatId);
      }
      saveChats();
      renderChats();
      const chatInputContainer = document.getElementById('chat-input-container');
      if (chatInputContainer) {
        const chatInput = chatInputContainer.querySelector('input[type="text"]');
        if (chatInput) chatInput.value = '';
      }
      setTimeout(() => { renderChatMessages(); }, 0);
    }

    // If an AI response is pending, offer the user to force the switch
    if (aiResponsePending) {
      // Remove existing modal if present
      let existing = document.getElementById('force-switch-modal');
      if (existing) existing.remove();
      const modal = document.createElement('div');
      modal.id = 'force-switch-modal';
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100vw';
      modal.style.height = '100vh';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.background = 'rgba(0,0,0,0.35)';
      modal.style.zIndex = 10001;

      const box = document.createElement('div');
      box.style.background = '#232e36';
      box.style.color = '#ccd0cf';
      box.style.padding = '22px';
      box.style.borderRadius = '10px';
      box.style.minWidth = '320px';
      box.style.textAlign = 'center';

      const txt = document.createElement('div');
      txt.textContent = 'There is a pending AI response. Force switching chats? This will cancel the pending response.';
      txt.style.marginBottom = '16px';
      box.appendChild(txt);

      const btnRow = document.createElement('div');
      btnRow.style.display = 'flex';
      btnRow.style.gap = '12px';
      btnRow.style.justifyContent = 'center';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Wait';
      cancelBtn.style.padding = '8px 16px';
      cancelBtn.style.borderRadius = '6px';
      cancelBtn.style.border = '1px solid #98a6a9';
      cancelBtn.style.background = '#232e36';
      cancelBtn.style.color = '#ccd0cf';
      cancelBtn.onclick = () => { modal.remove(); };

      const forceBtn = document.createElement('button');
      forceBtn.textContent = 'Force switch';
      forceBtn.style.padding = '8px 16px';
      forceBtn.style.borderRadius = '6px';
      forceBtn.style.border = 'none';
      forceBtn.style.background = '#58587c';
      forceBtn.style.color = '#fff';
      forceBtn.onclick = () => {
        // Abort pending AI request (if any), clear pending state and placeholder
        try { if (aiAbortController) aiAbortController.abort(); } catch (e) {}
        aiResponsePending = false;
        try {
          if (chatMessagesContainer && chatMessagesContainer.lastChild && chatMessagesContainer.lastChild.textContent === '...') {
            chatMessagesContainer.lastChild.remove();
          }
        } catch (e) {}
        try { clearAIPending(); } catch (e) {}
        modal.remove();
        doSelect(chatId);
      };

      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(forceBtn);
      box.appendChild(btnRow);
      modal.appendChild(box);
      document.body.appendChild(modal);
      return;
    }

    // Normal selection when no AI response is pending
    doSelect(chatId);
  }

  function createNewChat() {
    // If an AI response is pending, ask the user to wait or force create (which aborts the AI request)
    if (aiResponsePending) {
      let existing = document.getElementById('force-create-modal');
      if (existing) existing.remove();
      const modal = document.createElement('div');
      modal.id = 'force-create-modal';
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100vw';
      modal.style.height = '100vh';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.background = 'rgba(0,0,0,0.35)';
      modal.style.zIndex = 10002;

      const box = document.createElement('div');
      box.style.background = '#232e36';
      box.style.color = '#ccd0cf';
      box.style.padding = '20px';
      box.style.borderRadius = '10px';
      box.style.minWidth = '320px';
      box.style.textAlign = 'center';

      const txt = document.createElement('div');
      txt.textContent = 'An AI response is in progress. Force creating a new chat? This will cancel the pending response.';
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

      const forceBtn = document.createElement('button');
      forceBtn.textContent = 'Force creation';
      forceBtn.style.padding = '8px 14px';
      forceBtn.style.border = 'none';
      forceBtn.style.background = '#e74c3c';
      forceBtn.style.color = '#fff';
      forceBtn.style.borderRadius = '6px';
      forceBtn.onclick = () => {
        try { if (aiAbortController) aiAbortController.abort(); } catch (e) {}
        aiResponsePending = false;
        try {
          if (chatMessagesContainer && chatMessagesContainer.lastChild && chatMessagesContainer.lastChild.textContent === '...') {
            chatMessagesContainer.lastChild.remove();
          }
        } catch (e) {}
        try { clearAIPending(); } catch (e) {}
        modal.remove();
        // proceed to actually create the chat
        if (!userChatsKey) userChatsKey = getChatsKeyForUser(currentUser);
        const newChat = { id: 'chat_' + Date.now(), title: null, messages: [] };
        chats.unshift(newChat);
        selectedChatId = newChat.id;
        saveChats();
        renderChats();
      };

      btnRow.appendChild(waitBtn);
      btnRow.appendChild(forceBtn);
      box.appendChild(btnRow);
      modal.appendChild(box);
      document.body.appendChild(modal);
      return;
    }

    // Ensure we have a storage key (guest mode if no user)
    if (!userChatsKey) userChatsKey = getChatsKeyForUser(currentUser);
    // Create chat with title: null to show input (no focus/blur bug)
    const newChat = { id: 'chat_' + Date.now(), title: null, messages: [] };
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
    // No Firebase available: operate in guest mode
    firebaseAuthReady = true;
    currentUser = null;
    userChatsKey = getChatsKeyForUser(null);
    loadChats();
    renderChats();
  }
});

// If page was reloaded while an AI response was pending, show modal
window.addEventListener('DOMContentLoaded', () => {
  try {
    const pending = JSON.parse(localStorage.getItem('ai_response_pending') || 'null');
    if (pending && pending.pending) {
      // Delay slightly to ensure chats/UI have been restored
      setTimeout(() => {
        try {
          if (pending.chatId && chats && chats.some(c => c.id === pending.chatId)) {
            selectedChatId = pending.chatId;
            renderChats();
            renderChatMessages();
          }
        } catch (e) {}
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
  const mainTitleContainer = document.getElementById('main-title-container');

  // Ensure the global message modal close button always works,
  // even if Firebase code path didn't run. Some environments
  // may not initialize the Firebase block, leaving the button
  // without a handler.
  const firebaseMessageCloseBtn = document.getElementById('firebase-message-close');
  if (firebaseMessageCloseBtn) firebaseMessageCloseBtn.onclick = () => {
    const modal = document.getElementById('firebase-message-modal');
    if (modal) modal.style.display = 'none';
  };
  // Mensajes del chat (simple, solo para UI)
  // Only create the chat-messages container when there is an active chat
  // with messages. If no chat is selected we avoid creating it so it
  // doesn't clutter the UI on the main screen.
  chatMessagesContainer = document.getElementById('chat-messages');
  const activeChat = chats.find(c => c.id === selectedChatId);
  const shouldCreateMessages = !!(activeChat && activeChat.messages && activeChat.messages.length);
  if (!chatMessagesContainer && shouldCreateMessages) {
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
  // If there is an existing container but no active chat, remove it
  if (chatMessagesContainer && !shouldCreateMessages) {
    chatMessagesContainer.remove();
    chatMessagesContainer = null;
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

  // Mostrar mensaje en el chat (soporta attachments)
  function appendMessage(text, from, save = true, attachments = []) {
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

    if (text) {
      const textNode = document.createElement('div');
      textNode.textContent = text;
      msg.appendChild(textNode);
    }
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
    // Guardar mensaje en el chat seleccionado (incluye attachments)
    if (save && selectedChatId) {
      const chat = chats.find(c => c.id === selectedChatId);
      if (chat) {
        if (!chat.messages) chat.messages = [];
        chat.messages.push({ text, from, attachments: attachments || [] });
        saveChats();
      }
    }
  }

  // Simular respuesta de IA (puedes reemplazar por llamada real a backend/AI)
  // Llamada real a la API PHP para obtener respuesta de IA
  // --- API PHP SIMULADA EN JS PARA PRUEBAS ---
  // Simulación fiel de la lógica de api.php y OpenRouter
  // Implementación directa de la API PHP en JS usando fetch a OpenRouter
  async function callAIAPI(userText) {
    const api_key = '***REMOVED***'; // SOLO PARA PRUEBAS
    // Accept optional OCR summary and attachments as additional args
    const args = Array.from(arguments);
    const ocrSummary = args.length > 1 ? args[1] : '';
    const attachments = args.length > 2 ? args[2] : [];

    // Build multimodal content similar to app.js when attachments are present
    // Add a system message to request responses in Spanish (helps avoid unexpected French replies)
    const model = 'nvidia/nemotron-nano-12b-v2-vl:free';
    let messages;
    const systemMsg = { role: 'system', content: 'Eres un asistente útil. Responde en el idioma en que el usuario escriba. Si la entrada usa otro idioma, responde en el mismo idioma del usuario.' };
    if (attachments && attachments.length) {
      const content = [{ type: 'text', text: userText + (ocrSummary ? '\n\nAttached images OCR:\n' + ocrSummary : '') }];
      for (const url of attachments) {
        content.push({ type: 'image_url', image_url: { url } });
      }
      messages = [systemMsg, { role: 'user', content }];
    } else {
      const prompt = userText + (ocrSummary ? '\n\nAttached images OCR:\n' + ocrSummary : '');
      // Always send user content as a multimodal array (text block),
      // matching the shape used when attachments are present.
      const userContent = [{ type: 'text', text: prompt }];
      messages = [systemMsg, { role: 'user', content: userContent }];
    }
    const data = { model, messages };
    // Use AbortController so requests can be cancelled (e.g. when user forces chat switch)
    try {
      if (aiAbortController) {
        try { aiAbortController.abort(); } catch (e) {}
      }
      aiAbortController = new AbortController();
      const opts = {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + api_key,
          'Content-Type': 'application/json',
          'X-Title': 'AIWORK'
        },
        body: JSON.stringify(data),
        signal: aiAbortController.signal
      };

      let response;
      try {
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', opts);
      } catch (err) {
        // Network/CORS errors often surface as TypeError. Try a CORS-proxy fallback once.
        if (err.name === 'AbortError') throw err;
        try {
          const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://openrouter.ai/api/v1/chat/completions');
          response = await fetch(proxyUrl, opts);
        } catch (err2) {
          throw err; // rethrow original for outer catch
        }
      }

      if (!response) throw new Error('No response from AI endpoint');

      // If proxy wrapped the response, it may be text; try to parse JSON safely
      let result;
      try { result = await response.json(); } catch (e) { result = null; }

      if (response.status === 401) {
        const msg = (result && result.error && result.error.message) ? result.error.message : 'Unauthorized (401)';
        return 'AI error: ' + msg + '. Check the API key or use a backend proxy.';
      }

      // Try multiple known response shapes
      if (result) {
        // OpenAI-style: choices[].message.content
        const choice = (result.choices && result.choices[0]) || null;
        let content = choice?.message?.content || choice?.text || choice || null;
        // If content is an array (multimodal), extract text pieces
        if (Array.isArray(content)) {
          const maybeText = content.map(item => {
            if (typeof item === 'string') return item;
            if (!item) return '';
            return item.text || item.content || (item.message && item.message.content) || '';
          }).join('\n').trim();
          if (maybeText) return maybeText;
        }
        if (typeof content === 'string' && content.trim()) return content;

        // Other possible keys
        if (typeof result.output_text === 'string' && result.output_text.trim()) return result.output_text;
        if (typeof result.response === 'string' && result.response.trim()) return result.response;
        if (result.data && typeof result.data === 'object') {
          const maybe = result.data.text || result.data.output || result.data.response;
          if (typeof maybe === 'string' && maybe.trim()) return maybe;
        }

        // If there's an error object, surface it
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

  // Message send handler
  async function handleSendMessage() {
      aiResponsePending = true;
    // Solución temporal: inicializar autoCreatedChat si no existe
    if (typeof autoCreatedChat === 'undefined') window.autoCreatedChat = false;
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
    // Si no hay chats o chat seleccionado, mostrar advertencia y no enviar
    if (!chats.length || !selectedChatId) {
      showMessage('Please create a chat before sending messages.');
      return;
    }
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
    // Guardar el chatId actual para asociar la respuesta de IA
    const chatIdForAI = selectedChatId;
    // Si el chat fue creado automáticamente, actualizar el título en la lista si el usuario edita el primer mensaje (opcional)
    if (autoCreatedChat) {
      // Actualizar el título del chat en la UI sin recargar
      const chat = chats.find(c => c.id === chatIdForAI);
      if (chat) {
        chat.title = text;
        saveChats();
        renderChats();
      }
    }
    // Show AI message placeholder in the correct chat
    let aiMsgDiv = null;
    if (selectedChatId === chatIdForAI && chatMessagesContainer) {
      appendMessage('...', 'ai', false);
      aiMsgDiv = chatMessagesContainer.lastChild;
      // Persist the pending AI state so we can detect page reloads
      try { markAIPending(chatIdForAI); } catch (e) {}
    }
    // Extract OCR from attachments and include in prompt so the AI can "see" image text
    let ocrTexts = [];
    try {
      ocrTexts = await extractOcrTexts(attachmentsForSend);
    } catch (e) {
      console.warn('OCR extraction error', e);
    }
    const ocrSummary = ocrTexts.filter(Boolean).map((t, idx) => `Image ${idx + 1} OCR:\n${t}`).join('\n\n');
    let aiText = '';
    try {
      console.log('AI request start', { chatId: chatIdForAI });
      // ensure pending marker is set (defensive)
      try { markAIPending(chatIdForAI); } catch (e) {}
      aiText = await callAIAPI(text, ocrSummary, attachmentsForSend);
      console.log('AI response received', { chatId: chatIdForAI, aiText });
    } catch (err) {
      console.error('AI call failed', err);
      aiText = 'AI error: ' + (err && err.message ? err.message : String(err));
    } finally {
      aiResponsePending = false;
      try { clearAIPending(); } catch (e) {}
    }
    // Save AI response in the correct chat unless it was cancelled or an error placeholder
    const chatForAI = chats.find(c => c.id === chatIdForAI);
    const isCancelled = aiText === 'AI cancelled';
    const isAIError = typeof aiText === 'string' && aiText.startsWith('AI error:');
    if (chatForAI && !isCancelled && !isAIError) {
      if (!chatForAI.messages) chatForAI.messages = [];
      chatForAI.messages.push({ text: aiText, from: 'ai' });
      saveChats();
    }
    // Update UI placeholder or render messages depending on outcome
    if (isCancelled) {
      // Remove placeholder silently
      try { if (selectedChatId === chatIdForAI && aiMsgDiv) aiMsgDiv.remove(); } catch (e) {}
    } else if (isAIError) {
      // Show transient error in placeholder but do not save to chat history
      if (selectedChatId === chatIdForAI && aiMsgDiv) {
        aiMsgDiv.textContent = aiText;
      } else if (selectedChatId === chatIdForAI) {
        renderChatMessages();
      } else {
        const observer = new MutationObserver(() => {
          if (selectedChatId === chatIdForAI) {
            renderChatMessages();
            observer.disconnect();
          }
        });
        observer.observe(document.getElementById('chat-list'), { childList: true, subtree: true });
      }
    } else {
      if (chatForAI) {
        if (selectedChatId === chatIdForAI && aiMsgDiv) {
          aiMsgDiv.textContent = aiText;
        } else if (selectedChatId === chatIdForAI) {
          renderChatMessages();
        } else {
          const observer = new MutationObserver(() => {
            if (selectedChatId === chatIdForAI) {
              renderChatMessages();
              observer.disconnect();
            }
          });
          observer.observe(document.getElementById('chat-list'), { childList: true, subtree: true });
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
        if (chatInput.disabled || !selectedChatId) {
          e.preventDefault();
          showMessage('Please create or select a chat before sending messages.');
          return;
        }
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
