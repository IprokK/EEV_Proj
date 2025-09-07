import * as THREE from 'three';

/**
 * Менеджер рендерера
 * Отвечает за создание, настройку и управление WebGL рендерером
 */
export class RendererManager {
    constructor(container) {
        this.container = container;
        this.renderer = null;
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Инициализация рендерера
     */
    init() {
        try {
            this.createRenderer();
            this.setupRenderer();
            this.addToContainer();
            this.isInitialized = true;
            
            console.log('Рендерер инициализирован успешно');
        } catch (error) {
            console.error('Ошибка инициализации рендерера:', error);
        }
    }

    /**
     * Создание WebGL рендерера
     */
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
        });
    }

    /**
     * Настройка рендерера
     */
    setupRenderer() {
        if (!this.renderer) return;
        
        // Настройка размера
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Настройка теней
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Настройка цвета фона
        this.renderer.setClearColor(0x87ceeb);
        
        // Настройка гамма
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
    }

    /**
     * Добавление рендерера в контейнер
     */
    addToContainer() {
        if (this.container && this.renderer) {
            this.container.appendChild(this.renderer.domElement);
        }
    }

    /**
     * Рендеринг сцены
     */
    render(scene, camera) {
        if (this.renderer && scene && camera) {
            this.renderer.render(scene, camera);
        }
    }

    /**
     * Обработка изменения размера окна
     */
    handleResize() {
        if (!this.renderer) return;
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    /**
     * Получение DOM элемента рендерера
     */
    getDomElement() {
        return this.renderer ? this.renderer.domElement : null;
    }

    /**
     * Получение рендерера
     */
    getRenderer() {
        return this.renderer;
    }

    /**
     * Проверка инициализации
     */
    isReady() {
        return this.isInitialized && this.renderer !== null;
    }

    /**
     * Очистка ресурсов
     */
    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement) {
                this.container.removeChild(this.renderer.domElement);
            }
        }
        
        this.renderer = null;
        this.isInitialized = false;
    }
}
