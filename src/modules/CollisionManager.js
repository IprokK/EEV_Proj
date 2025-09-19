import * as THREE from 'three';

/**
 * Менеджер коллизий
 * Отвечает за проверку столкновений игрока с объектами интерьера
 */
export class CollisionManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.playerRadius = 0.35; // Радиус игрока
        this.playerHeight = 1.6; // Высота игрока
        this.collisionCache = new Map(); // Кэш для оптимизации
        this.cacheTimeout = 100; // Время жизни кэша в мс
        this.lastCacheUpdate = 0;
        
        this.init();
    }

    /**
     * Инициализация менеджера коллизий
     */
    init() {
        console.log('CollisionManager инициализирован');
    }

    /**
     * Проверка коллизий при движении игрока в интерьере
     * @param {THREE.Vector3} currentPosition - Текущая позиция игрока
     * @param {THREE.Vector3} targetPosition - Целевая позиция игрока
     * @param {THREE.Vector3} direction - Направление движения
     * @param {number} deltaTime - Время между кадрами
     * @returns {THREE.Vector3} - Безопасная позиция игрока
     */
    checkInteriorCollisions(currentPosition, targetPosition, direction, deltaTime) {
        if (!this.sceneManager.interiorColliders || this.sceneManager.interiorColliders.length === 0) {
            return targetPosition;
        }

        // Обновляем кэш коллизий если нужно
        this.updateCollisionCache();

        // Получаем коллайдеры из кэша
        const colliders = this.collisionCache.get('interiorColliders') || [];
        
        if (colliders.length === 0) {
            return targetPosition;
        }

        // Проверяем коллизии по осям отдельно для более плавного движения
        let safePosition = currentPosition.clone();
        
        // Проверяем движение по X
        if (Math.abs(direction.x) > 0.001) {
            const xTestPosition = safePosition.clone();
            xTestPosition.x = targetPosition.x;
            
            if (!this.checkPlayerCollision(xTestPosition, colliders)) {
                safePosition.x = targetPosition.x;
            }
        }
        
        // Проверяем движение по Z
        if (Math.abs(direction.z) > 0.001) {
            const zTestPosition = safePosition.clone();
            zTestPosition.z = targetPosition.z;
            
            if (!this.checkPlayerCollision(zTestPosition, colliders)) {
                safePosition.z = targetPosition.z;
            }
        }

        return safePosition;
    }

    /**
     * Проверка столкновения игрока с коллайдерами
     * @param {THREE.Vector3} position - Позиция игрока
     * @param {Array} colliders - Массив коллайдеров
     * @returns {boolean} - true если есть столкновение
     */
    checkPlayerCollision(position, colliders) {
        // Создаем AABB для игрока
        const playerBox = new THREE.Box3();
        const playerMin = new THREE.Vector3(
            position.x - this.playerRadius,
            position.y,
            position.z - this.playerRadius
        );
        const playerMax = new THREE.Vector3(
            position.x + this.playerRadius,
            position.y + this.playerHeight,
            position.z + this.playerRadius
        );
        playerBox.setFromPoints([playerMin, playerMax]);

        // Проверяем столкновения с каждым коллайдером
        for (const collider of colliders) {
            if (!collider.geometry || !collider.visible) continue;

            // Пропускаем интерактивные объекты
            if (collider.userData && (collider.userData.interactable || collider.userData.payload)) {
                continue;
            }

            // Пропускаем сферы (хит-зоны)
            if (collider.geometry.type === 'SphereGeometry') {
                continue;
            }

            try {
                // Обновляем мировую матрицу коллайдера
                collider.updateMatrixWorld(true);
                
                // Создаем AABB для коллайдера
                const colliderBox = new THREE.Box3();
                colliderBox.setFromObject(collider);

                // Проверяем пересечение
                if (playerBox.intersectsBox(colliderBox)) {
                    return true;
                }
            } catch (error) {
                console.warn('Ошибка при проверке коллизии:', error);
                continue;
            }
        }

        return false;
    }

    /**
     * Обновление кэша коллизий
     */
    updateCollisionCache() {
        const now = Date.now();
        
        // Обновляем кэш только если прошло достаточно времени
        if (now - this.lastCacheUpdate < this.cacheTimeout) {
            return;
        }

        this.lastCacheUpdate = now;

        // Очищаем старый кэш
        this.collisionCache.clear();

        // Собираем коллайдеры интерьера
        const interiorColliders = this.sceneManager.interiorColliders || [];
        const validColliders = [];

        // Фильтруем и валидируем коллайдеры
        for (const collider of interiorColliders) {
            if (this.isValidCollider(collider)) {
                validColliders.push(collider);
            }
        }

        // Если коллайдеров мало, попробуем собрать их из группы интерьера
        if (validColliders.length === 0 && this.sceneManager.interiorGroup) {
            this.collectCollidersFromInteriorGroup(validColliders);
        }

        this.collisionCache.set('interiorColliders', validColliders);
    }

    /**
     * Проверка валидности коллайдера
     * @param {THREE.Object3D} collider - Объект для проверки
     * @returns {boolean} - true если коллайдер валиден
     */
    isValidCollider(collider) {
        if (!collider || !collider.isMesh) return false;
        if (!collider.geometry) return false;
        if (!collider.visible) return false;
        
        // Пропускаем интерактивные объекты
        if (collider.userData && (collider.userData.interactable || collider.userData.payload)) {
            return false;
        }

        // Пропускаем сферы (хит-зоны)
        if (collider.geometry.type === 'SphereGeometry') {
            return false;
        }

        return true;
    }

    /**
     * Сбор коллайдеров из группы интерьера
     * @param {Array} colliders - Массив для добавления коллайдеров
     */
    collectCollidersFromInteriorGroup(colliders) {
        if (!this.sceneManager.interiorGroup) return;

        try {
            this.sceneManager.interiorGroup.updateMatrixWorld(true);
            
            this.sceneManager.interiorGroup.traverse((child) => {
                if (this.isValidCollider(child)) {
                    colliders.push(child);
                }
            });
        } catch (error) {
            console.warn('Ошибка при сборе коллайдеров из группы интерьера:', error);
        }
    }

    /**
     * Проверка коллизий с интерактивными объектами
     * @param {THREE.Vector3} position - Позиция игрока
     * @returns {Object|null} - Данные интерактивного объекта или null
     */
    checkInteriorInteractions(position) {
        const interactables = this.sceneManager.interiorInteractables || [];
        
        for (const interactable of interactables) {
            if (!interactable.geometry || !interactable.visible) continue;

            try {
                interactable.updateMatrixWorld(true);
                
                // Создаем сферу вокруг интерактивного объекта
                const interactableBox = new THREE.Box3();
                interactableBox.setFromObject(interactable);

                // Создаем AABB для игрока
                const playerBox = new THREE.Box3();
                const playerMin = new THREE.Vector3(
                    position.x - this.playerRadius,
                    position.y,
                    position.z - this.playerRadius
                );
                const playerMax = new THREE.Vector3(
                    position.x + this.playerRadius,
                    position.y + this.playerHeight,
                    position.z + this.playerRadius
                );
                playerBox.setFromPoints([playerMin, playerMax]);

                if (playerBox.intersectsBox(interactableBox)) {
                    return interactable.userData.payload || { type: 'interactable' };
                }
            } catch (error) {
                console.warn('Ошибка при проверке взаимодействия:', error);
                continue;
            }
        }

        return null;
    }

    /**
     * Получение безопасной позиции для телепортации
     * @param {THREE.Vector3} targetPosition - Целевая позиция
     * @returns {THREE.Vector3} - Безопасная позиция
     */
    getSafeTeleportPosition(targetPosition) {
        const colliders = this.collisionCache.get('interiorColliders') || [];
        
        if (colliders.length === 0) {
            return targetPosition.clone();
        }

        // Проверяем целевую позицию
        if (!this.checkPlayerCollision(targetPosition, colliders)) {
            return targetPosition.clone();
        }

        // Ищем ближайшую безопасную позицию
        const searchRadius = 2.0;
        const searchSteps = 8;
        
        for (let radius = 0.5; radius <= searchRadius; radius += 0.5) {
            for (let step = 0; step < searchSteps; step++) {
                const angle = (step / searchSteps) * Math.PI * 2;
                const testPosition = new THREE.Vector3(
                    targetPosition.x + Math.cos(angle) * radius,
                    targetPosition.y,
                    targetPosition.z + Math.sin(angle) * radius
                );

                if (!this.checkPlayerCollision(testPosition, colliders)) {
                    return testPosition;
                }
            }
        }

        // Если не нашли безопасную позицию, возвращаем исходную
        return targetPosition.clone();
    }

    /**
     * Очистка ресурсов
     */
    dispose() {
        this.collisionCache.clear();
        console.log('CollisionManager очищен');
    }
}
