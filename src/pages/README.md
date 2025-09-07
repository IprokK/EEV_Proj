# Страницы EEV_Proj

## Обзор

Страницы React приложения EEV_Proj. Каждая страница представляет собой отдельный маршрут в приложении и отвечает за определенную функциональность.

## Структура

```
pages/
├── DoubleTapWrapper.jsx    # Обертка для двойного тапа
├── InteriorEditor.jsx      # Редактор интерьеров
├── Login.jsx               # Страница входа
├── Login copy.jsx          # Копия страницы входа
├── MapEditor.jsx           # Редактор карты
├── RegisterStep1.jsx       # Регистрация - шаг 1
├── RegisterStep2.jsx       # Регистрация - шаг 2
├── RegisterStep3.jsx       # Регистрация - шаг 3
├── WaveformPlayer.jsx      # Плеер аудио
└── README.md               # Эта документация
```

## DoubleTapWrapper.jsx

Обертка для обработки двойного тапа на мобильных устройствах.

**Функциональность:**
- Обработка двойного тапа
- Предотвращение случайных нажатий
- Настройка задержки между тапами

**Использование:**
```javascript
<DoubleTapWrapper onDoubleTap={handleDoubleTap}>
    <div>Контент для двойного тапа</div>
</DoubleTapWrapper>
```

## InteriorEditor.jsx

Редактор интерьеров для создания и настройки внутренних пространств зданий.

**Функциональность:**
- Загрузка 3D моделей интерьеров
- Размещение объектов
- Настройка коллайдеров
- Экспорт конфигурации

**Компоненты:**
- 3D сцена для предварительного просмотра
- Панель инструментов
- Список доступных объектов
- Настройки материалов

## Login.jsx

Основная страница входа в систему.

**Функциональность:**
- Форма входа с email/паролем
- Валидация данных
- Обработка ошибок
- Перенаправление после входа
- Ссылка на регистрацию

**Состояния:**
- `email` - Email пользователя
- `password` - Пароль
- `loading` - Состояние загрузки
- `error` - Сообщение об ошибке

## MapEditor.jsx

Редактор карты мира для настройки игрового пространства.

**Функциональность:**
- Создание и редактирование карты
- Размещение объектов города
- Настройка путей и маршрутов
- Экспорт карты

**Инструменты:**
- Кисть для рисования
- Ластик для удаления
- Выбор объектов
- Масштабирование и панорамирование

## RegisterStep1.jsx

Первый шаг регистрации - основная информация.

**Функциональность:**
- Ввод имени пользователя
- Ввод email адреса
- Ввод пароля
- Подтверждение пароля
- Валидация данных

**Валидация:**
- Уникальность имени пользователя
- Корректность email
- Сложность пароля
- Совпадение паролей

## RegisterStep2.jsx

Второй шаг регистрации - профиль персонажа.

**Функциональность:**
- Выбор аватара
- Выбор пола персонажа
- Настройка внешности
- Предварительный просмотр

**Опции:**
- Готовые аватары
- Настройка цветов
- Выбор причесок
- Настройка лица

## RegisterStep3.jsx

Третий шаг регистрации - завершение.

**Функциональность:**
- Подтверждение данных
- Создание аккаунта
- Активация
- Перенаправление в игру

**Процесс:**
- Проверка всех данных
- Отправка на сервер
- Обработка ответа
- Успешная регистрация

## WaveformPlayer.jsx

Аудио плеер с визуализацией волновой формы.

**Функциональность:**
- Воспроизведение аудио
- Визуализация волновой формы
- Управление воспроизведением
- Настройка громкости

**Контролы:**
- Play/Pause
- Стоп
- Регулировка громкости
- Прогресс-бар
- Временные метки

## Создание новых страниц

### Шаблон страницы

```javascript
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * Описание страницы
 * @param {Object} props - Свойства страницы
 */
const NewPage = (props) => {
    const navigate = useNavigate();
    const { id } = useParams();
    
    // Состояния
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Эффекты
    useEffect(() => {
        loadData();
    }, [id]);
    
    // Функции
    const loadData = async () => {
        try {
            setLoading(true);
            // Загрузка данных
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleSubmit = (event) => {
        event.preventDefault();
        // Обработка отправки
    };
    
    // Рендер
    if (loading) return <div>Загрузка...</div>;
    if (error) return <div>Ошибка: {error}</div>;
    
    return (
        <div className="new-page">
            <h1>Новая страница</h1>
            <form onSubmit={handleSubmit}>
                {/* Форма */}
            </form>
        </div>
    );
};

export default NewPage;
```

### Принципы

1. **Единая ответственность** - Каждая страница отвечает за одну функциональность
2. **Маршрутизация** - Используйте React Router для навигации
3. **Состояние** - Управляйте состоянием через хуки React
4. **Обработка ошибок** - Всегда обрабатывайте ошибки и состояния загрузки
5. **Доступность** - Обеспечивайте доступность для всех пользователей

## Маршрутизация

### Настройка маршрутов

