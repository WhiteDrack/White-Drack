// Store conversation history
let conversationHistory = [];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener to send button
    document.getElementById('sendButton').addEventListener('click', sendMessage);
    
    // Add event listener for Enter key
    document.getElementById('userInput').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Add welcome message
    appendMessage('bot', getWelcomeMessage());
    conversationHistory.push({ role: 'assistant', content: getWelcomeMessage() });
});

// Welcome message with formatted content
function getWelcomeMessage() {
    return `Hello! I'm White Drack AI, your intelligent assistant. I can help you with various tasks and provide information in a clear, structured format.

## Here's what I can do:

- **Answer questions** on a wide range of topics
- **Explain concepts** with detailed explanations
- **Provide examples** with code snippets
- **Create structured content** with lists and tables
- **Format information** in an organized way

### Example formatting styles I use:

1. **Paragraphs**: For detailed explanations
2. **Bullet points**: For listing key information
3. **Numbered lists**: For step-by-step instructions
4. **Tables**: For organized data presentation
5. **Code blocks**: For programming code examples with copy functionality

Try asking me something like:
- "Explain quantum computing in simple terms"
- "Give me a recipe for chocolate chip cookies"
- "Show me an example of a Python function"
- "Create a table comparing different programming languages"

How can I assist you today?`;
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    if (!message) return;

    // Show user message
    appendMessage('user', message);
    conversationHistory.push({ role: 'user', content: message });
    input.value = '';

    try {
        // Show thinking animation
        showThinkingAnimation();
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer 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',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-3.5-turbo',
                messages: conversationHistory
            })
        });

        const data = await response.json();
        console.log(data);

        const reply = data.choices?.[0]?.message?.content || '❌ No response received.';
        
        // Add to conversation history
        conversationHistory.push({ role: 'assistant', content: reply });
        
        // Replace thinking animation with actual response
        replaceLastBotMessage(formatBotMessage(reply));
        
        // Apply syntax highlighting to code blocks and add copy buttons
        setTimeout(() => {
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
                
                // Add copy button to code blocks
                const preElement = block.closest('pre');
                if (preElement && !preElement.querySelector('.copy-button')) {
                    addCopyButton(preElement, block.textContent);
                    
                    // Add compact class for mobile
                    if (window.innerWidth <= 768) {
                        preElement.classList.add('compact-code');
                    }
                }
            });
        }, 100);
    } catch (error) {
        console.error('API Error:', error);
        replaceLastBotMessage('❌ Error: ' + error.message);
    }
}

function appendMessage(sender, text) {
    const chat = document.getElementById('chat');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = `avatar ${sender}-avatar`;
    avatarDiv.textContent = sender === 'user' ? 'Y' : 'WD';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (sender === 'bot') {
        contentDiv.innerHTML = formatBotMessage(text);
    } else {
        contentDiv.textContent = text;
    }
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chat.appendChild(messageDiv);
    chat.scrollTop = chat.scrollHeight;
}

function formatBotMessage(text) {
    // Convert markdown to HTML
    const html = marked.parse(text);
    // Sanitize HTML to prevent XSS attacks
    const cleanHtml = DOMPurify.sanitize(html);
    // Wrap in a div with class for styling
    return `<div class="bot-message-content">${cleanHtml}</div>`;
}

function showThinkingAnimation() {
    const chat = document.getElementById('chat');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    messageDiv.id = 'thinking-message';
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar bot-avatar';
    avatarDiv.textContent = 'WD';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = `
        <div class="thinking">
            <span>White Drack AI is thinking</span>
            <div class="thinking-dots">
                <div class="thinking-dot"></div>
                <div class="thinking-dot"></div>
                <div class="thinking-dot"></div>
            </div>
        </div>
    `;
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    chat.appendChild(messageDiv);
    chat.scrollTop = chat.scrollHeight;
}

function replaceLastBotMessage(newContent) {
    const thinkingMessage = document.getElementById('thinking-message');
    if (thinkingMessage) {
        thinkingMessage.querySelector('.message-content').innerHTML = newContent;
        thinkingMessage.removeAttribute('id');
    } else {
        const chat = document.getElementById('chat');
        const botMessages = chat.querySelectorAll('.bot-message');
        if (botMessages.length > 0) {
            botMessages[botMessages.length - 1].querySelector('.message-content').innerHTML = newContent;
        }
    }
}

// Add copy button to code blocks
function addCopyButton(preElement, codeText) {
    // Create code header
    const codeHeader = document.createElement('div');
    codeHeader.className = 'code-header';
    
    // Detect language for label
    const language = preElement.querySelector('code').className.replace('language-', '') || 'code';
    
    // Add language label
    const languageLabel = document.createElement('span');
    languageLabel.className = 'code-language';
    languageLabel.textContent = language;
    codeHeader.appendChild(languageLabel);
    
    // Add copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy
    `;
    
    copyButton.addEventListener('click', function() {
        copyToClipboard(codeText);
        
        // Visual feedback
        const originalText = copyButton.innerHTML;
        copyButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copied!
        `;
        copyButton.classList.add('copied');
        
        // Revert after 2 seconds
        setTimeout(() => {
            copyButton.innerHTML = originalText;
            copyButton.classList.remove('copied');
        }, 2000);
    });
    
    codeHeader.appendChild(copyButton);
    preElement.parentNode.insertBefore(codeHeader, preElement);
}

// Copy text to clipboard
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
    
    document.body.removeChild(textarea);
}

// Handle window resize for responsive code blocks
window.addEventListener('resize', function() {
    document.querySelectorAll('pre').forEach(preElement => {
        if (window.innerWidth <= 768) {
            preElement.classList.add('compact-code');
        } else {
            preElement.classList.remove('compact-code');
        }
    });
});
