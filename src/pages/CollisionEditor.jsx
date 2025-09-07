import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export default function CollisionEditor() {
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
  const [cityId, setCityId] = useState(null);
  const [lockUniformXZ, setLockUniformXZ] = useState(true);
  const collidersRef = useRef([]);

  const colliderMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.25, depthWrite: false }), []);
  const colliderEdgeMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: 0x00aaff }), []);

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

    scene.add(backgroundGroupRef.current);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbitRef.current = orbit;

    const transform = new TransformControls(camera, renderer.domElement);
    transform.addEventListener('dragging-changed', e => {
      orbit.enabled = !e.value;
    });
    transform.addEventListener('change', () => {
      renderer.render(scene, camera);
    });
    scene.add(transform);
    transformRef.current = transform;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const onPointerDown = (event) => {
      if (transform.dragging) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const meshes = collidersRef.current.map(c => c.mesh);
      const hits = raycaster.intersectObjects(meshes, true);
      if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj && !meshes.includes(obj) && obj.parent) obj = obj.parent;
        if (obj) {
          setSelected(obj);
          transform.attach(obj);
        }
      } else {
        setSelected(null);
        transform.detach();
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const onPointerMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const p = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, p);
      if (isFinite(p.x) && isFinite(p.z)) setCursorXZ({ x: p.x, z: p.z });
    };
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    const onKeyDown = (e) => {
      // Перемещение целевой точки орбиты стрелками
      const step = e.shiftKey ? 2 : 0.5;
      if (!orbitRef.current) return;
      const tgt = orbitRef.current.target;
      if (e.key === 'ArrowUp') { tgt.z -= step; e.preventDefault(); }
      if (e.key === 'ArrowDown') { tgt.z += step; e.preventDefault(); }
      if (e.key === 'ArrowLeft') { tgt.x -= step; e.preventDefault(); }
      if (e.key === 'ArrowRight') { tgt.x += step; e.preventDefault(); }
      orbitRef.current.update();
    };
    window.addEventListener('keydown', onKeyDown);

    const onResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      requestAnimationFrame(animate);
      orbit.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      mountRef.current && mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    transformRef.current?.setMode(mode);
  }, [mode]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/cities', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setCities(data);
        const profile = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
        const defaultCity = profile.last_city_id || data[0]?.id;
        setCityId(defaultCity || null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!cityId || !sceneRef.current) return;
    const token = localStorage.getItem('token');
    const bg = backgroundGroupRef.current;
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
                if (Array.isArray(child.material)) child.material.forEach(mat => { if (mat) mat.transparent = true; if (mat) mat.opacity = 0.9; });
                else { child.material.transparent = true; child.material.opacity = 0.9; }
                child.raycast = () => {};
              }
            });
            bg.add(m);
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, [cityId]);

  // Автозагрузка коллизий из API
  useEffect(() => {
    const token = localStorage.getItem('token');
    const q = cityId ? `?cityId=${encodeURIComponent(cityId)}` : '';
    fetch(`/api/colliders${q}`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
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
          mesh.add(line);
          mesh.position.set(c.position?.x || 0, c.position?.y || 0, c.position?.z || 0);
          mesh.rotation.set(c.rotation?.x || 0, c.rotation?.y || 0, c.rotation?.z || 0);
          mesh.scale.set(c.scale?.x || 1, c.scale?.y || 1, c.scale?.z || 1);
          mesh.userData = { type: c.type || 'box' };
          sceneRef.current.add(mesh);
          collidersRef.current.push({ mesh });
        });
      })
      .catch(() => {});
  }, [cityId]);

  // Авто-сохранение (дебаунс) при изменениях
  const saveTimer = useRef(null);
  const requestSave = () => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const token = localStorage.getItem('token');
      const payload = { colliders: serializeColliders(), cityId };
      fetch('/api/colliders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }, 400);
  };

  const addCollider = () => {
    if (!sceneRef.current) return;
    let mesh;
    if (shapeType === 'box') {
      const geom = new THREE.BoxGeometry(2, 2, 2);
      mesh = new THREE.Mesh(geom, colliderMaterial.clone());
    } else if (shapeType === 'circle') {
      const geom = new THREE.CylinderGeometry(1.5, 1.5, 2, 32);
      mesh = new THREE.Mesh(geom, colliderMaterial.clone());
    } else if (shapeType === 'capsule') {
      const geom = new THREE.CapsuleGeometry(1, 2, 4, 12);
      mesh = new THREE.Mesh(geom, colliderMaterial.clone());
    } else {
      const geom = new THREE.BoxGeometry(2, 2, 2);
      mesh = new THREE.Mesh(geom, colliderMaterial.clone());
    }

    const edges = new THREE.EdgesGeometry(mesh.geometry);
    const line = new THREE.LineSegments(edges, colliderEdgeMaterial.clone());
    mesh.add(line);

    mesh.position.set(0, 1, 0);
    mesh.userData = { type: shapeType };
    sceneRef.current.add(mesh);
    collidersRef.current.push({ mesh });
    transformRef.current.attach(mesh);
    setSelected(mesh);
    requestSave();
  };

  const deleteSelected = () => {
    if (!selected) return;
    transformRef.current.detach();
    sceneRef.current.remove(selected);
    collidersRef.current = collidersRef.current.filter(c => c.mesh !== selected);
    setSelected(null);
    requestSave();
  };

  const serializeColliders = () => {
    return collidersRef.current.map(({ mesh }) => {
      const type = mesh.userData?.type || 'box';
      return {
        type,
        position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
        rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
        scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z }
      };
    });
  };

  const exportJSON = () => {
    const data = serializeColliders();
    const blob = new Blob([JSON.stringify({ colliders: data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'colliders.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        collidersRef.current.forEach(c => sceneRef.current.remove(c.mesh));
        collidersRef.current = [];
        if (Array.isArray(parsed?.colliders)) {
          parsed.colliders.forEach(c => {
            let geom;
            if (c.type === 'circle') geom = new THREE.CylinderGeometry(1.5, 1.5, 2, 32);
            else if (c.type === 'capsule') geom = new THREE.CapsuleGeometry(1, 2, 4, 12);
            else geom = new THREE.BoxGeometry(2, 2, 2);
            const mesh = new THREE.Mesh(geom, colliderMaterial.clone());
            const edges = new THREE.EdgesGeometry(mesh.geometry);
            const line = new THREE.LineSegments(edges, colliderEdgeMaterial.clone());
            mesh.add(line);
            mesh.position.set(c.position?.x || 0, c.position?.y || 0, c.position?.z || 0);
            mesh.rotation.set(c.rotation?.x || 0, c.rotation?.y || 0, c.rotation?.z || 0);
            mesh.scale.set(c.scale?.x || 1, c.scale?.y || 1, c.scale?.z || 1);
            mesh.userData = { type: c.type || 'box' };
            sceneRef.current.add(mesh);
            collidersRef.current.push({ mesh });
          });
          requestSave();
        }
      } catch (e) {
        alert('Некорректный JSON');
      }
    };
    reader.readAsText(file);
  };

  const setSelectedPosition = (axis, value) => {
    if (!selected) return;
    const v = parseFloat(value);
    if (!isFinite(v)) return;
    selected.position[axis] = v;
    requestSave();
  };

  const setSelectedScale = (axis, value) => {
    if (!selected) return;
    const v = Math.max(0.01, parseFloat(value));
    if (!isFinite(v)) return;
    if (lockUniformXZ && (axis === 'x' || axis === 'z')) {
      selected.scale.x = v;
      selected.scale.z = v;
    } else {
      selected.scale[axis] = v;
    }
    requestSave();
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }} ref={mountRef}>
      <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.9)', padding: 8, display: 'grid', gap: 8, minWidth: 320 }}>
        <div>
          <label>Город:&nbsp;</label>
          <select value={cityId || ''} onChange={e => setCityId(Number(e.target.value))}>
            {cities.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.country_name})</option>
            ))}
          </select>
        </div>
        <div>
          <label>Форма:&nbsp;</label>
          <select value={shapeType} onChange={e => setShapeType(e.target.value)}>
            <option value="box">Прямоугольник</option>
            <option value="circle">Круг (цилиндр)</option>
            <option value="capsule">Капсула</option>
          </select>
          <button onClick={addCollider} style={{ marginLeft: 8 }}>Добавить</button>
        </div>
        <div>
          <button onClick={() => setMode(mode === 'translate' ? 'rotate' : mode === 'rotate' ? 'scale' : 'translate')}>
            Режим: {mode === 'translate' ? 'Перемещение' : mode === 'rotate' ? 'Вращение' : 'Масштаб'}
          </button>
          <button onClick={deleteSelected} style={{ marginLeft: 8 }}>Удалить выделенный</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, auto)', gap: 6, alignItems: 'center' }}>
          <b>Позиция</b>
          <span>X</span><input type="number" step="0.1" value={selected ? selected.position.x : ''} onChange={e => setSelectedPosition('x', e.target.value)} />
          <span>Y</span><input type="number" step="0.1" value={selected ? selected.position.y : ''} onChange={e => setSelectedPosition('y', e.target.value)} />
          <span>Z</span><input type="number" step="0.1" value={selected ? selected.position.z : ''} onChange={e => setSelectedPosition('z', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, auto)', gap: 6, alignItems: 'center' }}>
          <b>Размер</b>
          <span>X</span><input type="number" min="0.01" step="0.1" value={selected ? selected.scale.x : ''} onChange={e => setSelectedScale('x', e.target.value)} />
          <span>Y</span><input type="number" min="0.01" step="0.1" value={selected ? selected.scale.y : ''} onChange={e => setSelectedScale('y', e.target.value)} />
          <span>Z</span><input type="number" min="0.01" step="0.1" value={selected ? selected.scale.z : ''} onChange={e => setSelectedScale('z', e.target.value)} />
          <label style={{ marginLeft: 6 }}>
            <input type="checkbox" checked={lockUniformXZ} onChange={e => setLockUniformXZ(e.target.checked)} /> XZ равны
          </label>
        </div>
        <div>
          <b>Курсор</b>: X {cursorXZ.x.toFixed(2)} | Z {cursorXZ.z.toFixed(2)}
        </div>
        <div>
          <button onClick={exportJSON}>Экспорт JSON</button>
          <label style={{ marginLeft: 8 }}>
            Импорт JSON
            <input type="file" accept="application/json" style={{ display: 'block' }} onChange={(e) => e.target.files && e.target.files[0] && importJSON(e.target.files[0])} />
          </label>
        </div>
        <div>
          Подсказка: стрелки двигают точку прицеливания камеры (Shift — быстрее)
        </div>
      </div>
    </div>
  );
}
