import * as THREE from 'three';

/**
 * Менеджер камер
 * Отвечает за создание, переключение и управление камерами
 */
export class CameraManager {
    constructor() {
        this.orthoCamera = null;
        this.fpCamera = null;
        this.currentCamera = null;
        this.fpPitch = 0;
        this.baseOffset = new THREE.Vector3(-200, 150, -200);
        this.planarDist = Math.hypot(this.baseOffset.x, this.baseOffset.z);
        this.radius = Math.hypot(this.planarDist, this.baseOffset.y);
        this.baseAzimuth = Math.atan2(this.baseOffset.z, this.baseOffset.x);
        this.basePolar = Math.atan2(this.baseOffset.y, this.planarDist);
        this.cameraPitchOffset = 0;
        this.maxPitch = THREE.MathUtils.degToRad(10);
        this.zoom = 10;
        this.minZoom = this.zoom * 0.1;
        this.maxZoom = this.zoom * 3.5;
        
        this.init();
    }

    /**
     * Инициализация камер
     */
    init() {
        this.createOrthoCamera();
        this.createFirstPersonCamera();
        this.currentCamera = this.orthoCamera;
    }

    /**
     * Создание ортографической камеры (вид сверху)
     */
    createOrthoCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 50;
        
        this.orthoCamera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            1,
            1000
        );
        
        this.orthoCamera.position.copy(this.baseOffset);
        this.orthoCamera.lookAt(0, 0, 0);
        this.orthoCamera.updateProjectionMatrix();
    }

    /**
     * Создание камеры от первого лица
     */
    createFirstPersonCamera() {
        this.fpCamera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        this.fpCamera.position.set(0, 1.6, 0);
        this.fpCamera.updateProjectionMatrix();
    }

    /**
     * Переключение на камеру от первого лица
     */
    switchToFirstPersonCamera(playerPosition, playerRotation) {
        if (!this.fpCamera || !playerPosition) return;
        
        this.currentCamera = this.fpCamera;
        
        // Устанавливаем позицию камеры на уровне глаз игрока
        const headHeight = 1.6;
        this.fpCamera.position.set(
            playerPosition.x,
            playerPosition.y + headHeight,
            playerPosition.z
        );
        
        // Небольшой сдвиг камеры вперед
        const forward = new THREE.Vector3(0, 0, -0.08).applyEuler(
            new THREE.Euler(0, playerRotation.y, 0)
        );
        this.fpCamera.position.add(forward);
        
        // Направляем камеру в том же направлении, что и игрок
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyEuler(new THREE.Euler(0, playerRotation.y, 0));
        this.fpCamera.lookAt(
            this.fpCamera.position.clone().add(direction)
        );
        
        this.fpPitch = 0;
        this.fpCamera.updateProjectionMatrix();
        
        // Запрашиваем pointer lock для управления мышью
        this.requestPointerLock();
    }

    /**
     * Переключение на ортографическую камеру
     */
    switchToOrthoCamera() {
        this.currentCamera = this.orthoCamera;
        this.fpPitch = 0;
        
        // Выходим из pointer lock
        this.exitPointerLock();
    }

    /**
     * Запрос pointer lock для управления мышью
     */
    requestPointerLock() {
        if (document.body.requestPointerLock) {
            document.body.requestPointerLock();
        }
    }

    /**
     * Выход из pointer lock
     */
    exitPointerLock() {
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    }

    /**
     * Обновление позиции ортографической камеры
     */
    updateOrthoCameraPosition(playerPosition) {
        if (!this.orthoCamera || !playerPosition) return;
        
        const offset = this.baseOffset.clone();
        offset.x += playerPosition.x;
        offset.z += playerPosition.z;
        
        this.orthoCamera.position.copy(offset);
        this.orthoCamera.lookAt(playerPosition.x, 0, playerPosition.z);
        this.orthoCamera.updateProjectionMatrix();
    }

    /**
     * Обновление позиции камеры от первого лица
     */
    updateFirstPersonCameraPosition(playerPosition, playerRotation) {
        if (!this.fpCamera || !playerPosition) return;
        
        const headHeight = 1.6;
        this.fpCamera.position.set(
            playerPosition.x,
            playerPosition.y + headHeight,
            playerPosition.z
        );
        
        // Сдвиг вперед
        const forward = new THREE.Vector3(0, 0, -0.08).applyEuler(
            new THREE.Euler(0, playerRotation.y, 0)
        );
        this.fpCamera.position.add(forward);
        
        // Обновляем направление взгляда
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyEuler(new THREE.Euler(0, playerRotation.y, 0));
        this.fpCamera.lookAt(
            this.fpCamera.position.clone().add(direction)
        );
        
        this.fpCamera.updateProjectionMatrix();
    }

    /**
     * Обработка движения мыши для камеры от первого лица
     */
    handleMouseMove(deltaX, deltaY, sensitivity = 0.002) {
        if (this.currentCamera !== this.fpCamera) return;
        
        // Горизонтальный поворот
        this.fpCamera.rotation.y -= deltaX * sensitivity;
        
        // Вертикальный поворот с ограничениями
        this.fpPitch -= deltaY * sensitivity;
        this.fpPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.fpPitch));
        this.fpCamera.rotation.x = this.fpPitch;
        
        this.fpCamera.updateProjectionMatrix();
    }

    /**
     * Обработка колеса мыши для зума
     */
    handleWheel(delta, sensitivity = 0.1) {
        if (this.currentCamera !== this.orthoCamera) return;
        
        this.zoom += delta * sensitivity;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
        
        // Обновляем размеры frustum
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 50 / this.zoom;
        
        this.orthoCamera.left = frustumSize * aspect / -2;
        this.orthoCamera.right = frustumSize * aspect / 2;
        this.orthoCamera.top = frustumSize / 2;
        this.orthoCamera.bottom = frustumSize / -2;
        
        this.orthoCamera.updateProjectionMatrix();
    }

    /**
     * Обработка изменения размера окна
     */
    handleResize() {
        const aspect = window.innerWidth / window.innerHeight;
        
        // Обновляем перспективную камеру
        if (this.fpCamera) {
            this.fpCamera.aspect = aspect;
            this.fpCamera.updateProjectionMatrix();
        }
        
        // Обновляем ортографическую камеру
        if (this.orthoCamera) {
            const frustumSize = 50 / this.zoom;
            this.orthoCamera.left = frustumSize * aspect / -2;
            this.orthoCamera.right = frustumSize * aspect / 2;
            this.orthoCamera.top = frustumSize / 2;
            this.orthoCamera.bottom = frustumSize / -2;
            this.orthoCamera.updateProjectionMatrix();
        }
    }

    /**
     * Получение текущей активной камеры
     */
    getCurrentCamera() {
        return this.currentCamera;
    }

    /**
     * Получение ортографической камеры
     */
    getOrthoCamera() {
        return this.orthoCamera;
    }

    /**
     * Получение камеры от первого лица
     */
    getFirstPersonCamera() {
        return this.fpCamera;
    }

    /**
     * Проверка, активна ли камера от первого лица
     */
    isFirstPersonActive() {
        return this.currentCamera === this.fpCamera;
    }

    /**
     * Очистка ресурсов
     */
    dispose() {
        // Камеры автоматически очищаются при удалении сцены
        this.orthoCamera = null;
        this.fpCamera = null;
        this.currentCamera = null;
    }
}
