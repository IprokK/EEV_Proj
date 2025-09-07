# Компоненты EEV_Proj

## Обзор

Компоненты React, используемые в проекте EEV_Proj. Все компоненты следуют принципам функционального программирования и используют хуки React.

## Структура

```
components/
├── DialogSystem/           # Система диалогов
│   ├── DialogManager.js    # Хук для управления диалогами
│   └── DialogWindow.js     # Окно диалога
├── GameWrapper.jsx         # Обертка для игровой сцены
├── Inventory.jsx           # Инвентарь игрока
├── Loading.jsx             # Компонент загрузки
├── LoginScene.jsx          # Сцена входа
├── OrgControlPanel.jsx     # Панель управления организацией
├── RequireProfile.jsx      # Компонент для профиля
└── README.md               # Эта документация
```

## DialogSystem

### DialogManager.js
Хук для управления диалоговой системой.

**Использование:**
```javascript
const {
    currentDialog,
    dialogIndex,
    showDialog,
    loadDialog,
    handleAnswerSelect,
    setShowDialog
} = useDialogManager();
```

**Методы:**
- `loadDialog(npcId)` - Загружает диалог для NPC
- `handleAnswerSelect(answer)` - Обрабатывает выбор ответа
- `setShowDialog(show)` - Показывает/скрывает диалог

### DialogWindow.js
Компонент окна диалога.

**Props:**
- `dialog` - Объект диалога
- `dialogIndex` - Индекс текущего узла
- `onAnswerSelect` - Callback для выбора ответа
- `onClose` - Callback для закрытия

## GameWrapper.jsx

Обертка для игровой сцены, обеспечивающая правильное монтирование и размонтирование.

**Props:**
- `children` - Дочерние компоненты

**Особенности:**
- Автоматическое управление жизненным циклом
- Обработка ошибок
- Логирование

## Inventory.jsx

Компонент инвентаря игрока.

**Props:**
- `inventory` - Массив предметов
- `onClose` - Callback для закрытия
- `onItemAction` - Callback для действий с предметами

**Функциональность:**
- Отображение списка предметов
- Действия с предметами (использовать, выкинуть)
- Фильтрация и сортировка

## Loading.jsx

Компонент загрузки с анимацией.

**Props:**
- `message` - Сообщение загрузки
- `progress` - Прогресс (0-100)

**Особенности:**
- Анимированный спиннер
- Прогресс-бар
- Кастомные сообщения

## LoginScene.jsx

Сцена входа в игру.

**Функциональность:**
- Форма входа
- Валидация данных
- Обработка ошибок
- Перенаправление после входа

## OrgControlPanel.jsx

Панель управления организацией.

**Props:**
- `org` - Объект организации
- `onClose` - Callback для закрытия
- `onBuyItem` - Callback для покупки

**Функциональность:**
- Отображение меню организации
- Покупка предметов
- Управление настройками

## RequireProfile.jsx

Компонент для проверки профиля пользователя.

**Props:**
- `children` - Дочерние компоненты
- `redirectTo` - Путь для перенаправления

**Функциональность:**
- Проверка авторизации
- Перенаправление неавторизованных пользователей
- Защита маршрутов

## Создание новых компонентов

### Шаблон компонента

```javascript
import React from 'react';

/**
 * Описание компонента
 * @param {Object} props - Свойства компонента
 * @param {string} props.title - Заголовок
 * @param {Function} props.onClick - Callback для клика
 */
const NewComponent = ({ title, onClick }) => {
    return (
        <div className="new-component">
            <h2>{title}</h2>
            <button onClick={onClick}>
                Нажми меня
            </button>
        </div>
    );
};

export default NewComponent;
```

### Принципы

1. **Функциональные компоненты** - Используйте функциональные компоненты с хуками
2. **Props валидация** - Добавляйте PropTypes или TypeScript
3. **JSDoc** - Документируйте публичные API
4. **Единая ответственность** - Каждый компонент должен делать одну вещь
5. **Переиспользование** - Создавайте компоненты для переиспользования

### Стили

- Используйте CSS-in-JS или CSS модули
- Следуйте дизайн-системе проекта
- Обеспечивайте адаптивность
- Поддерживайте темную/светлую тему

## Тестирование

### Unit тесты

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import NewComponent from './NewComponent';

describe('NewComponent', () => {
    it('отображает заголовок', () => {
        render(<NewComponent title="Тест" />);
        expect(screen.getByText('Тест')).toBeInTheDocument();
    });

    it('вызывает onClick при клике', () => {
        const mockOnClick = jest.fn();
        render(<NewComponent title="Тест" onClick={mockOnClick} />);
        
        fireEvent.click(screen.getByRole('button'));
        expect(mockOnClick).toHaveBeenCalled();
    });
});
```

### Интеграционные тесты

```javascript
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('App Integration', () => {
    it('отображает главную страницу', () => {
        renderWithRouter(<App />);
        expect(screen.getByText('EEV_Proj')).toBeInTheDocument();
    });
});
```

## Производительность

### Оптимизация

1. **React.memo** - Мемоизация компонентов
2. **useMemo** - Мемоизация вычислений
3. **useCallback** - Мемоизация функций
4. **Lazy loading** - Ленивая загрузка компонентов

### Пример оптимизации

```javascript
import React, { useMemo, useCallback } from 'react';

const OptimizedComponent = React.memo(({ items, onItemClick }) => {
    const sortedItems = useMemo(() => {
        return items.sort((a, b) => a.name.localeCompare(b.name));
    }, [items]);

    const handleItemClick = useCallback((item) => {
        onItemClick(item);
    }, [onItemClick]);

    return (
        <ul>
            {sortedItems.map(item => (
                <li key={item.id} onClick={() => handleItemClick(item)}>
                    {item.name}
                </li>
            ))}
        </ul>
    );
});
```

## Доступность

### ARIA атрибуты

```javascript
const AccessibleComponent = ({ label, value, onChange }) => {
    return (
        <div>
            <label htmlFor="input">{label}</label>
            <input
                id="input"
                type="text"
                value={value}
                onChange={onChange}
                aria-describedby="help-text"
            />
            <div id="help-text">Дополнительная информация</div>
        </div>
    );
};
```

### Клавиатурная навигация

```javascript
const KeyboardComponent = ({ onEnter, onEscape }) => {
    const handleKeyDown = (event) => {
        switch (event.key) {
            case 'Enter':
                onEnter();
                break;
            case 'Escape':
                onEscape();
                break;
        }
    };

    return (
        <div tabIndex={0} onKeyDown={handleKeyDown}>
            Нажмите Enter или Escape
        </div>
    );
};
```

## Логирование

### Отладочная информация

```javascript
import { useEffect } from 'react';

const DebugComponent = ({ data }) => {
    useEffect(() => {
        console.log('Component mounted with data:', data);
        return () => {
            console.log('Component unmounting');
        };
    }, [data]);

    return <div>Debug Component</div>;
};
```

### Обработка ошибок

```javascript
import { ErrorBoundary } from 'react-error-boundary';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
    return (
        <div role="alert">
            <p>Что-то пошло не так:</p>
            <pre>{error.message}</pre>
            <button onClick={resetErrorBoundary}>Попробовать снова</button>
        </div>
    );
};

const AppWithErrorBoundary = () => {
    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <App />
        </ErrorBoundary>
    );
};
```
