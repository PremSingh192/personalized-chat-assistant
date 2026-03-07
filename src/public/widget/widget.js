(function() {
    'use strict';
    
    class ChatWidget {
        constructor(options) {
            this.apiKey = options.apiKey;
            this.position = options.position || 'bottom-right';
            this.primaryColor = options.primaryColor || '#4facfe';
            this.secondaryColor = options.secondaryColor || '#00f2fe';
            this.textColor = options.textColor || '#333333';
            this.bgColor = options.bgColor || '#ffffff';
            this.headerTitle = options.headerTitle || 'Customer Support';
            this.headerSubtitle = options.headerSubtitle || 'We are here to help!';
            this.size = options.size || 'medium';
            this.widgetUrl = options.widgetUrl || (window.location.origin + '/widget');
            this.isOpen = false;
            this.socket = null;
            this.deviceId = this.getOrCreateDeviceId();
            
            this.init();
        }
        
        getOrCreateDeviceId() {
            let deviceId = localStorage.getItem('chat_device_id');
            if (!deviceId) {
                deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
                localStorage.setItem('chat_device_id', deviceId);
            }
            return deviceId;
        }
        
        init() {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.createWidgetStyles();
                    this.createChatButton();
                    this.createChatWindow();
                    this.loadSocketIO();
                });
            } else {
                // DOM is already ready
                this.createWidgetStyles();
                this.createChatButton();
                this.createChatWindow();
                this.loadSocketIO();
            }
        }
        
        createWidgetStyles() {
            if (!document || !document.head) {
                console.error('ChatWidget: Document or head not available');
                return;
            }
            
            const sizeConfig = {
                small: { width: 320, height: 480 },
                medium: { width: 380, height: 600 },
                large: { width: 440, height: 720 }
            };
            
            const size = sizeConfig[this.size] || sizeConfig.medium;
            
            const style = document.createElement('style');
            style.textContent = `
                .chat-widget-container {
                    position: fixed;
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .chat-button {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, ${this.primaryColor} 0%, ${this.secondaryColor} 100%);
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s, box-shadow 0.2s;
                    z-index: 1000000;
                }
                
                .chat-button:hover {
                    transform: scale(1.05);
                    box-shadow: 0 6px 16px rgba(0,0,0,0.2);
                }
                
                .chat-button svg {
                    width: 24px;
                    height: 24px;
                    fill: white;
                }
                
                .chat-window {
                    position: fixed;
                    bottom: 90px;
                    right: 20px;
                    width: ${size.width}px;
                    height: ${size.height}px;
                    background: ${this.bgColor};
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    z-index: 999999;
                }
                
                .chat-window.open {
                    display: flex;
                }
                
                .chat-header {
                    background: linear-gradient(135deg, ${this.primaryColor} 0%, ${this.secondaryColor} 100%);
                    color: white;
                    padding: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .chat-header h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .chat-header p {
                    margin: 2px 0 0 0;
                    font-size: 12px;
                    opacity: 0.9;
                }
                
                .close-button {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: background 0.2s;
                }
                
                .close-button:hover {
                    background: rgba(255,255,255,0.1);
                }
                
                .close-button svg {
                    width: 16px;
                    height: 16px;
                    fill: white;
                }
                
                .chat-iframe {
                    flex: 1;
                    border: none;
                    width: 100%;
                    background: ${this.bgColor};
                }
                
                @media (max-width: 480px) {
                    .chat-window {
                        width: 100vw;
                        height: 100vh;
                        bottom: 0;
                        right: 0;
                        border-radius: 0;
                    }
                    
                    .chat-button {
                        bottom: 20px;
                        right: 20px;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        createChatButton() {
            if (!document || !document.body) {
                console.error('ChatWidget: Document or body not available for chat button');
                return;
            }
            
            const button = document.createElement('button');
            button.className = 'chat-button';
            button.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
            `;
            button.addEventListener('click', () => this.toggleChat());
            document.body.appendChild(button);
            this.chatButton = button;
        }
        
        createChatWindow() {
            if (!document || !document.body) {
                console.error('ChatWidget: Document or body not available for chat window');
                return;
            }
            
            const window = document.createElement('div');
            window.className = 'chat-window';
            window.innerHTML = `
                <div class="chat-header">
                    <h3>${this.headerTitle}</h3>
                    <p style="margin: 0; font-size: 12px; opacity: 0.9;">${this.headerSubtitle}</p>
                    <button class="close-button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <iframe 
                    class="chat-iframe" 
                    src="${this.widgetUrl}?api_key=${this.apiKey}"
                    frameborder="0"
                    allowfullscreen
                ></iframe>
            `;
            
            const closeButton = window.querySelector('.close-button');
            if (closeButton) {
                closeButton.addEventListener('click', () => this.toggleChat());
            }
            
            document.body.appendChild(window);
            this.chatWindow = window;
        }
        
        toggleChat() {
            if (!this.chatWindow || !this.chatButton) {
                console.error('ChatWidget: Chat elements not available for toggle');
                return;
            }
            
            this.isOpen = !this.isOpen;
            
            if (this.isOpen) {
                this.chatWindow.classList.add('open');
                this.chatButton.style.display = 'none';
            } else {
                this.chatWindow.classList.remove('open');
                this.chatButton.style.display = 'flex';
            }
        }
        
        loadSocketIO() {
            if (typeof io !== 'undefined') {
                this.socket = io(this.widgetUrl.replace('/widget', ''), {
                    query: { api_key: this.apiKey }
                });
                
                this.socket.on('connect', () => {
                    console.log('Chat widget connected');
                });
                
                this.socket.on('disconnect', () => {
                    console.log('Chat widget disconnected');
                });
            }
        }
        
        showNotification(message) {
            if (!this.chatButton) {
                console.error('ChatWidget: Chat button not available for notification');
                return;
            }
            
            if (!this.isOpen) {
                this.chatButton.style.animation = 'pulse 1s ease-in-out';
                
                setTimeout(() => {
                    if (this.chatButton) {
                        this.chatButton.style.animation = '';
                    }
                }, 1000);
            }
        }
        
        destroy() {
            if (this.chatButton && this.chatButton.parentNode) {
                this.chatButton.parentNode.removeChild(this.chatButton);
            }
            if (this.chatWindow && this.chatWindow.parentNode) {
                this.chatWindow.parentNode.removeChild(this.chatWindow);
            }
            if (this.socket) {
                this.socket.disconnect();
            }
            
            this.chatButton = null;
            this.chatWindow = null;
            this.socket = null;
        }
    }
    
    if (typeof window !== 'undefined') {
        window.ChatWidget = ChatWidget;
        
        // Static init method for easy integration
        ChatWidget.init = function(options) {
            if (!options.apiKey) {
                console.error('ChatWidget: API key is required');
                return null;
            }
            
            // Remove any existing widget instance
            if (window.ChatWidgetInstance) {
                window.ChatWidgetInstance.destroy();
            }
            
            // Create new widget instance
            const widget = new ChatWidget(options);
            window.ChatWidgetInstance = widget;
            
            console.log('ChatWidget initialized successfully');
            return widget;
        };
        
        const script = document.currentScript;
        if (script) {
            const apiKey = script.getAttribute('data-api-key');
            if (apiKey) {
                const widget = new ChatWidget({
                    apiKey: apiKey,
                    position: script.getAttribute('data-position') || 'bottom-right',
                    primaryColor: script.getAttribute('data-primary-color') || '#4facfe',
                    widgetUrl: script.getAttribute('data-widget-url')
                });
                
                window.ChatWidgetInstance = widget;
            }
        }
    }
})();
