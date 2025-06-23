// DOM Elements
const chatBox = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const hamburger = document.getElementById('hamburger');
const dropdown = document.getElementById('dropdown');
const darkToggle = document.getElementById('dark-toggle');
const submitButton = chatForm.querySelector('button[type="submit"]');

// State Management
let selectedLang = "English";
let isTyping = false;
let currentStreamingElement = null;

// System Prompts for Different Languages
const systemPrompts = {
  English: "You are Athena, a wise and helpful AI assistant. Respond thoughtfully and provide clear, helpful information.",
  Spanish: "Eres Athena, una asistente de IA sabia y útil. Responde de manera reflexiva y proporciona información clara y útil en español.",
  Italian: "Sei Athena, un'assistente IA saggia e utile. Rispondi in modo riflessivo e fornisci informazioni chiare e utili in italiano.",
  French: "Vous êtes Athena, une assistante IA sage et utile. Répondez de manière réfléchie et fournissez des informations claires et utiles en français.",
  Hindi: "आप अथेना हैं, एक बुद्धिमान और सहायक AI असिस्टेंट। विचारशील तरीके से जवाब दें और स्पष्ट, उपयोगी जानकारी प्रदान करें।",
  Japanese: "あなたはアテナ、賢くて親切なAIアシスタントです。思慮深く答え、明確で役立つ情報を提供してください。"
};

// Language Display Names
const languageNames = {
  English: "English",
  Spanish: "Español", 
  Italian: "Italiano",
  French: "Français",
  Hindi: "हिन्दी",
  Japanese: "日本語"
};

// Initialize Application
function initializeApp() {
  loadDarkMode();
  setupEventListeners();
  createAnimatedBackground();
  displayWelcomeMessage();
  focusInput();
}

// Dark Mode Management
function loadDarkMode() {
  // Note: In a real Flask app, you might want to use server-side storage instead
  // For now, we'll use a simple session-based approach
  const isDarkMode = sessionStorage.getItem("darkMode") === "true";
  if (isDarkMode) {
    document.body.classList.add("dark-mode");
    updateDarkToggleIcon(true);
  }
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle("dark-mode");
  sessionStorage.setItem("darkMode", isDark);
  updateDarkToggleIcon(isDark);
  
  // Add a nice transition effect
  document.body.style.transition = "all 0.3s ease";
  setTimeout(() => {
    document.body.style.transition = "";
  }, 300);
}

function updateDarkToggleIcon(isDark) {
  darkToggle.innerHTML = isDark ? '☀️' : '🌙';
  darkToggle.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
}

// Event Listeners Setup
function setupEventListeners() {
  // Dark mode toggle
  darkToggle.addEventListener('click', toggleDarkMode);

  // Language dropdown
  hamburger.addEventListener('click', toggleDropdown);
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !hamburger.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });

  // Language selection
  dropdown.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => selectLanguage(li.getAttribute('data-lang')));
  });

  // Chat form submission
  chatForm.addEventListener('submit', handleChatSubmission);

  // Auto-resize textarea
  userInput.addEventListener('input', autoResizeInput);
  
  // Enter key handling (Shift+Enter for new line, Enter to send)
  userInput.addEventListener('keydown', handleInputKeydown);

  // Focus management
  userInput.addEventListener('focus', () => {
    userInput.parentElement.style.transform = 'scale(1.02)';
  });
  
  userInput.addEventListener('blur', () => {
    userInput.parentElement.style.transform = 'scale(1)';
  });
}

// Dropdown Management
function toggleDropdown() {
  dropdown.classList.toggle('show');
  
  // Update dropdown content with current selection
  dropdown.querySelectorAll('li').forEach(li => {
    const lang = li.getAttribute('data-lang');
    li.classList.toggle('active', lang === selectedLang);
  });
}

function selectLanguage(lang) {
  selectedLang = lang;
  dropdown.classList.remove('show');
  
  // Show language change notification
  showNotification(`Language changed to ${languageNames[lang]}`, 'info');
  
  // Update UI to reflect language change
  updateLanguageUI();
}

function updateLanguageUI() {
  // You could update placeholder text based on language here
  const placeholders = {
    English: "Type your message...",
    Spanish: "Escribe tu mensaje...",
    Italian: "Scrivi il tuo messaggio...",
    French: "Tapez votre message...",
    Hindi: "अपना संदेश टाइप करें...",
    Japanese: "メッセージを入力してください..."
  };
  
  userInput.placeholder = placeholders[selectedLang];
}

// Input Management
function autoResizeInput() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
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
  setTimeout(() => userInput.focus(), 100);
}

