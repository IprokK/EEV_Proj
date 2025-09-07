# API EEV_Proj

## Обзор

API функции для взаимодействия с серверной частью проекта EEV_Proj. Все функции используют современный JavaScript и обеспечивают единообразный интерфейс для работы с сервером.

## Структура

```
api/
├── auth.js                 # Функции аутентификации
└── README.md               # Эта документация
```

## auth.js

### Функции аутентификации

#### getUsersStatus(token)
Получает статус всех пользователей в системе.

**Параметры:**
- `token` (string) - JWT токен аутентификации

**Возвращает:**
- Promise<Array> - Массив пользователей с их статусами

**Пример использования:**
```javascript
import { getUsersStatus } from './api/auth.js';

const token = localStorage.getItem('token');
try {
    const users = await getUsersStatus(token);
    console.log('Пользователи:', users);
} catch (error) {
    console.error('Ошибка получения статуса пользователей:', error);
}
```

#### loadUserInfo(userId, token)
Загружает информацию о конкретном пользователе.

**Параметры:**
- `userId` (string|number) - ID пользователя
- `token` (string) - JWT токен аутентификации

**Возвращает:**
- Promise<Object> - Объект с информацией о пользователе

**Пример использования:**
```javascript
import { loadUserInfo } from './api/auth.js';

const token = localStorage.getItem('token');
try {
    const userInfo = await loadUserInfo('123', token);
    console.log('Информация о пользователе:', userInfo);
} catch (error) {
    console.error('Ошибка загрузки информации о пользователе:', error);
}
```

## Создание новых API функций

### Шаблон API функции

```javascript
/**
 * Описание функции
 * @param {string} param1 - Описание параметра 1
 * @param {number} param2 - Описание параметра 2
 * @returns {Promise<Object>} Описание возвращаемого значения
 */
export async function apiFunction(param1, param2) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Токен не найден');
        }

        const response = await fetch(`/api/endpoint`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ param1, param2 })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка API функции:', error);
        throw error;
    }
}
```

### Принципы

1. **Единообразие** - Все функции следуют одному паттерну
2. **Обработка ошибок** - Всегда обрабатывайте ошибки
3. **Валидация** - Проверяйте входные параметры
4. **Логирование** - Логируйте ошибки для отладки
5. **Типизация** - Используйте JSDoc для документирования типов

## Обработка ошибок

### Типы ошибок

```javascript
// Сетевые ошибки
class NetworkError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'NetworkError';
        this.status = status;
    }
}

// Ошибки аутентификации
class AuthError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthError';
    }
}

// Ошибки валидации
class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}
```

### Обработка в компонентах

```javascript
import { apiFunction } from './api/api.js';

const MyComponent = () => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleApiCall = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const result = await apiFunction('param1', 'param2');
            setData(result);
        } catch (error) {
            if (error.name === 'AuthError') {
                // Перенаправление на страницу входа
                navigate('/login');
            } else if (error.name === 'ValidationError') {
                // Показать ошибку валидации
                setError(`Ошибка в поле ${error.field}: ${error.message}`);
            } else {
                // Общая ошибка
                setError(error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {loading && <div>Загрузка...</div>}
            {error && <div className="error">{error}</div>}
            {data && <div>{/* Отображение данных */}</div>}
            <button onClick={handleApiCall}>Вызвать API</button>
        </div>
    );
};
```

## Кэширование

### Простое кэширование

```javascript
const cache = new Map();

export async function cachedApiCall(key, apiFunction) {
    if (cache.has(key)) {
        const { data, timestamp } = cache.get(key);
        const now = Date.now();
        
        // Кэш действителен 5 минут
        if (now - timestamp < 5 * 60 * 1000) {
            return data;
        }
    }

    try {
        const data = await apiFunction();
        cache.set(key, { data, timestamp: Date.now() });
        return data;
    } catch (error) {
        throw error;
    }
}
```

### Использование

```javascript
import { cachedApiCall } from './api/cache.js';
import { getUsersStatus } from './api/auth.js';

const loadUsers = async () => {
    const token = localStorage.getItem('token');
    return await cachedApiCall('users-status', () => getUsersStatus(token));
};
```

## Retry логика

### Автоматические повторы

```javascript
/**
 * Выполняет API вызов с автоматическими повторами
 * @param {Function} apiFunction - Функция API
 * @param {number} maxRetries - Максимальное количество повторов
 * @param {number} delay - Задержка между повторами в мс
 */
export async function retryApiCall(apiFunction, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await apiFunction();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxRetries) {
                throw lastError;
            }
            
            // Ждем перед следующим попыткой
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }
}
```

### Использование

```javascript
import { retryApiCall } from './api/retry.js';
import { getUsersStatus } from './api/auth.js';

const loadUsersWithRetry = async () => {
    const token = localStorage.getItem('token');
    return await retryApiCall(() => getUsersStatus(token), 3, 1000);
};
```

## Batch запросы

### Группировка запросов

```javascript
/**
 * Выполняет несколько API запросов параллельно
 * @param {Array<Function>} apiFunctions - Массив функций API
 * @returns {Promise<Array>} Массив результатов
 */
export async function batchApiCalls(apiFunctions) {
    try {
        const results = await Promise.allSettled(apiFunctions.map(fn => fn()));
        
        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                console.error(`Ошибка в запросе ${index}:`, result.reason);
                return null;
            }
        });
    } catch (error) {
        console.error('Ошибка batch запросов:', error);
        throw error;
    }
}
```

### Использование

