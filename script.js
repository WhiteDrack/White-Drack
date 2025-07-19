const firebaseConfig = {
    apiKey: "AIzaSyDOPErXM1g4vdmiVdau67U7vGRsmbtMMhE",
    authDomain: "white-drack-fd1ee.firebaseapp.com",
    projectId: "white-drack-fd1ee",
    storageBucket: "white-drack-fd1ee.appspot.com",
    messagingSenderId: "151227903888",
    appId: "1:151227903888:web:02a2d7ab14f7d1e152cd15"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Enhanced conversation tracking
let currentUser = null;
let conversationCache = [];
let currentTopic = "";
let messageToDelete = null;
let isTyping = false;
let shareData = false;

// Speech recognition setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isRecognizing = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isRecognizing = true;
        document.getElementById('voiceInputButton').innerHTML = '<i class="fas fa-microphone-alt-slash"></i>';
        document.getElementById('userInput').placeholder = 'Listening...';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('userInput').value = transcript;
        sendMessage();
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        document.getElementById('userInput').placeholder = 'Error listening...';
        stopVoiceInput();
    };

    recognition.onend = () => {
        stopVoiceInput();
    };
} else {
    console.warn('Web Speech API not supported in this browser.');
    document.getElementById('voiceInputButton').style.display = 'none';
}

function startVoiceInput() {
    if (recognition && !isRecognizing) {
        try {
            recognition.start();
        } catch (e) {
            console.error("Error starting speech recognition:", e);
            alert("Could not start voice input. Please ensure microphone access is granted and try again.");
            stopVoiceInput();
        }
    } else {
        stopVoiceInput();
    }
}

function stopVoiceInput() {
    if (recognition && isRecognizing) {
        recognition.stop();
    }
    isRecognizing = false;
    document.getElementById('voiceInputButton').innerHTML = '<i class="fas fa-microphone"></i>';
    document.getElementById('userInput').placeholder = 'Ask anything...';
}

// DOM Elements
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const menuButton = document.getElementById('menuButton');
const dropdownMenu = document.getElementById('dropdownMenu');
const logoutBtn = document.getElementById('logoutBtn');
const accountBtn = document.getElementById('accountBtn');
const donateBtn = document.getElementById('donateBtn');
const donationForm = document.getElementById('donationForm');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const forgotPasswordModal = document.getElementById('forgotPasswordModal');
const topicDisplay = document.getElementById('topicDisplay');
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const privacySettingsBtn = document.getElementById('privacySettingsBtn');
const privacyModal = document.getElementById('privacyModal');
const shareDataCheckbox = document.getElementById('shareDataCheckbox');
const voiceInputButton = document.getElementById('voiceInputButton');

// Speech Synthesis setup
let currentUtterance = null;

function speakMessage(text, lang = 'en-US') {
    if ('speechSynthesis' in window) {
        if (currentUtterance && speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }

        currentUtterance = new SpeechSynthesisUtterance(text);
        currentUtterance.lang = lang;
        currentUtterance.rate = 1;
        currentUtterance.pitch = 1;

        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => voice.lang === lang && voice.name.includes('Google') || voice.lang === lang);
        if (preferredVoice) {
            currentUtterance.voice = preferredVoice;
        }

        speechSynthesis.speak(currentUtterance);

        currentUtterance.onend = () => {
            console.log('Speech finished');
            currentUtterance = null;
        };

        currentUtterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            currentUtterance = null;
        };
    } else {
        alert('Text-to-speech not supported in this browser.');
    }
}

// Event listener for voice input button
if (voiceInputButton) {
    voiceInputButton.addEventListener('click', startVoiceInput);
}

// Tab switching
loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
});

registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.style.display = 'flex';
    loginForm.style.display = 'none';
});

// Menu toggle
menuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
    donationForm.style.display = 'none';
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!menuButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.remove('show');
    }
    if (!donateBtn.contains(e.target) && donationForm && !donationForm.contains(e.target)) {
        donationForm.style.display = 'none';
    }
    if (!forgotPasswordLink.contains(e.target) && forgotPasswordModal && !forgotPasswordModal.contains(e.target)) {
        forgotPasswordModal.style.display = 'none';
    }
    if (!privacySettingsBtn.contains(e.target) && privacyModal && !privacyModal.contains(e.target)) {
        privacyModal.style.display = 'none';
    }
});

// Donate button click handler
donateBtn.addEventListener('click', () => {
    dropdownMenu.classList.remove('show');
    donationForm.style.display = 'block';
});

// Privacy settings button click handler
privacySettingsBtn.addEventListener('click', () => {
    dropdownMenu.classList.remove('show');
    privacyModal.style.display = 'flex';
});

// Forgot password link click handler
forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    forgotPasswordModal.style.display = 'flex';
    document.getElementById('resetError').style.display = 'none';
    document.getElementById('resetSuccess').style.display = 'none';
    document.getElementById('resetEmail').value = '';
});

// Delete confirmation handler
confirmDeleteBtn.addEventListener('click', async () => {
    if (messageToDelete) {
        await deleteMessage(messageToDelete);
        deleteConfirmModal.style.display = 'none';
    }
});

