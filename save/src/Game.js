import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import PF from 'pathfinding';
import { io } from 'socket.io-client';

function Game({ avatarUrl, gender }) {
  const mountRef = useRef(null);

  useEffect(() => {
    let scene, camera, renderer;
    let player, mixer;
    let idleAction, walkAction, currentAction;
    let remotePlayers = {};
    let obstacles = [];
    let destination = null;
    const moveSpeed = 0.15;
    const clock = new THREE.Clock();
    const keys = {};

    const territorySize = 500; // размер территории
    const boundary = territorySize / 2;
    const gridSize = 300;
    const nodeSize = territorySize / gridSize;

    let pathfinderGrid;
    let currentPath = [];
    let pathIndex = 0;
    let groundPlane;
    let destinationMarker;

    // Инициализируем Socket.IO (адрес сервера – тот же домен)
    const socket = io();

    const gltfLoader = new GLTFLoader();
    const animLoader = new GLTFLoader();

    async function init() {
      // Создаем сцену
      scene = new THREE.Scene();

      // Создаем ортографическую камеру
      const aspect = window.innerWidth / window.innerHeight;
      const d = 200;
      camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
      camera.position.set(200, 200, 200);
      camera.lookAt(scene.position);

      // Рендерер
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      mountRef.current.appendChild(renderer.domElement);

      // Основная плоскость (земля)
      const planeGeometry = new THREE.PlaneGeometry(territorySize, territorySize);
      const planeMaterial = new THREE.MeshLambertMaterial({ color: 0x00aa00, side: THREE.DoubleSide });
      groundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
      groundPlane.rotation.x = -Math.PI / 2;
      scene.add(groundPlane);

      // Сетка
      /*const gridHelper = new THREE.GridHelper(territorySize, gridSize, 0xffffff, 0x888888);
      scene.add(gridHelper);*/

      // Освещение
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(50, 100, 50);
      scene.add(directionalLight);

      // Маркер точки назначения
      const markerGeometry = new THREE.SphereGeometry(0.5, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      destinationMarker = new THREE.Mesh(markerGeometry, markerMaterial);
      destinationMarker.visible = false;
      scene.add(destinationMarker);

      // Загрузка текстур
      const loadingManager = new THREE.LoadingManager(() => {
        console.log("Все текстуры загружены");
      });
      const textureLoader = new THREE.TextureLoader(loadingManager);
      const baseTexture = textureLoader.load('textures/base.png');
      // Дополнительные текстуры можно использовать по необходимости
      const customMaterial = new THREE.MeshStandardMaterial({
        map: baseTexture,
      });

      async function loadPlayerModel(avatarUrl) {
        return new Promise((resolve, reject) => {
          gltfLoader.load(avatarUrl, (gltf) => {
            if (!gltf.scene) return reject('GLTF.scene отсутствует');
            resolve(gltf);
          }, undefined, (err) => reject(err));
        });
      }
      

      // Массив моделей
      const modelsToLoad = [
        { name: 'Burger', path: 'models/copied/building-burger-joint.glb', position: new THREE.Vector3(25, 0, 50) },
        { name: 'HouseSmall', path: 'models/copied/building-house-family-small.glb', position: new THREE.Vector3(25, 0, 0) },
        { name: 'HouseOld', path: 'models/copied/building-house-block-old.glb', position: new THREE.Vector3(25, 0, 25) },
        { name: 'HouseModernBig2', path: 'models/copied/building-house-modern-big.glb', position: new THREE.Vector3(50, 0, 25) },
        { name: 'HouseSmall', path: 'models/copied/building-house-family-small.glb', position: new THREE.Vector3(70, 0, 25) },
        { name: 'HouseModernBig', path: 'models/copied/building-house-modern-big.glb', position: new THREE.Vector3(10, 0, 25) },
      ];

      let loadedModelsCount = 0;
      const totalModelsToLoad = modelsToLoad.length;

      modelsToLoad.forEach(modelData => {
        gltfLoader.load(
          modelData.path,
          (gltf) => {
            const model = gltf.scene;
            model.scale.set(1, 1, 1);
            model.position.copy(modelData.position);
            model.traverse(child => {
              if (child.isMesh) {
                child.material = customMaterial.clone();
                child.material.needsUpdate = true;
              }
            });
            scene.add(model);
            model.updateMatrixWorld();
            const boundingBox = new THREE.Box3().setFromObject(model);
            obstacles.push({ mesh: model, box: boundingBox });

            loadedModelsCount++;
            if (loadedModelsCount === totalModelsToLoad) {
              console.log("Все модели загружены. Строим сетку...");
              buildPathfindingGrid();
            }
          },
          undefined,
          (error) => {
            console.error(`Ошибка загрузки модели ${modelData.name}:`, error);
          }
        );
      });

      // Обработчики клавиатуры
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      // Обработчик клика по canvas
      renderer.domElement.addEventListener('pointerdown', onDocumentMouseDown);

      // Загрузка модели игрока
      try {
        const gltf = await loadPlayerModel(avatarUrl);
        player = gltf.scene;
        scene.add(player);
        player.scale.set(1, 1, 1);
        player.position.set(0, 0, 0);
      
        mixer = new THREE.AnimationMixer(player);

        const isFemale = gender === 'female';
        const animGender = isFemale ? 'feminine' : 'masculine';

        // теперь animGender доступен
        const idlePath = `/animations/${animGender}/glb/idle/${
          isFemale
            ? 'F_Standing_Idle_001.glb'
            : 'M_Standing_Idle_001.glb'
        }`;
        const walkPath = `/animations/${animGender}/glb/locomotion/${
          isFemale
            ? 'F_Walk_002.glb'
            : 'M_Walk_001.glb'
        }`;

        const [idleGltf, walkGltf] = await Promise.all([
          animLoader.loadAsync(idlePath),
          animLoader.loadAsync(walkPath)
        ]);


        console.log('Idle GLB анимации:', idleGltf.animations);
        console.log('Walk GLB анимации:', walkGltf.animations);

        idleAction = mixer.clipAction(idleGltf.animations[0], player);
        walkAction = mixer.clipAction(walkGltf.animations[0], player);

        // сразу запускаем idle
        idleAction.play();
        currentAction = idleAction;
          
        updateCameraFollow();
      
        // ✅ только теперь можно отправить на сервер:
        socket.emit('newPlayer', {
          x: player.position.x,
          z: player.position.z,
          avatarURL: avatarUrl
        });
      
      } catch (err) {
        console.error("Ошибка загрузки модели игрока:", err);
      }
           

      // Socket.IO события
      socket.on('playerMoved', (data) => {
        const remote = remotePlayers[data.playerId];
        if (remote) {
          const newPos = new THREE.Vector3(data.x, 0, data.z);
          const dir = new THREE.Vector3().subVectors(newPos, remote.model.position);
          const angle = Math.atan2(dir.x, dir.z);
          remote.model.rotation.y = angle;
          remote.model.position.copy(newPos);
        }
      });

      socket.emit('newPlayer', {
        x: player.position.x,
        z: player.position.z,
        avatarURL: avatarUrl
      });
      

      socket.on('newPlayer', (data) => {
        addOtherPlayer(data.playerId, data.x, data.z, data.avatarURL);
      });

      socket.on('playerDisconnected', (id) => {
        if (remotePlayers[id]) {
          scene.remove(remotePlayers[id].model);
          delete remotePlayers[id];
        }
      });
    }

    function buildPathfindingGrid() {
      pathfinderGrid = new PF.Grid(gridSize, gridSize);
      obstacles.forEach(o => {
        const box = new THREE.Box3().setFromObject(o.mesh);
        const minX = Math.floor((box.min.x + boundary) / nodeSize);
        const maxX = Math.floor((box.max.x + boundary) / nodeSize);
        const minZ = Math.floor((box.min.z + boundary) / nodeSize);
        const maxZ = Math.floor((box.max.z + boundary) / nodeSize);
        for (let x = minX; x <= maxX; x++) {
          for (let z = minZ; z <= maxZ; z++) {
            if (x >= 0 && x < gridSize && z >= 0 && z < gridSize) {
              pathfinderGrid.setWalkableAt(x, z, false);
              /*
              const block = new THREE.Mesh(
                new THREE.PlaneGeometry(nodeSize, nodeSize),
                new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide, opacity: 0.4, transparent: true })
              );
              block.rotation.x = -Math.PI / 2;
              block.position.set(
                x * nodeSize - boundary + nodeSize / 2,
                0.1,
                z * nodeSize - boundary + nodeSize / 2
              );
              scene.add(block);*/
            }
          }
        }
      });
    }

    function onDocumentMouseDown(event) {
      if (!player) return;
      event.preventDefault();
    
      // 1) Вычисляем координаты клика по плоскости:
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(groundPlane);
      if (intersects.length === 0) {
        console.log("Клик не попал по плоскости");
        return;
      }
    
      // 2) Точка назначения в мировых координатах
      destination = intersects[0].point.clone();
      destination.y = player.position.y;
    
      // 3) Преобразуем в индексы сетки
      const startX = Math.floor((player.position.x + boundary) / nodeSize);
      const startZ = Math.floor((player.position.z + boundary) / nodeSize);
      const endX   = Math.floor((destination.x + boundary) / nodeSize);
      const endZ   = Math.floor((destination.z + boundary) / nodeSize);
    
      // 4) Настраиваем A* (с диагоналями) и клонируем grid
      const finder = new PF.AStarFinder({
        allowDiagonal: true,
        dontCrossCorners: true,
        diagonalMovement: PF.DiagonalMovement.OnlyWhenNoObstacles
      });
      const gridClone = pathfinderGrid.clone();
    
      // 5) Строим «сырой» путь
      const rawPath = finder.findPath(startX, startZ, endX, endZ, gridClone);
      if (rawPath.length === 0) {
        console.log("Путь не найден");
        return;
      }
    
      // 6) Сглаживаем
      const smoothPath = PF.Util.smoothenPath(gridClone, rawPath);
    
      // 7) Переводим путь в THREE.Vector3
      currentPath = smoothPath.map(([x, z]) =>
        new THREE.Vector3(
          x * nodeSize - boundary + nodeSize / 2,
          player.position.y,
          z * nodeSize - boundary + nodeSize / 2
        )
      );
      pathIndex = 0;
    
      // 8) Показываем маркер и лог
      destinationMarker.position.copy(destination);
      destinationMarker.visible = true;
      console.log("Новая цель:", destination, "точек в пути:", currentPath.length);
    }
    

    function onKeyDown(event) {
      keys[event.key] = true;
      destination = null;
      destinationMarker.visible = false;
    }

    function onKeyUp(event) {
      keys[event.key] = false;
    }

    function createPlayerLabel(text) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 64;
      ctx.fillStyle = 'white';
      ctx.font = '28px Arial';
      ctx.fillText(text, 10, 40);
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(5, 1.25, 1);
      return sprite;
    }

    async function addOtherPlayer(id, x, z, avatarURL) {
      try {
        const gltf = await loadPlayerModel(avatarURL);
        gltf.scene.scale.set(1, 1, 1);
        gltf.scene.position.set(x, 0, z);
        scene.add(gltf.scene);
        remotePlayers[id] = { model: gltf.scene };
      } catch (err) {
        console.error("Ошибка загрузки модели:", err);
      }
    }

    function switchAnimation(newAction) {
      if (!newAction || !currentAction || newAction === currentAction) return;
    
      currentAction.fadeOut(0.2);
      newAction.reset().fadeIn(0.2).play();
      currentAction = newAction;
    }
    
    function canMove(newPosition) {
      const halfSize = 1;
      const playerMin = new THREE.Vector2(newPosition.x - halfSize, newPosition.z - halfSize);
      const playerMax = new THREE.Vector2(newPosition.x + halfSize, newPosition.z + halfSize);

      for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].mesh.updateMatrixWorld();
        const box = new THREE.Box3().setFromObject(obstacles[i].mesh);
        const obstacleMin = new THREE.Vector2(box.min.x, box.min.z);
        const obstacleMax = new THREE.Vector2(box.max.x, box.max.z);
        if ((playerMin.x <= obstacleMax.x && playerMax.x >= obstacleMin.x) &&
            (playerMin.y <= obstacleMax.y && playerMax.y >= obstacleMin.y)) {
          return false;
        }
      }
      return true;
    }

    function updateDestinationMovement(delta) {
      if (!player || currentPath.length === 0) return;
    
      const target = currentPath[pathIndex];
      const direction = new THREE.Vector3().subVectors(target, player.position);
      direction.y = 0;
      const distance = direction.length();
    
      // Достигли текущей точки?
      if (distance < moveSpeed) {
        pathIndex++;
        if (pathIndex >= currentPath.length) {
          // Конец маршрута
          currentPath = [];
          destination = null;
          // Переходим в idle
          if (currentAction !== idleAction) {
            currentAction.fadeOut(0.2);
            idleAction.reset().fadeIn(0.2).play();
            currentAction = idleAction;
          }
        }
        return;
      }
    
      // Идём к следующей точке
      direction.normalize();
      const step = direction.clone().multiplyScalar(moveSpeed);
      const newPosition = player.position.clone().add(step);
    
      if (canMove(newPosition)) {
        // Обновляем позицию и ориентацию
        player.position.copy(newPosition);
        const angle = Math.atan2(direction.x, direction.z);
        //player.rotation.y = angle;
        const targetQuat = new THREE.Quaternion()
          .setFromEuler(new THREE.Euler(0, angle, 0));
        // фактор 5 можно регулировать — чем больше, тем быстрее поворот
        player.quaternion.slerp(targetQuat, Math.min(1, 5 * delta));
        socket.emit('playerMovement', { x: player.position.x, z: player.position.z });
    
        // Переходим в анимацию ходьбы
        if (currentAction !== walkAction) {
          currentAction.fadeOut(0.2);
          walkAction.reset().fadeIn(0.2).play();
          currentAction = walkAction;
        }
      } else {
        // Движение заблокировано — сбрасываем всё в idle
        console.warn('Движение прервано препятствием.');
        currentPath = [];
        destination = null;
        if (currentAction !== idleAction) {
          currentAction.fadeOut(0.2);
          idleAction.reset().fadeIn(0.2).play();
          currentAction = idleAction;
        }
      }
    }
    

    function updateTransparency() {
      if (!player) return;
      // Сбрасываем прозрачность объектов
      obstacles.forEach(obstacle => {
        obstacle.mesh.traverse(child => {
          if (child.isMesh && child.material) {
            child.material.transparent = false;
            child.material.opacity = 1.0;
            child.material.depthWrite = true;
            child.material.needsUpdate = true;
          }
        });
      });
      // Луч от камеры к игроку
      const direction = new THREE.Vector3().subVectors(player.position, camera.position).normalize();
      const raycaster = new THREE.Raycaster(camera.position, direction);
      const camToPlayerDist = camera.position.distanceTo(player.position);
      const intersects = raycaster.intersectObjects(obstacles.map(ob => ob.mesh), true);
      intersects.forEach(hit => {
        if (hit.object === player) return;
        if (hit.distance < camToPlayerDist) {
          if (hit.object.parent === scene) {
            if (hit.object.isMesh && hit.object.material) {
              hit.object.material.transparent = true;
              hit.object.material.opacity = 0.3;
              hit.object.material.depthWrite = false;
              hit.object.material.needsUpdate = true;
            }
          } else {
            hit.object.parent.traverse(child => {
              if (child.isMesh && child.material) {
                child.material.transparent = true;
                child.material.opacity = 0.3;
                child.material.depthWrite = false;
                child.material.needsUpdate = true;
              }
            });
          }
        }
      });
    }

    function updateCameraFollow() {
      if (!player) return;
      const targetPosition = player.position.clone();
      const offset = new THREE.Vector3(-200, 150, -200);
      camera.position.copy(targetPosition.clone().add(offset));
      camera.zoom = 25;
      camera.updateProjectionMatrix();
      camera.lookAt(targetPosition);
    }

    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      updateDestinationMovement(delta);
      if (mixer) mixer.update(delta);
      updateTransparency();
      updateCameraFollow();
      for (let id in remotePlayers) {
        remotePlayers[id].mixer.update(delta);
      }
      renderer.render(scene, camera);
    }

    // Инициализация и запуск анимации
    (async () => {
      await init();
      animate();
    })();
    
    //animate();

    function onWindowResize() {
      const aspect = window.innerWidth / window.innerHeight;
      camera.left = -200 * aspect;
      camera.right = 200 * aspect;
      camera.top = 200;
      camera.bottom = -200;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onWindowResize, false);

    // Очистка при размонтировании компонента
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('pointerdown', onDocumentMouseDown);
      window.removeEventListener('resize', onWindowResize);
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
}

export default Game;
