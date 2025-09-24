import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export default function EnhancedCollisionEditor() {
  const mountRef = useRef(null);
  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const orbitRef = useRef();
  const transformRef = useRef();
  const backgroundGroupRef = useRef(new THREE.Group());
  const gltfLoaderRef = useRef(new GLTFLoader());

  const [shapeType, setShapeType] = useState('box');
  const [mode, setMode] = useState('translate');
  const [selected, setSelected] = useState(null);
  const [cursorXZ, setCursorXZ] = useState({ x: 0, z: 0 });
  const [cities, setCities] = useState([]);
  const [cityId, setCityId] = useState(1);
  const [lockUniformXZ, setLockUniformXZ] = useState(true);
  const collidersRef = useRef([]);
  
  // Новые состояния для цветов и прозрачности
  const [selectedColor, setSelectedColor] = useState({ r: 1, g: 0, b: 0 });
  const [selectedOpacity, setSelectedOpacity] = useState(0.3);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Состояния для управления камерой
  const [cameraSpeed, setCameraSpeed] = useState(5);
  const [keysPressed, setKeysPressed] = useState({});
  const cameraMoveRef = useRef({ forward: false, backward: false, left: false, right: false, up: false, down: false });
  
  // Состояние для расстояния создания коллайдера
  const [colliderCreationDistance, setColliderCreationDistance] = useState(10);
  
  // Состояние для предварительного просмотра позиции коллайдера
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef(null);
  
  // Состояния для управления параметрами выбранного коллайдера
  const [colliderPosition, setColliderPosition] = useState({ x: 0, y: 0, z: 0 });
  const [colliderRotation, setColliderRotation] = useState({ x: 0, y: 0, z: 0 });
  const [colliderScale, setColliderScale] = useState({ x: 1, y: 1, z: 1 });
  
  // Состояние для списка интерьеров
  const [interiors, setInteriors] = useState([]);
  
  // Состояние для режима TransformControls
  const [transformMode, setTransformMode] = useState('translate'); // 'translate', 'rotate', 'scale'
  
  // Состояние для автоматического сохранения
  const [autoSave, setAutoSave] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const autoSaveTimeoutRef = useRef(null);
  const [showWireframes, setShowWireframes] = useState(true); // Новое состояние для рамок

  const colliderMaterial = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({ 
      color: new THREE.Color(selectedColor.r, selectedColor.g, selectedColor.b), 
      transparent: true, 
      opacity: selectedOpacity, 
      depthWrite: false 
    });
    
    // Если прозрачность 0, делаем материал невидимым
    if (selectedOpacity === 0) {
      material.visible = false;
      material.alphaTest = 0;
    } else {
      material.visible = true;
      material.alphaTest = 0.1;
    }
    
    return material;
  }, [selectedColor, selectedOpacity]);
  
  const colliderEdgeMaterial = useMemo(() => new THREE.LineBasicMaterial({ 
    color: new THREE.Color(selectedColor.r, selectedColor.g, selectedColor.b) 
  }), [selectedColor]);

  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9aa7b1);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 2000);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
    hemi.position.set(0, 50, 0);
    scene.add(hemi);

    const grid = new THREE.GridHelper(1000, 100);
    scene.add(grid);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.05;
    orbit.enablePan = true;
    orbit.enableZoom = true;
    orbit.enableRotate = true;
    orbit.panSpeed = 1.0;
    orbit.zoomSpeed = 1.0;
    orbit.rotateSpeed = 1.0;
    orbit.minDistance = 5;
    orbit.maxDistance = 500;
    orbit.maxPolarAngle = Math.PI;
    orbitRef.current = orbit;

    const transform = new TransformControls(camera, renderer.domElement);
    transform.addEventListener('dragging-changed', (event) => {
      orbit.enabled = !event.value;
    });
    transform.addEventListener('objectChange', () => {
      if (selected) {
        updateColliderData(selected);
        // Обновляем параметры в UI при изменении через TransformControls
        setColliderPosition({ x: selected.position.x, y: selected.position.y, z: selected.position.z });
        setColliderRotation({ x: selected.rotation.x, y: selected.rotation.y, z: selected.rotation.z });
        setColliderScale({ x: selected.scale.x, y: selected.scale.y, z: selected.scale.z });
        console.log('🔄 Параметры обновлены через TransformControls:', {
          position: selected.position,
          rotation: selected.rotation,
          scale: selected.scale
        });
        // Запускаем автоматическое сохранение
        triggerAutoSave();
      }
    });
    scene.add(transform);
    transformRef.current = transform;

    scene.add(backgroundGroupRef.current);

    // Функция для движения камеры с клавиатуры
    const moveCamera = () => {
      if (!cameraRef.current || !orbitRef.current) return;
      
      const camera = cameraRef.current;
      const orbit = orbitRef.current;
      const move = cameraMoveRef.current;
      
      if (move.forward || move.backward || move.left || move.right || move.up || move.down) {
        const direction = new THREE.Vector3();
        const right = new THREE.Vector3();
        
        // Получаем направление камеры
        camera.getWorldDirection(direction);
        right.crossVectors(direction, camera.up).normalize();
        
        const moveVector = new THREE.Vector3();
        
        if (move.forward) {
          moveVector.add(direction.multiplyScalar(cameraSpeed * 0.1));
        }
        if (move.backward) {
          moveVector.add(direction.multiplyScalar(-cameraSpeed * 0.1));
        }
        if (move.left) {
          moveVector.add(right.multiplyScalar(-cameraSpeed * 0.1));
        }
        if (move.right) {
          moveVector.add(right.multiplyScalar(cameraSpeed * 0.1));
        }
        if (move.up) {
          moveVector.add(camera.up.multiplyScalar(cameraSpeed * 0.1));
        }
        if (move.down) {
          moveVector.add(camera.up.multiplyScalar(-cameraSpeed * 0.1));
        }
        
        // Применяем движение к камере и target OrbitControls
        camera.position.add(moveVector);
        orbit.target.add(moveVector);
        orbit.update();
      }
    };

    const animate = () => {
      requestAnimationFrame(animate);
      moveCamera();
      orbit.update();
      
      // Обновляем предварительный просмотр при движении камеры
      if (showPreview) {
        updatePreview();
      }
      
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Загрузка городов и интерьеров
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Загружаем города
    fetch('/api/cities', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setCities(data);
        if (data.length > 0) {
          setCityId(data[0].id);
        }
      })
      .catch(() => {});
    
    // Загружаем интерьеры
    fetch('/api/interiors', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setInteriors(data);
      })
      .catch(() => {});
  }, []);

  // Загрузка объектов города
  useEffect(() => {
    if (!cityId || !sceneRef.current) return;
    const token = localStorage.getItem('token');
    const bg = backgroundGroupRef.current;
    
    // Очищаем предыдущие объекты
    while (bg.children.length) {
      const ch = bg.children.pop();
      ch.traverse(n => {
        if (n.isMesh) {
          n.geometry?.dispose?.();
          if (n.material) {
            if (Array.isArray(n.material)) n.material.forEach(m => m.dispose?.());
            else n.material.dispose?.();
          }
        }
      });
    }
    
    fetch(`/api/cities/${cityId}/objects`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(async data => {
        for (const obj of data) {
          try {
            const gltf = await gltfLoaderRef.current.loadAsync(obj.model_url);
            const m = gltf.scene;
            m.position.set(obj.pos_x, obj.pos_y, obj.pos_z);
            m.rotation.set(obj.rot_x, obj.rot_y, obj.rot_z);
            m.scale.set(obj.scale_x || 1, obj.scale_y || 1, obj.scale_z || 1);
            m.traverse(child => {
              if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => { 
                    if (mat) mat.transparent = true; 
                    if (mat) mat.opacity = 0.9; 
                  });
                } else { 
                  child.material.transparent = true; 
                  child.material.opacity = 0.9; 
                }
                child.raycast = () => {};
              }
            });
            bg.add(m);
          } catch (e) {
            console.error('Ошибка загрузки объекта:', e);
          }
        }
      })
      .catch(() => {});
  }, [cityId]);

  // Обработчики клавиатуры для управления камерой
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const move = cameraMoveRef.current;
      
      switch (key) {
        case 'w':
        case 'arrowup':
          move.forward = true;
          break;
        case 's':
        case 'arrowdown':
          move.backward = true;
          break;
        case 'a':
        case 'arrowleft':
          move.left = true;
          break;
        case 'd':
        case 'arrowright':
          move.right = true;
          break;
        case 'q':
        case 'pageup':
          move.up = true;
          break;
        case 'e':
        case 'pagedown':
          move.down = true;
          break;
        case 'r':
          // Сброс позиции камеры
          if (cameraRef.current && orbitRef.current) {
            cameraRef.current.position.set(20, 20, 20);
            orbitRef.current.target.set(0, 0, 0);
            orbitRef.current.update();
          }
          break;
      }
      
      setKeysPressed(prev => ({ ...prev, [key]: true }));
    };

    const handleKeyUp = (event) => {
      const key = event.key.toLowerCase();
      const move = cameraMoveRef.current;
      
      switch (key) {
        case 'w':
        case 'arrowup':
          move.forward = false;
          break;
        case 's':
        case 'arrowdown':
          move.backward = false;
          break;
        case 'a':
        case 'arrowleft':
          move.left = false;
          break;
        case 'd':
        case 'arrowright':
          move.right = false;
          break;
        case 'q':
        case 'pageup':
          move.up = false;
          break;
        case 'e':
        case 'pagedown':
          move.down = false;
          break;
      }
      
      setKeysPressed(prev => ({ ...prev, [key]: false }));
    };

    // Добавляем обработчики событий
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Автоматическая загрузка коллайдеров при смене города
  useEffect(() => {
    if (cityId) {
      loadCollidersFromJSON();
    }
  }, [cityId]);

  // Загрузка коллизий из JSON через API
  const loadCollidersFromJSON = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Сначала пробуем новый API с базой данных
      let response = await fetch(`/api/colliders/city/${cityId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Если новый API недоступен (500 ошибка), пробуем старый JSON API
      if (!response.ok && response.status === 500) {
        console.log('🔄 Новый API недоступен, пробуем старый JSON API...');
        response = await fetch(`/api/colliders?cityId=${cityId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      if (!response.ok) {
        console.log('📄 JSON файл не найден, создаем новый');
        collidersRef.current = [];
        return;
      }
      
      const data = await response.json();
      collidersRef.current.forEach(c => sceneRef.current.remove(c.mesh));
      collidersRef.current = [];
      
      const list = Array.isArray(data?.colliders) ? data.colliders : [];
      list.forEach(c => {
        let geom;
        if (c.type === 'circle') geom = new THREE.CylinderGeometry(1.5, 1.5, 2, 32);
        else if (c.type === 'capsule') geom = new THREE.CapsuleGeometry(1, 2, 4, 12);
        else geom = new THREE.BoxGeometry(2, 2, 2);
        
        const mesh = new THREE.Mesh(geom, colliderMaterial.clone());
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const line = new THREE.LineSegments(edges, colliderEdgeMaterial.clone());
        line.visible = showWireframes; // Учитываем настройку видимости рамок
        mesh.add(line);
        
        mesh.position.set(c.position?.x || 0, c.position?.y || 0, c.position?.z || 0);
        mesh.rotation.set(c.rotation?.x || 0, c.rotation?.y || 0, c.rotation?.z || 0);
        mesh.scale.set(c.scale?.x || 1, c.scale?.y || 1, c.scale?.z || 1);
        
        // Применяем цвет и прозрачность из JSON
        if (c.color) {
          const color = new THREE.Color(c.color.r, c.color.g, c.color.b);
          mesh.material.color = color;
          line.material.color = color;
        }
        if (c.opacity !== undefined) {
          mesh.material.opacity = c.opacity;
          // Если прозрачность 0, делаем материал невидимым
          if (c.opacity === 0) {
            mesh.material.visible = false;
            mesh.material.transparent = true;
            mesh.material.alphaTest = 0;
          } else {
            mesh.material.visible = true;
            mesh.material.transparent = true;
            mesh.material.alphaTest = 0.1;
          }
        }
        
        mesh.userData = { 
          type: c.type || 'box',
          color: c.color || { r: 1, g: 0, b: 0 },
          opacity: c.opacity || 0.3,
          id: c.id // Добавляем ID из базы данных
        };
        
        sceneRef.current.add(mesh);
        collidersRef.current.push({ mesh, data: c });
      });
      
      console.log(`Загружено ${list.length} коллайдеров`);
    } catch (error) {
      console.error('Ошибка загрузки коллайдеров:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Сохранение коллизий в JSON через API
  const saveCollidersToJSON = async () => {
    setIsSaving(true);
    try {
      const collidersData = collidersRef.current.map(c => {
        const mesh = c.mesh;
        return {
          type: mesh.userData.type || 'box',
          position: {
            x: mesh.position.x,
            y: mesh.position.y,
            z: mesh.position.z
          },
          rotation: {
            x: mesh.rotation.x,
            y: mesh.rotation.y,
            z: mesh.rotation.z
          },
          scale: {
            x: mesh.scale.x,
            y: mesh.scale.y,
            z: mesh.scale.z
          },
          color: mesh.userData.color || { r: 1, g: 0, b: 0 },
          opacity: mesh.userData.opacity || 0.3,
          id: mesh.userData.id // Добавляем ID для существующих коллайдеров
        };
      });

      const jsonData = { colliders: collidersData };
      
      // Отправляем данные на сервер для сохранения
      const token = localStorage.getItem('token');
      
      // Сначала пробуем новый API с базой данных
      let response = await fetch(`/api/colliders/city/${cityId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(jsonData)
      });
      
      // Если новый API недоступен (500 ошибка), пробуем старый JSON API
      if (!response.ok && response.status === 500) {
        console.log('🔄 Новый API недоступен, пробуем старый JSON API...');
        response = await fetch('/api/colliders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ ...jsonData, cityId: parseInt(cityId) })
        });
      }

      if (response.ok) {
        const result = await response.json();
        console.log('Коллайдеры сохранены успешно:', result.message);
        alert('Коллайдеры сохранены!');
      } else {
        const error = await response.json();
        console.error('Ошибка сохранения коллайдеров:', error);
        alert('Ошибка сохранения коллайдеров: ' + (error.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Создание нового коллайдера перед камерой
  const createCollider = () => {
    let geom;
    if (shapeType === 'circle') geom = new THREE.CylinderGeometry(1.5, 1.5, 2, 32);
    else if (shapeType === 'capsule') geom = new THREE.CapsuleGeometry(1, 2, 4, 12);
    else geom = new THREE.BoxGeometry(2, 2, 2);

    const mesh = new THREE.Mesh(geom, colliderMaterial.clone());
    const edges = new THREE.EdgesGeometry(mesh.geometry);
    const line = new THREE.LineSegments(edges, colliderEdgeMaterial.clone());
    line.visible = showWireframes; // Учитываем настройку видимости рамок
    mesh.add(line);

    // Вычисляем позицию перед камерой
    const camera = cameraRef.current;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    // Позиция перед камерой на настраиваемом расстоянии
    const distance = colliderCreationDistance;
    const position = new THREE.Vector3();
    position.copy(camera.position);
    position.add(direction.multiplyScalar(distance));

    // Используем высоту камеры вместо принудительной установки на 0
    // Устанавливаем Y координату на уровне камеры или немного ниже
    position.y = camera.position.y - 1;

    mesh.position.copy(position);
    mesh.userData = { 
      type: shapeType,
      color: { ...selectedColor },
      opacity: selectedOpacity,
      id: null // Новый коллайдер пока не имеет ID
    };

    sceneRef.current.add(mesh);
    collidersRef.current.push({ mesh, data: null });
    setSelected(mesh);
    transformRef.current.attach(mesh);
    
    console.log(`✅ Создан коллайдер типа "${shapeType}" в позиции:`, position);
    console.log(`📊 Всего коллайдеров: ${collidersRef.current.length}`);
    // Запускаем автоматическое сохранение
    triggerAutoSave();
  };

  // Функция для обновления предварительного просмотра позиции коллайдера
  const updatePreview = () => {
    if (!showPreview || !cameraRef.current || !sceneRef.current) return;
    
    // Удаляем предыдущий предварительный просмотр
    if (previewRef.current) {
      sceneRef.current.remove(previewRef.current);
    }
    
    // Создаем новый предварительный просмотр
    let geom;
    if (shapeType === 'circle') geom = new THREE.CylinderGeometry(1.5, 1.5, 2, 32);
    else if (shapeType === 'capsule') geom = new THREE.CapsuleGeometry(1, 2, 4, 12);
    else geom = new THREE.BoxGeometry(2, 2, 2);
    
    const previewMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(selectedColor.r, selectedColor.g, selectedColor.b),
      transparent: true,
      opacity: selectedOpacity * 0.5,
      wireframe: true
    });
    
    const previewMesh = new THREE.Mesh(geom, previewMaterial);
    
    // Вычисляем позицию перед камерой
    const camera = cameraRef.current;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    const distance = colliderCreationDistance;
    const position = new THREE.Vector3();
    position.copy(camera.position);
    position.add(direction.multiplyScalar(distance));
    position.y = Math.max(0, position.y - 2);
    
    previewMesh.position.copy(position);
    previewRef.current = previewMesh;
    sceneRef.current.add(previewMesh);
  };

  // Обновляем предварительный просмотр при изменении параметров
  useEffect(() => {
    updatePreview();
  }, [showPreview, shapeType, selectedColor, selectedOpacity, colliderCreationDistance]);

  // Обновление данных коллайдера
  const updateColliderData = (mesh) => {
    const collider = collidersRef.current.find(c => c.mesh === mesh);
    if (collider) {
      collider.data = {
        type: mesh.userData.type,
        position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
        rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
        scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
        color: mesh.userData.color,
        opacity: mesh.userData.opacity
      };
    }
  };

  // Функция для обновления параметров выбранного коллайдера
  const updateSelectedColliderParameters = () => {
    if (!selected) return;
    
    // Обновляем позицию
    selected.position.set(colliderPosition.x, colliderPosition.y, colliderPosition.z);
    
    // Обновляем поворот
    selected.rotation.set(colliderRotation.x, colliderRotation.y, colliderRotation.z);
    
    // Обновляем масштаб
    selected.scale.set(colliderScale.x, colliderScale.y, colliderScale.z);
    
    // Обновляем данные
    updateColliderData(selected);
    
    // Обновляем TransformControls
    if (transformRef.current) {
      transformRef.current.updateMatrixWorld();
    }
    
    console.log('Параметры коллайдера обновлены:', { position: colliderPosition, rotation: colliderRotation, scale: colliderScale });
  };

  // Функция для дублирования выбранного коллайдера
  const duplicateSelectedCollider = () => {
    if (!selected) return;
    
    // Создаем копию геометрии
    let geom;
    if (selected.userData.type === 'circle') geom = new THREE.CylinderGeometry(1.5, 1.5, 2, 32);
    else if (selected.userData.type === 'capsule') geom = new THREE.CapsuleGeometry(1, 2, 4, 12);
    else geom = new THREE.BoxGeometry(2, 2, 2);
    
    // Создаем новый материал с правильными параметрами
    const newMaterial = new THREE.MeshBasicMaterial({
      color: selected.material.color.clone(),
      transparent: true,
      opacity: selected.material.opacity,
      wireframe: false
    });
    
    const mesh = new THREE.Mesh(geom, newMaterial);
    const edges = new THREE.EdgesGeometry(mesh.geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
    line.visible = showWireframes; // Учитываем настройку видимости рамок
    mesh.add(line);
    
    // Копируем параметры с небольшим смещением
    mesh.position.copy(selected.position);
    mesh.position.add(new THREE.Vector3(2, 0, 2)); // Смещаем на 2 единицы
    
    mesh.rotation.copy(selected.rotation);
    mesh.scale.copy(selected.scale);
    
    // Обновляем параметры в UI для нового коллайдера
    setColliderPosition({ x: mesh.position.x, y: mesh.position.y, z: mesh.position.z });
    setColliderRotation({ x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z });
    setColliderScale({ x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z });
    
    mesh.userData = {
      type: selected.userData.type,
      color: { ...selected.userData.color },
      opacity: selected.userData.opacity,
      id: null // Дублированный коллайдер пока не имеет ID
    };
    
    sceneRef.current.add(mesh);
    collidersRef.current.push({ mesh, data: null });
    setSelected(mesh);
    transformRef.current.attach(mesh);
    
    console.log('✅ Коллайдер дублирован');
    console.log(`📊 Всего коллайдеров: ${collidersRef.current.length}`);
    console.log('📐 Параметры трансформации скопированы:', {
      position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
      rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
      scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z }
    });
    // Запускаем автоматическое сохранение
    triggerAutoSave();
  };

  // Функция для телепортации камеры к интерьеру
  const teleportToInterior = (interiorId) => {
    const interior = interiors.find(i => i.id === interiorId);
    if (!interior || !cameraRef.current || !orbitRef.current) return;
    
    const camera = cameraRef.current;
    const orbit = orbitRef.current;
    
    // Телепортируем камеру к интерьеру
    camera.position.set(interior.pos_x, interior.pos_y + 10, interior.pos_z);
    orbit.target.set(interior.pos_x, interior.pos_y, interior.pos_z);
    orbit.update();
    
    console.log(`Телепорт к интерьеру ${interiorId}:`, { x: interior.pos_x, y: interior.pos_y, z: interior.pos_z });
  };

  // Функция для переключения режима TransformControls
  const switchTransformMode = (mode) => {
    setTransformMode(mode);
    if (transformRef.current) {
      transformRef.current.setMode(mode);
    }
    console.log(`Режим TransformControls изменен на: ${mode}`);
  };

  // Функция для принудительной перезагрузки коллайдеров из базы данных
  const reloadColliders = async () => {
    console.log('🔄 Принудительная перезагрузка коллайдеров из БД...');
    await loadCollidersFromJSON();
    console.log('✅ Коллайдеры перезагружены');
  };

  // Функция для переключения видимости рамок
  const toggleWireframes = () => {
    const newShowWireframes = !showWireframes;
    setShowWireframes(newShowWireframes);
    
    // Обновляем видимость рамок у всех коллайдеров
    collidersRef.current.forEach(c => {
      const mesh = c.mesh;
      mesh.children.forEach(child => {
        if (child.type === 'LineSegments') {
          child.visible = newShowWireframes;
        }
      });
    });
    
    console.log(`🔲 Рамки ${newShowWireframes ? 'включены' : 'отключены'}`);
  };

  // Функция для отладки коллайдеров
  const debugColliders = () => {
    console.log('🔍 Отладка коллайдеров:');
    console.log('📊 Всего коллайдеров:', collidersRef.current.length);
    console.log('🎯 Выбранный коллайдер:', selected);
    
    collidersRef.current.forEach((collider, index) => {
      console.log(`📦 Коллайдер ${index}:`, {
        mesh: collider.mesh,
        data: collider.data,
        position: collider.mesh.position,
        userData: collider.mesh.userData
      });
    });
  };

  // Функция автоматического сохранения
  const triggerAutoSave = () => {
    if (!autoSave || !cityId) return;
    
    // Очищаем предыдущий таймер
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Устанавливаем новый таймер на 2 секунды
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveCollidersToJSON();
        setLastSaved(new Date());
        console.log('💾 Автоматическое сохранение выполнено');
      } catch (error) {
        console.error('❌ Ошибка автоматического сохранения:', error);
      }
    }, 2000);
  };

  // Обновление цвета выбранного коллайдера
  const updateSelectedColliderColor = () => {
    if (selected) {
      const color = new THREE.Color(selectedColor.r, selectedColor.g, selectedColor.b);
      selected.material.color = color;
      selected.children[0].material.color = color; // Обновляем цвет линий
      selected.userData.color = { ...selectedColor };
      selected.userData.opacity = selectedOpacity;
      selected.material.opacity = selectedOpacity;
      
      // Если прозрачность 0, делаем материал невидимым
      if (selectedOpacity === 0) {
        selected.material.visible = false;
        selected.material.transparent = true;
        selected.material.alphaTest = 0;
      } else {
        selected.material.visible = true;
        selected.material.transparent = true;
        selected.material.alphaTest = 0.1;
      }
      
      updateColliderData(selected);
    }
  };

  // Удаление выбранного коллайдера
  const deleteSelected = async () => {
    if (!selected) {
      console.log('❌ Нет выбранного коллайдера для удаления');
      return;
    }
    
    console.log('🗑️ Удаляем коллайдер:', selected);
    console.log('📊 Всего коллайдеров до удаления:', collidersRef.current.length);
    
    // Если у коллайдера есть ID, удаляем его из базы данных
    if (selected.userData.id) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/colliders/${selected.userData.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          console.log(`✅ Коллайдер ${selected.userData.id} удален из базы данных`);
        } else {
          console.error(`❌ Ошибка удаления коллайдера ${selected.userData.id} из БД:`, await response.text());
        }
      } catch (error) {
        console.error('❌ Ошибка при удалении коллайдера из БД:', error);
      }
    } else {
      console.log('⚠️ У коллайдера нет ID, удаляем только из фронтенда');
    }
    
    // Удаляем из сцены
    sceneRef.current.remove(selected);
    
    // Удаляем из массива коллайдеров
    const beforeLength = collidersRef.current.length;
    collidersRef.current = collidersRef.current.filter(c => c.mesh !== selected);
    const afterLength = collidersRef.current.length;
    
    console.log(`📊 Коллайдеров до: ${beforeLength}, после: ${afterLength}`);
    
    // Отключаем TransformControls
    transformRef.current.detach();
    setSelected(null);
    
    console.log('✅ Коллайдер успешно удален');
    // Запускаем автоматическое сохранение для синхронизации
    triggerAutoSave();
  };

  // Обработка клика по объекту
  const handleClick = (event) => {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    // Получаем все объекты коллайдеров (включая рамки)
    const allColliderObjects = [];
    collidersRef.current.forEach(c => {
      allColliderObjects.push(c.mesh); // Основной меш
      allColliderObjects.push(...c.mesh.children); // Рамки (дочерние объекты)
    });

    const intersects = raycaster.intersectObjects(allColliderObjects);
    
    if (intersects.length > 0) {
      let clickedObject = intersects[0].object;
      
      // Если кликнули по рамке, находим родительский меш
      if (clickedObject.type === 'LineSegments') {
        clickedObject = clickedObject.parent;
        console.log('🎯 Кликнули по рамке, выбираем родительский меш:', clickedObject);
      }
      
      // Проверяем, что это действительно коллайдер из нашего списка
      const collider = collidersRef.current.find(c => c.mesh === clickedObject);
      if (!collider) {
        console.log('❌ Кликнули по объекту, который не является коллайдером');
        return;
      }
      
      setSelected(clickedObject);
      transformRef.current.attach(clickedObject);
      
      console.log('🎯 Выбран коллайдер:', clickedObject);
      console.log('📊 Всего коллайдеров в массиве:', collidersRef.current.length);
      
      // Обновляем цветовую палитру
      setSelectedColor(clickedObject.userData.color || { r: 1, g: 0, b: 0 });
      setSelectedOpacity(clickedObject.userData.opacity || 0.3);
      
      // Обновляем параметры коллайдера
      setColliderPosition({ x: clickedObject.position.x, y: clickedObject.position.y, z: clickedObject.position.z });
      setColliderRotation({ x: clickedObject.rotation.x, y: clickedObject.rotation.y, z: clickedObject.rotation.z });
      setColliderScale({ x: clickedObject.scale.x, y: clickedObject.scale.y, z: clickedObject.scale.z });
    } else {
      setSelected(null);
      transformRef.current.detach();
      console.log('❌ Клик мимо коллайдера');
    }
  };

  // Обработка движения мыши для позиционирования
  const handleMouseMove = (event) => {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    setCursorXZ({ x: intersectPoint.x, z: intersectPoint.z });
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Панель управления */}
      <div style={{ 
        width: '300px', 
        backgroundColor: '#2c3e50', 
        color: 'white', 
        padding: '20px',
        overflowY: 'auto'
      }}>
        <h2>Редактор коллизий</h2>
        
        {/* Выбор города */}
        <div style={{ marginBottom: '20px' }}>
          <label>Город:</label>
          <select 
            value={cityId} 
            onChange={(e) => setCityId(parseInt(e.target.value))}
            style={{ width: '100%', padding: '5px', marginTop: '5px' }}
          >
            {cities.map(city => (
              <option key={city.id} value={city.id}>{city.name}</option>
            ))}
          </select>
        </div>

        {/* Кнопки загрузки и сохранения */}
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={loadCollidersFromJSON}
            disabled={isLoading}
            style={{ 
              width: '100%', 
              padding: '10px', 
              marginBottom: '10px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Загрузка...' : 'Загрузить из JSON'}
          </button>
          
          <button 
            onClick={saveCollidersToJSON}
            disabled={isSaving}
            style={{ 
              width: '100%', 
              padding: '10px',
              backgroundColor: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isSaving ? 'not-allowed' : 'pointer'
            }}
          >
            {isSaving ? 'Сохранение...' : 'Сохранить в JSON'}
          </button>
        </div>

        {/* Настройки коллайдера */}
        <div style={{ marginBottom: '20px' }}>
          <h3>Создание коллайдера</h3>
          
          <div style={{ marginBottom: '10px' }}>
            <label>Тип:</label>
            <select 
              value={shapeType} 
              onChange={(e) => setShapeType(e.target.value)}
              style={{ width: '100%', padding: '5px', marginTop: '5px' }}
            >
              <option value="box">Коробка</option>
              <option value="circle">Цилиндр</option>
              <option value="capsule">Капсула</option>
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Расстояние от камеры: {colliderCreationDistance}</label>
            <input 
              type="range" 
              min="5" 
              max="50" 
              value={colliderCreationDistance}
              onChange={(e) => setColliderCreationDistance(parseInt(e.target.value))}
              style={{ width: '100%', marginTop: '5px' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="checkbox" 
                checked={showPreview}
                onChange={(e) => setShowPreview(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Показать предварительный просмотр
            </label>
          </div>

          <button 
            onClick={createCollider}
            style={{ 
              width: '100%', 
              padding: '10px',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Создать коллайдер
          </button>
        </div>

        {/* Настройки цвета и прозрачности */}
        {selected && (
          <div style={{ marginBottom: '20px' }}>
            <h3>Настройки выбранного коллайдера</h3>
            
            {/* Управление параметрами */}
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#34495e', borderRadius: '5px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Параметры трансформации</h4>
              
              {/* Позиция */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '12px' }}>Позиция:</label>
                <div style={{ display: 'flex', gap: '5px', marginTop: '3px' }}>
                  <input 
                    type="number" 
                    step="0.1"
                    value={colliderPosition.x.toFixed(2)}
                    onChange={(e) => setColliderPosition({...colliderPosition, x: parseFloat(e.target.value) || 0})}
                    style={{ width: '60px', padding: '2px', fontSize: '11px' }}
                    placeholder="X"
                  />
                  <input 
                    type="number" 
                    step="0.1"
                    value={colliderPosition.y.toFixed(2)}
                    onChange={(e) => setColliderPosition({...colliderPosition, y: parseFloat(e.target.value) || 0})}
                    style={{ width: '60px', padding: '2px', fontSize: '11px' }}
                    placeholder="Y"
                  />
                  <input 
                    type="number" 
                    step="0.1"
                    value={colliderPosition.z.toFixed(2)}
                    onChange={(e) => setColliderPosition({...colliderPosition, z: parseFloat(e.target.value) || 0})}
                    style={{ width: '60px', padding: '2px', fontSize: '11px' }}
                    placeholder="Z"
                  />
                </div>
              </div>
              
              {/* Поворот */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '12px' }}>Поворот (радианы):</label>
                <div style={{ display: 'flex', gap: '5px', marginTop: '3px' }}>
                  <input 
                    type="number" 
                    step="0.1"
                    value={colliderRotation.x.toFixed(2)}
                    onChange={(e) => setColliderRotation({...colliderRotation, x: parseFloat(e.target.value) || 0})}
                    style={{ width: '60px', padding: '2px', fontSize: '11px' }}
                    placeholder="X"
                  />
                  <input 
                    type="number" 
                    step="0.1"
                    value={colliderRotation.y.toFixed(2)}
                    onChange={(e) => setColliderRotation({...colliderRotation, y: parseFloat(e.target.value) || 0})}
                    style={{ width: '60px', padding: '2px', fontSize: '11px' }}
                    placeholder="Y"
                  />
                  <input 
                    type="number" 
                    step="0.1"
                    value={colliderRotation.z.toFixed(2)}
                    onChange={(e) => setColliderRotation({...colliderRotation, z: parseFloat(e.target.value) || 0})}
                    style={{ width: '60px', padding: '2px', fontSize: '11px' }}
                    placeholder="Z"
                  />
                </div>
              </div>
              
              {/* Масштаб */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '12px' }}>Масштаб:</label>
                <div style={{ display: 'flex', gap: '5px', marginTop: '3px' }}>
                  <input 
                    type="number" 
                    step="0.1"
                    min="0.1"
                    value={colliderScale.x.toFixed(2)}
                    onChange={(e) => setColliderScale({...colliderScale, x: parseFloat(e.target.value) || 0.1})}
                    style={{ width: '60px', padding: '2px', fontSize: '11px' }}
                    placeholder="X"
                  />
                  <input 
                    type="number" 
                    step="0.1"
                    min="0.1"
                    value={colliderScale.y.toFixed(2)}
                    onChange={(e) => setColliderScale({...colliderScale, y: parseFloat(e.target.value) || 0.1})}
                    style={{ width: '60px', padding: '2px', fontSize: '11px' }}
                    placeholder="Y"
                  />
                  <input 
                    type="number" 
                    step="0.1"
                    min="0.1"
                    value={colliderScale.z.toFixed(2)}
                    onChange={(e) => setColliderScale({...colliderScale, z: parseFloat(e.target.value) || 0.1})}
                    style={{ width: '60px', padding: '2px', fontSize: '11px' }}
                    placeholder="Z"
                  />
                </div>
              </div>
              
              <button 
                onClick={updateSelectedColliderParameters}
                style={{ 
                  width: '100%', 
                  padding: '5px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginBottom: '8px'
                }}
              >
                Применить параметры
              </button>
            </div>
            
            {/* Переключение режимов TransformControls */}
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#2c3e50', borderRadius: '5px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Режим трансформации</h4>
              
              <div style={{ display: 'flex', gap: '5px' }}>
                <button 
                  onClick={() => switchTransformMode('translate')}
                  style={{ 
                    flex: 1,
                    padding: '8px',
                    backgroundColor: transformMode === 'translate' ? '#27ae60' : '#34495e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  Перемещение
                </button>
                
                <button 
                  onClick={() => switchTransformMode('rotate')}
                  style={{ 
                    flex: 1,
                    padding: '8px',
                    backgroundColor: transformMode === 'rotate' ? '#27ae60' : '#34495e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  Поворот
                </button>
                
                <button 
                  onClick={() => switchTransformMode('scale')}
                  style={{ 
                    flex: 1,
                    padding: '8px',
                    backgroundColor: transformMode === 'scale' ? '#27ae60' : '#34495e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  Масштаб
                </button>
              </div>
              
              {/* Переключение рамок */}
              <div style={{ marginBottom: '8px' }}>
                <button 
                  onClick={toggleWireframes}
                  style={{ 
                    width: '100%',
                    padding: '8px',
                    backgroundColor: showWireframes ? '#27ae60' : '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  {showWireframes ? '🔲 Скрыть рамки' : '🔲 Показать рамки'}
                </button>
              </div>
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label>Цвет:</label>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                <div 
                  style={{ 
                    width: '30px', 
                    height: '30px', 
                    backgroundColor: `rgb(${selectedColor.r * 255}, ${selectedColor.g * 255}, ${selectedColor.b * 255})`,
                    border: '2px solid white',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />
                <span style={{ marginLeft: '10px' }}>
                  RGB({Math.round(selectedColor.r * 255)}, {Math.round(selectedColor.g * 255)}, {Math.round(selectedColor.b * 255)})
                </span>
              </div>
              
              {showColorPicker && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ marginBottom: '5px' }}>
                    <label>Красный: {Math.round(selectedColor.r * 255)}</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01"
                      value={selectedColor.r}
                      onChange={(e) => setSelectedColor({...selectedColor, r: parseFloat(e.target.value)})}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ marginBottom: '5px' }}>
                    <label>Зеленый: {Math.round(selectedColor.g * 255)}</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01"
                      value={selectedColor.g}
                      onChange={(e) => setSelectedColor({...selectedColor, g: parseFloat(e.target.value)})}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ marginBottom: '5px' }}>
                    <label>Синий: {Math.round(selectedColor.b * 255)}</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01"
                      value={selectedColor.b}
                      onChange={(e) => setSelectedColor({...selectedColor, b: parseFloat(e.target.value)})}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>Прозрачность: {Math.round(selectedOpacity * 100)}%</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01"
                value={selectedOpacity}
                onChange={(e) => setSelectedOpacity(parseFloat(e.target.value))}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </div>

            <button 
              onClick={updateSelectedColliderColor}
              style={{ 
                width: '100%', 
                padding: '10px',
                backgroundColor: '#9b59b6',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginBottom: '10px'
              }}
            >
              Применить цвет
            </button>

            <button 
              onClick={duplicateSelectedCollider}
              style={{ 
                width: '100%', 
                padding: '10px',
                backgroundColor: '#f39c12',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginBottom: '10px'
              }}
            >
              Дублировать коллайдер
            </button>

            <button 
              onClick={deleteSelected}
              style={{ 
                width: '100%', 
                padding: '10px',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginBottom: '10px'
              }}
            >
              Удалить коллайдер
            </button>

            <button 
              onClick={debugColliders}
              style={{ 
                width: '100%', 
                padding: '8px',
                backgroundColor: '#9b59b6',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🔍 Отладка коллайдеров
            </button>
          </div>
        )}

        {/* Управление камерой */}
        <div style={{ marginBottom: '20px' }}>
          <h3>Управление камерой</h3>
          
          <div style={{ marginBottom: '10px' }}>
            <label>Скорость движения: {cameraSpeed}</label>
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={cameraSpeed}
              onChange={(e) => setCameraSpeed(parseInt(e.target.value))}
              style={{ width: '100%', marginTop: '5px' }}
            />
          </div>

          <div style={{ marginTop: '10px' }}>
            <button 
              onClick={() => {
                if (cameraRef.current && orbitRef.current) {
                  cameraRef.current.position.set(20, 20, 20);
                  orbitRef.current.target.set(0, 0, 0);
                  orbitRef.current.update();
                }
              }}
              style={{ 
                width: '100%', 
                padding: '8px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginBottom: '5px'
              }}
            >
              Сброс камеры (R)
            </button>
            
            <button 
              onClick={() => {
                if (cameraRef.current && orbitRef.current) {
                  cameraRef.current.position.set(0, 50, 0);
                  orbitRef.current.target.set(0, 0, 0);
                  orbitRef.current.update();
                }
              }}
              style={{ 
                width: '100%', 
                padding: '8px',
                backgroundColor: '#9b59b6',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginBottom: '5px'
              }}
            >
              Вид сверху
            </button>
            
            <button 
              onClick={() => {
                if (cameraRef.current && orbitRef.current) {
                  cameraRef.current.position.set(50, 10, 0);
                  orbitRef.current.target.set(0, 0, 0);
                  orbitRef.current.update();
                }
              }}
              style={{ 
                width: '100%', 
                padding: '8px',
                backgroundColor: '#e67e22',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Вид сбоку
            </button>
          </div>

          <div style={{ fontSize: '11px', color: '#bdc3c7', marginTop: '10px' }}>
            <p><strong>Клавиши управления:</strong></p>
            <p>W / ↑ - Вперед</p>
            <p>S / ↓ - Назад</p>
            <p>A / ← - Влево</p>
            <p>D / → - Вправо</p>
            <p>Q / PageUp - Вверх</p>
            <p>E / PageDown - Вниз</p>
            <p>R - Сброс позиции</p>
            <p>Мышь - Поворот камеры</p>
            <p>Колесо мыши - Приближение</p>
          </div>
        </div>

        {/* Телепорт к интерьерам */}
        <div style={{ marginBottom: '20px' }}>
          <h3>Телепорт к интерьерам</h3>
          
          {interiors.length > 0 ? (
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {interiors.map(interior => (
                <button 
                  key={interior.id}
                  onClick={() => teleportToInterior(interior.id)}
                  style={{ 
                    width: '100%', 
                    padding: '8px',
                    backgroundColor: '#16a085',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    marginBottom: '5px',
                    fontSize: '12px',
                    textAlign: 'left'
                  }}
                >
                  Интерьер #{interior.id} 
                  <br />
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>
                    ({interior.pos_x?.toFixed(1)}, {interior.pos_y?.toFixed(1)}, {interior.pos_z?.toFixed(1)})
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '12px', color: '#bdc3c7' }}>
              Интерьеры не найдены
            </p>
          )}
        </div>

        {/* Управление сохранением */}
        <div style={{ marginBottom: '20px' }}>
          <h3>Управление сохранением</h3>
          
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox" 
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
              <span style={{ fontSize: '14px' }}>Автоматическое сохранение</span>
            </label>
          </div>
          
          {lastSaved && (
            <div style={{ fontSize: '12px', color: '#27ae60', marginBottom: '10px' }}>
              💾 Последнее сохранение: {lastSaved.toLocaleTimeString()}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={saveCollidersToJSON}
              disabled={isSaving}
              style={{ 
                flex: 1,
                padding: '8px',
                backgroundColor: isSaving ? '#95a5a6' : '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              {isSaving ? 'Сохранение...' : '💾 Сохранить сейчас'}
            </button>
            
            <button 
              onClick={loadCollidersFromJSON}
              disabled={isLoading}
              style={{ 
                flex: 1,
                padding: '8px',
                backgroundColor: isLoading ? '#95a5a6' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              {isLoading ? 'Загрузка...' : '🔄 Перезагрузить'}
            </button>
            
            <button 
              onClick={reloadColliders}
              disabled={isLoading}
              style={{ 
                flex: 1,
                padding: '8px',
                backgroundColor: isLoading ? '#95a5a6' : '#e67e22',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              {isLoading ? 'Загрузка...' : '🔄 Синхронизировать'}
            </button>
          </div>
        </div>

        {/* Информация */}
        <div style={{ marginTop: '20px', fontSize: '12px', color: '#bdc3c7' }}>
          <p>Коллайдеров: {collidersRef.current.length}</p>
          <p>Выбран: {selected ? 'Да' : 'Нет'}</p>
          <p>Позиция курсора: ({cursorXZ.x.toFixed(2)}, {cursorXZ.z.toFixed(2)})</p>
          {cameraRef.current && (
            <p>Позиция камеры: ({cameraRef.current.position.x.toFixed(2)}, {cameraRef.current.position.y.toFixed(2)}, {cameraRef.current.position.z.toFixed(2)})</p>
          )}
        </div>
      </div>

      {/* 3D сцена */}
      <div 
        ref={mountRef} 
        style={{ flex: 1 }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
      />
    </div>
  );
}
