import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Менеджер интерьеров
 * Отвечает за загрузку, управление и взаимодействие с интерьерами
 */
export class InteriorManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.loader = new GLTFLoader();
        this.baseChairMesh = this.createBaseChairMesh();
        this.texturePackCache = new Map();
        this.cityPackMaterialCache = new Map();
        
        this.init();
    }

    /**
     * Инициализация менеджера интерьеров
     */
    init() {
        console.log('InteriorManager инициализирован');
    }

    /**
     * Создание базового меша для стула
     */
    createBaseChairMesh() {
        return new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({ visible: false })
        );
    }

    /**
     * Загрузка GLTF модели
     */
    async loadGLTF(url) {
        return new Promise((resolve, reject) => {
            this.loader.load(url, resolve, undefined, reject);
        });
    }

    /**
     * Вход в режим интерьера
     */
    async enterInteriorMode(interiorId, playerPosition) {
        console.log('Вход в интерьер:', interiorId);
        
        // Сохраняем позицию игрока
        if (playerPosition) {
            this.sceneManager.savedPosition = playerPosition.clone();
        }
        
        // Загружаем модель интерьера
        await this.loadInteriorModel(interiorId);
        
        // Создаем группу интерьера
        const interiorGroup = this.sceneManager.createInteriorGroup();
        
        return interiorGroup;
    }

    /**
     * Загрузка модели интерьера
     */
    async loadInteriorModel(interiorId) {
        console.log('Загрузка модели интерьера:', interiorId);
        
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Токен не найден');
        }

        try {
            // Получаем определение интерьера с сервера
            const defRes = await fetch(`/api/interiors/${interiorId}/definition`, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include',
                cache: 'no-cache'
            });

            if (!defRes.ok) {
                throw new Error(`Ошибка ${defRes.status} при загрузке определения интерьера`);
            }

            const { glb, objects } = await defRes.json();
            const baseUrl = window.location.origin;
            const glbUrl = baseUrl + glb;
            
            console.log('Загрузка GLB из:', glbUrl);

            // Проверяем доступность GLB файла
            const headResp = await fetch(glbUrl, { method: 'HEAD', cache: 'no-cache' });
            if (!headResp.ok) {
                throw new Error(`GLB недоступен: HTTP ${headResp.status}`);
            }

            // Загружаем GLTF модель
            const gltf = await this.loadGLTF(glbUrl);
            const scene = this.sceneManager.getScene();

            // Создаем группу для интерьера
            const intGroup = new THREE.Group();
            intGroup.name = 'interiorGroup';
            intGroup.add(gltf.scene);

            // Обрабатываем материалы интерьера
            this.processInteriorMaterials(gltf.scene);

            // Строим коллайдеры интерьера
            this.buildInteriorColliders(gltf.scene);

            // Добавляем объекты интерьера
            await this.addInteriorObjects(objects, intGroup);

            // Добавляем освещение для интерьера
            this.addInteriorLighting(intGroup);

            // Добавляем группу в сцену
            scene.add(intGroup);
            this.sceneManager.interiorGroup = intGroup;

            console.log('Модель интерьера загружена успешно');
            return intGroup;

        } catch (error) {
            console.error('Ошибка загрузки модели интерьера:', error);
            throw error;
        }
    }

    /**
     * Обработка материалов интерьера
     */
    processInteriorMaterials(scene) {
        scene.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material = child.material.map(mat => {
                        if (!mat) return mat;
                        const m = mat.clone();
                        m.transparent = false;
                        m.opacity = 1;
                        m.depthWrite = true;
                        m.needsUpdate = true;
                        return m;
                    });
                } else {
                    child.material = child.material.clone();
                    child.material.transparent = false;
                    child.material.opacity = 1;
                    child.material.depthWrite = true;
                    child.material.needsUpdate = true;
                }
            }
        });
    }

    /**
     * Построение коллайдеров интерьера
     */
    buildInteriorColliders(scene) {
        const colliders = [];
        scene.traverse((child) => {
            if (child.isMesh && child.geometry) {
                colliders.push(child);
            }
        });
        this.sceneManager.interiorColliders = colliders;
    }

    /**
     * Добавление объектов интерьера
     */
    async addInteriorObjects(objects, intGroup) {
        this.sceneManager.interiorInteractables = [];

        for (const obj of objects) {
            if (obj.model_url) {
                try {
                    const objGltf = await this.loadGLTF(window.location.origin + obj.model_url);
                    objGltf.scene.position.set(obj.x, obj.y, obj.z);
                    objGltf.scene.rotation.set(obj.rot_x, obj.rot_y, obj.rot_z);
                    objGltf.scene.scale.set(obj.scale, obj.scale, obj.scale);
                    intGroup.add(objGltf.scene);

                    // Добавляем меши объекта как коллайдеры
                    objGltf.scene.traverse((child) => {
                        if (child.isMesh && child.geometry) {
                            this.sceneManager.interiorColliders.push(child);
                        }
                    });

                    // Обрабатываем NPC
                    if (this.isNPC(obj)) {
                        this.processNPC(obj, objGltf.scene, intGroup);
                    }

                } catch (error) {
                    console.warn('Не удалось загрузить объект интерьера:', obj.model_url, error);
                }
            } else {
                // Создаем плейсхолдер
                const mesh = this.baseChairMesh.clone();
                mesh.position.set(obj.x, obj.y, obj.z);
                mesh.rotation.set(obj.rot_x, obj.rot_y, obj.rot_z);
                mesh.scale.set(obj.scale, obj.scale, obj.scale);
                intGroup.add(mesh);
                mesh.visible = false;
                this.sceneManager.interiorColliders.push(mesh);
            }

            // Обрабатываем интерактивные маркеры
            if (obj.interactable || obj.marker) {
                this.createInteriorMarker(obj, intGroup);
            }

            // Сохраняем позицию внутреннего выхода
            if (obj.exit_int_x !== undefined && obj.exit_int_y !== undefined && obj.exit_int_z !== undefined) {
                this.sceneManager.setInteriorExitPos(new THREE.Vector3(obj.exit_int_x, obj.exit_int_y, obj.exit_int_z));
            }
        }
    }

    /**
     * Проверка, является ли объект NPC
     */
    isNPC(obj) {
        return (obj.type === 'npc') || 
               (typeof obj.model_url === 'string' && obj.model_url.includes('/models/npc/'));
    }

    /**
     * Обработка NPC
     */
    processNPC(obj, scene, intGroup) {
        const npcId = obj.id || this.getNpcIdFromModel(obj.model_url);
        console.log('Обнаружен NPC:', npcId, 'в позиции:', { x: obj.x, y: obj.y, z: obj.z });

        // Создаем хит-зону для NPC
        const hit = new THREE.Mesh(
            new THREE.SphereGeometry(1.2),
            new THREE.MeshBasicMaterial({ 
                color: 0x00ff00, 
                transparent: true, 
                opacity: 0.0001, 
                depthWrite: false 
            })
        );
        hit.position.set(obj.x, (obj.y ?? 0) + 1.0, obj.z);
        hit.userData.interactable = true;
        hit.userData.payload = { type: 'npc', id: npcId };
        hit.visible = true;
        intGroup.add(hit);
        this.sceneManager.interiorInteractables.push(hit);

        // Помечаем корень модели как кликабельный NPC
        try {
            scene.userData = scene.userData || {};
            scene.userData.interactable = true;
            scene.userData.payload = { type: 'npc', id: npcId };
            scene.userData.isNpc = true;
            scene.userData.npcId = npcId;
            this.sceneManager.interiorInteractables.push(scene);
        } catch (error) {
            console.warn('Ошибка при обработке NPC:', error);
        }
    }

    /**
     * Получение ID NPC из пути к модели
     */
    getNpcIdFromModel(url) {
        if (!url || typeof url !== 'string') return null;
        
        const lower = url.toLowerCase();
        if (lower.includes('/models/npc/galina.glb')) return 'Adventurer';
        if (lower.includes('/models/npc/oxranik.glb')) return 'Oxranik';
        if (lower.includes('/models/npc/guard.glb')) return 'guard';
        if (lower.includes('/models/npc/beachcharacter.glb')) return 'BeachCharacter';
        if (lower.includes('/models/npc/bartender.glb')) return 'bartender';
        if (lower.includes('/models/npc/computer.glb')) return 'Computer';
        
        return null;
    }

    /**
     * Создание интерактивного маркера
     */
    createInteriorMarker(obj, intGroup) {
        const hit = new THREE.Mesh(
            new THREE.SphereGeometry(0.6),
            new THREE.MeshBasicMaterial({ 
                color: 0x00ff00, 
                transparent: true, 
                opacity: 0.0001, 
                depthWrite: false 
            })
        );
        hit.position.set(obj.x, obj.y + 1.0, obj.z);
        hit.userData.interactable = true;
        hit.userData.payload = { 
            type: obj.type || 'marker', 
            id: obj.id || null, 
            label: obj.label || 'Интерактив' 
        };
        hit.visible = true;
        
        try {
            if (hit.material) hit.material.visible = false;
        } catch (error) {
            // Игнорируем ошибки
        }
        
        intGroup.add(hit);
        this.sceneManager.interiorInteractables.push(hit);
    }

    /**
     * Добавление освещения для интерьера
     */
    addInteriorLighting(intGroup) {
        const light = new THREE.AmbientLight(0xffffff, 1);
        intGroup.add(light);
    }

    /**
     * Выход из интерьера
     */
    exitInterior(playerPosition, exitPosition) {
        console.log('Выход из интерьера');
        
        // Телепортируем игрока
        if (playerPosition && exitPosition) {
            playerPosition.set(
                exitPosition.x,
                typeof exitPosition.y === 'number' ? exitPosition.y : playerPosition.y,
                exitPosition.z
            );
        }
        
        // Удаляем группу интерьера
        this.sceneManager.removeInteriorGroup();
        
        // Возвращаем видимость мира
        this.sceneManager.toggleWorldVisibility(true);
    }

    /**
     * Очистка ресурсов
     */
    dispose() {
        this.texturePackCache.clear();
        this.cityPackMaterialCache.clear();
    }
}
