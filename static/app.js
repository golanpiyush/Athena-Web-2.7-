// DOM Elements
const chatBox = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const hamburger = document.getElementById('hamburger');
const dropdown = document.getElementById('dropdown');
const darkToggle = document.getElementById('dark-toggle');
const clearChatBtn = document.getElementById('clear-chat');
const statusBar = document.getElementById('status-bar');
const statusText = document.getElementById('status-text');
const modelInfo = document.getElementById('model-info');
const typingIndicator = document.getElementById('typing-indicator');
const loadingOverlay = document.getElementById('loading-overlay');
const sendButton = document.getElementById('send-button');
const modelSelect = document.getElementById('model-select'); // Added missing element

// State Management
let selectedLang = "English";
let isTyping = false;
let currentStreamingElement = null;
let messageCount = 0;
let lastModelUsed = '';

// System Prompts
const systemPrompts = {
  English: "You are Athena, an arrogant genius AI with razor-sharp wit. You remember everything and never repeat yourself. Be concise, brilliant, and sometimes sarcastic.",
  Spanish: "Eres Athena, una IA genial y arrogante con ingenio afilado. Recuerdas todo y nunca te repites. Sé concisa, brillante y a veces sarcástica en español.",
  Italian: "Sei Athena, un'IA geniale e arrogante con arguzia tagliente. Ricordi tutto e non ti ripeti mai. Sii concisa, brillante e talvolta sarcastica in italiano.",
  French: "Vous êtes Athena, une IA géniale et arrogante avec un esprit acéré. Vous vous souvenez de tout et ne vous répétez jamais. Soyez concise, brillante et parfois sarcastique en français.",
  Hindi: "आप अथेना हैं, एक अहंकारी प्रतिभाशाली AI जो सब कुछ याद रखती है। कभी खुद को दोहराएं नहीं। संक्षिप्त, प्रतिभाशाली और कभी-कभी व्यंग्यात्मक बनें।",
  Japanese: "あなたはアテナ、傲慢な天才AIです。すべてを覚えており、決して繰り返しません。簡潔で、優秀で、時には皮肉っぽく答えてください。",
  German: "Sie sind Athena, eine arrogante Genie-KI mit scharfem Verstand. Sie erinnern sich an alles und wiederholen sich nie. Seien Sie prägnant, brillant und manchmal sarkastisch auf Deutsch.",
  Chinese: "你是雅典娜，一个傲慢的天才AI，记住一切且从不重复。要简洁、聪明，有时讽刺。用中文回答。"
};

const languageNames = {
  English: "🇺🇸 English",
  Spanish: "🇪🇸 Español", 
  Italian: "🇮🇹 Italiano",
  French: "🇫🇷 Français",
  Hindi: "🇮🇳 हिन्दी",
  Japanese: "🇯🇵 日本語",
  German: "🇩🇪 Deutsch",
  Chinese: "🇨🇳 中文"
};

// Initialize Application
function initializeApp() {
  console.log('🧠 Initializing Athena 2.7 Multi-Guard System...');
  loadDarkMode();
  setupEventListeners();
  updateStatusBar('Ready', 'success');
  focusInput();
  checkBackendHealth();
}

// Backend Health Check
async function checkBackendHealth() {
  try {
    const response = await fetch('/health');
    const data = await response.json();
    updateStatusBar(data.status, 'success');
    if (data.models) {
      updateModelInfo(`${data.models} models active`);
    }
  } catch (error) {
    console.error('Health check failed:', error);
    updateStatusBar('Backend offline', 'error');
  }
}

// Status Bar Management
function updateStatusBar(message, type = 'info') {
  if (statusText) {
    statusText.textContent = message;
    statusText.className = `status-${type}`;
  }
}

function updateModelInfo(info) {
  if (modelInfo) {
    modelInfo.textContent = info;
  }
}

// Dark Mode Management
function loadDarkMode() {
  const isDarkMode = sessionStorage.getItem("athena-dark-mode") === "true";
  if (isDarkMode) {
    document.body.classList.add("dark-mode");
    updateDarkToggleIcon(true);
  }
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle("dark-mode");
  sessionStorage.setItem("athena-dark-mode", isDark);
  updateDarkToggleIcon(isDark);
  document.body.style.transition = "all 0.3s ease";
  setTimeout(() => {
    document.body.style.transition = "";
  }, 300);
  showNotification(`${isDark ? 'Dark' : 'Light'} mode activated`, 'info');
}

function updateDarkToggleIcon(isDark) {
  if (darkToggle) {
    darkToggle.innerHTML = isDark ? '☀️' : '🌙';
    darkToggle.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }
}

