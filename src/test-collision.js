import { GameCore } from './modules/GameCore.js';

/**
 * Тестовый класс для демонстрации системы коллизий в интерьерах
 */
class CollisionTest {
    constructor() {
        this.gameCore = null;
        this.container = null;
    }

    /**
     * Инициализация теста
     */
    async init() {
        // Создаем контейнер для игры
        this.container = document.createElement('div');
        this.container.style.width = '100vw';
        this.container.style.height = '100vh';
        this.container.style.position = 'fixed';
        this.container.style.top = '0';
        this.container.style.left = '0';
        document.body.appendChild(this.container);

        // Инициализируем игровое ядро
        this.gameCore = new GameCore(this.container);
        
        console.log('Тест системы коллизий инициализирован');
        console.log('Управление:');
        console.log('- WASD или стрелки для движения');
        console.log('- Мышь для поворота камеры в интерьере');
        console.log('- Клик по объектам города для входа в интерьер');
    }

    /**
     * Запуск теста
     */
    start() {
        console.log('Тест запущен');
    }

    /**
     * Остановка теста
     */
    stop() {
        if (this.gameCore) {
            this.gameCore.dispose();
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        console.log('Тест остановлен');
    }
}

// Автоматический запуск теста при загрузке страницы
if (typeof window !== 'undefined') {
    window.addEventListener('load', async () => {
        const test = new CollisionTest();
        await test.init();
        test.start();
        
        // Обработка закрытия страницы
        window.addEventListener('beforeunload', () => {
            test.stop();
        });
    });
}

export { CollisionTest };
