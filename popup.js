// Screen Ruler - Popup Interface
// Управление расширением через popup

class ScreenRulerPopup {
    constructor() {
        this.isEnabled = false;
        this.isPaused = false;
        this.settings = {};
        
        this.init();
    }

    async init() {
        // Получаем элементы DOM
        this.elements = {
            loading: document.getElementById('loading'),
            mainContent: document.getElementById('mainContent'),
            extensionToggle: document.getElementById('extensionToggle'),
            statusDot: document.getElementById('statusDot'),
            statusText: document.getElementById('statusText'),
            pauseBtn: document.getElementById('pauseBtn'),
            unfixBtn: document.getElementById('unfixBtn'),
            disableBtn: document.getElementById('disableBtn'),
            cursorPositionCheckbox: document.getElementById('cursorPositionCheckbox'),
            interactiveModeCheckbox: document.getElementById('interactiveModeCheckbox')
        };

        // Загружаем состояние
        await this.loadStatus();
        
        // Инициализируем события
        this.initializeEvents();
        
        // Показываем интерфейс
        this.showInterface();
    }

    async loadStatus() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
            if (response) {
                this.isEnabled = response.isEnabled;
                this.settings = response.settings;
                this.isPaused = response.settings.isPaused;
                this.updateUI();
            }
        } catch (error) {
            console.error('Error loading status:', error);
        }
    }

    initializeEvents() {
        // Переключатель расширения
        this.elements.extensionToggle.addEventListener('click', () => {
            this.toggleExtension();
        });

        // Кнопка паузы
        this.elements.pauseBtn.addEventListener('click', () => {
            this.togglePause();
        });

        // Кнопка снятия фиксации
        this.elements.unfixBtn.addEventListener('click', () => {
            this.unfixElement();
        });

        // Кнопка отключения
        this.elements.disableBtn.addEventListener('click', () => {
            this.disableExtension();
        });

        // Чекбокс позиции курсора
        this.elements.cursorPositionCheckbox.addEventListener('click', () => {
            this.toggleSetting('showCursorPosition');
        });

        // Чекбокс интерактивного режима
        this.elements.interactiveModeCheckbox.addEventListener('click', () => {
            this.toggleSetting('interactiveMode');
        });
    }

    async toggleExtension() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'TOGGLE_EXTENSION' });
            if (response) {
                this.isEnabled = response.isEnabled;
                this.updateUI();
            }
        } catch (error) {
            console.error('Error toggling extension:', error);
        }
    }

    async togglePause() {
        try {
            this.isPaused = !this.isPaused;
            const response = await chrome.runtime.sendMessage({
                action: 'PAUSE_EXTENSION',
                data: { isPaused: this.isPaused }
            });
            
            if (response && response.success) {
                this.settings.isPaused = this.isPaused;
                this.updateUI();
            }
        } catch (error) {
            console.error('Error toggling pause:', error);
        }
    }

    async unfixElement() {
        try {
            // Отправляем сообщение в активную вкладку
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                await chrome.tabs.sendMessage(tab.id, { action: 'UNFIX_ELEMENT' });
            }
        } catch (error) {
            console.error('Error unfixing element:', error);
        }
    }

    async disableExtension() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'UPDATE_SETTINGS',
                data: { isEnabled: false }
            });
            
            if (response && response.success) {
                this.isEnabled = false;
                this.updateUI();
            }
        } catch (error) {
            console.error('Error disabling extension:', error);
        }
    }

    async toggleSetting(settingName) {
        try {
            const newValue = !this.settings[settingName];
            const response = await chrome.runtime.sendMessage({
                action: 'UPDATE_SETTINGS',
                data: { [settingName]: newValue }
            });
            
            if (response && response.success) {
                this.settings[settingName] = newValue;
                this.updateUI();
            }
        } catch (error) {
            console.error('Error updating setting:', error);
        }
    }

    updateUI() {
        // Обновляем переключатель расширения
        if (this.isEnabled) {
            this.elements.extensionToggle.classList.add('active');
        } else {
            this.elements.extensionToggle.classList.remove('active');
        }

        // Обновляем статус
        this.elements.statusDot.className = 'status-dot';
        
        if (this.isEnabled) {
            if (this.isPaused) {
                this.elements.statusDot.classList.add('paused');
                this.elements.statusText.textContent = 'На паузе';
            } else {
                this.elements.statusDot.classList.add('active');
                this.elements.statusText.textContent = 'Активно';
            }
        } else {
            this.elements.statusText.textContent = 'Отключено';
        }

        // Обновляем кнопки
        this.updateButtons();
        
        // Обновляем настройки
        this.updateSettings();
    }

    updateButtons() {
        // Кнопка паузы
        if (this.isPaused) {
            this.elements.pauseBtn.textContent = 'Продолжить';
            this.elements.pauseBtn.classList.remove('primary');
        } else {
            this.elements.pauseBtn.textContent = 'Пауза';
            this.elements.pauseBtn.classList.add('primary');
        }

        // Доступность кнопок
        const isDisabled = !this.isEnabled;
        this.elements.pauseBtn.disabled = isDisabled;
        this.elements.unfixBtn.disabled = isDisabled;
        
        if (isDisabled) {
            this.elements.pauseBtn.style.opacity = '0.5';
            this.elements.unfixBtn.style.opacity = '0.5';
        } else {
            this.elements.pauseBtn.style.opacity = '1';
            this.elements.unfixBtn.style.opacity = '1';
        }
    }

    updateSettings() {
        // Позиция курсора
        if (this.settings.showCursorPosition) {
            this.elements.cursorPositionCheckbox.classList.add('checked');
        } else {
            this.elements.cursorPositionCheckbox.classList.remove('checked');
        }

        // Интерактивный режим
        if (this.settings.interactiveMode) {
            this.elements.interactiveModeCheckbox.classList.add('checked');
        } else {
            this.elements.interactiveModeCheckbox.classList.remove('checked');
        }
    }

    showInterface() {
        this.elements.loading.classList.add('hidden');
        this.elements.mainContent.classList.remove('hidden');
    }

    async getCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            return tab;
        } catch (error) {
            console.error('Error getting current tab:', error);
            return null;
        }
    }

    async sendMessageToTab(message) {
        try {
            const tab = await this.getCurrentTab();
            if (tab) {
                return await chrome.tabs.sendMessage(tab.id, message);
            }
        } catch (error) {
            console.error('Error sending message to tab:', error);
        }
        return null;
    }
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    new ScreenRulerPopup();
});

// Обработка горячих клавиш в popup
document.addEventListener('keydown', (e) => {
    // Escape - закрыть popup
    if (e.key === 'Escape') {
        window.close();
    }
});

// Отладочная информация
console.log('Screen Ruler Popup loaded');