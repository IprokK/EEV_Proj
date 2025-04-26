// src/components/LoginScene.jsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import init from '../three/init';       // ваш старый init.js
import './LoginScene.css';             // стили можно вынести

export default function LoginScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    // 1) Инициализируем сцену, камеру и WebGL-рендерер
    const { sizes, scene, canvas, camera, renderer, controls } = init();
    mountRef.current.appendChild(renderer.domElement);

    // 2) CSS3DRenderer для формы
    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(sizes.width, sizes.height);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = 0;
    mountRef.current.appendChild(cssRenderer.domElement);

    // 3) Добавляем пол, свет, текст и модели (скопируйте из вашего script.js)
    //    … ваш код Floor, lights, FontLoader, skyscrapers …

    // 4) Форма логина
    let currentForm = null;
    function createForm(html, position, scale = 0.005) {
      if (currentForm) scene.remove(currentForm);
      const div = document.createElement('div');
      div.style.width = '300px';
      div.style.background = 'rgba(34,34,51,0.9)';
      div.style.padding = '35px';
      div.innerHTML = html;
      div.querySelectorAll('input, button').forEach(el => {
        el.style.width = '100%';
        el.style.boxSizing = 'border-box';
        el.style.marginBottom = '10px';
      });
      const cssObj = new CSS3DObject(div);
      cssObj.position.copy(position);
      cssObj.scale.set(scale, scale, scale);
      currentForm = cssObj;
      scene.add(cssObj);
      return div;
    }

    function showLoginForm() {
      const html = `
        <h2 style="color:#fff; text-align:center; margin-bottom:20px;">Войти</h2>
        <input id="loginEmail"  type="email"    placeholder="Email"      />
        <input id="loginPass"   type="password" placeholder="Пароль"     />
        <button id="loginBtn">Войти</button>
        <p style="text-align:center; margin-top:10px;">
          <a href="#" id="toRegister" style="color:#557788;">Регистрация</a>
        </p>`;
      const el = createForm(html, new THREE.Vector3(-1.2, 1.3, 2.95));
      el.querySelector('#loginBtn').onclick = async () => {
        const email = el.querySelector('#loginEmail').value;
        const password = el.querySelector('#loginPass').value;
        // вызвать вашу логику /api/login и перенаправление
        // fetch('/api/login')...
      };
      el.querySelector('#toRegister').onclick = e => {
        e.preventDefault();
        showRegisterForm();
      };
    }

    function showRegisterForm() {
      const html = `
        <h2 style="color:#fff; text-align:center; margin-bottom:20px;">Регистрация</h2>
        <input id="regEmail"    type="email"    placeholder="Email" />
        <input id="regAge"      type="number"   placeholder="Возраст" />
        <input id="regPass"     type="password" placeholder="Пароль" />
        <input id="regPassConf" type="password" placeholder="Повтор пароля" />
        <button id="regBtn">Зарегистрироваться</button>
        <p style="text-align:center; margin-top:10px;">
          <a href="#" id="toLogin" style="color:#557788;">← Войти</a>
        </p>`;
      const el = createForm(html, new THREE.Vector3(-1.2, 1.3, 2.95));
      el.querySelector('#toLogin').onclick = e => {
        e.preventDefault();
        showLoginForm();
      };
      el.querySelector('#regBtn').onclick = async () => {
        // fetch('/api/register')...
      };
    }

    // 5) Подгружаем модель пользователя и сразу показываем форму логина
    const loader = new GLTFLoader();
    let mixer = null;
    loader.load('/models/Punk.glb', gltf => {
      const punk = gltf.scene;
      punk.position.set(0, 0, 3);
      scene.add(punk);
      mixer = new THREE.AnimationMixer(punk);
      mixer.clipAction(gltf.animations[0]).play();
      showLoginForm();
    });

    // 6) Запуск анимации
    const clock = new THREE.Clock();
    function tick() {
      const delta = clock.getDelta();
      controls.update();
      renderer.render(scene, camera);
      cssRenderer.render(scene, camera);
      if (mixer) mixer.update(delta);
      requestAnimationFrame(tick);
    }
    tick();

    // 7) Очистка при размонтировании
    return () => {
      mountRef.current.innerHTML = '';
      window.removeEventListener('resize', /*…*/);
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh', position: 'relative' }} />;
}