logoutBtn.addEventListener('click', () => {
    logout();
    dropdownMenu.classList.remove('show');
});

accountBtn.addEventListener('click', () => {
    if (currentUser) {
        alert(`Logged in as: ${currentUser.email}`);
    } else {
        alert("Not currently logged in");
    }
    dropdownMenu.classList.remove('show');
});

// Auth state listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('chatSection').style.display = 'flex';
        logoutBtn.style.display = 'block';

        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.lastTopic) {
                currentTopic = userData.lastTopic;
                displayCurrentTopic();
            }
            if (userData.shareData !== undefined) {
                shareData = userData.shareData;
                shareDataCheckbox.checked = shareData;
            }
        }

        loadChatHistory();
    } else {
        currentUser = null;
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('chatSection').style.display = 'none';
        logoutBtn.style.display = 'none';
    }
});

// Save privacy settings
async function savePrivacySettings() {
    if (!currentUser) return;

    shareData = shareDataCheckbox.checked;
    await db.collection("users").doc(currentUser.uid).set({
        shareData: shareData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    privacyModal.style.display = 'none';
    alert("Privacy settings saved successfully!");
}

// Auth functions
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showError(loginError, "Please fill in all fields");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => {
            let errorMessage = "Login failed";
            switch(error.code) {
                case "auth/invalid-email":
                    errorMessage = "Invalid email address";
                    break;
                case "auth/user-disabled":
                    errorMessage = "Account disabled";
                    break;
                case "auth/user-not-found":
                    errorMessage = "No account found with this email";
                    break;
                case "auth/wrong-password":
                    errorMessage = "Incorrect password";
                    break;
            }
            showError(loginError, errorMessage);
        });
}

function register() {
    const email = document.getElementById('newEmail').value;
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!email || !password || !confirmPassword) {
        showError(registerError, "Please fill in all fields");
        return;
    }

    if (password !== confirmPassword) {
        showError(registerError, "Passwords don't match");
        return;
    }

    if (password.length < 6) {
        showError(registerError, "Password must be at least 6 characters");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            document.getElementById('newEmail').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            registerError.style.display = 'none';
            loginTab.click();
        })
        .catch((error) => {
            let errorMessage = "Registration failed";
            switch(error.code) {
                case "auth/email-already-in-use":
                    errorMessage = "Email already in use";
                    break;
                case "auth/invalid-email":
                    errorMessage = "Invalid email address";
                    break;
                case "auth/weak-password":
                    errorMessage = "Password is too weak";
                    break;
            }
            showError(registerError, errorMessage);
        });
}

// Password reset function
function sendPasswordReset() {
    const email = document.getElementById('resetEmail').value;
    const resetError = document.getElementById('resetError');
    const resetSuccess = document.getElementById('resetSuccess');
    if (!email) {
        resetError.textContent = "Please enter your email address";
        resetError.style.display = 'block';
        return;
    }
    auth.sendPasswordResetEmail(email)
        .then(() => {
            resetError.style.display = 'none';
            resetSuccess.style.display = 'block';
            setTimeout(() => {
                forgotPasswordModal.style.display = 'none';
            }, 2000);
        })
        .catch((error) => {
            let errorMessage = "Error sending reset email";
            switch(error.code) {
                case "auth/invalid-email":
                    errorMessage = "Invalid email address";
                    break;
                case "auth/user-not-found":
                    errorMessage = "No account found with this email";
                    break;
            }
            resetError.textContent = errorMessage;
            resetError.style.display = 'block';
        });
}

function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

function logout() {
    auth.signOut();
}

// Enhanced topic extraction with multi-language support
function extractTopic(message) {
    const questionPatterns = [
        /(what|who|where|when|why|how|explain|tell me|क्या|कौन|कहाँ|कब|क्यों|कैसे) (is|are|was|were|about|do|does|did|है|हो)? (.+)/i,
        /(discuss|talk about|know about|चर्चा|बात करो|जानना चाहता हूँ) (.+)/i,
        /(?:I want to know|tell me|मैं जानना चाहता हूँ|मुझे बताओ) about (.+)/i
    ];

    for (const pattern of questionPatterns) {
        const match = message.toLowerCase().match(pattern);
        if (match) {
            const topic = match[match.length - 1]
                .replace(/[?.,!]/g, '')
                .trim();
            return topic.charAt(0).toUpperCase() + topic.slice(1);
        }
    }
    return null;
}

