import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import PF from 'pathfinding';
import { io } from 'socket.io-client';

function Game({ avatarUrl, gender }) {
  const mountRef = useRef(null);
  const socketRef = useRef(null);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerStats, setPlayerStats]       = useState(null);

  const statsRef = useRef(null);

  async function viewStats() {
    if (!selectedPlayer) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/players/${selectedPlayer.socketId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      console.error('Ошибка при загрузке статистики');
      return;
    }
    const data = await res.json();
    setPlayerStats(data);
  }

  useEffect(() => {

    const mount = mountRef.current;
    if (!mount) return;
    
    console.log('–– useEffect начало');   


    const baseOffset = new THREE.Vector3(-200, 150, -200);
    // вычленим полярный (угол подъёма) и азимутальный (горизонтальный) углы:
    const planarDist = Math.hypot(baseOffset.x, baseOffset.z);
    const radius      = Math.hypot(planarDist, baseOffset.y);
    const baseAzimuth = Math.atan2(baseOffset.z, baseOffset.x);      // угол в XY-плоскости
    const basePolar   = Math.atan2(baseOffset.y, planarDist);       // угол подъёма

    let cameraPitchOffset = 0;                       // смещение полярного угла
    const maxPitch        = THREE.MathUtils.degToRad(10); // ±10°

    let zoom = 25;           // базовый зум
    const minZoom = zoom * 0.5;
    const maxZoom = zoom * 1.5;


    let scene, camera, renderer;
    let player, mixer;
    let idleAction, walkAction, currentAction;
    let remotePlayers = {};
    let obstacles = [];
    let destination = null;
    //const moveSpeed = 0.15;
    const moveSpeed = 5;
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
    const token = localStorage.getItem('token');
    //socketRef.current = io(`localhost:4000`, {
      socketRef.current = io(`37.27.238.225:4000`, {
      auth: { token }
    });
    /*socketRef.current = io(`37.27.238.225:4000`);*/
    //socketRef.current = io(`localhost:4000`);
    const socket = socketRef.current;
    
    console.log('socket инстанс:', socket);
    //socket.connect();
    socket.on('connect', () => console.log('✔ Socket connected, id=', socket.id));
    socket.on('connect_error', err => console.error('Socket connect_error:', err));
    socket.on('disconnect', reason => console.warn('Socket disconnected:', reason));
    const gltfLoader = new GLTFLoader();
    const animLoader = new GLTFLoader();


    async function loadPlayerModel(avatarUrl) {
      return new Promise((resolve, reject) => {
        gltfLoader.load(avatarUrl, (gltf) => {
          if (!gltf.scene) return reject('GLTF.scene отсутствует');
          resolve(gltf);
        }, undefined, (err) => reject(err));
      });
    }
  

    async function addOtherPlayer(id, x, z, avatarURL, genderRemote = 'male', firstName = '', lastName = '') {
      let model;
      try {
        if (!avatarURL) throw new Error('no avatarURL');
        const gltf = await loadPlayerModel(avatarURL);
        model = gltf.scene;
      } catch (e) {
        console.warn(`Не удалось загрузить аватар ${id}, рисуем сферу`, e);
        model = new THREE.Mesh(
          new THREE.SphereGeometry(1),
          new THREE.MeshBasicMaterial({ color: 0x888888 })
        );
      }
      model.scale.set(1,1,1);
      model.position.set(x, 0, z);
      scene.add(model);

      // создаём надпись над чужим игроком
      const fullname = `${firstName} ${lastName}`.trim();
      if (fullname) {
        const label = createPlayerLabel(fullname);
        label.position.set(0, 2.2, 0);
        model.add(label);
      }
    
      const mixerRemote = new THREE.AnimationMixer(model);

      const isFemale = genderRemote === 'female';
      const animGender = isFemale ? 'feminine' : 'masculine';

      const idleFile = isFemale
        ? 'F_Standing_Idle_001.glb'
        : 'M_Standing_Idle_001.glb';
      const walkFile = isFemale
        ? 'F_Walk_002.glb'
        : 'M_Walk_001.glb';

      const idlePath = `/animations/${animGender}/glb/idle/${idleFile}`;
      const walkPath = `/animations/${animGender}/glb/locomotion/${walkFile}`;

      const [idleGltf, walkGltf] = await Promise.all([
        animLoader.loadAsync(idlePath),
        animLoader.loadAsync(walkPath)
      ]);

      idleGltf.animations.forEach(stripPositionTracks);
      walkGltf.animations.forEach(stripPositionTracks);

      // создаём действия
      const remoteIdleAction  = mixerRemote.clipAction(idleGltf.animations[0], model);
      const remoteWalkAction  = mixerRemote.clipAction(walkGltf.animations[0], model);

      remoteIdleAction.play();

      remotePlayers[id] = {
        model, 
        mixer: mixerRemote,
        idleAction: remoteIdleAction,
        walkAction: remoteWalkAction,
        currentAction: remoteIdleAction,
        firstName, lastName, gender: genderRemote, avatarURL,
        _idleTimeout: null
      };

      remotePlayers[id].walkAction.setEffectiveTimeScale(0.6);
    }

    //Подгружаем других игроков
    socket.on('connect', () => console.log('Socket connected, id=', socket.id));
    socket.on('currentPlayers', (players) => {
      console.log('currentPlayers', players);
      Object.keys(players).forEach(id => {
        if (id === socket.id) return; // пропускаем себя
        const { x, z, avatarURL, gender, firstName, lastName } = players[id]; 
        addOtherPlayer(id, x, z, avatarURL, gender, firstName, lastName);
      });
    });

    socket.on('chatMessage', ({ playerId, name, message, position }) => {
      console.log('← chatMessage получил:', message);
      if (!player || !camera || !scene || !obstacles) return;

      // 1. Точка, откуда исходит луч (глаза игрока или камера)
      const origin = camera.position.clone();

      // 2. Точка, в которую направляем (позиция отправителя)
      const targetPos = new THREE.Vector3(position.x, player.position.y, position.z);

      // 3. Направление луча
      const direction = new THREE.Vector3().subVectors(targetPos, origin).normalize();

      // 4. Создаём луч
      const raycaster = new THREE.Raycaster(origin, direction);

      // 5. Массив мешей, которые могут загораживать обзор
      const obstacleMeshes = obstacles.map(o => o.mesh); // если obstacles — массив объектов

      // 6. Проверка на пересечение
      const intersects = raycaster.intersectObjects(obstacleMeshes, true);
      const distanceToTarget = origin.distanceTo(targetPos);

      if (intersects.length > 0 && intersects[0].distance < distanceToTarget) {
          console.log(`🔕 ${name} за препятствием — сообщение скрыто`);
          return;
      }

      // 7. Если нет препятствий — выводим сообщение
      const div = document.getElementById('chatMessages');
      if (!div) return;

      const p = document.createElement('p');
      p.textContent = `${name || 'Игрок'}: ${message}`;
      p.style.color = 'white';
      p.style.padding = '5px';
      p.style.margin = '2px 0';
      p.style.fontSize = '14px';
      p.style.borderRadius = '10px';
      div.appendChild(p);
      div.scrollTop = div.scrollHeight;
  });


    // Socket.IO события
    socket.on('playerMoved', (data) => {
      const remote = remotePlayers[data.playerId];
      if (!remote) return;
    
      // 1) Новая позиция
      const newPos = new THREE.Vector3(data.x, 0, data.z);
    
      // 2) Вычисляем вектор движения и угол
      const dir = new THREE.Vector3().subVectors(newPos, remote.model.position);
      // если длина слишком маленькая — не поворачиваем
      if (dir.lengthSq() > 1e-4) {
        // atan2(x, z) даёт угол вокруг Y
        const angle = Math.atan2(dir.x, dir.z);
    
        // 3) Создаём кватернион для этого угла
        const targetQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, angle, 0)
        );
    
        // 4) Плавно вращаем модель к нужному направлению
        remote.model.quaternion.slerp(targetQuat, 0.2);
      }
    
      // 5) Перемещаем модель
      remote.targetPosition = newPos.clone();
    
      // 6) Анимация: если ещё не в фазе ходьбы — переключаем
      if (remote.currentAction !== remote.walkAction) {
        remote.currentAction.fadeOut(0.2);
        remote.walkAction.reset().fadeIn(0.2).play();
        remote.currentAction = remote.walkAction;
      }
      
      // 7) Отмена в idle через 500 мс после последнего движения
      clearTimeout(remote._idleTimeout);
      remote._idleTimeout = setTimeout(() => {
        if (remote.currentAction !== remote.idleAction) {
          remote.currentAction.fadeOut(0.2);
          remote.idleAction.reset().fadeIn(0.2).play();
          remote.currentAction = remote.idleAction;
        }
      }, 500);
    });    
    

    socket.on('newPlayer', (data) => {
      console.log('newPlayer', data);
      const { playerId, x, z, avatarURL, gender, firstName, lastName } = data;
      addOtherPlayer(playerId, x, z, avatarURL, gender, firstName, lastName);
    });

    socket.on('playerDisconnected', (id) => {
      if (remotePlayers[id]) {
        scene.remove(remotePlayers[id].model);
        delete remotePlayers[id];
      }
    });

    function onMouseWheel(e) {
      e.preventDefault();
      const delta = -e.deltaY * 0.001; // нормируем
    
      if (e.ctrlKey) {
        // при зажатом Ctrl — меняем наклон
        cameraPitchOffset = THREE.MathUtils.clamp(
          cameraPitchOffset + delta,
          -maxPitch,
          maxPitch
        );
      } else {
        // без Ctrl — зум
        zoom = THREE.MathUtils.clamp(zoom * (1 + delta), minZoom, maxZoom);
        camera.zoom = zoom;
        camera.updateProjectionMatrix();
      }
    }

    async function init() {
      // Создаем сцену
      scene = new THREE.Scene();

      // Создаем ортографическую камеру
      const aspect = window.innerWidth / window.innerHeight;
      const d = 200;
      camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
      camera.position.set(200, 200, 200);

      camera.zoom = zoom;
      camera.updateProjectionMatrix();

      camera.lookAt(scene.position);

      // Рендерер
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      mountRef.current.appendChild(renderer.domElement);

      renderer.domElement.addEventListener('wheel', onMouseWheel, { passive: false });

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

      //socket.connect();

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
      

      // Массив моделей
      const modelsToLoad = [
        { name: 'Burger', path: 'models/copied/building-burger-joint.glb', position: new THREE.Vector3(25, 0, 50) },
        { name: 'HouseSmall', path: 'models/copied/building-house-family-small.glb', position: new THREE.Vector3(25, 0, 0) },
        { name: 'HouseOld', path: 'models/copied/building-house-block-old.glb', position: new THREE.Vector3(25, 0, 25) },
        { name: 'HouseModernBig2', path: 'models/copied/building-house-modern-big.glb', position: new THREE.Vector3(50, 0, 25) },
        { name: 'HouseModernBig2', path: 'models/copied/building-hotel.glb', position: new THREE.Vector3(100, 0, 25) },
        { name: 'HouseModernBig2', path: 'models/copied/building-cinema.glb', position: new THREE.Vector3(150, 0, 25) },
        { name: 'HouseModernBig2', path: 'models/copied/building-mall.glb', position: new THREE.Vector3(250, 0, 25) },
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
            model.userData = {
              type: modelData.name,
              rent:    modelData.rent    ?? 'не указано',
              tax:     modelData.tax     ?? 'не указано'
            };
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

        // 1) Подтягиваем из sessionStorage профиль пользователя
        const profile = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
        const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();

        mountRef.current = myName;

        // 2) Создаём и прикрепляем надпись над головой
        const nameLabel = createPlayerLabel(myName);
        // смещаем спрайт чуть вверх
        nameLabel.position.set(0, 2.2, 0);
        player.add(nameLabel);
      
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

        idleGltf.animations.forEach(stripPositionTracks);
        walkGltf.animations.forEach(stripPositionTracks);

        console.log('Idle GLB анимации:', idleGltf.animations);
        console.log('Walk GLB анимации:', walkGltf.animations);

        idleAction = mixer.clipAction(idleGltf.animations[0], player);
        walkAction = mixer.clipAction(walkGltf.animations[0], player);

        // сразу запускаем idle
        idleAction.play();
        currentAction = idleAction;
          
        updateCameraFollow();
      
        // ✅ только теперь можно отправить на сервер:
        socketRef.current?.emit('newPlayer', {
          x: player.position.x,
          z: player.position.z,
          avatarURL: avatarUrl,
          // передаём своё имя, чтобы другие могли отрисовать label
          firstName: profile.firstName,
          lastName:  profile.lastName,
          userId:     profile.id
        });
      
      } catch (err) {
        console.error("Ошибка загрузки модели игрока:", err);
      }
    }


    // Функция-утилита: убирает из AnimationClip все треки ".position"
    function stripPositionTracks(clip) {
      clip.tracks = clip.tracks.filter(track => !track.name.endsWith('.position'));
      return clip;
    }


    function computePath(fromVec3, toVec3) {
      // конвертация мировых координат в индексы сетки
      const startX = Math.floor((fromVec3.x + boundary) / nodeSize);
      const startZ = Math.floor((fromVec3.z + boundary) / nodeSize);
      const endX   = Math.floor((toVec3.x   + boundary) / nodeSize);
      const endZ   = Math.floor((toVec3.z   + boundary) / nodeSize);
    
      const finder = new PF.AStarFinder({
        allowDiagonal: true,
        dontCrossCorners: true,
        diagonalMovement: PF.DiagonalMovement.OnlyWhenNoObstacles
      });
      const gridClone = pathfinderGrid.clone();

      // «Вытаскивать» игрока из "стены":
      if (!gridClone.isWalkableAt(startX, startZ)) {
        gridClone.setWalkableAt(startX, startZ, true);
      }

      if (!gridClone.isWalkableAt(endX, endZ)) {
        gridClone.setWalkableAt(endX, endZ, true);
      }

      const rawPath = finder.findPath(startX, startZ, endX, endZ, gridClone);
      if (!rawPath.length) return [];
    
      const smooth = PF.Util.smoothenPath(gridClone, rawPath);
      return smooth.map(([x,z])=> new THREE.Vector3(
        x * nodeSize - boundary + nodeSize/2,
        fromVec3.y,
        z * nodeSize - boundary + nodeSize/2
      ));
    }

    function buildPathfindingGrid() {
      pathfinderGrid = new PF.Grid(gridSize, gridSize);
    
      obstacles.forEach(o => {
        const box = new THREE.Box3().setFromObject(o.mesh);
    
        // конвертация в индексы…
        let minX = Math.floor((box.min.x + boundary) / nodeSize);
        let maxX = Math.floor((box.max.x + boundary) / nodeSize);
        let minZ = Math.floor((box.min.z + boundary) / nodeSize);
        let maxZ = Math.floor((box.max.z + boundary) / nodeSize);
    
        // ** КЛАМПИМ **  
        minX = Math.max(0, Math.min(gridSize-1, minX));
        maxX = Math.max(0, Math.min(gridSize-1, maxX));
        minZ = Math.max(0, Math.min(gridSize-1, minZ));
        maxZ = Math.max(0, Math.min(gridSize-1, maxZ));
    
        for (let x = minX; x <= maxX; x++) {
          for (let z = minZ; z <= maxZ; z++) {
            pathfinderGrid.setWalkableAt(x, z, false);
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

      const houseIntersects = raycaster.intersectObjects(
        obstacles.map(o=>o.mesh), true
      );
      if (houseIntersects.length) {
        const mesh = houseIntersects[0].object;          // конкретная “часть” меша
        const root = mesh.parent;                        // сам root-меш
        const { type, rent, tax } = root.userData;
        setSelectedHouse({ type, rent, tax });
        return;  // дальше движение не обрабатываем
      }
    
      // 2) Если ничего из домов не попало — сбрасываем панель:
      setSelectedHouse(null);

      const remoteModels = Object.values(remotePlayers).map(r => r.model);
      const playerIntersects = raycaster.intersectObjects(remoteModels, true);
      if (playerIntersects.length) {
        // нашли какую‑то ту часть модели
        let mesh = playerIntersects[0].object;
        // поднимаемся вверх до корня модели
        while (mesh && !remoteModels.includes(mesh)) mesh = mesh.parent;
        // находим id игрока
        const entry = Object.entries(remotePlayers).find(([, r]) => r.model === mesh);
        if (entry) {
          const [id, r] = entry;
          setSelectedPlayer({ socketId: id, firstName: r.firstName, lastName: r.lastName });
          setPlayerStats(null);
          return; // дальше ничего не делаем
        }
      }


      const intersects = raycaster.intersectObject(groundPlane);
      if (intersects.length === 0) {
        console.log("Клик не попал по плоскости");
        return;
      }
    
      // 2) Точка назначения в мировых координатах
      destination = intersects[0].point.clone();
      destination.y = player.position.y;

      /*currentPath = computePath(player.position, destination);
      pathIndex = 0;*/

      const newPath = computePath(player.position, destination);
      if (newPath.length === 0) {
        console.warn("Путь не найден");
        return;
      }
      currentPath = newPath;
      pathIndex = 0;


      console.log('computed path length:', currentPath.length);

      if (destinationMarker) {
        destinationMarker.position.copy(destination);
        destinationMarker.visible = true;
      }
      /*
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
      pathIndex = 0;*/
    
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
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
    
      // настройки шрифта и стилей
      const fontSize = 15;
      ctx.fillStyle = 'white';
      ctx.font = `${fontSize}px Arial`;
    
      // центрируем текст
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    
      // рисуем его в середине канваса
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
    
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
    
      // подбираем масштаб так, чтобы спрайт был небольшим
      sprite.scale.set(3, 0.75, 1);
    
      return sprite;
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
      if (!player || currentPath.length === 0 || pathIndex >= currentPath.length) return;
    
      const target = currentPath[pathIndex];
      const direction = new THREE.Vector3().subVectors(target, player.position);
      direction.y = 0;
      const distance = direction.length();
    
      // Достигли текущей точки?
      const stepDistance = moveSpeed * delta;
      if (distance < stepDistance) {
        player.position.copy(target);
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
      // вычисляем единичный вектор к цели и свой новый позиционный вектор
      const step = direction.multiplyScalar(stepDistance);
      const nextPos = player.position.clone().add(step);
    
      if (canMove(nextPos)) {
        // Обновляем позицию и ориентацию
        player.position.add(step);
        const angle = Math.atan2(direction.x, direction.z);
        //player.rotation.y = angle;

        /*let currentYaw = 0;
        currentYaw = player.rotation.y;
        const desiredYaw = Math.atan2(direction.x, direction.z);
        let yawDiff = desiredYaw - currentYaw;
        yawDiff = ((yawDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
        const turnSpeed = 5;             // рад/с — регулируйте под себя
        const maxTurn = turnSpeed * delta;
        if (Math.abs(yawDiff) > maxTurn) {
          currentYaw += Math.sign(yawDiff) * maxTurn;
        } else {
          currentYaw = desiredYaw;
        }
        player.rotation.y = currentYaw;*/


        const targetQuat = new THREE.Quaternion()
          .setFromEuler(new THREE.Euler(0, angle, 0));
        // фактор 5 можно регулировать — чем больше, тем быстрее поворот
        player.quaternion.slerp(targetQuat, Math.min(1, 10 * delta));
        socketRef.current?.emit('playerMovement', { x: player.position.x, z: player.position.z });
    
        // Переходим в анимацию ходьбы
        if (currentAction !== walkAction) {
          currentAction.fadeOut(0.2);
          walkAction.reset().fadeIn(0.2).play();
          currentAction = walkAction;
        }
      } else {
        /*
        console.log('hit obstacle, пересчитываем путь');
        if (destination) {
          const newPath = computePath(player.position, destination);
          if (newPath.length) {
            currentPath = newPath;
            pathIndex = 0;
            if (currentAction !== walkAction) {
              currentAction.fadeOut(0.2);
              walkAction.reset().fadeIn(0.2).play();
              currentAction = walkAction;
            }
            return;
          }
          */
        console.warn('hit obstacle, пропускаем узел');

        
        if (currentAction !== idleAction) {
          console.log('Не удалось найти путь, стою');
          currentAction.fadeOut(0.2);
          idleAction.reset().fadeIn(0.2).play();
          currentAction = idleAction;
        }
        // просто шагаем к следующей точке маршрута
        pathIndex++;
        return;
      }
    }
    

    function updateTransparency() {
      if (!player) return
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
    
      const target = player.position.clone();
    
      // полярный угол с учётом смещения
      const polar = basePolar + cameraPitchOffset;
    
      // новая горизонтальная дистанция
      const planar = radius * Math.cos(polar);
      // новая высота
      const yOff   = radius * Math.sin(polar);
    
      // вектор в горизонтальной плоскости по азимуту
      const xOff = planar * Math.cos(baseAzimuth);
      const zOff = planar * Math.sin(baseAzimuth);
    
      camera.position.set(
        target.x + xOff,
        target.y + yOff,
        target.z + zOff
      );
    
      camera.lookAt(target);
    }
    

    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      updateDestinationMovement(delta);
      if (mixer) mixer.update(delta);
      updateTransparency();
      updateCameraFollow();
      /*for (let id in remotePlayers) {
        remotePlayers[id].mixer.update(delta);
      }*/
      for (let id in remotePlayers) {
        const r = remotePlayers[id];
        // плавно смещаемся к цели:
        if (r.targetPosition) {
          r.model.position.lerp(r.targetPosition, 0.1);
        }
        r.mixer.update(delta);
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
      renderer.domElement.removeEventListener('wheel', onMouseWheel);
      window.removeEventListener('resize', onWindowResize);
      if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <>
      {/* здесь ваша канвас-контейнер */}
      <div ref={mountRef} style={{ width:'100vw', height:'100vh' }} />

      {/* оверлейная панель */}
      {selectedHouse && (
        <div style={{
          position: 'absolute',
          top: 20, right: 20,
          background:'rgba(0,0,0,0.8)',
          color:'#fff', padding:16,
          borderRadius:8, minWidth:220
        }}>
          <h3 style={{ margin:0, marginBottom:8 }}>🏠 {selectedHouse.type}</h3>
          <p style={{ margin:'4px 0' }}>
            <b>Стоимость аренды:</b> {selectedHouse.rent}
          </p>
          <p style={{ margin:'4px 0' }}>
            <b>Налог:</b> {selectedHouse.tax}
          </p>
          <div style={{ marginTop:12, display:'flex', gap:8 }}>
            <button onClick={()=>enterHouse(selectedHouse)}
                    style={btnStyle}>Войти</button>
            <button onClick={()=>viewStats(selectedHouse)}
                    style={btnStyle}>Статистика</button>
          </div>
        </div>

      )}

{selectedPlayer && (
  <div
    ref={statsRef}
    style={{
      position: 'absolute',
      top: 20, left: 20,
      background: 'rgba(0,0,0,0.8)',
      color: '#fff',
      padding: 16,
      borderRadius: 8,
      minWidth: 260,
      zIndex: 100
    }}
  >
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <h3 style={{ margin:0 }}>
      {selectedPlayer.firstName} {selectedPlayer.lastName}
      </h3>
      <button
        onClick={() => { setSelectedPlayer(null); setPlayerStats(null); }}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        ✕
      </button>
    </div>

    <div style={{ display:'flex', gap:8, marginTop:8 }}>
      <button onClick={viewStats} style={btnStyle}>Посмотреть статистику</button>
      <button style={btnStyle} onClick={()=>{/* познакомиться */}}>Познакомиться</button>
    </div>

    {playerStats && (
      <div style={{ marginTop:12, lineHeight: '1.4em' }}>
        <p><b>Баланс:</b> {playerStats.balance}</p>
        <p><b>Часов игры:</b> {playerStats.hoursPlayed}</p>
        <p><b>Репутация:</b> {playerStats.reputation}</p>
        <p><b>Телефон:</b> {playerStats.phone || '—'}</p>
        <p><b>Спортивность:</b> {playerStats.sportiness}</p>
        <p><b>Уровень здоровья:</b> {playerStats.healthLevel}</p>
        <p><b>Уровень стресса:</b> {playerStats.stressLevel}</p>
        <p><b>Болезни:</b> {playerStats.diseases?.join(', ') || 'нет'}</p>
      </div>
    )}
  </div>
)}



            {/* UI поверх сцены */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                width: '25%',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                padding: '10px',
                borderRadius: '15px',
                fontSize: '14px',
                zIndex: 10
            }}>
                <div id="chatMessages" style={{
                    height: '150px',
                    overflowY: 'auto',
                    background: 'rgba(255, 255, 255, 0.1)',
                    padding: '5px',
                    borderRadius: '10px',
                    color: 'white'
                }}>
                    {/* Сюда вставляй сообщения */}
                </div>
                <input
                    id="chatInput"
                    type="text"
                    placeholder="Введите сообщение..."
                    style={{ width: '70%', padding: '5px',position: 'relative',  left: '15px'  }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const msg = e.target.value.trim();
                            if (msg) {
                              socketRef.current?.emit('chatMessage', {
                                    message: msg,
                                    name: mountRef.current
                                });
                                console.log('отправил', msg);
                                e.target.value = '';
                            }
                        }
                    }}
                />
        </div>
    </>
  );
}

const btnStyle = {
  flex:1,
  padding:'8px 12px',
  background:'#17a2b8',
  border:'none',
  borderRadius:4,
  color:'#fff',
  cursor:'pointer'
};

export default Game;