```javascript
import { batchApiCalls } from './api/batch.js';
import { getUsersStatus, loadUserInfo } from './api/auth.js';

const loadAllData = async () => {
    const token = localStorage.getItem('token');
    
    const results = await batchApiCalls([
        () => getUsersStatus(token),
        () => loadUserInfo('123', token),
        () => loadUserInfo('456', token)
    ]);
    
    const [users, user1, user2] = results;
    return { users, user1, user2 };
};
```

## WebSocket API

### Подключение

```javascript
import { io } from 'socket.io-client';

class WebSocketAPI {
    constructor() {
        this.socket = null;
        this.isConnected = false;
    }

    connect(token) {
        const serverUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:4000' 
            : window.location.origin;

        this.socket = io(serverUrl, {
            transports: ['websocket', 'polling'],
            auth: { token },
            timeout: 20000
        });

        this.socket.on('connect', () => {
            this.isConnected = true;
            console.log('WebSocket подключен');
        });

        this.socket.on('disconnect', () => {
            this.isConnected = false;
            console.log('WebSocket отключен');
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }

    emit(event, data) {
        if (this.socket && this.isConnected) {
            this.socket.emit(event, data);
        } else {
            console.warn('WebSocket не подключен');
        }
    }

    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event, callback) {
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }
}

export const wsAPI = new WebSocketAPI();
```

### Использование

```javascript
import { wsAPI } from './api/websocket.js';

// Подключение
const token = localStorage.getItem('token');
wsAPI.connect(token);

// Отправка события
wsAPI.emit('playerMovement', { x: 100, y: 0, z: 200 });

// Подписка на события
wsAPI.on('economy:balanceChanged', ({ userId, newBalance }) => {
    console.log('Баланс изменился:', newBalance);
});

// Отписка
wsAPI.off('economy:balanceChanged');
```

## Тестирование API

### Mock функции

```javascript
// __mocks__/api/auth.js
export const getUsersStatus = jest.fn();
export const loadUserInfo = jest.fn();

// Сброс моков
beforeEach(() => {
    getUsersStatus.mockClear();
    loadUserInfo.mockClear();
});
```

### Тесты

```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { getUsersStatus } from './api/auth.js';

// Мокаем модуль
jest.mock('./api/auth.js');

describe('API Functions', () => {
    it('загружает статус пользователей', async () => {
        const mockUsers = [
            { id: 1, name: 'User 1', status: 'online' },
            { id: 2, name: 'User 2', status: 'offline' }
        ];

        getUsersStatus.mockResolvedValue(mockUsers);

        const result = await getUsersStatus('token');
        
        expect(result).toEqual(mockUsers);
        expect(getUsersStatus).toHaveBeenCalledWith('token');
    });

    it('обрабатывает ошибки API', async () => {
        const errorMessage = 'Unauthorized';
        getUsersStatus.mockRejectedValue(new Error(errorMessage));

        await expect(getUsersStatus('invalid-token')).rejects.toThrow(errorMessage);
    });
});
```

## Мониторинг и метрики

### Логирование API вызовов

```javascript
class APIMonitor {
    constructor() {
        this.calls = [];
        this.errors = [];
    }

    logCall(endpoint, method, duration, success) {
        const call = {
            endpoint,
            method,
            duration,
            success,
            timestamp: Date.now()
        };
        
        this.calls.push(call);
        
        // Ограничиваем размер массива
        if (this.calls.length > 1000) {
            this.calls.shift();
        }
    }

    logError(endpoint, method, error) {
        const errorLog = {
            endpoint,
            method,
            error: error.message,
            timestamp: Date.now()
        };
        
        this.errors.push(errorLog);
        
        if (this.errors.length > 100) {
            this.errors.shift();
        }
    }

    getStats() {
        const totalCalls = this.calls.length;
        const successfulCalls = this.calls.filter(call => call.success).length;
        const errorCalls = this.errors.length;
        const avgDuration = this.calls.reduce((sum, call) => sum + call.duration, 0) / totalCalls;

        return {
            totalCalls,
            successfulCalls,
            errorCalls,
            successRate: (successfulCalls / totalCalls) * 100,
            avgDuration
        };
    }
}

export const apiMonitor = new APIMonitor();
```

### Использование в API функциях

```javascript
import { apiMonitor } from './api/monitor.js';

export async function monitoredApiCall(endpoint, options) {
    const startTime = Date.now();
    
    try {
        const response = await fetch(endpoint, options);
        const duration = Date.now() - startTime;
        
        apiMonitor.logCall(endpoint, options.method || 'GET', duration, response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        const duration = Date.now() - startTime;
        apiMonitor.logCall(endpoint, options.method || 'GET', duration, false);
        apiMonitor.logError(endpoint, options.method || 'GET', error);
        throw error;
    }
}
```

## Безопасность

### Валидация токенов

```javascript
export function validateToken(token) {
    if (!token) {
        throw new Error('Токен не предоставлен');
    }
    
    // Проверяем формат JWT токена
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
        throw new Error('Неверный формат токена');
    }
    
    try {
        // Декодируем payload
        const payload = JSON.parse(atob(tokenParts[1]));
        
        // Проверяем срок действия
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            throw new Error('Токен истек');
        }
        
        return payload;
    } catch (error) {
        throw new Error('Неверный токен');
    }
}
```

### Санитизация данных

```javascript
export function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return input;
    }
    
    // Удаляем потенциально опасные символы
    return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .trim();
}

export function sanitizeObject(obj) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeInput(value);
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
}
```
