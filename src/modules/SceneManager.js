import * as THREE from 'three';

/**
 * Менеджер 3D сцены
 * Отвечает за создание, управление и обновление 3D сцены
 */
export class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.cityGroup = new THREE.Group();
        this.interiorGroup = null;
        this.ground = null;
        this.cityMeshes = [];
        this.cityObjectsData = [];
        this.loadedCityObjects = {};
        this.loadedInteriorMeshes = {};
        this.interiorsData = [];
        this.npcMeshes = [];
        this.interiorColliders = [];
        this.interiorInteractables = [];
        this.interiorExitPos = null;
        this.fpHiddenNodes = [];
        this.cleanupTimer = null;
        this.overlayTimeout = null;
        
        this.init();
    }

    /**
     * Инициализация сцены
     */
    init() {
        this.scene.add(this.cityGroup);
        this.setupLighting();
        this.setupGround();
    }

    /**
     * Настройка освещения сцены
     */
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
    }

    /**
     * Создание поверхности земли
     */
    setupGround() {
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a5f3a,
            roughness: 0.8,
            metalness: 0.1
        });
        
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }

    /**
     * Добавление объекта в город
     */
    addCityObject(mesh, data) {
        this.cityGroup.add(mesh);
        this.cityMeshes.push(mesh);
        this.cityObjectsData.push(data);
    }

    /**
     * Удаление объекта из города
     */
    removeCityObject(mesh) {
        this.cityGroup.remove(mesh);
        const index = this.cityMeshes.indexOf(mesh);
        if (index > -1) {
            this.cityMeshes.splice(index, 1);
            this.cityObjectsData.splice(index, 1);
        }
    }

    /**
     * Создание группы интерьера
     */
    createInteriorGroup() {
        this.interiorGroup = new THREE.Group();
        this.interiorGroup.name = 'interiorGroup';
        this.scene.add(this.interiorGroup);
        return this.interiorGroup;
    }

    /**
     * Удаление группы интерьера
     */
    removeInteriorGroup() {
        if (this.interiorGroup) {
            this.scene.remove(this.interiorGroup);
            this.interiorGroup = null;
            this.interiorColliders = [];
            this.interiorInteractables = [];
            this.interiorExitPos = null;
        }
    }

    /**
     * Добавление коллайдера интерьера
     */
    addInteriorCollider(mesh) {
        this.interiorColliders.push(mesh);
    }

    /**
     * Добавление интерактивного объекта интерьера
     */
    addInteriorInteractable(mesh) {
        this.interiorInteractables.push(mesh);
    }

    /**
     * Установка позиции выхода из интерьера
     */
    setInteriorExitPos(position) {
        this.interiorExitPos = position;
    }

    /**
     * Переключение видимости мира
     */
    toggleWorldVisibility(visible) {
        if (this.ground) this.ground.visible = visible;
        this.cityMeshes.forEach(mesh => mesh.visible = visible);
    }

    /**
     * Очистка ресурсов
     */
    dispose() {
        // Очистка таймеров
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        if (this.overlayTimeout) {
            clearTimeout(this.overlayTimeout);
        }

        // Очистка геометрий и материалов
        this.scene.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        // Очистка сцены
        this.scene.clear();
    }

    /**
     * Получение сцены
     */
    getScene() {
        return this.scene;
    }

    /**
     * Получение группы города
     */
    getCityGroup() {
        return this.cityGroup;
    }

    /**
     * Получение группы интерьера
     */
    getInteriorGroup() {
        return this.interiorGroup;
    }

    /**
     * Получение коллайдеров интерьера
     */
    getInteriorColliders() {
        return this.interiorColliders;
    }

    /**
     * Получение интерактивных объектов интерьера
     */
    getInteriorInteractables() {
        return this.interiorInteractables;
    }

    /**
     * Получение позиции выхода из интерьера
     */
    getInteriorExitPos() {
        return this.interiorExitPos;
    }
}
