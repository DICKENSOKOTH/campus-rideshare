// AI Assistant Logic — Chat interface and AI-powered suggestions

class AIAssistant {
    constructor() {
        this.messages = [];
        this.isTyping = false;
        this.context = { currentRides: [], currentBookings: [] };
    }

    async init() {
        if (!authManager.requireAuth()) return;

        this.setupChatInterface();
        this.setupSidebarActions();
        this.loadChatHistory();
        await this.loadUserContext();

        if (this.messages.length === 0) {
            this.showWelcomeMessage();
        }
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

        this.renderQuickActions();
    }

    setupSidebarActions() {
        const newBtn = document.getElementById('newChatBtn');
        if (newBtn) newBtn.addEventListener('click', () => this.clearHistory());

        const clearBtn = document.getElementById('clearChatBtn');
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearHistory());
    }

    renderQuickActions() {
        const container = document.getElementById('quickActionsContainer');
        if (!container) return;

        const actions = [
            { id: 'findRide',   label: 'Find me a ride' },
            { id: 'createRide', label: 'I want to offer a ride' },
            { id: 'myRides',    label: 'Show my rides' },
            { id: 'help',       label: 'How does this work?' },
        ];

        container.innerHTML = actions.map(a =>
            `<button class="quick-prompt" data-action="${a.id}">${a.label}</button>`
        ).join('');

        container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (btn) this.quickAction(btn.dataset.action);
        });
    }

    /* ── Context ── */

    async loadUserContext() {
        try {
            const [ridesRes, bookingsRes] = await Promise.all([
                UserAPI.getMyRides(),
                UserAPI.getMyBookings(),
            ]);
            if (ridesRes.success && ridesRes.data) this.context.currentRides = ridesRes.data;
            if (bookingsRes.success && bookingsRes.data) this.context.currentBookings = bookingsRes.data;
        } catch (error) {
            console.error('Failed to load user context:', error);
        }
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

    async handleSendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput?.value.trim();
        if (!message) return;

        if (messageInput) { messageInput.value = ''; messageInput.style.height = 'auto'; }
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) sendBtn.disabled = true;

        this.addMessage({ role: 'user', content: message, timestamp: new Date().toISOString() });
        this.showTyping();

        try {
            const response = await AIAPI.chat(message, this.messages);
            if (response.success) {
                this.addMessage({
                    role: 'assistant',
                    content: response.response || response.data?.message || 'No response',
                    timestamp: new Date().toISOString(),
                });
            } else {
                throw new Error(response.error || response.message || 'Failed to get response');
            }
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

    /* ── Quick Actions ── */

    quickAction(id) {
        const actions = {
            findRide:   () => this.quickFindRide(),
            createRide: () => this.quickCreateRide(),
            myRides:    () => this.quickShowMyRides(),
            help:       () => this.quickHelp(),
        };
        const fn = actions[id];
        if (fn) fn();
    }

    quickFindRide() {
        this.addMessage({ role: 'user', content: 'Find me a ride', timestamp: new Date().toISOString() });
        this.addMessage({ role: 'assistant', content: 'Sure! To find the best ride for you, I need a few details:\n\nWhere are you starting from?\nWhere do you want to go?\nWhen do you need to travel?', timestamp: new Date().toISOString() });
    }

    quickCreateRide() {
        this.addMessage({ role: 'user', content: 'I want to offer a ride', timestamp: new Date().toISOString() });
        this.addMessage({ role: 'assistant', content: 'Great! Offering rides helps the community and you can earn some money. Let me take you to the ride creation page.', timestamp: new Date().toISOString() });
        setTimeout(() => { window.location.href = 'create-ride.html'; }, 1500);
    }

    quickShowMyRides() {
        const upcoming = (this.context.currentRides || []).filter(r => new Date(r.departure_time) > new Date());
        let content;
        if (upcoming.length > 0) {
            content = `You have ${upcoming.length} upcoming ride(s):\n\n` +
                upcoming.map((r, i) => `${i + 1}. ${r.origin} → ${r.destination}\n   ${new Date(r.departure_time).toLocaleString()}`).join('\n\n');
        } else {
            content = "You don't have any upcoming rides. Would you like to create one or find a ride?";
        }
        this.addMessage({ role: 'user', content: 'Show my rides', timestamp: new Date().toISOString() });
        this.addMessage({ role: 'assistant', content, timestamp: new Date().toISOString() });
    }

    quickHelp() {
        this.addMessage({ role: 'user', content: 'How does this work?', timestamp: new Date().toISOString() });
        this.addMessage({ role: 'assistant', content: "Here's how our rideshare platform works:\n\n**For Riders:**\n1. Search for rides going your way\n2. Book available seats\n3. Meet your driver at the pickup point\n4. Rate your experience after the ride\n\n**For Drivers:**\n1. Create a ride offer with your route\n2. Set your price and available seats\n3. Accept or reject booking requests\n4. Pick up your passengers and earn money\n\n**Safety Tips:**\n- Always verify driver/passenger identity\n- Share your trip details with friends\n- Rate honestly to help the community\n\nDo you have any specific questions?", timestamp: new Date().toISOString() });
    }

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
    document.addEventListener('DOMContentLoaded', () => {
        aiAssistant = new AIAssistant();
        aiAssistant.init();
    });
}
