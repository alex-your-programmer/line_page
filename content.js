// Screen Ruler - Content Script
// Основная логика расширения с модульной архитектурой

(function() {
    'use strict';

    // Защита от повторного запуска
    if (window.screenRulerLoaded) {
        return;
    }
    window.screenRulerLoaded = true;

    // ===== CORE ENGINE =====
    class MeasurementEngine {
        constructor() {
            this.currentElement = null;
            this.fixedElement = null;
        }

        getDimensions(element) {
            if (!element) return null;
            
            const rect = element.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(element);
            
            return {
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                top: Math.round(rect.top + window.scrollY),
                left: Math.round(rect.left + window.scrollX),
                right: Math.round(rect.right + window.scrollX),
                bottom: Math.round(rect.bottom + window.scrollY)
            };
        }

        getBoxModel(element) {
            if (!element) return null;
            
            const computedStyle = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            
            return {
                content: {
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                },
                padding: {
                    top: Math.round(parseFloat(computedStyle.paddingTop) || 0),
                    right: Math.round(parseFloat(computedStyle.paddingRight) || 0),
                    bottom: Math.round(parseFloat(computedStyle.paddingBottom) || 0),
                    left: Math.round(parseFloat(computedStyle.paddingLeft) || 0)
                },
                border: {
                    top: Math.round(parseFloat(computedStyle.borderTopWidth) || 0),
                    right: Math.round(parseFloat(computedStyle.borderRightWidth) || 0),
                    bottom: Math.round(parseFloat(computedStyle.borderBottomWidth) || 0),
                    left: Math.round(parseFloat(computedStyle.borderLeftWidth) || 0)
                },
                margin: {
                    top: Math.round(parseFloat(computedStyle.marginTop) || 0),
                    right: Math.round(parseFloat(computedStyle.marginRight) || 0),
                    bottom: Math.round(parseFloat(computedStyle.marginBottom) || 0),
                    left: Math.round(parseFloat(computedStyle.marginLeft) || 0)
                }
            };
        }

        getElementSelector(element, short = false) {
            if (!element) return '';
            
            const tagName = element.tagName.toLowerCase();
            const id = element.id;
            const classes = Array.from(element.classList);
            
            if (short) {
                if (id) {
                    return `${tagName}#${id}`;
                } else if (classes.length > 0) {
                    return `${tagName}.${classes[0]}`;
                }
                return tagName;
            }
            
            let selector = tagName;
            if (id) {
                selector += `#${id}`;
            }
            if (classes.length > 0) {
                selector += `.${classes.slice(0, 3).join('.')}`;
                if (classes.length > 3) {
                    selector += '...';
                }
            }
            
            return selector;
        }

        calculateDistance(element1, element2) {
            if (!element1 || !element2) return null;
            
            const rect1 = element1.getBoundingClientRect();
            const rect2 = element2.getBoundingClientRect();
            
            const distances = {
                horizontal: 0,
                vertical: 0,
                hasHorizontal: false,
                hasVertical: false
            };
            
            // Горизонтальное расстояние
            if (rect1.right < rect2.left) {
                distances.horizontal = Math.round(rect2.left - rect1.right);
                distances.hasHorizontal = true;
            } else if (rect2.right < rect1.left) {
                distances.horizontal = Math.round(rect1.left - rect2.right);
                distances.hasHorizontal = true;
            }
            
            // Вертикальное расстояние
            if (rect1.bottom < rect2.top) {
                distances.vertical = Math.round(rect2.top - rect1.bottom);
                distances.hasVertical = true;
            } else if (rect2.bottom < rect1.top) {
                distances.vertical = Math.round(rect1.top - rect2.bottom);
                distances.hasVertical = true;
            }
            
            return distances;
        }
    }

    // ===== ELEMENT SELECTOR =====
    class ElementSelector {
        constructor(measurementEngine) {
            this.measurementEngine = measurementEngine;
            this.highlightElement = null;
            this.fixedHighlightElement = null;
        }

        createHighlight(isFixed = false) {
            const highlight = document.createElement('div');
            highlight.className = `screen-ruler-highlight ${isFixed ? 'fixed' : ''}`;
            highlight.style.display = 'none';
            document.body.appendChild(highlight);
            return highlight;
        }

        updateHighlight(element, isFixed = false) {
            if (!element) return;
            
            const highlight = isFixed ? this.fixedHighlightElement : this.highlightElement;
            if (!highlight) return;
            
            const rect = element.getBoundingClientRect();
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            
            highlight.style.display = 'block';
            highlight.style.left = `${rect.left + scrollX}px`;
            highlight.style.top = `${rect.top + scrollY}px`;
            highlight.style.width = `${rect.width}px`;
            highlight.style.height = `${rect.height}px`;
        }

        hideHighlight(isFixed = false) {
            const highlight = isFixed ? this.fixedHighlightElement : this.highlightElement;
            if (highlight) {
                highlight.style.display = 'none';
            }
        }

        createLabel(element, content, isFixed = false) {
            const label = document.createElement('div');
            label.className = 'screen-ruler-label';
            label.textContent = content;
            
            const rect = element.getBoundingClientRect();
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            
            // Определяем оптимальную позицию для label
            const position = this.getLabelPosition(element);
            label.classList.add(position);
            
            // Позиционируем label
            switch (position) {
                case 'top':
                    label.style.left = `${rect.left + scrollX}px`;
                    label.style.top = `${rect.top + scrollY}px`;
                    break;
                case 'bottom':
                    label.style.left = `${rect.left + scrollX}px`;
                    label.style.top = `${rect.bottom + scrollY}px`;
                    break;
                case 'left':
                    label.style.left = `${rect.left + scrollX}px`;
                    label.style.top = `${rect.top + scrollY}px`;
                    break;
                case 'right':
                    label.style.left = `${rect.right + scrollX}px`;
                    label.style.top = `${rect.top + scrollY}px`;
                    break;
            }
            
            document.body.appendChild(label);
            return label;
        }

        getLabelPosition(element) {
            const rect = element.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            const labelWidth = 150; // Примерная ширина label
            const labelHeight = 30; // Примерная высота label
            
            // Приоритет: сверху → справа → снизу → слева
            if (rect.top - labelHeight > 0) return 'top';
            if (rect.right + labelWidth < viewportWidth) return 'right';
            if (rect.bottom + labelHeight < viewportHeight) return 'bottom';
            return 'left';
        }

        fixElement(element) {
            if (!element) return;
            
            this.measurementEngine.fixedElement = element;
            
            // Создаем фиксированное подсвечивание
            if (!this.fixedHighlightElement) {
                this.fixedHighlightElement = this.createHighlight(true);
            }
            
            this.updateHighlight(element, true);
            
            // Создаем label для фиксированного элемента
            const dimensions = this.measurementEngine.getDimensions(element);
            const selector = this.measurementEngine.getElementSelector(element, true);
            const labelContent = `${selector} ${dimensions.width}×${dimensions.height}`;
            
            // Удаляем предыдущий label
            const oldLabel = document.querySelector('.screen-ruler-label[data-fixed="true"]');
            if (oldLabel) {
                oldLabel.remove();
            }
            
            const label = this.createLabel(element, labelContent, true);
            label.setAttribute('data-fixed', 'true');
        }

        unfixElement() {
            this.measurementEngine.fixedElement = null;
            this.hideHighlight(true);
            
            // Удаляем label фиксированного элемента
            const label = document.querySelector('.screen-ruler-label[data-fixed="true"]');
            if (label) {
                label.remove();
            }
        }

        init() {
            this.highlightElement = this.createHighlight(false);
            this.fixedHighlightElement = this.createHighlight(true);
        }

        destroy() {
            if (this.highlightElement) {
                this.highlightElement.remove();
                this.highlightElement = null;
            }
            if (this.fixedHighlightElement) {
                this.fixedHighlightElement.remove();
                this.fixedHighlightElement = null;
            }
            
            // Удаляем все labels
            const labels = document.querySelectorAll('.screen-ruler-label');
            labels.forEach(label => label.remove());
        }
    }

    // ===== HOVER WINDOW =====
    class HoverWindow {
        constructor(measurementEngine) {
            this.measurementEngine = measurementEngine;
            this.window = null;
            this.isVisible = false;
        }

        create() {
            this.window = document.createElement('div');
            this.window.className = 'screen-ruler-hover-window';
            this.window.style.display = 'none';
            
            document.body.appendChild(this.window);
        }

        show(element) {
            if (!element || !this.window) return;
            
            const dimensions = this.measurementEngine.getDimensions(element);
            const boxModel = this.measurementEngine.getBoxModel(element);
            const selector = this.measurementEngine.getElementSelector(element);
            
            this.window.innerHTML = `
                <div class="selector">${selector}</div>
                <div class="dimensions">${dimensions.width} × ${dimensions.height} px</div>
                <div class="box-model">
                    <div class="box-model-row">
                        <span class="box-model-label">Content:</span>
                        ${boxModel.content.width}×${boxModel.content.height}
                    </div>
                    <div class="box-model-row">
                        <span class="box-model-label">Padding:</span>
                        ${boxModel.padding.top} ${boxModel.padding.right} ${boxModel.padding.bottom} ${boxModel.padding.left}
                    </div>
                    <div class="box-model-row">
                        <span class="box-model-label">Margin:</span>
                        ${boxModel.margin.top} ${boxModel.margin.right} ${boxModel.margin.bottom} ${boxModel.margin.left}
                    </div>
                </div>
            `;
            
            // Позиционируем окно
            this.positionWindow(element);
            
            this.window.style.display = 'block';
            this.isVisible = true;
        }

        hide() {
            if (this.window) {
                this.window.style.display = 'none';
                this.isVisible = false;
            }
        }

        positionWindow(element) {
            if (!element || !this.window) return;
            
            const rect = element.getBoundingClientRect();
            const windowRect = this.window.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            
            let left = rect.right + scrollX + 10;
            let top = rect.top + scrollY;
            
            // Проверяем, помещается ли справа
            if (left + windowRect.width > viewportWidth + scrollX) {
                left = rect.left + scrollX - windowRect.width - 10;
            }
            
            // Проверяем, помещается ли слева
            if (left < scrollX) {
                left = rect.left + scrollX + 10;
                top = rect.bottom + scrollY + 10;
            }
            
            // Проверяем, помещается ли снизу
            if (top + windowRect.height > viewportHeight + scrollY) {
                top = rect.top + scrollY - windowRect.height - 10;
            }
            
            // Проверяем, помещается ли сверху
            if (top < scrollY) {
                top = scrollY + 10;
            }
            
            this.window.style.left = `${left}px`;
            this.window.style.top = `${top}px`;
        }

        destroy() {
            if (this.window) {
                this.window.remove();
                this.window = null;
            }
        }
    }

    // ===== DISTANCE CALCULATOR =====
    class DistanceCalculator {
        constructor(measurementEngine) {
            this.measurementEngine = measurementEngine;
            this.distanceLines = [];
            this.distanceLabels = [];
        }

        showDistances(element1, element2) {
            this.clearDistances();
            
            if (!element1 || !element2) return;
            
            const distances = this.measurementEngine.calculateDistance(element1, element2);
            if (!distances) return;
            
            // Показываем горизонтальное расстояние
            if (distances.hasHorizontal && distances.horizontal > 0) {
                this.createHorizontalDistanceLine(element1, element2, distances.horizontal);
            }
            
            // Показываем вертикальное расстояние
            if (distances.hasVertical && distances.vertical > 0) {
                this.createVerticalDistanceLine(element1, element2, distances.vertical);
            }
        }

        createHorizontalDistanceLine(element1, element2, distance) {
            const rect1 = element1.getBoundingClientRect();
            const rect2 = element2.getBoundingClientRect();
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            
            const line = document.createElement('div');
            line.className = 'screen-ruler-distance-line horizontal';
            
            const left = Math.min(rect1.right, rect2.left);
            const right = Math.max(rect1.left, rect2.right);
            const top = Math.min(rect1.top + rect1.height / 2, rect2.top + rect2.height / 2);
            
            line.style.left = `${left + scrollX}px`;
            line.style.top = `${top + scrollY}px`;
            line.style.width = `${right - left}px`;
            
            document.body.appendChild(line);
            this.distanceLines.push(line);
            
            // Создаем label с расстоянием
            this.createDistanceLabel(distance, left + (right - left) / 2 + scrollX, top + scrollY);
        }

        createVerticalDistanceLine(element1, element2, distance) {
            const rect1 = element1.getBoundingClientRect();
            const rect2 = element2.getBoundingClientRect();
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            
            const line = document.createElement('div');
            line.className = 'screen-ruler-distance-line vertical';
            
            const top = Math.min(rect1.bottom, rect2.top);
            const bottom = Math.max(rect1.top, rect2.bottom);
            const left = Math.min(rect1.left + rect1.width / 2, rect2.left + rect2.width / 2);
            
            line.style.left = `${left + scrollX}px`;
            line.style.top = `${top + scrollY}px`;
            line.style.height = `${bottom - top}px`;
            
            document.body.appendChild(line);
            this.distanceLines.push(line);
            
            // Создаем label с расстоянием
            this.createDistanceLabel(distance, left + scrollX, top + (bottom - top) / 2 + scrollY);
        }

        createDistanceLabel(distance, x, y) {
            const label = document.createElement('div');
            label.className = 'screen-ruler-distance-label';
            label.textContent = `${distance}px`;
            
            label.style.left = `${x}px`;
            label.style.top = `${y}px`;
            label.style.transform = 'translate(-50%, -50%)';
            
            document.body.appendChild(label);
            this.distanceLabels.push(label);
        }

        clearDistances() {
            this.distanceLines.forEach(line => line.remove());
            this.distanceLabels.forEach(label => label.remove());
            this.distanceLines = [];
            this.distanceLabels = [];
        }

        destroy() {
            this.clearDistances();
        }
    }

    // ===== CONTROL PANEL =====
    class ControlPanel {
        constructor(screenRuler) {
            this.screenRuler = screenRuler;
            this.panel = null;
            this.isDragging = false;
            this.dragOffset = { x: 0, y: 0 };
        }

        create() {
            this.panel = document.createElement('div');
            this.panel.className = 'screen-ruler-control-panel';
            this.panel.innerHTML = `
                <div class="status-indicator"></div>
                <button class="pause-btn">Пауза</button>
                <button class="settings-btn">⚙️</button>
            `;
            
            document.body.appendChild(this.panel);
            this.initializeEvents();
        }

        initializeEvents() {
            if (!this.panel) return;
            
            const pauseBtn = this.panel.querySelector('.pause-btn');
            const settingsBtn = this.panel.querySelector('.settings-btn');
            
            pauseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.screenRuler.togglePause();
            });
            
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.screenRuler.openSettings();
            });
            
            // Dragging functionality
            this.panel.addEventListener('mousedown', (e) => {
                this.isDragging = true;
                this.dragOffset.x = e.clientX - this.panel.offsetLeft;
                this.dragOffset.y = e.clientY - this.panel.offsetTop;
                this.panel.style.cursor = 'grabbing';
            });
            
            document.addEventListener('mousemove', (e) => {
                if (this.isDragging) {
                    const x = e.clientX - this.dragOffset.x;
                    const y = e.clientY - this.dragOffset.y;
                    
                    this.panel.style.left = `${x}px`;
                    this.panel.style.top = `${y}px`;
                    this.panel.style.right = 'auto';
                }
            });
            
            document.addEventListener('mouseup', () => {
                this.isDragging = false;
                this.panel.style.cursor = 'move';
            });
        }

        updateStatus(isPaused) {
            if (!this.panel) return;
            
            const indicator = this.panel.querySelector('.status-indicator');
            const pauseBtn = this.panel.querySelector('.pause-btn');
            
            if (isPaused) {
                indicator.className = 'status-indicator paused';
                pauseBtn.textContent = 'Продолжить';
            } else {
                indicator.className = 'status-indicator';
                pauseBtn.textContent = 'Пауза';
            }
        }

        destroy() {
            if (this.panel) {
                this.panel.remove();
                this.panel = null;
            }
        }
    }

    // ===== EVENT MANAGER =====
    class EventManager {
        constructor(screenRuler) {
            this.screenRuler = screenRuler;
            this.throttledMouseMove = this.throttle(this.handleMouseMove.bind(this), 16);
            this.isEnabled = false;
        }

        init() {
            this.isEnabled = true;
            document.addEventListener('mousemove', this.throttledMouseMove);
            document.addEventListener('click', this.handleClick.bind(this));
            document.addEventListener('keydown', this.handleKeyDown.bind(this));
        }

        destroy() {
            this.isEnabled = false;
            document.removeEventListener('mousemove', this.throttledMouseMove);
            document.removeEventListener('click', this.handleClick.bind(this));
            document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        }

        handleMouseMove(e) {
            if (!this.isEnabled || this.screenRuler.isPaused) return;
            
            const element = document.elementFromPoint(e.clientX, e.clientY);
            if (!element || this.isScreenRulerElement(element)) return;
            
            this.screenRuler.handleElementHover(element);
        }

        handleClick(e) {
            if (!this.isEnabled || this.screenRuler.isPaused) return;
            if (this.isScreenRulerElement(e.target)) return;
            
            if (!this.screenRuler.settings.interactiveMode) {
                e.preventDefault();
                e.stopPropagation();
                this.screenRuler.handleElementClick(e.target);
            }
        }

        handleKeyDown(e) {
            if (!this.isEnabled || this.screenRuler.isPaused) return;
            
            // Alt - фиксация элемента
            if (e.altKey && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                const element = document.elementFromPoint(
                    this.screenRuler.lastMouseX || 0,
                    this.screenRuler.lastMouseY || 0
                );
                if (element && !this.isScreenRulerElement(element)) {
                    this.screenRuler.handleElementClick(element);
                }
            }
            
            // Escape - снятие фиксации
            if (e.key === 'Escape') {
                this.screenRuler.unfixElement();
            }
        }

        isScreenRulerElement(element) {
            return element.closest('.screen-ruler-extension') ||
                   element.classList.contains('screen-ruler-highlight') ||
                   element.classList.contains('screen-ruler-hover-window') ||
                   element.classList.contains('screen-ruler-control-panel') ||
                   element.classList.contains('screen-ruler-label') ||
                   element.classList.contains('screen-ruler-distance-line') ||
                   element.classList.contains('screen-ruler-distance-label');
        }

        throttle(func, limit) {
            let lastFunc;
            let lastRan;
            return function(...args) {
                if (!lastRan) {
                    func.apply(this, args);
                    lastRan = Date.now();
                } else {
                    clearTimeout(lastFunc);
                    lastFunc = setTimeout(() => {
                        if ((Date.now() - lastRan) >= limit) {
                            func.apply(this, args);
                            lastRan = Date.now();
                        }
                    }, limit - (Date.now() - lastRan));
                }
            };
        }
    }

    // ===== MAIN SCREEN RULER CLASS =====
    class ScreenRuler {
        constructor() {
            this.isEnabled = false;
            this.isPaused = false;
            this.settings = {};
            this.lastMouseX = 0;
            this.lastMouseY = 0;
            
            // Инициализация модулей
            this.measurementEngine = new MeasurementEngine();
            this.elementSelector = new ElementSelector(this.measurementEngine);
            this.hoverWindow = new HoverWindow(this.measurementEngine);
            this.distanceCalculator = new DistanceCalculator(this.measurementEngine);
            this.controlPanel = new ControlPanel(this);
            this.eventManager = new EventManager(this);
            
            this.init();
        }

        async init() {
            // Загружаем настройки
            await this.loadSettings();
            
            // Инициализируем модули
            this.elementSelector.init();
            this.hoverWindow.create();
            this.controlPanel.create();
            
            // Слушаем сообщения от background script
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                this.handleMessage(request, sender, sendResponse);
            });
            
            // Отслеживаем положение мыши
            document.addEventListener('mousemove', (e) => {
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            });
            
            // Получаем статус от background script
            chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
                if (response) {
                    this.isEnabled = response.isEnabled;
                    this.settings = response.settings;
                    this.updateStatus();
                }
            });
        }

        handleMessage(request, sender, sendResponse) {
            const { action, data } = request;
            
            switch (action) {
                case 'UPDATE_STATUS':
                    this.isEnabled = data.isEnabled;
                    this.settings = data.settings;
                    this.updateStatus();
                    break;
                    
                case 'SETTINGS_UPDATED':
                    this.settings = { ...this.settings, ...data };
                    this.updateStatus();
                    break;
                    
                case 'UNFIX_ELEMENT':
                    this.unfixElement();
                    break;
            }
        }

        async loadSettings() {
            try {
                const response = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
                if (response) {
                    this.settings = response.settings;
                    this.isEnabled = response.isEnabled;
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        }

        updateStatus() {
            if (this.isEnabled && !this.isPaused) {
                this.eventManager.init();
                this.controlPanel.updateStatus(false);
            } else {
                this.eventManager.destroy();
                this.hoverWindow.hide();
                this.elementSelector.hideHighlight();
                this.distanceCalculator.clearDistances();
                this.controlPanel.updateStatus(this.isPaused);
            }
        }

        handleElementHover(element) {
            if (!this.isEnabled || this.isPaused) return;
            
            // Показываем подсвечивание
            this.elementSelector.updateHighlight(element);
            
            // Показываем hover-окно
            this.hoverWindow.show(element);
            
            // Если есть фиксированный элемент, показываем расстояния
            if (this.measurementEngine.fixedElement) {
                this.distanceCalculator.showDistances(
                    this.measurementEngine.fixedElement,
                    element
                );
            }
        }

        handleElementClick(element) {
            if (!this.isEnabled || this.isPaused) return;
            
            // Фиксируем элемент
            this.elementSelector.fixElement(element);
        }

        unfixElement() {
            this.elementSelector.unfixElement();
            this.distanceCalculator.clearDistances();
        }

        togglePause() {
            this.isPaused = !this.isPaused;
            chrome.runtime.sendMessage({
                action: 'PAUSE_EXTENSION',
                data: { isPaused: this.isPaused }
            });
            this.updateStatus();
        }

        openSettings() {
            // Открываем popup расширения
            chrome.runtime.sendMessage({ action: 'OPEN_POPUP' });
        }

        destroy() {
            this.eventManager.destroy();
            this.elementSelector.destroy();
            this.hoverWindow.destroy();
            this.distanceCalculator.destroy();
            this.controlPanel.destroy();
        }
    }

    // Инициализация Screen Ruler
    const screenRuler = new ScreenRuler();

    // Очистка при выгрузке страницы
    window.addEventListener('beforeunload', () => {
        screenRuler.destroy();
    });

    console.log('Screen Ruler Content Script loaded');

})();