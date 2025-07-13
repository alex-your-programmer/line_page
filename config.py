"""
Конфигурация background агента
"""

import os
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла
load_dotenv()

class Config:
    """Класс конфигурации"""
    
    # Основные настройки
    INTERVAL = int(os.getenv('AGENT_INTERVAL', 30))  # Интервал выполнения в секундах
    
    # Настройки логирования
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'agent.log')
    
    # Настройки базы данных (если нужно)
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///agent.db')
    
    # Настройки уведомлений
    ENABLE_NOTIFICATIONS = os.getenv('ENABLE_NOTIFICATIONS', 'False').lower() == 'true'
    
    # Рабочая директория
    WORK_DIR = os.getenv('WORK_DIR', os.getcwd())
    
    # Максимальное количество попыток
    MAX_RETRIES = int(os.getenv('MAX_RETRIES', 3))
    
    # Timeout для операций
    TIMEOUT = int(os.getenv('TIMEOUT', 60))
    
    @classmethod
    def validate(cls):
        """Валидация конфигурации"""
        if cls.INTERVAL <= 0:
            raise ValueError("INTERVAL должен быть больше 0")
        
        if cls.MAX_RETRIES <= 0:
            raise ValueError("MAX_RETRIES должен быть больше 0")
        
        if cls.TIMEOUT <= 0:
            raise ValueError("TIMEOUT должен быть больше 0") 