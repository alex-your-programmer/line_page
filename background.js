// Screen Ruler - Background Service Worker
// Управление состоянием расширения и настройками

class ScreenRulerBackground {
    constructor() {
        this.activeTabId = null;
        this.isEnabled = false;
        this.initializeListeners();
        this.loadSettings();
    }

    initializeListeners() {
        // Слушаем сообщения от content script и popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Для async response
        });

        // Отслеживаем изменения активной вкладки
        chrome.tabs.onActivated.addListener((activeInfo) => {
            this.activeTabId = activeInfo.tabId;
        });

        // Отслеживаем обновления вкладок
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && this.isEnabled) {
                this.notifyContentScript(tabId);
            }
        });
    }

    async handleMessage(request, sender, sendResponse) {
        const { action, data } = request;

        switch (action) {
            case 'GET_STATUS':
                sendResponse({ 
                    isEnabled: this.isEnabled,
                    settings: await this.getSettings()
                });
                break;

            case 'TOGGLE_EXTENSION':
                this.isEnabled = !this.isEnabled;
                await this.saveSettings({ isEnabled: this.isEnabled });
                
                // Уведомляем content script
                if (sender.tab) {
                    this.notifyContentScript(sender.tab.id);
                }
                
                sendResponse({ isEnabled: this.isEnabled });
                break;

            case 'UPDATE_SETTINGS':
                await this.saveSettings(data);
                
                // Уведомляем все активные вкладки
                this.broadcastToAllTabs('SETTINGS_UPDATED', data);
                
                sendResponse({ success: true });
                break;

            case 'PAUSE_EXTENSION':
                await this.saveSettings({ isPaused: data.isPaused });
                
                if (sender.tab) {
                    this.notifyContentScript(sender.tab.id);
                }
                
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ error: 'Unknown action' });
        }
    }

    async notifyContentScript(tabId) {
        try {
            await chrome.tabs.sendMessage(tabId, {
                action: 'UPDATE_STATUS',
                data: {
                    isEnabled: this.isEnabled,
                    settings: await this.getSettings()
                }
            });
        } catch (error) {
            // Вкладка может быть неактивна или не иметь content script
            console.log('Could not send message to tab:', tabId);
        }
    }

    async broadcastToAllTabs(action, data) {
        try {
            const tabs = await chrome.tabs.query({});
            const promises = tabs.map(tab => 
                chrome.tabs.sendMessage(tab.id, { action, data })
                    .catch(() => {}) // Игнорируем ошибки неактивных вкладок
            );
            await Promise.all(promises);
        } catch (error) {
            console.error('Error broadcasting to tabs:', error);
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get({
                isEnabled: false,
                isPaused: false,
                theme: 'auto',
                showCursorPosition: false,
                interactiveMode: true,
                highlightColor: '#FF6B6B',
                fixedColor: '#4ECDC4',
                distanceColor: '#FFE66D'
            });
            
            this.isEnabled = result.isEnabled;
            return result;
        } catch (error) {
            console.error('Error loading settings:', error);
            return this.getDefaultSettings();
        }
    }

    async saveSettings(settings) {
        try {
            await chrome.storage.sync.set(settings);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    async getSettings() {
        try {
            return await chrome.storage.sync.get({
                isEnabled: false,
                isPaused: false,
                theme: 'auto',
                showCursorPosition: false,
                interactiveMode: true,
                highlightColor: '#FF6B6B',
                fixedColor: '#4ECDC4',
                distanceColor: '#FFE66D'
            });
        } catch (error) {
            console.error('Error getting settings:', error);
            return this.getDefaultSettings();
        }
    }

    getDefaultSettings() {
        return {
            isEnabled: false,
            isPaused: false,
            theme: 'auto',
            showCursorPosition: false,
            interactiveMode: true,
            highlightColor: '#FF6B6B',
            fixedColor: '#4ECDC4',
            distanceColor: '#FFE66D'
        };
    }
}

// Инициализация background service worker
const screenRulerBackground = new ScreenRulerBackground();

// Отладочная информация
console.log('Screen Ruler Background Service Worker loaded');