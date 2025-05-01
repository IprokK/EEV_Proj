// ...весь импорт остаётся без изменений
// ...весь импорт остаётся без изменений
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import init from './init';
import './style.css';

const { sizes, camera, scene, canvas, controls, renderer } = init();
const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.style.position = 'absolute';
cssRenderer.domElement.style.top = '0';
document.body.appendChild(cssRenderer.domElement);

camera.position.set(-1.5, 1.2, 5);

// Плоскость земли
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
        color: "#C0C0C0",
        metalness: 0,
        roughness: 0.5,
    }),
);
floor.scale.set(3, 3, 3);
floor.receiveShadow = true;
floor.rotation.x = -Math.PI * 0.5;
scene.add(floor);

// Загрузка текста
const fontLoader = new FontLoader();
fontLoader.load('https://unpkg.com/three@0.77.0/examples/fonts/helvetiker_regular.typeface.json', (font) => {
    const textGeometry = new TextGeometry('Game Name', {
        font: font,
        size: 18,
        height: 5,
        curveSegments: 32,
        bevelEnabled: true,
        bevelThickness: 0.5,
        bevelSize: 0.5,
        bevelSegments: 8,
    });

    const material = new THREE.MeshStandardMaterial({ color: 'hotpink', roughness: 0.5 });
    const textMesh = new THREE.Mesh(textGeometry, material);
    textMesh.position.set(-3.3, 0.05, 2.7);
    textMesh.scale.set(0.01, 0.01, 0.001);
    textMesh.rotation.y = Math.PI * 0.15;
    scene.add(textMesh);
});

// Свет
const hemLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61);
hemLight.position.set(0, 50, 0);
scene.add(hemLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.54);
dirLight.position.set(-8, 12, 0);
dirLight.castShadow = true;
dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024);
scene.add(dirLight);

// Загрузка моделей
const loader = new GLTFLoader();
for (let x = -6; x <= 2; x += 2) {
    loader.load('./models/Skyscraper.glb', (gltf) => {
        const model = gltf.scene;
        model.position.set(x, 0, x === 2 ? 2 : 0);
        model.scale.set(1.2, 1.2, 1.2);
        scene.add(model);
    });
}

let mixer = null;
const buttons = [];
let currentForm = null;

const createForm = (html, position, scale = 0.005) => {
    if (currentForm) scene.remove(currentForm);
    const div = document.createElement('div');
    div.style.width = '300px';
    div.style.background = 'rgba(34,34,51,0.9)';
    div.style.padding = '35px';
    div.style.boxSizing = 'border-box';
    div.innerHTML = html;

    div.querySelectorAll('input, button').forEach(el => {
        el.style.width = '100%';
        el.style.boxSizing = 'border-box';
    });

    const cssObject = new CSS3DObject(div);
    cssObject.position.copy(position);
    cssObject.scale.set(scale, scale, scale);
    currentForm = cssObject;
    scene.add(cssObject);
    return div;
};

const showLoginForm = () => {
    const html = `
        <h2 style="color:#fff; text-align:center; margin-bottom:20px;">Персонаж</h2>
        <div style="color:#fff; margin-bottom:10px; font-size:16px;">Имя персонажа: <strong>Артур</strong></div>
        <div style="color:#fff; margin-bottom:10px; font-size:16px;">Кошелек: <strong>1200₽</strong></div>
        <div style="color:#fff; margin-bottom:10px; font-size:16px;">Сила: <strong>15</strong></div>
        <div style="color:#fff; margin-bottom:10px; font-size:16px;">Ловкость: <strong>12</strong></div>
        <button id="loginBtn" style="width:100%; padding:10px; font-size:16px; cursor:pointer;">Продолжить</button>
    `;
    const el = createForm(html, new THREE.Vector3(-1.2, 1.3, 2.95));

    el.querySelector('#loginBtn').addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Переход в игру...');
    });
};

loader.load('./models/Punk.glb', (gltf) => {
    const punk = gltf.scene;
    punk.position.set(0, 0, 3);
    punk.scale.set(1, 1, 1);
    scene.add(punk);

    if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(punk);
        const action = mixer.clipAction(gltf.animations[7] || gltf.animations[0]);
        action.play();
    }

    showLoginForm();
});

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

// Анимация и рендеринг
const clock = new THREE.Clock();
scene.background = new THREE.Color('#E0FFFF');

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

canvas.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(buttons);
    if (intersects.length > 0) {
        const clicked = intersects[0].object;
        alert(`Нажата ${clicked.userData.label}`);
    }
});

const tick = () => {
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }
    controls.update();
    renderer.render(scene, camera);
    cssRenderer.render(scene, camera);
    window.requestAnimationFrame(tick);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
};
tick();

window.addEventListener('resize', () => {
    if (window.innerWidth < 850) {
        camera.fov = 110;
    } else {
        camera.fov = 75;
    }
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    cssRenderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.render(scene, camera);
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

window.addEventListener('dblclick', () => {
    if (!document.fullscreenElement) {
        document.body.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});