```javascript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import RegisterStep1 from './pages/RegisterStep1';
import RegisterStep2 from './pages/RegisterStep2';
import RegisterStep3 from './pages/RegisterStep3';
import Game from './pages/Game';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register/step1" element={<RegisterStep1 />} />
                <Route path="/register/step2" element={<RegisterStep2 />} />
                <Route path="/register/step3" element={<RegisterStep3 />} />
                <Route path="/game" element={<Game />} />
                <Route path="/" element={<Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    );
};
```

### Защищенные маршруты

```javascript
import RequireProfile from '../components/RequireProfile';

const ProtectedRoute = ({ children }) => {
    return (
        <RequireProfile redirectTo="/login">
            {children}
        </RequireProfile>
    );
};

// В маршрутах
<Route 
    path="/game" 
    element={
        <ProtectedRoute>
            <Game />
        </ProtectedRoute>
    } 
/>
```

## Навигация

### Программная навигация

```javascript
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
    const navigate = useNavigate();
    
    const handleLogin = async (credentials) => {
        try {
            const response = await loginUser(credentials);
            if (response.success) {
                navigate('/game');
            }
        } catch (error) {
            console.error('Ошибка входа:', error);
        }
    };
    
    return (
        <div>
            <button onClick={() => navigate('/register/step1')}>
                Регистрация
            </button>
        </div>
    );
};
```

### Передача параметров

```javascript
// Передача через navigate
navigate('/user/123', { state: { userData } });

// Получение в компоненте
import { useLocation } from 'react-router-dom';

const UserPage = () => {
    const location = useLocation();
    const userData = location.state?.userData;
    
    return <div>Данные пользователя: {userData?.name}</div>;
};
```

## Состояние страниц

### Локальное состояние

```javascript
const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
});

const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
        ...prev,
        [name]: value
    }));
};
```

### Глобальное состояние

```javascript
import { useAuth } from '../contexts/AuthContext';

const ProfilePage = () => {
    const { user, updateUser } = useAuth();
    
    const handleUpdate = async (newData) => {
        await updateUser(newData);
    };
    
    return <div>Профиль: {user?.username}</div>;
};
```

## Валидация

### Формы

```javascript
import { useState } from 'react';

const LoginForm = () => {
    const [errors, setErrors] = useState({});
    
    const validateForm = (data) => {
        const newErrors = {};
        
        if (!data.email) {
            newErrors.email = 'Email обязателен';
        } else if (!/\S+@\S+\.\S+/.test(data.email)) {
            newErrors.email = 'Email некорректен';
        }
        
        if (!data.password) {
            newErrors.password = 'Пароль обязателен';
        } else if (data.password.length < 6) {
            newErrors.password = 'Пароль должен быть не менее 6 символов';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleSubmit = (event) => {
        event.preventDefault();
        if (validateForm(formData)) {
            // Отправка формы
        }
    };
    
    return (
        <form onSubmit={handleSubmit}>
            <input
                type="email"
                name="email"
                className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
        </form>
    );
};
```

## Обработка ошибок

### Error Boundary

```javascript
import { ErrorBoundary } from 'react-error-boundary';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
    return (
        <div role="alert">
            <h2>Что-то пошло не так</h2>
            <pre>{error.message}</pre>
            <button onClick={resetErrorBoundary}>Попробовать снова</button>
        </div>
    );
};

const App = () => {
    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Router>
                <Routes>
                    {/* Маршруты */}
                </Routes>
            </Router>
        </ErrorBoundary>
    );
};
```

### Try-Catch в компонентах

```javascript
const DataPage = () => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await api.getData();
                setData(result);
            } catch (err) {
                setError(err.message);
                console.error('Ошибка загрузки данных:', err);
            }
        };
        
        fetchData();
    }, []);
    
    if (error) {
        return (
            <div className="error-container">
                <h3>Ошибка загрузки</h3>
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>
                    Обновить страницу
                </button>
            </div>
        );
    }
    
    return <div>{/* Контент */}</div>;
};
```

## Тестирование

### Unit тесты для страниц

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';

const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('Login Page', () => {
    it('отображает форму входа', () => {
        renderWithRouter(<Login />);
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument();
    });
    
    it('обрабатывает отправку формы', () => {
        const mockOnSubmit = jest.fn();
        renderWithRouter(<Login onSubmit={mockOnSubmit} />);
        
        fireEvent.click(screen.getByRole('button', { name: /войти/i }));
        expect(mockOnSubmit).toHaveBeenCalled();
    });
});
```

### Интеграционные тесты

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import Login from './Login';

const renderWithProviders = (component) => {
    return render(
        <BrowserRouter>
            <AuthProvider>
                {component}
            </AuthProvider>
        </BrowserRouter>
    );
};

describe('Login Integration', () => {
    it('выполняет вход и перенаправляет', async () => {
        renderWithProviders(<Login />);
        
        fireEvent.change(screen.getByLabelText(/email/i), {
            target: { value: 'test@example.com' }
        });
        fireEvent.change(screen.getByLabelText(/пароль/i), {
            target: { value: 'password123' }
        });
        
        fireEvent.click(screen.getByRole('button', { name: /войти/i }));
        
        await waitFor(() => {
            expect(window.location.pathname).toBe('/game');
        });
    });
});
```
