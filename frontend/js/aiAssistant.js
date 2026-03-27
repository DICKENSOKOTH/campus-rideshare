// AI Assistant Logic — Chat interface powered by the backend AI API

class AIAssistant {
    constructor() {
        this.messages = [];
        this.isTyping = false;
    }

    async init() {
        if (!(await authManager.requireAuth())) return;

        this.setupChatInterface();
        this.setupSidebarActions();
        this.loadChatHistory();
        await this.loadPageData();
    }

    /* ── Setup ── */

    setupChatInterface() {
        const chatForm = document.getElementById('chatForm');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');

        if (chatForm) {
            chatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSendMessage();
            });
        }

        if (messageInput) {
            messageInput.addEventListener('input', () => {
                if (sendBtn) sendBtn.disabled = !messageInput.value.trim();
                messageInput.style.height = 'auto';
                messageInput.style.height = messageInput.scrollHeight + 'px';
            });
        }
    }

    setupSidebarActions() {
        const newBtn = document.getElementById('newChatBtn');
        if (newBtn) newBtn.addEventListener('click', () => this.clearHistory());

        const clearBtn = document.getElementById('clearChatBtn');
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearHistory());
    }

    /* ── Page data from backend ── */

    async loadPageData() {
        try {
            const data = await AIAPI.getChatPageData();
            if (data.success) {
                this.renderQuickActions(data.suggestions || []);
                if (this.messages.length === 0 && data.greeting) {
                    this.addMessage({
                        role: 'assistant',
                        content: data.greeting,
                        timestamp: new Date().toISOString(),
                    }, false);
                }
            }
        } catch (err) {
            console.error('Failed to load AI page data:', err);
        }

        // Fallback welcome if nothing loaded
        if (this.messages.length === 0) {
            this.showFallbackWelcome();
        }
    }

    renderQuickActions(suggestions) {
        const container = document.getElementById('quickActionsContainer');
        if (!container) return;

        if (!suggestions.length) {
            suggestions = ['Search available rides', 'How booking works', 'Platform help'];
        }

        container.innerHTML = suggestions.map(label =>
            `<button class="quick-prompt" data-prompt="${this.escapeHtml(label)}">${this.escapeHtml(label)}</button>`
        ).join('');

        container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-prompt]');
            if (btn) this.sendMessage(btn.dataset.prompt);
        });
    }

    showFallbackWelcome() {
        const userName = authManager.currentUser?.full_name?.split(' ')[0] || 'there';
        this.addMessage({
            role: 'assistant',
            content: `Hi ${userName}! I can help you find rides, check availability, or answer questions about the platform. What would you like to know?`,
            timestamp: new Date().toISOString(),
        }, false);
    }

    /* ── Chat History ── */

    loadChatHistory() {
        const history = localStorage.getItem('chat_history');
        if (history) {
            try {
                this.messages = JSON.parse(history);
                this.renderMessages();
            } catch (_) {
                this.messages = [];
            }
        }
        this.renderSidebarHistory();
    }

    saveChatHistory() {
        try {
            localStorage.setItem('chat_history', JSON.stringify(this.messages.slice(-50)));
        } catch (_) {}
        this.renderSidebarHistory();
    }

    renderSidebarHistory() {
        const container = document.getElementById('chatHistory');
        if (!container) return;

        const userMessages = this.messages.filter(m => m.role === 'user');
        if (!userMessages.length) {
            container.innerHTML = '<p class="chat-history-label">No conversations yet</p>';
            return;
        }

        // Group by date
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const groups = { Today: [], Yesterday: [], Earlier: [] };

        userMessages.forEach(m => {
            const d = new Date(m.timestamp).toDateString();
            if (d === today) groups.Today.push(m);
            else if (d === yesterday) groups.Yesterday.push(m);
            else groups.Earlier.push(m);
        });

        let html = '';
        for (const [label, msgs] of Object.entries(groups)) {
            if (!msgs.length) continue;
            html += `<p class="chat-history-label">${label}</p>`;
            msgs.forEach(m => {
                const preview = m.content.length > 30 ? m.content.substring(0, 30) + '...' : m.content;
                html += `<div class="chat-history-item">${this.escapeHtml(preview)}</div>`;
            });
        }
        container.innerHTML = html;
    }

    /* ── Welcome ── */

    showWelcomeMessage() {
        const userName = authManager.currentUser?.full_name?.split(' ')[0] || 'there';
        this.addMessage({
            role: 'assistant',
            content: `Hi ${userName}! I'm your rideshare assistant. I can help you:\n\n- Find rides that match your schedule\n- Compare prices across available rides\n- Plan your route with stops\n- Help you post a ride as a driver\n- Recommend top-rated drivers\n\nWhat would you like to do today?`,
            timestamp: new Date().toISOString(),
        }, false);
    }

    /* ── Send Message ── */

    async sendMessage(text) {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) { messageInput.value = ''; messageInput.style.height = 'auto'; }
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) sendBtn.disabled = true;

        this.addMessage({ role: 'user', content: text, timestamp: new Date().toISOString() });
        this.showTyping();

        try {
            // Build clean history for the backend: only role + content
            const history = this.messages
                .filter(m => m.role === 'user' || m.role === 'assistant')
                .map(m => ({ role: m.role, content: m.content }));

            const response = await AIAPI.chat(text, history);

            this.addMessage({
                role: 'assistant',
                content: response.response || 'No response received.',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('AI chat error:', error);
            this.addMessage({
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date().toISOString(),
                isError: true,
            });
        } finally {
            this.hideTyping();
        }
    }

    async handleSendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput?.value.trim();
        if (!message) return;
        await this.sendMessage(message);
    }

    /* ── Message Rendering ── */

    addMessage(message, save = true) {
        this.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();
        if (save) this.saveChatHistory();
    }

    renderMessages() {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        // Keep typing indicator
        const typing = document.getElementById('typingIndicator');
        container.innerHTML = '';
        this.messages.forEach(m => this.renderMessage(m));
        if (typing) container.appendChild(typing);
        this.scrollToBottom();
    }

    renderMessage(message) {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const typing = document.getElementById('typingIndicator');
        const div = document.createElement('div');
        div.className = `message ${message.role === 'user' ? 'user' : 'ai'}`;

        const avatarHtml = message.role === 'user'
            ? `<div class="avatar avatar-sm">${this.getUserInitials()}</div>`
            : `<div class="ai-avatar"><svg class="icon icon-md gold-light"><use href="assets/icons.svg#icon-sparkle"></use></svg></div>`;

        const formattedContent = this.formatContent(message.content);

        div.innerHTML = `
            ${avatarHtml}
            <div>
                <div class="message-bubble${message.isError ? ' text-danger' : ''}">${formattedContent}</div>
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            </div>
        `;

        if (typing) container.insertBefore(div, typing);
        else container.appendChild(div);
    }

    formatContent(content) {
        if (!content) return '';
        return this.escapeHtml(content)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/- /g, '&bull; ');
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    getUserInitials() {
        const name = authManager.currentUser?.full_name;
        if (!name) return '?';
        return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
    }

    escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    /* ── Typing Indicator ── */

    showTyping() {
        this.isTyping = true;
        const el = document.getElementById('typingIndicator');
        if (el) el.classList.remove('hidden');
        this.scrollToBottom();
    }

    hideTyping() {
        this.isTyping = false;
        const el = document.getElementById('typingIndicator');
        if (el) el.classList.add('hidden');
    }

    scrollToBottom() {
        const container = document.getElementById('chatMessages');
        if (container) container.scrollTop = container.scrollHeight;
    }

    /* ── Quick Actions (all go through the AI backend) ── */

    // Quick action buttons just send their label as a message to the AI
    // No more hardcoded responses — everything goes through the backend

    /* ── Clear ── */

    clearHistory() {
        this.messages = [];
        localStorage.removeItem('chat_history');
        this.renderMessages();
        this.renderSidebarHistory();
        this.showWelcomeMessage();
    }
}

// Initialize
let aiAssistant;
if (window.location.pathname.includes('ai-assistant.html')) {
    document.addEventListener('DOMContentLoaded', async () => {
        aiAssistant = new AIAssistant();
        await aiAssistant.init();
    });
}
