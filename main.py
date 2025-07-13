#!/usr/bin/env python3
"""
Background Agent - Основной файл
"""

import time
import logging
import signal
import sys
from datetime import datetime
from config import Config

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('agent.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class BackgroundAgent:
    """Основной класс background агента"""
    
    def __init__(self):
        self.running = True
        self.config = Config()
        
    def signal_handler(self, signum, frame):
        """Обработчик сигналов для корректного завершения"""
        logger.info(f"Получен сигнал {signum}, завершаю работу...")
        self.running = False
        
    def run_task(self):
        """Основная логика выполнения задач"""
        logger.info("Выполняю задачу...")
        
        # Здесь размещается ваша логика
        # Например:
        # - Мониторинг файлов
        # - Обработка очереди задач
        # - Отправка уведомлений
        # - Сбор метрик
        
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"Задача выполнена в {current_time}")
        
    def start(self):
        """Запуск агента"""
        logger.info("Запускаю background агент...")
        
        # Регистрация обработчиков сигналов
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        while self.running:
            try:
                self.run_task()
                time.sleep(self.config.INTERVAL)
                
            except Exception as e:
                logger.error(f"Ошибка при выполнении задачи: {e}")
                time.sleep(5)  # Пауза при ошибке
                
        logger.info("Background агент остановлен")

if __name__ == "__main__":
    agent = BackgroundAgent()
    agent.start() 