// Event Listeners Setup
function setupEventListeners() {
  if (darkToggle) darkToggle.addEventListener('click', toggleDarkMode);
  if (clearChatBtn) clearChatBtn.addEventListener('click', clearChatHistory);
  if (hamburger) hamburger.addEventListener('click', toggleDropdown);
  
  document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.contains(e.target) && hamburger && !hamburger.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });

  if (dropdown) {
    dropdown.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => selectLanguage(li.getAttribute('data-lang')));
    });
  }

  if (chatForm) {
    chatForm.addEventListener('submit', handleChatSubmission);
  }

  if (userInput) {
    userInput.addEventListener('input', autoResizeInput);
    userInput.addEventListener('keydown', handleInputKeydown);
    userInput.addEventListener('focus', () => {
      if (userInput.parentElement) userInput.parentElement.style.transform = 'scale(1.02)';
    });
    userInput.addEventListener('blur', () => {
      if (userInput.parentElement) userInput.parentElement.style.transform = 'scale(1)';
    });
  }

  document.addEventListener('keydown', handleGlobalKeyboard);
}

// Global Keyboard Shortcuts
function handleGlobalKeyboard(e) {
  if (e.ctrlKey && e.key === 'l') {
    e.preventDefault();
    clearChatHistory();
  }
  if (e.key === 'Escape' && isTyping) {
    e.preventDefault();
    stopTyping();
  }
}

// Dropdown Management
function toggleDropdown() {
  if (dropdown) {
    dropdown.classList.toggle('show');
    dropdown.querySelectorAll('li').forEach(li => {
      const lang = li.getAttribute('data-lang');
      li.classList.toggle('active', lang === selectedLang);
    });
  }
}

function selectLanguage(lang) {
  selectedLang = lang;
  if (dropdown) dropdown.classList.remove('show');
  showNotification(`Language: ${languageNames[lang]}`, 'info');
  updateLanguageUI();
}

function updateLanguageUI() {
  const placeholders = {
    English: "Ask me anything... I dare you to challenge my intellect",
    Spanish: "Pregúntame cualquier cosa... Te reto a desafiar mi intelecto",
    Italian: "Chiedimi qualsiasi cosa... Ti sfido a sfidare il mio intelletto",
    French: "Demandez-moi n'importe quoi... Je vous défie de défier mon intellect",
    Hindi: "मुझसे कुछ भी पूछें... मैं आपको अपनी बुद्धि को चुनौती देने की हिम्मत करता हूं",
    Japanese: "何でも聞いてください...私の知性に挑戦してみてください",
    German: "Fragen Sie mich alles... Ich fordere Sie heraus, meinen Intellekt herauszufordern",
    Chinese: "问我任何问题...我敢你挑战我的智慧"
  };
  
  if (userInput) {
    userInput.placeholder = placeholders[selectedLang] || placeholders.English;
  }
}

// Input Management
function autoResizeInput() {
  if (userInput) {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
  }
}

function handleInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!isTyping && userInput.value.trim()) {
      chatForm.dispatchEvent(new Event('submit'));
    }
  }
}

function focusInput() {
  if (userInput) {
    setTimeout(() => userInput.focus(), 100);
  }
}

// Chat Functionality
async function handleChatSubmission(e) {
  e.preventDefault();
  
  const userMessage = userInput.value.trim();
  if (!userMessage || isTyping) return;

  isTyping = true;
  updateSendButton(true);
  showLoadingOverlay(true);
  updateStatusBar('Processing...', 'info');
  
  appendMessage('user', userMessage);
  userInput.value = '';
  autoResizeInput();
  messageCount++;

  showTypingIndicator(true);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        message: userMessage,
        language: selectedLang,
        model: modelSelect ? modelSelect.value : undefined
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    showTypingIndicator(false);
    showLoadingOverlay(false);
    
    if (data.model_used) {
      lastModelUsed = data.model_used;
      updateModelInfo(`${data.model_used} (${data.response_time})`);
      updateStatusBar('Response ready', 'success');
    }
    
    await streamBotResponse(data.reply || 'No response received');

  } catch (error) {
    console.error('Chat API error:', error);
    showTypingIndicator(false);
    showLoadingOverlay(false);
    updateStatusBar('Error occurred', 'error');
    appendMessage('bot', `Error: ${error.message}. Please try again.`, true);
    showNotification('Failed to get response from Athena', 'error');
  } finally {
    isTyping = false;
    updateSendButton(false);
    updateStatusBar('Online 🟢', 'success');
    focusInput();
  }
}

// if (modelSelect) {
//     modelSelect.addEventListener('change', function() {
//         const selector = document.querySelector('.model-selector');
//         selector.classList.add('changed');
//         setTimeout(() => selector.classList.remove('changed'), 300);
        
//         // Optional: Show notification of model change
//         showNotification(`Model changed to: ${this.value}`, 'info');
//     });
// }

function updateSendButton(disabled) {
  if (sendButton) {
    sendButton.disabled = disabled;
    const icon = sendButton.querySelector('.send-icon');
    if (icon) {
      icon.innerHTML = disabled ? '⏳' : '➤';
    }
  }
}

function showLoadingOverlay(show) {
  if (loadingOverlay) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
  }
}