// Chat Functionality
async function handleChatSubmission(e) {
  e.preventDefault();
  
  const userMessage = userInput.value.trim();
  if (!userMessage || isTyping) return;

  // Update UI state
  isTyping = true;
  updateSubmitButton(true);
  
  // Add user message
  appendMessage('user', userMessage);
  userInput.value = '';
  autoResizeInput();

  // Show typing indicator
  const typingIndicator = showTypingIndicator();

  try {
    // Make API request
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        message: userMessage,
        system: systemPrompts[selectedLang],
        language: selectedLang
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Remove typing indicator
    removeTypingIndicator(typingIndicator);
    
    // Stream the response
    await streamBotResponse(data.reply || data.response || 'No response received');

  } catch (error) {
    console.error('Chat error:', error);
    removeTypingIndicator(typingIndicator);
    appendMessage('bot', 'Sorry, I encountered an error. Please try again.', true);
    showNotification('Connection error. Please check your network.', 'error');
  } finally {
    // Reset UI state
    isTyping = false;
    updateSubmitButton(false);
    focusInput();
  }
}

function updateSubmitButton(disabled) {
  submitButton.disabled = disabled;
  submitButton.innerHTML = disabled ? '<div class="loading-spinner"></div>' : '➤';
}

// Message Management
function appendMessage(sender, text, isError = false) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', sender);
  
  if (isError) {
    messageElement.classList.add('error');
  }
  
  // Add timestamp for accessibility
  const timestamp = new Date().toLocaleTimeString();
  messageElement.setAttribute('data-timestamp', timestamp);
  messageElement.setAttribute('role', sender === 'user' ? 'user' : 'assistant');
  
  if (sender === 'bot') {
    messageElement.innerHTML = `<span class="message-content">${escapeHtml(text)}</span>`;
  } else {
    messageElement.textContent = text;
  }
  
  chatBox.appendChild(messageElement);
  scrollToBottom();
  
  return messageElement;
}

function showTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.classList.add('typing-indicator');
  indicator.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-label', 'Athena is typing');
  
  chatBox.appendChild(indicator);
  scrollToBottom();
  
  return indicator;
}

function removeTypingIndicator(indicator) {
  if (indicator && indicator.parentNode) {
    indicator.style.opacity = '0';
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 200);
  }
}

async function streamBotResponse(text) {
  const messageElement = appendMessage('bot', '');
  const contentSpan = messageElement.querySelector('.message-content');
  currentStreamingElement = contentSpan;
  
  // Add streaming cursor
  contentSpan.classList.add('streaming');
  
  const words = text.split(' ');
  let currentText = '';
  
  for (let i = 0; i < words.length; i++) {
    if (currentStreamingElement !== contentSpan) break; // Stop if interrupted
    
    currentText += (i > 0 ? ' ' : '') + words[i];
    contentSpan.textContent = currentText;
    scrollToBottom();
    
    // Variable delay for more natural typing
    const delay = Math.random() * 50 + 30;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // Remove streaming cursor
  contentSpan.classList.remove('streaming');
  currentStreamingElement = null;
}

// Utility Functions
function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
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
    ${type === 'error' ? 'background: #ef4444;' : 'background: #10b981;'}
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Remove after delay
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Animated Background
function createAnimatedBackground() {
  const bgAnimation = document.createElement('div');
  bgAnimation.className = 'bg-animation';
  
  const floatingShapes = document.createElement('div');
  floatingShapes.className = 'floating-shapes';
  
  // Create floating shapes
  for (let i = 0; i < 5; i++) {
    const shape = document.createElement('div');
    shape.className = 'shape';
    floatingShapes.appendChild(shape);
  }
  
  bgAnimation.appendChild(floatingShapes);
  document.body.appendChild(bgAnimation);
}

// Welcome Message
function displayWelcomeMessage() {
  setTimeout(() => {
    appendMessage('bot', 'Hello! I\'m Athena, your AI assistant. How can I help you today? 🦉');
  }, 500);
}

// Enhanced Error Handling
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  showNotification('An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  showNotification('A network error occurred', 'error');
});

// Performance Optimization
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Optimized scroll handling
const debouncedScrollToBottom = debounce(scrollToBottom, 10);

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Add CSS classes for enhanced functionality
const additionalStyles = `
  .message-content.streaming::after {
    content: '|';
    animation: typingBlink 1s infinite;
    color: #667eea;
  }
  
  .notification {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .message.error {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
    color: white !important;
  }
  
  .dropdown li.active {
    background: rgba(102, 126, 234, 0.2);
    font-weight: 600;
  }
  
  .typing-indicator {
    animation: messageSlide 0.4s ease;
  }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);