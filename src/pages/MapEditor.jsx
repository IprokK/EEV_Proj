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

  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const controlsRef = useRef();
  const transformRef = useRef();
  const objectsRef = useRef([]);
  const removedIdsRef = useRef([]);
  const selectedRef = useRef(null);
  const loader = useRef(new GLTFLoader()).current;
  const materialRef = useRef();

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
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controlsRef.current = controls;

    const handleKeyDown = e => {
      const step = 1;
      const cam = cameraRef.current;
      const ctrl = controlsRef.current;
      if (!cam || !ctrl) return;
      switch (e.key) {
        case 'ArrowUp':
          cam.position.z -= step;
          ctrl.target.z -= step;
          break;
        case 'ArrowDown':
          cam.position.z += step;
          ctrl.target.z += step;
          break;
        case 'ArrowLeft':
          cam.position.x -= step;
          ctrl.target.x -= step;
          break;
        case 'ArrowRight':
          cam.position.x += step;
          ctrl.target.x += step;
          break;
        default:
          return;
      }
      ctrl.update();
    };
    window.addEventListener('keydown', handleKeyDown);

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
        // find top-level object stored in objectsRef
        while (obj.parent && !objectsRef.current.includes(obj)) {
          obj = obj.parent;
        }
        transform.attach(obj);
        selectedRef.current = obj;
      } else {
        selectedRef.current = null;
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
      window.removeEventListener('keydown', handleKeyDown);
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
    });
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
    objectsRef.current = objectsRef.current.filter(o => o !== obj);
    if (obj.userData.id) {
      removedIdsRef.current.push(obj.userData.id);
    }
    selectedRef.current = null;
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
        <button onClick={saveMap}>Сохранить</button>
      </div>
    </div>
  );
}