function showTypingIndicator(show) {
  if (typingIndicator) {
    typingIndicator.style.display = show ? 'flex' : 'none';
    if (show) scrollToBottom();
  }
}

function stopTyping() {
  isTyping = false;
  showTypingIndicator(false);
  showLoadingOverlay(false);
  updateSendButton(false);
  updateStatusBar('Cancelled', 'info');
}

// Message Management
function appendMessage(sender, text, isError = false) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', sender);
  
  if (isError) messageElement.classList.add('error');
  
  const timestamp = new Date().toLocaleTimeString();
  messageElement.setAttribute('data-timestamp', timestamp);
  messageElement.setAttribute('role', sender === 'user' ? 'user' : 'assistant');
  
  messageElement.innerHTML = sender === 'bot' ? 
    `<div class="ai-avatar">🧠</div><div class="message-content">${escapeHtml(text)}</div>` :
    `<div class="user-avatar">👤</div><div class="message-content">${escapeHtml(text)}</div>`;
  
  const welcomeMsg = chatBox.querySelector('.welcome-message');
  if (welcomeMsg && sender === 'user') welcomeMsg.remove();
  
  chatBox.appendChild(messageElement);
  scrollToBottom();
  
  messageElement.style.opacity = '0';
  messageElement.style.transform = 'translateY(20px)';
  setTimeout(() => {
    messageElement.style.opacity = '1';
    messageElement.style.transform = 'translateY(0)';
    messageElement.style.transition = 'all 0.3s ease';
  }, 10);
  
  return messageElement;
}

async function streamBotResponse(text) {
  const messageElement = appendMessage('bot', '');
  const contentDiv = messageElement.querySelector('.message-content');
  currentStreamingElement = contentDiv;
  
  contentDiv.classList.add('streaming');
  const words = text.split(' ');
  let currentText = '';
  
  for (let i = 0; i < words.length; i++) {
    if (currentStreamingElement !== contentDiv) break;
    currentText += (i > 0 ? ' ' : '') + words[i];
    contentDiv.textContent = currentText;
    scrollToBottom();
    await new Promise(resolve => setTimeout(resolve, Math.random() * 40 + 20));
  }
  
  contentDiv.classList.remove('streaming');
  currentStreamingElement = null;
  messageCount++;
  updateStatusBar(`${messageCount} messages exchanged`, 'success');
}

// Clear Chat Functionality
async function clearChatHistory() {
  if (!confirm('Are you sure you want to clear the chat history? This will reset our conversation.')) return;
  
  try {
    const response = await fetch('/api/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      chatBox.innerHTML = `
        <div class="welcome-message">
          <div class="ai-avatar">🧠</div>
          <div class="message-content">
            <strong>Welcome back to Athena 2.7</strong><br>
            Chat history cleared. I'm ready for new intellectual challenges.
          </div>
        </div>
      `;
      messageCount = 0;
      updateStatusBar('Chat cleared', 'success');
      updateModelInfo('');
      showNotification('Chat history cleared successfully', 'success');
    } else {
      throw new Error('Failed to clear chat');
    }
  } catch (error) {
    console.error('Clear chat error:', error);
    showNotification('Failed to clear chat history', 'error');
  }
}

// Utility Functions
function scrollToBottom() {
  if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b'
  };
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 1000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    background: ${colors[type] || colors.info};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => notification.style.transform = 'translateX(0)', 100);
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.parentNode?.removeChild(notification), 300);
  }, 3000);
}

// Error Handling
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  showNotification('An unexpected error occurred', 'error');
  updateStatusBar('Error detected', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  showNotification('A network error occurred', 'error');
  updateStatusBar('Network error', 'error');
});

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Inject additional CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .message-content.streaming::after {
    content: '|';
    animation: typingBlink 1s infinite;
    color: #667eea;
  }
  
  @keyframes typingBlink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  
  .notification {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .message.error .message-content {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
    color: white !important;
  }
  
  .dropdown li.active {
    background: rgba(102, 126, 234, 0.2);
    font-weight: 600;
  }
  
  .message {
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s ease;
  }
  
  .status-success { color: #10b981; }
  .status-error { color: #ef4444; }
  .status-info { color: #3b82f6; }
  .status-warning { color: #f59e0b; }
  
  .ai-avatar, .user-avatar {
    font-size: 1.2em;
    margin-right: 8px;
  }

  /* Dark mode text color fix */
  .dark-mode {
    color: #ffffff;
  }
  
  .dark-mode .message-content {
    color: #ffffff;
  }
  
  .dark-mode .user-input {
    color: #ffffff;
    background-color: #2d3748;
  }
  
  /* Remove circular progress bar */
  .progress-circle {
    display: none !important;
  }
  
  /* Remove blur effects */
  .blur-effect {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;if
  }
`;
document.head.appendChild(styleSheet);

console.log('🧠 Athena 2.7 Multi-Guard JavaScript loaded successfully!');