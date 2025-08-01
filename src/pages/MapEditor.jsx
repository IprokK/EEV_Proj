import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';

export default function MapEditor() {
  const mountRef = useRef(null);
  const [modelList, setModelList] = useState([]);
  const [mode, setMode] = useState('translate');
  const [cities, setCities] = useState([]);
  const [cityId, setCityId] = useState(null);
  const [selectedObj, setSelectedObj] = useState(null);
  const [coords, setCoords] = useState({
    posX: 0,
    posY: 0,
    posZ: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0
  });

  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const controlsRef = useRef();
  const transformRef = useRef();
  const objectsRef = useRef([]);
  const removedIdsRef = useRef([]);
  const selectedRef = useRef(null);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const transformStart = useRef(null);
  const loader = useRef(new GLTFLoader()).current;
  const materialRef = useRef();

  const updateCoordsValues = obj => {
    if (!obj) return;
    setCoords({
      posX: obj.position.x,
      posY: obj.position.y,
      posZ: obj.position.z,
      rotX: obj.rotation.x,
      rotY: obj.rotation.y,
      rotZ: obj.rotation.z
    });
  };

  const pushAction = action => {
    undoStack.current.push(action);
    redoStack.current = [];
  };

  const undo = () => {
    const action = undoStack.current.pop();
    if (!action) return;
    redoStack.current.push(action);
    switch (action.type) {
      case 'add':
        if (action.object.parent) action.object.parent.remove(action.object);
        objectsRef.current = objectsRef.current.filter(o => o !== action.object);
        if (selectedRef.current === action.object) {
          selectedRef.current = null;
          setSelectedObj(null);
        }
        break;
      case 'delete':
        sceneRef.current.add(action.object);
        objectsRef.current.splice(action.index, 0, action.object);
        selectedRef.current = action.object;
        setSelectedObj(action.object);
        break;
      case 'transform':
        action.object.position.copy(action.prevPosition);
        action.object.rotation.copy(action.prevRotation);
        break;
      default:
        break;
    }
    updateCoordsValues(selectedRef.current);
  };

  const redo = () => {
    const action = redoStack.current.pop();
    if (!action) return;
    undoStack.current.push(action);
    switch (action.type) {
      case 'add':
        sceneRef.current.add(action.object);
        objectsRef.current.push(action.object);
        selectedRef.current = action.object;
        setSelectedObj(action.object);
        break;
      case 'delete':
        if (action.object.parent) action.object.parent.remove(action.object);
        objectsRef.current = objectsRef.current.filter(o => o !== action.object);
        if (selectedRef.current === action.object) {
          selectedRef.current = null;
          setSelectedObj(null);
        }
        break;
      case 'transform':
        action.object.position.copy(action.newPosition);
        action.object.rotation.copy(action.newRotation);
        break;
      default:
        break;
    }
    updateCoordsValues(selectedRef.current);
  };

  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xaaaaaa);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;

    const loadingManager = new THREE.LoadingManager();
    const textureLoader = new THREE.TextureLoader(loadingManager);
    const baseTexture = textureLoader.load('textures/base.png');
    materialRef.current = new THREE.MeshStandardMaterial({ map: baseTexture });

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    hemi.position.set(0, 20, 0);
    scene.add(hemi);

    const grid = new THREE.GridHelper(100, 100);
    scene.add(grid);

    const transform = new TransformControls(camera, renderer.domElement);
    transform.addEventListener('dragging-changed', e => {
      controls.enabled = !e.value;
    });
    scene.add(transform);
    transformRef.current = transform;
    transform.addEventListener('mouseDown', () => {
      if (selectedRef.current) {
        transformStart.current = {
          object: selectedRef.current,
          pos: selectedRef.current.position.clone(),
          rot: selectedRef.current.rotation.clone()
        };
      }
    });
    transform.addEventListener('mouseUp', () => {
      if (transformStart.current) {
        const obj = transformStart.current.object;
        pushAction({
          type: 'transform',
          object: obj,
          prevPosition: transformStart.current.pos,
          prevRotation: transformStart.current.rot,
          newPosition: obj.position.clone(),
          newRotation: obj.rotation.clone()
        });
        transformStart.current = null;
      }
    });
    transform.addEventListener('objectChange', () => {
      if (selectedRef.current) {
        updateCoordsValues(selectedRef.current);
      }
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onPointerDown = event => {
      // Если начинаем тянуть гизм TransformControls, не переопределяем выбор
      if (transform.dragging) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(objectsRef.current, true);
      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && !objectsRef.current.includes(obj)) {
          obj = obj.parent;
        }
        transform.attach(obj);
        selectedRef.current = obj;
        setSelectedObj(obj);
        updateCoordsValues(obj);
      } else {
        selectedRef.current = null;
        setSelectedObj(null);
        transform.detach();
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onResize);
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    transformRef.current?.setMode(mode);
  }, [mode]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/models', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setModelList)
      .catch(err => console.error('Ошибка загрузки моделей', err));
    fetch('/api/cities', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setCities(data);
        const profile = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
        const defaultCity = profile.last_city_id || data[0]?.id;
        setCityId(defaultCity);
      })
      .catch(err => console.error('Ошибка загрузки городов', err));
  }, []);

  useEffect(() => {
    if (!cityId) return;
    const token = localStorage.getItem('token');
    // очистка текущих объектов
    objectsRef.current.forEach(o => sceneRef.current.remove(o));
    objectsRef.current = [];
    removedIdsRef.current = [];
    fetch(`/api/cities/${cityId}/objects`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        data.forEach(obj => {
          loader.load(obj.model_url, gltf => {
            const m = gltf.scene;
            m.position.set(obj.pos_x, obj.pos_y, obj.pos_z);
            m.rotation.set(obj.rot_x, obj.rot_y, obj.rot_z);
            m.userData = { id: obj.id, model_url: obj.model_url, name: obj.name };
            m.traverse(child => {
              if (child.isMesh && materialRef.current) {
                child.material = materialRef.current.clone();
                child.material.needsUpdate = true;
              }
            });
            sceneRef.current.add(m);
            objectsRef.current.push(m);
          });
        });
      })
      .catch(err => console.error('Ошибка загрузки объектов', err));
  }, [cityId, loader]);

  const addModel = name => {
    if (!name) return;
    const url = `/models/copied/${name}`;
    loader.load(url, gltf => {
      const m = gltf.scene;
      m.userData = { model_url: url, name };
      m.traverse(child => {
        if (child.isMesh && materialRef.current) {
          child.material = materialRef.current.clone();
          child.material.needsUpdate = true;
        }
      });
      sceneRef.current.add(m);
      objectsRef.current.push(m);
      transformRef.current.attach(m);
      selectedRef.current = m;
      setSelectedObj(m);
      updateCoordsValues(m);
      pushAction({ type: 'add', object: m });
    });
  };

  const copySelected = () => {
    const obj = selectedRef.current;
    if (!obj) return;
    const clone = obj.clone(true);
    clone.traverse(child => {
      if (child.isMesh && materialRef.current) {
        child.material = materialRef.current.clone();
        child.material.needsUpdate = true;
      }
    });
    sceneRef.current.add(clone);
    objectsRef.current.push(clone);
    transformRef.current.attach(clone);
    selectedRef.current = clone;
    setSelectedObj(clone);
    updateCoordsValues(clone);
    pushAction({ type: 'add', object: clone });
  };

  const deleteSelected = () => {
    const obj = selectedRef.current;
    if (!obj) return;
    transformRef.current.detach();
    if (obj.parent) {
      obj.parent.remove(obj);
    } else {
      sceneRef.current.remove(obj);
    }
    const idx = objectsRef.current.indexOf(obj);
    objectsRef.current = objectsRef.current.filter(o => o !== obj);
    if (obj.userData.id) {
      removedIdsRef.current.push(obj.userData.id);
    }
    selectedRef.current = null;
    setSelectedObj(null);
    setCoords({ posX: 0, posY: 0, posZ: 0, rotX: 0, rotY: 0, rotZ: 0 });
    pushAction({ type: 'delete', object: obj, index: idx });
  };

  const handleCoordChange = (field, value) => {
    setCoords(prev => ({ ...prev, [field]: value }));
    const num = parseFloat(value);
    const obj = selectedRef.current;
    if (!obj || isNaN(num)) return;
    const prevPos = obj.position.clone();
    const prevRot = obj.rotation.clone();
    switch (field) {
      case 'posX':
        obj.position.x = num;
        break;
      case 'posY':
        obj.position.y = num;
        break;
      case 'posZ':
        obj.position.z = num;
        break;
      case 'rotX':
        obj.rotation.x = num;
        break;
      case 'rotY':
        obj.rotation.y = num;
        break;
      case 'rotZ':
        obj.rotation.z = num;
        break;
      default:
        break;
    }
    pushAction({
      type: 'transform',
      object: obj,
      prevPosition: prevPos,
      prevRotation: prevRot,
      newPosition: obj.position.clone(),
      newRotation: obj.rotation.clone()
    });
    if (transformRef.current) {
      transformRef.current.updateMatrixWorld(true);
    }
  };

  const saveMap = () => {
    const objects = objectsRef.current.map(obj => ({
      id: obj.userData.id,
      name: obj.userData.name || '',
      model_url: obj.userData.model_url,
      pos_x: obj.position.x,
      pos_y: obj.position.y,
      pos_z: obj.position.z,
      rot_x: obj.rotation.x,
      rot_y: obj.rotation.y,
      rot_z: obj.rotation.z
    }));
    const token = localStorage.getItem('token');
    fetch('/api/save-map', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ cityId, objects, removedIds: removedIdsRef.current })
    })
      .then(r => {
        if (!r.ok) throw new Error('fail');
        alert('Карта сохранена');
      })
      .catch(() => alert('Ошибка сохранения'));
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }} ref={mountRef}>
      <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.8)', padding: 8 }}>
        <div style={{ marginBottom: 4 }}>
          <select value={cityId || ''} onChange={e => setCityId(Number(e.target.value))}>
            {cities.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.country_name})</option>
            ))}
          </select>
        </div>
        <select id="modelSelect">
          <option value="">-- модель --</option>
          {modelList.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button onClick={() => {
          const select = document.getElementById('modelSelect');
          addModel(select.value);
        }}>Добавить</button>
        <button onClick={() => setMode(mode === 'translate' ? 'rotate' : 'translate')}>
          {mode === 'translate' ? 'Перемещение' : 'Вращение'}
        </button>
        <button onClick={deleteSelected}>Удалить</button>
        <button onClick={copySelected}>Копировать</button>
        <button onClick={undo}>Назад</button>
        <button onClick={redo}>Вперед</button>
        <button onClick={saveMap}>Сохранить</button>
      </div>
      {selectedObj && (
        <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(255,255,255,0.8)', padding: 8 }}>
          <div style={{ marginBottom: 4 }}>Позиция:</div>
          <div>
            X: <input type="number" step="0.1" value={coords.posX} onChange={e => handleCoordChange('posX', e.target.value)} />
          </div>
          <div>
            Y: <input type="number" step="0.1" value={coords.posY} onChange={e => handleCoordChange('posY', e.target.value)} />
          </div>
          <div>
            Z: <input type="number" step="0.1" value={coords.posZ} onChange={e => handleCoordChange('posZ', e.target.value)} />
          </div>
          <div style={{ marginTop: 4 }}>Вращение:</div>
          <div>
            X: <input type="number" step="0.1" value={coords.rotX} onChange={e => handleCoordChange('rotX', e.target.value)} />
          </div>
          <div>
            Y: <input type="number" step="0.1" value={coords.rotY} onChange={e => handleCoordChange('rotY', e.target.value)} />
          </div>
          <div>
            Z: <input type="number" step="0.1" value={coords.rotZ} onChange={e => handleCoordChange('rotZ', e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}
