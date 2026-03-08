// AI Assistant Logic - Chat interface and AI-powered suggestions

class AIAssistant {
    constructor() {
        this.messages = [];
        this.isTyping = false;
        this.context = {
            userLocation: null,
            recentSearches: [],
            currentRides: [],
        };
    }

    async init() {
        // Require authentication
        if (!authManager.requireAuth()) {
            return;
        }

        this.setupChatInterface();
        this.loadChatHistory();
        await this.loadUserContext();
        this.showWelcomeMessage();
    }

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
            messageInput.addEventListener('input', (e) => {
                // Enable/disable send button based on input
                if (sendBtn) {
                    sendBtn.disabled = !e.target.value.trim();
                }
            });

            // Auto-resize textarea
            messageInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        }

        // Setup quick action buttons
        this.setupQuickActions();
    }

    setupQuickActions() {
        const quickActions = [
            { id: 'findRide', text: 'Find me a ride', action: () => this.quickFindRide() },
            { id: 'createRide', text: 'I want to offer a ride', action: () => this.quickCreateRide() },
            { id: 'myRides', text: 'Show my rides', action: () => this.quickShowMyRides() },
            { id: 'help', text: 'How does this work?', action: () => this.quickHelp() },
        ];

        const container = document.getElementById('quickActionsContainer');
        if (container) {
            container.innerHTML = quickActions.map(action => `
                <button class="quick-action-btn" onclick="aiAssistant.quickAction('${action.id}')">
                    ${action.text}
                </button>
            `).join('');
        }

        // Store actions for later use
        this.quickActions = new Map(quickActions.map(a => [a.id, a.action]));
    }

    async loadUserContext() {
        try {
            // Load user's recent rides and bookings
            const [ridesResponse, bookingsResponse] = await Promise.all([
                UserAPI.getUserRides(),
                UserAPI.getUserBookings(),
            ]);

            if (ridesResponse.success && ridesResponse.data) {
                this.context.currentRides = ridesResponse.data;
            }

            if (bookingsResponse.success && bookingsResponse.data) {
                this.context.currentBookings = bookingsResponse.data;
            }

            // Get user location
            try {
                this.context.userLocation = await mapManager.getCurrentLocation();
            } catch (error) {
                console.log('Could not get user location');
            }

            // Load recent searches from localStorage
            const searches = localStorage.getItem('recent_searches');
            if (searches) {
                this.context.recentSearches = JSON.parse(searches);
            }
        } catch (error) {
            console.error('Failed to load user context:', error);
        }
    }

    loadChatHistory() {
        // Load chat history from localStorage
        const history = localStorage.getItem('chat_history');
        if (history) {
            try {
                this.messages = JSON.parse(history);
                this.renderMessages();
            } catch (error) {
                console.error('Failed to load chat history:', error);
                this.messages = [];
            }
        }
    }

    saveChatHistory() {
        try {
            // Keep only last 50 messages
            const recentMessages = this.messages.slice(-50);
            localStorage.setItem('chat_history', JSON.stringify(recentMessages));
        } catch (error) {
            console.error('Failed to save chat history:', error);
        }
    }

    showWelcomeMessage() {
        if (this.messages.length === 0) {
            const welcomeMessage = {
                role: 'assistant',
                content: `Hi ${authManager.currentUser?.name || 'there'}! 👋 I'm your rideshare assistant. I can help you:\n\n• Find rides that match your schedule\n• Create ride offers\n• Answer questions about ridesharing\n• Give you tips for better rides\n\nWhat would you like to do today?`,
                timestamp: new Date().toISOString(),
            };
            
            this.addMessage(welcomeMessage, false);
        }
    }

    async handleSendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput?.value.trim();

        if (!message) return;

        // Clear input and disable send button
        if (messageInput) {
            messageInput.value = '';
            messageInput.style.height = 'auto';
        }

        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) sendBtn.disabled = true;

        // Add user message
        this.addMessage({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString(),
        });

        // Show typing indicator
        this.showTyping();

        try {
            // Send to AI API
            const response = await AIAPI.chat(message, this.context);

            if (response.success && response.data) {
                // Add AI response
                this.addMessage({
                    role: 'assistant',
                    content: response.data.message,
                    timestamp: new Date().toISOString(),
                    suggestions: response.data.suggestions,
                    actions: response.data.actions,
                });

                // Update context if provided
                if (response.data.updated_context) {
                    Object.assign(this.context, response.data.updated_context);
                }
            } else {
                throw new Error(response.message || 'Failed to get response');
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

    addMessage(message, save = true) {
        this.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();

        if (save) {
            this.saveChatHistory();
        }
    }

    renderMessages() {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        container.innerHTML = '';
        this.messages.forEach(message => this.renderMessage(message));
        this.scrollToBottom();
    }

    renderMessage(message) {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message message-${message.role}`;

        let content = `
            <div class="message-content">
                <p>${this.formatMessageContent(message.content)}</p>
            </div>
            <div class="message-time">${this.formatTime(message.timestamp)}</div>
        `;

        // Add suggestions if present
        if (message.suggestions && message.suggestions.length > 0) {
            content += `
                <div class="message-suggestions">
                    ${message.suggestions.map((suggestion, index) => `
                        <button class="suggestion-btn" onclick="aiAssistant.applySuggestion(${index}, '${message.suggestions[index]}')">
                            ${suggestion}
                        </button>
                    `).join('')}
                </div>
            `;
        }

        // Add action buttons if present
        if (message.actions && message.actions.length > 0) {
            content += `
                <div class="message-actions">
                    ${message.actions.map(action => `
                        <button class="action-btn" onclick="aiAssistant.executeAction('${action.type}', '${action.data}')">
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            `;
        }

        messageDiv.innerHTML = content;
        container.appendChild(messageDiv);
    }

    formatMessageContent(content) {
        // Convert markdown-like formatting to HTML
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    showTyping() {
        this.isTyping = true;
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const typingDiv = document.createElement('div');
        typingDiv.id = 'typingIndicator';
        typingDiv.className = 'chat-message message-assistant typing';
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;

        container.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTyping() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    scrollToBottom() {
        const container = document.getElementById('chatMessages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    quickAction(actionId) {
        const action = this.quickActions.get(actionId);
        if (action) {
            action();
        }
    }

    quickFindRide() {
        this.addMessage({
            role: 'user',
            content: 'Find me a ride',
            timestamp: new Date().toISOString(),
        });

        this.addMessage({
            role: 'assistant',
            content: 'Sure! To find the best ride for you, I need a few details:\n\nWhere are you starting from?\nWhere do you want to go?\nWhen do you need to travel?',
            timestamp: new Date().toISOString(),
        });
    }

    quickCreateRide() {
        this.addMessage({
            role: 'user',
            content: 'I want to offer a ride',
            timestamp: new Date().toISOString(),
        });

        this.addMessage({
            role: 'assistant',
            content: 'Great! Offering rides helps the community and you can earn some money. Let me guide you through creating a ride offer.',
            timestamp: new Date().toISOString(),
            actions: [{
                type: 'navigate',
                data: '/create-ride.html',
                label: 'Create Ride Now',
            }],
        });
    }

    quickShowMyRides() {
        const upcomingRides = this.context.currentRides?.filter(ride => 
            new Date(ride.departure_time) > new Date()
        ) || [];

        let content = '';
        if (upcomingRides.length > 0) {
            content = `You have ${upcomingRides.length} upcoming ride(s):\n\n`;
            upcomingRides.forEach((ride, index) => {
                content += `${index + 1}. ${ride.origin} → ${ride.destination}\n   ${new Date(ride.departure_time).toLocaleString()}\n\n`;
            });
        } else {
            content = 'You don\'t have any upcoming rides. Would you like to create one or find a ride?';
        }

        this.addMessage({
            role: 'user',
            content: 'Show my rides',
            timestamp: new Date().toISOString(),
        });

        this.addMessage({
            role: 'assistant',
            content: content,
            timestamp: new Date().toISOString(),
            actions: [{
                type: 'navigate',
                data: '/dashboard.html',
                label: 'View Dashboard',
            }],
        });
    }

    quickHelp() {
        this.addMessage({
            role: 'user',
            content: 'How does this work?',
            timestamp: new Date().toISOString(),
        });

        this.addMessage({
            role: 'assistant',
            content: `Here's how our rideshare platform works:\n\n**For Riders:**\n1. Search for rides going your way\n2. Book available seats\n3. Meet your driver at the pickup point\n4. Rate your experience after the ride\n\n**For Drivers:**\n1. Create a ride offer with your route\n2. Set your price and available seats\n3. Accept or reject booking requests\n4. Pick up your passengers and earn money\n\n**Safety Tips:**\n• Always verify driver/passenger identity\n• Share your trip details with friends\n• Rate honestly to help the community\n\nDo you have any specific questions?`,
            timestamp: new Date().toISOString(),
        });
    }

    applySuggestion(index, suggestion) {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = suggestion;
            messageInput.focus();
        }
    }

    executeAction(type, data) {
        switch (type) {
            case 'navigate':
                window.location.href = data;
                break;
            case 'search':
                window.location.href = `/find-ride.html?${data}`;
                break;
            case 'create':
                window.location.href = '/create-ride.html';
                break;
            default:
                console.log('Unknown action type:', type);
        }
    }

    clearHistory() {
        const confirmed = confirm('Are you sure you want to clear chat history?');
        if (confirmed) {
            this.messages = [];
            localStorage.removeItem('chat_history');
            this.renderMessages();
            this.showWelcomeMessage();
        }
    }
}

// Initialize AI Assistant when page loads
let aiAssistant;

if (window.location.pathname.includes('ai-assistant.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        aiAssistant = new AIAssistant();
        aiAssistant.init();
    });
}
