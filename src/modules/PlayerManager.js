import * as THREE from 'three';

/**
 * Менеджер игрока
 * Отвечает за создание, управление и анимацию игрока
 */
export class PlayerManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.player = null;
        this.mixer = null;
        this.moveSpeed = 2.5;
        this.savedPosition = new THREE.Vector3();
        this.remotePlayers = {};
        
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
        
        const moveDistance = this.moveSpeed * deltaTime;
        const moveVector = new THREE.Vector3();
        
        if (direction.forward) moveVector.z -= moveDistance;
        if (direction.backward) moveVector.z += moveDistance;
        if (direction.left) moveVector.x -= moveDistance;
        if (direction.right) moveVector.x += moveDistance;
        
        this.player.position.add(moveVector);
        
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
        
        this.player.position.copy(position);
        if (rotation !== null) {
            this.player.rotation.y = rotation;
        }
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
