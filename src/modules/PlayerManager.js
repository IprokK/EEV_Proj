import * as THREE from 'three';

/**
 * Менеджер игрока
 * Отвечает за создание, управление и анимацию игрока
 */
export class PlayerManager {
    constructor(sceneManager, collisionManager = null) {
        this.sceneManager = sceneManager;
        this.collisionManager = collisionManager;
        this.player = null;
        this.mixer = null;
        this.moveSpeed = 2.5;
        this.interiorMoveSpeed = 3.0; // Скорость движения в интерьере
        this.savedPosition = new THREE.Vector3();
        this.remotePlayers = {};
        this.isInInterior = false;
        
        this.init();
    }

    /**
     * Инициализация игрока
     */
    async init() {
        await this.createPlayer();
    }

    /**
     * Создание модели игрока
     */
    async createPlayer() {
        try {
            // Создаем простую геометрию для игрока
            const geometry = new THREE.BoxGeometry(1, 2, 1);
            const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
            this.player = new THREE.Mesh(geometry, material);
            
            this.player.position.set(0, 0, 0);
            this.player.castShadow = true;
            
            // Добавляем игрока на сцену
            this.sceneManager.getScene().add(this.player);
            
            console.log('Игрок создан успешно');
        } catch (error) {
            console.error('Ошибка создания игрока:', error);
        }
    }

    /**
     * Движение игрока
     */
    movePlayer(direction, deltaTime) {
        if (!this.player) return;
        
        const moveDistance = this.isInInterior ? this.interiorMoveSpeed * deltaTime : this.moveSpeed * deltaTime;
        const moveVector = new THREE.Vector3();
        
        if (direction.forward) moveVector.z -= moveDistance;
        if (direction.backward) moveVector.z += moveDistance;
        if (direction.left) moveVector.x -= moveDistance;
        if (direction.right) moveVector.x += moveDistance;
        
        // Если игрок в интерьере, используем систему коллизий
        if (this.isInInterior && this.collisionManager) {
            const targetPosition = this.player.position.clone().add(moveVector);
            const safePosition = this.collisionManager.checkInteriorCollisions(
                this.player.position,
                targetPosition,
                moveVector,
                deltaTime
            );
            this.player.position.copy(safePosition);
        } else {
            // Обычное движение без коллизий
            this.player.position.add(moveVector);
        }
        
        // Поворачиваем игрока в направлении движения
        if (moveVector.length() > 0) {
            const angle = Math.atan2(moveVector.x, moveVector.z);
            this.player.rotation.y = angle;
        }
    }

    /**
     * Телепортация игрока
     */
    teleportPlayer(position, rotation = null) {
        if (!this.player) return;
        
        // Если игрок в интерьере, проверяем безопасность позиции
        if (this.isInInterior && this.collisionManager) {
            const safePosition = this.collisionManager.getSafeTeleportPosition(position);
            this.player.position.copy(safePosition);
        } else {
            this.player.position.copy(position);
        }
        
        if (rotation !== null) {
            this.player.rotation.y = rotation;
        }
    }

    /**
     * Сохранение позиции игрока
     */
    savePosition() {
        if (this.player) {
            this.savedPosition.copy(this.player.position);
        }
    }

    /**
     * Восстановление позиции игрока
     */
    restorePosition() {
        if (this.player && this.savedPosition.length() > 0) {
            this.player.position.copy(this.savedPosition);
        }
    }

    /**
     * Установка состояния интерьера
     */
    setInInterior(inInterior) {
        this.isInInterior = inInterior;
    }

    /**
     * Получение поворота игрока
     */
    getPlayerRotation() {
        return this.player ? this.player.rotation.clone() : new THREE.Euler();
    }

    /**
     * Получение позиции игрока
     */
    getPlayerPosition() {
        return this.player ? this.player.position.clone() : new THREE.Vector3();
    }

    /**
     * Получение объекта игрока
     */
    getPlayer() {
        return this.player;
    }

    /**
     * Очистка ресурсов
     */
    dispose() {
        if (this.player) {
            this.sceneManager.getScene().remove(this.player);
        }
        
        this.player = null;
        this.remotePlayers = {};
    }
}