// Track conversation topic from cached messages
function trackConversationTopic() {
    const lastMessages = conversationCache.slice(-4);
    const newTopic = lastMessages.reduce((topic, msg) => {
        return extractTopic(msg.message) || topic;
    }, currentTopic);

    if (newTopic !== currentTopic) {
        currentTopic = newTopic;
        displayCurrentTopic();

        if (currentUser && currentTopic) {
            db.collection("users").doc(currentUser.uid).set({
                lastTopic: currentTopic,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
    }
}

// Display current topic in UI
function displayCurrentTopic() {
    if (currentTopic) {
        topicDisplay.textContent = `Current Topic: ${currentTopic}`;
        topicDisplay.style.display = 'block';
    } else {
        topicDisplay.style.display = 'none';
    }
}

// Show typing indicator
function showTypingIndicator() {
    if (isTyping) return;

    isTyping = true;
    const responseDiv = document.getElementById('response');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
    `;
    responseDiv.appendChild(typingDiv);
    responseDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// Hide typing indicator
function hideTypingIndicator() {
    isTyping = false;
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Delete message function
async function deleteMessage(messageId) {
    try {
        await db.collection("users").doc(currentUser.uid).collection("chats").doc(messageId).delete();
    } catch (error) {
        console.error("Error deleting message:", error);
        alert("Failed to delete message. Please try again.");
    }
}

// Load chat history with context tracking
function loadChatHistory() {
    if (!currentUser) return;

    db.collection("users").doc(currentUser.uid).collection("chats")
        .orderBy("timestamp", "asc")
        .limit(50)
        .onSnapshot((snapshot) => {
            conversationCache = [];
            const responseDiv = document.getElementById('response');
            responseDiv.innerHTML = '';

            snapshot.forEach(doc => {
                const data = doc.data();
                conversationCache.push({
                    id: doc.id,
                    ...data
                });

                const messageContainer = document.createElement('div');
                messageContainer.className = 'message-container';

                const messageDiv = document.createElement('div');
                messageDiv.className = data.sender === 'user' ? 'user-message' : 'bot-message';
                messageDiv.innerHTML = marked.parse(data.message);

                if (data.message.includes('... [Response truncated') ||
                    data.message.trim().endsWith('let') ||
                    data.message.trim().endsWith('Let')) {
                    const warning = document.createElement('div');
                    warning.className = 'incomplete-warning';
                    warning.textContent = 'Response was automatically completed';
                    messageContainer.appendChild(warning);
                }

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = '×';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    messageToDelete = doc.id;
                    document.getElementById('deleteConfirmModal').style.display = 'flex';
                };

                const readAloudBtn = document.createElement('button');
                readAloudBtn.className = 'read-aloud-btn';
                readAloudBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                readAloudBtn.onclick = (e) => {
                    e.stopPropagation();
                    speakMessage(data.message);
                };

                messageContainer.appendChild(messageDiv);
                messageContainer.appendChild(deleteBtn);
                messageContainer.appendChild(readAloudBtn);
                responseDiv.appendChild(messageContainer);
            });

            trackConversationTopic();
            const messagesContainer = document.getElementById('messagesContainer');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
}

// Enhanced sendMessage with complete response handling
async function sendMessage() {
    if (!currentUser) return;

    const inputField = document.getElementById('userInput');
    const input = inputField.value.trim();
    const button = document.getElementById('askButton');
    if (!input) {
        alert("Please enter a message.");
        return;
    }
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Sending...';
    try {
        await db.collection("users").doc(currentUser.uid).collection("chats").add({
            message: input,
            sender: "user",
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            shareData: shareData
        });
        
        showTypingIndicator();

        const userDoc = await db.collection("users").doc(currentUser.uid).get();
        const userPreferences = userDoc.data() || {};

        const contextMessages = conversationCache
            .slice(-6)
            .map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.message
            }));
            
        const systemPrompt = {
            role: "system",
            content: `You are White Drack AI Assistant.
                Current topic: ${currentTopic || "General discussion"}.
                User preferences: ${JSON.stringify(userPreferences)}.
                Respond in the user's language matching their message.
                ALWAYS provide complete responses with proper endings.
                Never end with "let" or incomplete sentences.
                Structure your response with:
                1. Clear introduction
                2. Detailed main content
                3. Proper conclusion
                If the response is long, ensure it's properly concluded before token limits.`
        };
        
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": "Bearer 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",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "deepseek/deepseek-r1:free",
                messages: [systemPrompt, ...contextMessages],
                temperature: 0.7,
                max_tokens: 4000,
                stream: false
            })
        });
        
        const data = await response.json();
        let botResponse = data.choices?.[0]?.message?.content || 'No response received.';

        if (botResponse.trim().endsWith('let') ||
            botResponse.trim().endsWith('Let') ||
            !/[.!?]$/.test(botResponse.trim())) {
            botResponse = botResponse.replace(/\s(let|Let)[^.!?]*$/i, '.');

            if (!/[.!?]$/.test(botResponse.trim())) {
                botResponse += '... [Response auto-completed]';
            }
        }
        
        await db.collection("users").doc(currentUser.uid).collection("chats").add({
            message: botResponse,
            sender: "bot",
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            context: {
                topic: currentTopic,
                relatedMessages: contextMessages.map(m => m.content)
            }
        });
    } catch (error) {
        console.error("Error:", error);
        await db.collection("users").doc(currentUser.uid).collection("chats").add({
            message: `Error: ${error.message}`,
            sender: "bot",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } finally {
        hideTypingIndicator();
        button.disabled = false;
        button.innerHTML = 'Send';
        inputField.value = '';
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('userInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });
});