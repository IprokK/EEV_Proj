import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { CameraManager } from './CameraManager.js';
import { PlayerManager } from './PlayerManager.js';
import { RendererManager } from './RendererManager.js';
import { InteriorManager } from './InteriorManager.js';

/**
 * Основной класс игры
 * Координирует все модули и управляет игровым циклом
 */
export class GameCore {
    constructor(container) {
        this.container = container;
        this.isRunning = false;
        this.clock = new THREE.Clock();
        
        // Инициализация модулей
        this.sceneManager = new SceneManager();
        this.cameraManager = new CameraManager();
        this.playerManager = new PlayerManager(this.sceneManager);
        this.rendererManager = new RendererManager(container);
        this.interiorManager = new InteriorManager(this.sceneManager);
        
        // Состояние игры
        this.moveInput = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            strafeLeft: false,
            strafeRight: false
        };
        
        this.isInInterior = false;
        this.currentExit = null;
        
        this.init();
    }

    /**
     * Инициализация игры
     */
    async init() {
        try {
            // Ждем инициализации всех модулей
            await this.playerManager.init();
            
            // Настраиваем обработчики событий
            this.setupEventListeners();
            
            // Запускаем игровой цикл
            this.start();
            
            console.log('GameCore инициализирован успешно');
        } catch (error) {
            console.error('Ошибка инициализации GameCore:', error);
        }
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Обработка клавиатуры
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Обработка мыши
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Обработка изменения размера окна
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Обработка кликов по сцене
        this.setupClickHandlers();
    }

    /**
     * Настройка обработчиков кликов
     */
    setupClickHandlers() {
        const canvas = this.rendererManager.getDomElement();
        if (!canvas) return;
        
        canvas.addEventListener('click', this.handleSceneClick.bind(this));
        canvas.addEventListener('pointerdown', this.handleSceneClick.bind(this));
    }

    /**
     * Обработка нажатия клавиш
     */
    handleKeyDown(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveInput.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveInput.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveInput.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveInput.right = true;
                break;
            case 'KeyQ':
                this.moveInput.strafeLeft = true;
                break;
            case 'KeyE':
                this.moveInput.strafeRight = true;
                break;
        }
    }

    /**
     * Обработка отпускания клавиш
     */
    handleKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveInput.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveInput.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveInput.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveInput.right = false;
                break;
            case 'KeyQ':
                this.moveInput.strafeLeft = false;
                break;
            case 'KeyE':
                this.moveInput.strafeRight = false;
                break;
        }
    }

    /**
     * Обработка движения мыши
     */
    handleMouseMove(event) {
        if (this.cameraManager.isFirstPersonActive()) {
            this.cameraManager.handleMouseMove(event.movementX, event.movementY);
        }
    }

    /**
     * Обработка колеса мыши
     */
    handleWheel(event) {
        this.cameraManager.handleWheel(event.deltaY);
    }

    /**
     * Обработка изменения размера окна
     */
    handleResize() {
        this.rendererManager.handleResize();
        this.cameraManager.handleResize();
    }

    /**
     * Обработка кликов по сцене
     */
    handleSceneClick(event) {
        if (!this.rendererManager.isReady() || !this.cameraManager.getCurrentCamera()) return;
        
        const rect = this.rendererManager.getDomElement().getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.cameraManager.getCurrentCamera());
        
        // Проверяем клики по интерактивным объектам интерьера
        if (this.isInInterior) {
            this.handleInteriorClick(raycaster);
        }
        
        // Проверяем клики по объектам города
        this.handleCityClick(raycaster);
    }

    /**
     * Обработка кликов по объектам интерьера
     */
    handleInteriorClick(raycaster) {
        const interactables = this.sceneManager.getInteriorInteractables();
        const hits = raycaster.intersectObjects(interactables, true);
        
        if (hits.length > 0) {
            const hit = hits[0];
            const payload = this.getInteractablePayload(hit.object);
            
            if (payload) {
                this.handleInteriorInteraction(payload);
            }
        }
    }

    /**
     * Обработка кликов по объектам города
     */
    handleCityClick(raycaster) {
        const cityMeshes = this.sceneManager.cityMeshes;
        const hits = raycaster.intersectObjects(cityMeshes, true);
        
        if (hits.length > 0) {
            const hit = hits[0];
            const objectId = hit.object.userData.id;
            
            if (objectId) {
                this.handleCityObjectClick(objectId);
            }
        }
    }

    /**
     * Получение данных интерактивного объекта
     */
    getInteractablePayload(object) {
        let node = object;
        while (node && !node.userData?.payload && node.parent) {
            node = node.parent;
        }
        return node?.userData?.payload;
    }

    /**
     * Обработка взаимодействия с объектами интерьера
     */
    handleInteriorInteraction(payload) {
        switch (payload.type) {
            case 'npc':
                console.log('Взаимодействие с NPC:', payload.id);
                // Здесь можно вызвать систему диалогов
                break;
            case 'marker':
                console.log('Взаимодействие с маркером:', payload.label);
                break;
            default:
                console.log('Неизвестный тип взаимодействия:', payload);
        }
    }

    /**
     * Обработка клика по объекту города
     */
    async handleCityObjectClick(objectId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/city_objects/${objectId}/interior`, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include',
                cache: 'no-cache'
            });
            
            if (response.ok) {
                const { interiorId } = await response.json();
                if (interiorId) {
                    await this.enterInterior(interiorId);
                }
            }
        } catch (error) {
            console.error('Ошибка при обработке клика по объекту города:', error);
        }
    }

    /**
     * Вход в интерьер
     */
    async enterInterior(interiorId) {
        try {
            this.isInInterior = true;
            
            // Сохраняем позицию игрока
            const playerPosition = this.playerManager.getPlayerPosition();
            this.playerManager.savePosition();
            
            // Переключаемся на камеру от первого лица
            this.cameraManager.switchToFirstPersonCamera(
                playerPosition,
                this.playerManager.getPlayerRotation()
            );
            
            // Загружаем интерьер
            await this.interiorManager.enterInteriorMode(interiorId, playerPosition);
            
            console.log('Вход в интерьер завершен');
        } catch (error) {
            console.error('Ошибка входа в интерьер:', error);
            this.isInInterior = false;
        }
    }

    /**
     * Выход из интерьера
     */
    exitInterior() {
        if (!this.isInInterior) return;
        
        try {
            this.isInInterior = false;
            
            // Восстанавливаем позицию игрока
            this.playerManager.restorePosition();
            
            // Переключаемся на ортографическую камеру
            this.cameraManager.switchToOrthoCamera();
            
            // Удаляем интерьер
            this.sceneManager.removeInteriorGroup();
            
            console.log('Выход из интерьера завершен');
        } catch (error) {
            console.error('Ошибка выхода из интерьера:', error);
        }
    }

    /**
     * Запуск игры
     */
    start() {
        this.isRunning = true;
        this.gameLoop();
    }

    /**
     * Остановка игры
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Основной игровой цикл
     */
    gameLoop() {
        if (!this.isRunning) return;
        
        const deltaTime = this.clock.getDelta();
        
        // Обновляем игрока
        this.playerManager.movePlayer(this.moveInput, deltaTime);
        
        // Обновляем камеру
        if (!this.isInInterior) {
            const playerPosition = this.playerManager.getPlayerPosition();
            this.cameraManager.updateOrthoCameraPosition(playerPosition);
        } else {
            const playerPosition = this.playerManager.getPlayerPosition();
            const playerRotation = this.playerManager.getPlayerRotation();
            this.cameraManager.updateFirstPersonCameraPosition(playerPosition, playerRotation);
        }
        
        // Рендерим сцену
        this.rendererManager.render(
            this.sceneManager.getScene(),
            this.cameraManager.getCurrentCamera()
        );
        
        // Продолжаем цикл
        requestAnimationFrame(() => this.gameLoop());
    }

    /**
     * Получение менеджера сцены
     */
    getSceneManager() {
        return this.sceneManager;
    }

    /**
     * Получение менеджера камер
     */
    getCameraManager() {
        return this.cameraManager;
    }

    /**
     * Получение менеджера игрока
     */
    getPlayerManager() {
        return this.playerManager;
    }

    /**
     * Получение менеджера рендерера
     */
    getRendererManager() {
        return this.rendererManager;
    }

    /**
     * Получение менеджера интерьеров
     */
    getInteriorManager() {
        return this.interiorManager;
    }

    /**
     * Очистка ресурсов
     */
    dispose() {
        this.stop();
        
        // Очищаем все модули
        this.sceneManager.dispose();
        this.cameraManager.dispose();
        this.playerManager.dispose();
        this.rendererManager.dispose();
        this.interiorManager.dispose();
        
        // Удаляем обработчики событий
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        document.removeEventListener('keyup', this.handleKeyUp.bind(this));
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('wheel', this.handleWheel.bind(this));
        window.removeEventListener('resize', this.handleResize.bind(this));
        
        console.log('GameCore очищен');
    }
}
