/*
- Проблема с игроками они множатся
- Проблема с перемещением между городами (исчезновение и появление игроков)
- Проблема с Null полусферами
*/
import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import PF from 'pathfinding';
import { io } from 'socket.io-client';
import DoubleTapWrapper from './pages/DoubleTapWrapper';


function Game({ avatarUrl, gender }) {
    const [activeApp, setActiveApp] = useState(null);
  const mountRef = useRef(null);
  const socketRef = useRef(null);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const [orgMenu, setOrgMenu] = useState(null);
  const [satiety, setSatiety] = useState(() => {
    const p = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
    return p.satiety ?? 100;
  });

  const statsRef = useRef(null);
  const voiceConnections = useRef({});
  const localStream = useRef(null);
  const voiceIcons = useRef({});

    //Телефон
    const [activeChat, setActiveChat] = useState(null);
      // Добавьте этот код в начало компонента Game, рядом с другими состояниями
    const [telegramContacts, setTelegramContacts] = useState([]);
    const [isIframeOpen, setIsIframeOpen] = useState(false);
    const [iframeUrl, setIframeUrl] = useState('');




    const [appsHidden, setAppsHidden] = useState(false);
    const [isPhoneVisible, setIsPhoneVisible] = useState(true);
    const [isChatVisible, setIsChatVisible] = useState(true);
    const handleAppClick = (appName) => {
        setAppsHidden(true);
        setActiveApp(appName);
        if (appName === "Telegram") {
            loadTelegramContacts(); // Загрузка контактов при открытии
        }
    };

    const closeApp = () => {
        setAppsHidden(false);
        setActiveApp(null);
    };

    const bodyStyle = {
        margin: 0,
        fontFamily: "'Arial', sans-serif",
        background: '#f1f1f1',
        color: '#333',
        minHeight: '100vh'
    };

    const headerStyle = {
        backgroundColor: '#0047ab',
        color: 'white',
        padding: '1em',
        textAlign: 'center'
    };

    const mainStyle = {
        padding: '1em'
    };

    const listingStyle = {
        background: 'white',
        borderRadius: '10px',
        padding: '1em',
        marginBottom: '1em',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    };

    const imageStyle = {
        width: '100%',
        borderRadius: '10px'
    };

    const listingTitleStyle = {
        marginTop: '0.5em',
        marginBottom: '0.3em'
    };

    const openIframe = (url) => {
        setIframeUrl(url);
        setIsIframeOpen(true);
    };

    const closeIframe = () => {
        setIsIframeOpen(false);
        setIframeUrl('');
    };

async function loadTelegramContacts() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setTelegramContacts(data);
    } else {
      console.error('Ошибка загрузки контактов Telegram');
    }
  } catch (err) {
    console.error('Ошибка сети:', err);
  }
    }

    // Дополняем состояния
    const [newMessage, setNewMessage] = useState("");
    const [messageInterval, setMessageInterval] = useState(null);
    const [messages, setMessages] = useState([]);
    const [userProfile, setUserProfile] = useState(null);

    // Функция загрузки сообщений
    async function loadMessages(contactId) {
        if (!contactId) return;

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/messages/${contactId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(data);

                // Прокручиваем чат вниз
                setTimeout(() => {
                    const chatContainer = document.getElementById('chatContainer');
                    if (chatContainer) {
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                }, 100);
            } else {
                console.error('Ошибка загрузки сообщений');
            }
        } catch (err) {
            console.error('Ошибка сети:', err);
        }
    }

    // Функция отправки сообщения
    async function sendMessage() {
        if (!activeChat || !newMessage.trim()) return;

        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    receiverId: activeChat.id,
                    message: newMessage
                })
            });

            if (res.ok) {
                setNewMessage("");
                // После отправки сразу обновляем сообщения
                loadMessages(activeChat.id);
            } else {
                console.error('Ошибка отправки сообщения');
            }
        } catch (err) {
            console.error('Ошибка сети:', err);
        }
    }

    // Запускаем интервал при открытии чата
    useEffect(() => {
        if (activeChat) {
            // Первоначальная загрузка сообщений
            loadMessages(activeChat.id);

            // Запускаем интервал для проверки новых сообщений
            const interval = setInterval(() => {
                loadMessages(activeChat.id);
            }, 1000); // Проверка каждую секунду

            setMessageInterval(interval);

            // Очищаем интервал при закрытии чата
            return () => {
                if (interval) clearInterval(interval);
            };
        } else {
            // Останавливаем интервал, если чат закрыт
            if (messageInterval) {
                clearInterval(messageInterval);
                setMessageInterval(null);
            }
            setMessages([]);
        }
    }, [activeChat]);

    // Очищаем интервал при размонтировании компонента
    useEffect(() => {
        return () => {
            if (messageInterval) {
                clearInterval(messageInterval);
            }
        };
    }, []);

    // Загружаем профиль при монтировании
    useEffect(() => {
        const profile = JSON.parse(sessionStorage.getItem('user_profile') || {});
        setUserProfile(profile);
    }, []);

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

  async function toggleMicrophone() {
    try {
      if (!micEnabled) {
        localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicEnabled(true);
        socketRef.current?.emit('voiceChatToggle', { enabled: true });
        
         const track = localStream.current.getAudioTracks()[0];
        Object.values(voiceConnections.current).forEach(conn => {
          if (conn.audioSender && track) {
            conn.audioSender.replaceTrack(track);
          }
        });
      } else {
        if (localStream.current) {
          localStream.current.getTracks().forEach(track => track.stop());
        }
        Object.values(voiceConnections.current).forEach(conn => {
          if (conn.audioSender) {
            conn.audioSender.replaceTrack(null);
          }
        });
        localStream.current = null;
        setMicEnabled(false);
        socketRef.current?.emit('voiceChatToggle', { enabled: false });
      }
    } catch (err) {
      console.error('Ошибка доступа к микрофону:', err);
    }
  }
<<<<<<< HEAD
=======

  async function openOrganizationMenu(objectId) {
    const token = localStorage.getItem('token');
    const res = await fetch(
      `/api/organizations/by-object/${objectId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      const data = await res.json();
      setOrgMenu(data);
      setSelectedHouse(null);
    } else {
      console.error('Не удалось загрузить меню организации для объекта', objectId);
    }
  }

  async function buyItem(key) {
    if (!orgMenu) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/organizations/${orgMenu.id}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itemKey: key })
    });
    if (res.ok) {
      const data = await res.json();
      setSatiety(data.satiety);
      const profile = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
      profile.satiety = data.satiety;
      sessionStorage.setItem('user_profile', JSON.stringify(profile));
    }
  }

>>>>>>> 5450df7a34b32d0854b33d441fe3988ffd837684
  useEffect(() => {
    console.log('[DEBUG] useEffect вызван');
    const mount = mountRef.current;
    if (!mount) {
      console.log('[DEBUG] mountRef.current не определён!');
      return;
    }

    console.log('–– useEffect начало');

    const baseOffset = new THREE.Vector3(-200, 150, -200);
    const planarDist = Math.hypot(baseOffset.x, baseOffset.z);
    const radius = Math.hypot(planarDist, baseOffset.y);
    const baseAzimuth = Math.atan2(baseOffset.z, baseOffset.x);
    const basePolar = Math.atan2(baseOffset.y, planarDist);

    let cameraPitchOffset = 0;
    const maxPitch = THREE.MathUtils.degToRad(10);

    let zoom = 10;
    const minZoom = zoom * 0.1;
    const maxZoom = zoom * 1.5;

    let scene, camera, renderer;
    let player, mixer;
    let idleAction, walkAction, currentAction;
    let remotePlayers = {};
    let obstacles = [];
    let destination = null;
    const moveSpeed = 5;
    const clock = new THREE.Clock();
    const keys = {};

    const territorySize = 500;
    const boundary = territorySize / 2;
    const gridSize = 300;
    const nodeSize = territorySize / gridSize;

    let pathfinderGrid;
    let currentPath = [];
    let pathIndex = 0;
    let groundPlane;
    let destinationMarker;

    const token = localStorage.getItem('token');
<<<<<<< HEAD
    socketRef.current = io(`localhost:4000`, {
=======
    socketRef.current = io({
    transports: ['websocket','polling'],
>>>>>>> 5450df7a34b32d0854b33d441fe3988ffd837684
      auth: { token }
    });
    const socket = socketRef.current;

    console.log('socket инстанс:', socket);
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
      model.scale.set(1, 1, 1);
      model.position.set(x, 0, z);
      scene.add(model);

      const fullname = `${firstName} ${lastName}`.trim();
      if (fullname) {
        const label = createPlayerLabel(fullname);
        label.position.set(0, 2.2, 0);
        model.add(label);
      }

      // Add voice chat icon (initially hidden)
      const voiceIcon = createVoiceIcon();
      voiceIcon.position.set(0, 2.7, 0);
      voiceIcon.visible = false;
      model.add(voiceIcon);
      voiceIcons.current[id] = voiceIcon;

      const mixerRemote = new THREE.AnimationMixer(model);

      const isFemale = genderRemote === 'female';
      const animGender = isFemale ? 'feminine' : 'masculine';

      const idleFile = isFemale ? 'F_Standing_Idle_001.glb' : 'M_Standing_Idle_001.glb';
      const walkFile = isFemale ? 'F_Walk_002.glb' : 'M_Walk_001.glb';

      const idlePath = `/animations/${animGender}/glb/idle/${idleFile}`;
      const walkPath = `/animations/${animGender}/glb/locomotion/${walkFile}`;

      const [idleGltf, walkGltf] = await Promise.all([
        animLoader.loadAsync(idlePath),
        animLoader.loadAsync(walkPath)
      ]);

      idleGltf.animations.forEach(stripPositionTracks);
      walkGltf.animations.forEach(stripPositionTracks);

      const remoteIdleAction = mixerRemote.clipAction(idleGltf.animations[0], model);
      const remoteWalkAction = mixerRemote.clipAction(walkGltf.animations[0], model);

      remoteIdleAction.play();

      remotePlayers[id] = {
        model,
        mixer: mixerRemote,
        idleAction: remoteIdleAction,
        walkAction: remoteWalkAction,
        currentAction: remoteIdleAction,
        firstName,
        lastName,
        gender: genderRemote,
        avatarURL,
        _idleTimeout: null
      };

      remotePlayers[id].walkAction.setEffectiveTimeScale(0.6);
    }

    function createVoiceIcon() {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(32, 32, 20, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎤', 32, 32);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;

      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(0.5, 0.5, 1);
      return sprite;
    }

    async function initiateVoiceChat(peerId) {
      if (voiceConnections.current[peerId]) return;

      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });


      voiceConnections.current[peerId] = {
        peerConnection,
        audioElement: document.createElement('audio'),
        pendingCandidates: [],
        audioSender: null
      };

      voiceConnections.current[peerId].audioElement.autoplay = true;
      document.body.appendChild(voiceConnections.current[peerId].audioElement);

      peerConnection.ontrack = (event) => {
        voiceConnections.current[peerId].audioElement.srcObject = event.streams[0];
      };

      // В функции initiateVoiceChat, перед peerConnection.onicecandidate, добавьте (18.05.2025):
      voiceConnections.current[peerId].pendingCandidates = [];

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('voiceChatIceCandidate', {
            to: peerId,
            candidate: event.candidate
          });
        }
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
          cleanupVoiceConnection(peerId);
        }
      };

      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('voiceChatOffer', { to: peerId, offer });
      } catch (err) {
        console.error('Ошибка создания WebRTC предложения:', err);
      }
    }

    function cleanupVoiceConnection(peerId) {
      if (voiceConnections.current[peerId]) {
        const conn = voiceConnections.current[peerId];
        try {
          conn.audioSender?.replaceTrack(null);
        } catch {}
        conn.peerConnection.close();
        conn.audioElement.remove();
        delete voiceConnections.current[peerId];
      }
    }

    socket.on('voiceChatNearby', ({ playerId }) => {
      if (remotePlayers[playerId] && !voiceConnections.current[playerId]) {
        if (socket.id < playerId) {
          initiateVoiceChat(playerId);
        }
      }
    });

    socket.on('voiceChatOffer', async ({ from, offer }) => {
      if (!voiceConnections.current[from]) {
        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        voiceConnections.current[from] = {
          peerConnection,
          audioElement: document.createElement('audio'),
          pendingCandidates: [],
          audioSender: null
        };

        voiceConnections.current[from].audioElement.autoplay = true;
        document.body.appendChild(voiceConnections.current[from].audioElement);

        peerConnection.ontrack = (event) => {
          voiceConnections.current[from].audioElement.srcObject = event.streams[0];
        };

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('voiceChatIceCandidate', {
              to: from,
              candidate: event.candidate
            });
          }
        };

        peerConnection.onconnectionstatechange = () => {
          if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
            cleanupVoiceConnection(from);
          }
        };

        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          const remoteTransceiver = peerConnection.getTransceivers().find(
            t => t.receiver && t.receiver.track && t.receiver.track.kind === 'audio'
          );
          if (remoteTransceiver) {
            remoteTransceiver.direction = 'sendrecv';
            voiceConnections.current[from].audioSender = remoteTransceiver.sender;
            if (localStream.current) {
              const track = localStream.current.getAudioTracks()[0];
              if (track) {
                await remoteTransceiver.sender.replaceTrack(track);
              }
            }
          }
          // В обработчике voiceChatOffer, после await peerConnection.setRemoteDescription, добавьте (18.05.2025):
          const pendingCandidates = voiceConnections.current[from].pendingCandidates || [];
          for (const candidate of pendingCandidates) {
            try {
              await voiceConnections.current[from].peerConnection.addIceCandidate(
                new RTCIceCandidate(candidate)
              );
            } catch (err) {
              console.error('Ошибка добавления буферизованного ICE кандидата:', err);
            }
          }
          voiceConnections.current[from].pendingCandidates = [];
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit('voiceChatAnswer', { to: from, answer });
        } catch (err) {
          console.error('Ошибка обработки WebRTC предложения:', err);
        }
      }
    });

    socket.on('voiceChatAnswer', async ({ from, answer }) => {
      if (voiceConnections.current[from]) {
        try {
          await voiceConnections.current[from].peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
          const pending = voiceConnections.current[from].pendingCandidates || [];
          for (const candidate of pending) {
            try {
              await voiceConnections.current[from].peerConnection.addIceCandidate(
                new RTCIceCandidate(candidate)
              );
            } catch (err) {
              console.error('Ошибка добавления буферизованного ICE кандидата:', err);
            }
          }
          voiceConnections.current[from].pendingCandidates = [];
        } catch (err) {
          console.error('Ошибка установки WebRTC ответа:', err);
        }
      }
    });


    // Замените обработчик voiceChatIceCandidate на (18.05.2025):
    socket.on('voiceChatIceCandidate', async ({ from, candidate }) => {
      if (!voiceConnections.current[from]) {
        console.warn('Соединение для', from, 'не существует, пропущен ICE кандидат');
        return;
      }

      const peerConnection = voiceConnections.current[from].peerConnection;

      if (peerConnection.remoteDescription) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Ошибка добавления ICE кандидата:', err);
        }
      } else {
        console.log('Буферизация ICE кандидата для', from);
        voiceConnections.current[from].pendingCandidates.push(candidate);
      }
    });

    socket.on('voiceChatStatus', ({ playerId, enabled }) => {
      if (voiceIcons.current[playerId]) {
        voiceIcons.current[playerId].visible = enabled;
      }
    });

    socket.on('connect', () => console.log('Socket connected, id=', socket.id));
    socket.on('currentPlayers', (players) => {
      console.log('currentPlayers', players);
      // Получаем cityId текущего игрока из профиля
      const myProfile = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
      const myCityId = myProfile.last_city_id || 1;
      Object.keys(players).forEach(id => {
        if (id === socket.id) return;
        const { x, z, avatarURL, gender, firstName, lastName, cityId } = players[id];
        if (cityId && cityId !== myCityId) return; // показываем только игроков своего города
        addOtherPlayer(id, x, z, avatarURL, gender, firstName, lastName);
      });
      // После получения списка игроков, отправляем newPlayer о себе
      const profile = myProfile;
      socket.emit('newPlayer', {
        x: player?.position?.x || 0,
        z: player?.position?.z || 0,
        avatarURL: avatarUrl,
        firstName: profile.firstName,
        lastName: profile.lastName,
        userId: profile.id,
        cityId: myCityId
      });
    });

    socket.on('chatMessage', ({ playerId, name, message, position }) => {
      console.log('← chatMessage получил:', message);
      if (!player || !camera || !scene || !obstacles) return;

      const origin = camera.position.clone();
      const targetPos = new THREE.Vector3(position.x, player.position.y, position.z);
      const direction = new THREE.Vector3().subVectors(targetPos, origin).normalize();
      const raycaster = new THREE.Raycaster(origin, direction);
      const obstacleMeshes = obstacles.map(o => o.mesh);
      const intersects = raycaster.intersectObjects(obstacleMeshes, true);
      const distanceToTarget = origin.distanceTo(targetPos);

      if (intersects.length > 0 && intersects[0].distance < distanceToTarget) {
        console.log(`🔕 ${name} за препятствием — сообщение скрыто`);
        return;
      }

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

    socket.on('playerMoved', (data) => {
      const remote = remotePlayers[data.playerId];
      if (!remote) return;

      const newPos = new THREE.Vector3(data.x, 0, data.z);
      const dir = new THREE.Vector3().subVectors(newPos, remote.model.position);
      if (dir.lengthSq() > 1e-4) {
        const angle = Math.atan2(dir.x, dir.z);
        const targetQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, angle, 0)
        );
        remote.model.quaternion.slerp(targetQuat, 0.2);
      }

      remote.targetPosition = newPos.clone();

      if (remote.currentAction !== remote.walkAction) {
        remote.currentAction.fadeOut(0.2);
        remote.walkAction.reset().fadeIn(0.2).play();
        remote.currentAction = remote.walkAction;
      }

      clearTimeout(remote._idleTimeout);
      remote._idleTimeout = setTimeout(() => {
        if (remote.currentAction !== remote.idleAction) {
          remote.currentAction.fadeOut(0.2);
          remote.idleAction.reset().fadeIn(0.2).play();
          remote.currentAction = remote.idleAction;
        }
      }, 500);

      // Update voice chat volume based on distance
      if (voiceConnections.current[data.playerId]) {
        const dist = player.position.distanceTo(newPos);
        const maxDist = 50;
        const volume = Math.max(0, 1 - dist / maxDist);
        voiceConnections.current[data.playerId].audioElement.volume = volume;
      }
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
      if (voiceIcons.current[id]) {
        delete voiceIcons.current[id];
      }
      cleanupVoiceConnection(id);
    });

    function onMouseWheel(e) {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;

      if (e.ctrlKey) {
        cameraPitchOffset = THREE.MathUtils.clamp(
          cameraPitchOffset + delta,
          -maxPitch,
          maxPitch
        );
      } else {
        zoom = THREE.MathUtils.clamp(zoom * (1 + delta), minZoom, maxZoom);
        camera.zoom = zoom;
        camera.updateProjectionMatrix();
      }
    }

    async function init() {
      scene = new THREE.Scene();

      const aspect = window.innerWidth / window.innerHeight;
      const d = 200;
      camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
      camera.position.set(200, 200, 200);

      camera.zoom = zoom;
      camera.updateProjectionMatrix();

      camera.lookAt(scene.position);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      mountRef.current.appendChild(renderer.domElement);

      renderer.domElement.addEventListener('wheel', onMouseWheel, { passive: false });

      const planeGeometry = new THREE.PlaneGeometry(territorySize, territorySize);
      const planeMaterial = new THREE.MeshLambertMaterial({ color: 0x00aa00, side: THREE.DoubleSide });
      groundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
      groundPlane.rotation.x = -Math.PI / 2;
      scene.add(groundPlane);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(50, 100, 50);
      scene.add(directionalLight);

      const markerGeometry = new THREE.SphereGeometry(0.5, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      destinationMarker = new THREE.Mesh(markerGeometry, markerMaterial);
      destinationMarker.visible = false;
      scene.add(destinationMarker);

      const loadingManager = new THREE.LoadingManager(() => {
        console.log("Все текстуры загружены");
      });
      const textureLoader = new THREE.TextureLoader(loadingManager);
      const baseTexture = textureLoader.load('textures/base.png');
      const customMaterial = new THREE.MeshStandardMaterial({
        map: baseTexture,
      });

      // Загрузка объектов города из базы данных
      let loadedModelsCount = 0;
      let cityObjects = [];
      let totalModelsToLoad = 0;
      try {
        const profile = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
        const cityId = profile.last_city_id || 1; // по умолчанию 1, если нет
        console.log('[DEBUG] cityId для загрузки объектов:', cityId);
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/cities/${cityId}/objects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        cityObjects = await res.json();
        console.log('[DEBUG] Список объектов для загрузки (cityObjects):', cityObjects);
        totalModelsToLoad = cityObjects.length;
      } catch (e) {
        console.error('[DEBUG] Ошибка загрузки объектов города:', e);
        cityObjects = [];
        totalModelsToLoad = 0;
      }

      console.log('[DEBUG] cityObjects:', cityObjects);
      try {
        cityObjects.forEach(obj => {
          console.log('[DEBUG] Загружаю объект:', obj);
          gltfLoader.load(
            obj.model_url,
            (gltf) => {
              const model = gltf.scene;
              model.userData = {
                id: obj.id,                    // уникальный ID объекта
                type: obj.name,                // название типа модели
                organizationId: obj.organization_id, // ID организации
                rent: obj.rent,                // стоимость аренды (если есть)
                tax: obj.tax                   // налог (если есть)
              };

              model.scale.set(1, 1, 1);
              model.position.set(obj.pos_x, obj.pos_y, obj.pos_z);
              model.rotation.set(obj.rot_x, obj.rot_y, obj.rot_z);
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
              console.log(`[DEBUG] Модель ${obj.name} успешно загружена (${loadedModelsCount}/${totalModelsToLoad})`);
              if (loadedModelsCount === totalModelsToLoad) {
                console.log('[DEBUG] Все модели загружены. Строим сетку...');
                buildPathfindingGrid();
              }
            },
            undefined,
            (error) => {
              console.error(`[DEBUG] Ошибка загрузки модели ${obj.name}:`, error);
            }
          );
        });
      } catch (e) {
        console.error('[DEBUG] Ошибка в cityObjects.forEach:', e);
      }

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      renderer.domElement.addEventListener('pointerdown', onDocumentMouseDown);

      try {
        const gltf = await loadPlayerModel(avatarUrl);
        player = gltf.scene;
        scene.add(player);
        player.scale.set(1, 1, 1);
        player.position.set(0, 0, 0);

        const profile = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
        const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();

        mountRef.current = myName;

        const nameLabel = createPlayerLabel(myName);
        nameLabel.position.set(0, 2.2, 0);
        player.add(nameLabel);

        mixer = new THREE.AnimationMixer(player);

        const isFemale = gender === 'female';
        const animGender = isFemale ? 'feminine' : 'masculine';

        const idlePath = `/animations/${animGender}/glb/idle/${
          isFemale ? 'F_Standing_Idle_001.glb' : 'M_Standing_Idle_001.glb'
        }`;
        const walkPath = `/animations/${animGender}/glb/locomotion/${
          isFemale ? 'F_Walk_002.glb' : 'M_Walk_001.glb'
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

        idleAction.play();
        currentAction = idleAction;

        updateCameraFollow();

        socketRef.current?.emit('newPlayer', {
          x: player.position.x,
          z: player.position.z,
          avatarURL: avatarUrl,
          firstName: profile.firstName,
          lastName: profile.lastName,
          userId: profile.id
        });
      } catch (err) {
        console.error("Ошибка загрузки модели игрока:", err);
      }
    }

    function stripPositionTracks(clip) {
      clip.tracks = clip.tracks.filter(track => !track.name.endsWith('.position'));
      return clip;
    }

    function computePath(fromVec3, toVec3) {
      const startX = Math.floor((fromVec3.x + boundary) / nodeSize);
      const startZ = Math.floor((fromVec3.z + boundary) / nodeSize);
      const endX = Math.floor((toVec3.x + boundary) / nodeSize);
      const endZ = Math.floor((toVec3.z + boundary) / nodeSize);

      const finder = new PF.AStarFinder({
        allowDiagonal: true,
        dontCrossCorners: true,
        diagonalMovement: PF.DiagonalMovement.OnlyWhenNoObstacles
      });
      const gridClone = pathfinderGrid.clone();

      if (!gridClone.isWalkableAt(startX, startZ)) {
        gridClone.setWalkableAt(startX, startZ, true);
      }

      if (!gridClone.isWalkableAt(endX, endZ)) {
        gridClone.setWalkableAt(endX, endZ, true);
      }

      const rawPath = finder.findPath(startX, startZ, endX, endZ, gridClone);
      if (!rawPath.length) return [];

      const smooth = PF.Util.smoothenPath(gridClone, rawPath);
      return smooth.map(([x, z]) => new THREE.Vector3(
        x * nodeSize - boundary + nodeSize / 2,
        fromVec3.y,
        z * nodeSize - boundary + nodeSize / 2
      ));
    }

    function buildPathfindingGrid() {
      pathfinderGrid = new PF.Grid(gridSize, gridSize);

      obstacles.forEach(o => {
        const box = new THREE.Box3().setFromObject(o.mesh);

        let minX = Math.floor((box.min.x + boundary) / nodeSize);
        let maxX = Math.floor((box.max.x + boundary) / nodeSize);
        let minZ = Math.floor((box.min.z + boundary) / nodeSize);
        let maxZ = Math.floor((box.max.z + boundary) / nodeSize);

        minX = Math.max(0, Math.min(gridSize - 1, minX));
        maxX = Math.max(0, Math.min(gridSize - 1, maxX));
        minZ = Math.max(0, Math.min(gridSize - 1, minZ));
        maxZ = Math.max(0, Math.min(gridSize - 1, maxZ));

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

      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const houseIntersects = raycaster.intersectObjects(
        obstacles.map(o => o.mesh), true
      );
      if (houseIntersects.length) {
        const mesh = houseIntersects[0].object;
        const root = mesh.parent;
        const { id: objectId, type, rent, tax, organizationId } = root.userData;
        if (objectId && organizationId) {
          // Вызываем меню по правильному ID объекта
          openOrganizationMenu(objectId);
        } else {
          // Простое окно информации об аренде/налоге
          setSelectedHouse({ type, rent, tax });
        }
        return;
      }

      setSelectedHouse(null);
      setOrgMenu(null);

      const remoteModels = Object.values(remotePlayers).map(r => r.model);
      const playerIntersects = raycaster.intersectObjects(remoteModels, true);
      if (playerIntersects.length) {
        let mesh = playerIntersects[0].object;
        while (mesh && !remoteModels.includes(mesh)) mesh = mesh.parent;
        const entry = Object.entries(remotePlayers).find(([, r]) => r.model === mesh);
        if (entry) {
          const [id, r] = entry;
          setSelectedPlayer({ socketId: id, firstName: r.firstName, lastName: r.lastName });
          setPlayerStats(null);
          return;
        }
      }

      const intersects = raycaster.intersectObject(groundPlane);
      if (intersects.length === 0) {
        console.log("Клик не попал по плоскости");
        return;
      }

      destination = intersects[0].point.clone();
      destination.y = player.position.y;

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

      const fontSize = 15;
      ctx.fillStyle = 'white';
      ctx.font = `${fontSize}px Arial`;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillText(text, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;

      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);

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

      const stepDistance = moveSpeed * delta;
      if (distance < stepDistance) {
        player.position.copy(target);
        pathIndex++;
        if (pathIndex >= currentPath.length) {
          currentPath = [];
          destination = null;
          if (currentAction !== idleAction) {
            currentAction.fadeOut(0.2);
            idleAction.reset().fadeIn(0.2).play();
            currentAction = idleAction;
          }
        }
        return;
      }

      direction.normalize();
      const step = direction.multiplyScalar(stepDistance);
      const nextPos = player.position.clone().add(step);

      if (canMove(nextPos)) {
        player.position.add(step);
        const angle = Math.atan2(direction.x, direction.z);
        const targetQuat = new THREE.Quaternion()
          .setFromEuler(new THREE.Euler(0, angle, 0));
        player.quaternion.slerp(targetQuat, Math.min(1, 10 * delta));
        socketRef.current?.emit('playerMovement', { x: player.position.x, z: player.position.z });

        if (currentAction !== walkAction) {
          currentAction.fadeOut(0.2);
          walkAction.reset().fadeIn(0.2).play();
          currentAction = walkAction;
        }
      } else {
        console.warn('hit obstacle, пропускаем узел');
        if (currentAction !== idleAction) {
          console.log('Не удалось найти путь, стою');
          currentAction.fadeOut(0.2);
          idleAction.reset().fadeIn(0.2).play();
          currentAction = idleAction;
        }
        pathIndex++;
        return;
      }
    }

    function updateTransparency() {
      if (!player) return;
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

      const polar = basePolar + cameraPitchOffset;

      const planar = radius * Math.cos(polar);
      const yOff = radius * Math.sin(polar);

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
      for (let id in remotePlayers) {
        const r = remotePlayers[id];
        if (r.targetPosition) {
          r.model.position.lerp(r.targetPosition, 0.1);
        }
        r.mixer.update(delta);
      }
      renderer.render(scene, camera);
    }

    (async () => {
      await init();
      animate();
    })();

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

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('pointerdown', onDocumentMouseDown);
      renderer.domElement.removeEventListener('wheel', onMouseWheel);
      window.removeEventListener('resize', onWindowResize);
      if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
      Object.keys(voiceConnections.current).forEach(peerId => {
        cleanupVoiceConnection(peerId);
      });
    };
  }, []);

  const [showWorldMap, setShowWorldMap] = useState(false);
  const [cities, setCities] = useState([]);

  // Получить список городов при открытии карты мира
  async function openWorldMap() {
    setShowWorldMap(true);
    const token = localStorage.getItem('token');
    const res = await fetch('/api/cities', { headers: { Authorization: `Bearer ${token}` } });
    console.log('Ответ /api/cities:', res);
    if (res.ok) {
      const data = await res.json();
      console.log('Данные городов:', data);
      setCities(data);
    } else {
      console.warn('Ошибка загрузки городов:', res.status, res.statusText);
    }
  }

  function closeWorldMap() {
    setShowWorldMap(false);
  }

  async function handleCitySelect(cityId) {
    setShowWorldMap(false);
    // Отправляем событие на сервер
    socketRef.current?.emit('cityChange', { cityId });
    // Обновляем профиль в sessionStorage
    const token = localStorage.getItem('token');
    const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const profile = await res.json();
      profile.last_city_id = cityId; // явно обновляем поле
      sessionStorage.setItem('user_profile', JSON.stringify(profile));
    }
    window.location.reload();
  }

  return (
    <div ref={mountRef} style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 8px', borderRadius: 4 }}>
        Сытость: {satiety}
      </div>
      {/* Кнопка карты мира */}
      <button
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 1000,
          padding: '10px 18px',
          background: '#0047ab',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '18px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}
        onClick={openWorldMap}
      >
        Карта мира
      </button>

      {/* Модальное окно выбора города */}
      {showWorldMap && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            minWidth: '350px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)'
          }}>
            <h2 style={{ marginTop: 0 }}>Выберите город</h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {cities.map(city => (
                <li key={city.id} style={{ margin: '12px 0' }}>
                  <button
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '16px',
                      borderRadius: '8px',
                      border: '1px solid #0047ab',
                      background: '#f1f6ff',
                      color: '#0047ab',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onClick={() => handleCitySelect(city.id)}
                  >
                    {city.name} ({city.country_name})
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={closeWorldMap} style={{ marginTop: 16, background: '#eee', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>Закрыть</button>
          </div>
        </div>
      )}

      {selectedHouse && (
        <div style={{
          position: 'absolute',
          top: 20, right: 20,
          background: 'rgba(0,0,0,0.8)',
          color: '#fff', padding: 16,
          borderRadius: 8, minWidth: 220
        }}>
          <h3 style={{ margin: 0, marginBottom: 8 }}>🏠 {selectedHouse.type}</h3>
          <p style={{ margin: '4px 0' }}>
            <b>Стоимость аренды:</b> {selectedHouse.rent}
          </p>
          <p style={{ margin: '4px 0' }}>
            <b>Налог:</b> {selectedHouse.tax}
          </p>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={() => enterHouse(selectedHouse)}
                    style={btnStyle}>Войти</button>
            <button onClick={() => viewStats(selectedHouse)}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>
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

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={viewStats} style={btnStyle}>Посмотреть статистику</button>
            <button style={btnStyle} onClick={() => { /* познакомиться */ }}>Познакомиться</button>
          </div>

          {playerStats && (
            <div style={{ marginTop: 12, lineHeight: '1.4em' }}>
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

      {orgMenu && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(0,0,0,0.8)',
          color: '#fff',
          padding: 16,
          borderRadius: 8,
          minWidth: 220
        }}>
          <h3 style={{ margin: 0, marginBottom: 8 }}>{orgMenu.name}</h3>
          {orgMenu.menu && Object.keys(orgMenu.menu).map(key => (
            <div key={key} style={{marginBottom:8}}>
              <span>{orgMenu.menu[key].title} — {orgMenu.menu[key].price}₽</span>
              <button onClick={() => buyItem(key)} style={{marginLeft:8}}>Купить</button>
            </div>
          ))}
          <button onClick={() => setOrgMenu(null)} style={{ marginTop: 8 }}>Закрыть</button>
        </div>
      )}

      <DoubleTapWrapper
              onDoubleTap={() => setIsChatVisible(false)}
              onTap={() => { if (!isChatVisible) setIsChatVisible(true); }}
          >
              <div
                  style={{
                      position: 'absolute',
                      top: '20px',
                      left: '20px',
                      width: '25%',
                      height: '5%',
                      padding: '10px',
                      borderRadius: '15px',
                      fontSize: '14px',
                      zIndex: 10,
                      opacity: isChatVisible ? 1 : 0,
                      transition: 'opacity 0.3s ease',
                      // Разрешаем клики даже когда невидим
                      pointerEvents: 'auto',
                      // Прозрачная область для кликов когда скрыт
                      cursor: isChatVisible ? 'default' : 'pointer'
                  }}
                  onDoubleClick={() => setIsChatVisible(false)}
                  onClick={() => {
                      if (!isChatVisible) {
                          setIsChatVisible(true);
                      }
                  }
                  }
              >
                  <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px'
                  }}>
                      <span>Голосовой чат: {micEnabled ? 'Вкл' : 'Выкл'}</span>
                      <button
                          onClick={toggleMicrophone}
                          style={{
                              ...btnStyle,
                              background: micEnabled ? '#dc3545' : '#28a745'
                          }}
                      >
                          {micEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
                      </button>
                  </div>
                  <div id="chatMessages" style={{
                      height: '150px', // 15px 
                      overflowY: 'auto',
                      padding: '5px',
                      borderRadius: '10px',
                      color: 'white'
                  }}>
                  </div>
              </div>
          </DoubleTapWrapper>

          <DoubleTapWrapper
              onDoubleTap={() => setIsChatVisible(false)}
              onTap={() => { if (!isChatVisible) setIsChatVisible(true); }}
          >
              <div
                  style={{
                      position: 'absolute',
                      bottom: '20px',
                      left: '20px',
                      width: '25%',
                      height: '5%',
                      padding: '10px',
                      borderRadius: '15px',
                      fontSize: '14px',
                      zIndex: 10,
                      opacity: isChatVisible ? 1 : 0,
                      transition: 'opacity 0.3s ease',
                      // Разрешаем клики даже когда невидим
                      pointerEvents: 'auto',
                      // Прозрачная область для кликов когда скрыт
                      cursor: isChatVisible ? 'default' : 'pointer'
                  }}
                  onDoubleClick={() => setIsChatVisible(false)}
                  onClick={() => {
                      if (!isChatVisible) {
                          setIsChatVisible(true);
                      }
                  }
                  }
              >
                  <input
                      id="chatInput"
                      type="text"
                      placeholder="Введите сообщение..."
                      style={{
                          width: '65%',  // 50
                          padding: '5px',
                          position: 'relative',
                          left: '10px',
                          bottom: '5%',
                          opacity: '50%'
                      }}
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
          </DoubleTapWrapper>
          {/*Телефон*/}
          <DoubleTapWrapper
              onDoubleTap={() => setIsPhoneVisible(false)}
              onTap={() => { if (!isPhoneVisible) setIsPhoneVisible(true); }}
          >
              <div
                  style={{
                      position: "absolute",
                      bottom: "20px",
                      right: "20px",
                      background: "linear-gradient(#e66465, #9198e5)",
                      width: "200px",
                      aspectRatio: "10 / 19.5",
                      borderRadius: "1.5em",
                      border: "0.5em solid black",
                      overflow: "hidden",
                      zIndex: 100,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      opacity: isPhoneVisible ? 1 : 0,
                      transition: 'opacity 0.3s ease',
                      // Разрешаем клики даже когда невидим
                      pointerEvents: 'auto',
                      // Прозрачная область для кликов когда скрыт
                      cursor: isPhoneVisible ? 'default' : 'pointer'
                  }}
                  onDoubleClick={() => setIsPhoneVisible(false)}
                  onClick={() => {
                      if (!isPhoneVisible) {
                          setIsPhoneVisible(true);
                      }
                  }
                  }
              >
                  {/* Содержимое телефона */}
                  <div style={{ flex: 1, position: "relative", pointerEvents: isPhoneVisible ? 'auto' : 'none' }}>
                      {!appsHidden ? (
                          // Иконки приложений
                          <div className="app-grid" style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(3, 1fr)",
                              gap: "0.5em",
                              padding: "0.5em"
                          }}>
                              {[
                                  { src: "https://cdn-icons-png.flaticon.com/512/174/174855.png", alt: "YouTube", app: "YouTube" },
                                  { src: "https://cdn-icons-png.flaticon.com/512/732/732200.png", alt: "Gmail", app: "Gmail" },
                                  { src: "https://cdn-icons-png.flaticon.com/512/1828/1828864.png", alt: "Камера", app: "Camera" },
                                  { src: "https://cdn.iconscout.com/icon/free/png-512/free-telegram-logo-icon-download-in-svg-png-gif-file-formats--social-media-brand-pack-logos-icons-3073750.png?f=webp&w=512", alt: "Telegram", app: "Telegram" },
                                  { src: "https://cdn-icons-png.flaticon.com/512/732/732200.png", alt: "Gmail" },
                                  { src: "https://cdn-icons-png.flaticon.com/512/2111/2111398.png", alt: "Instagram" },
                                  { src: "https://cdn-icons-png.flaticon.com/512/732/732228.png", alt: "Google Drive" },
                                  { src: "https://cdn-icons-png.flaticon.com/512/732/732190.png", alt: "Chrome" },
                                  { src: "https://cdn-icons-png.flaticon.com/512/270/270798.png", alt: "Settings" },
                                  {
                                      src: "https://cdn-icons-png.flaticon.com/512/1828/1828817.png",
                                      alt: "Phone",
                                      app: "Phone"
},
                                  { src: "https://cdn-icons-png.flaticon.com/512/1828/1828864.png", alt: "Камера" },
                                  { src: "https://cdn-icons-png.flaticon.com/512/1828/1828911.png", alt: "Gallery" },
                                  { src: "https://cdn-icons-png.flaticon.com/512/1828/1828970.png", alt: "Music" },
                                  { src: "https://cdn-icons-png.flaticon.com/512/1828/1828961.png", alt: "Notes" },
                                  { src: "https://cdn-icons-png.flaticon.com/512/1828/1828843.png", alt: "Clock" },
                                  { src: "https://cdn-icons-png.flaticon.com/512/1828/1828998.png", alt: "Files" }
                              ].map((app, index) => (
                                  <button
                                      key={index}
                                      style={{
                                          width: "100%",
                                          aspectRatio: "1 / 1",
                                          borderRadius: "0.5em",
                                          border: "none",
                                          backgroundImage: `url(${app.src})`,
                                          backgroundSize: "contain",
                                          backgroundPosition: "center",
                                          backgroundRepeat: "no-repeat",
                                          cursor: "pointer"
                                      }}
                                      aria-label={app.alt}
                                      onClick={() => handleAppClick(app.app)}
                                  />
                              ))}
                          </div>
                      ) : (
                          // Псевдо-сайт
                          <div style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              padding: "1em",
                              width: "100%",
                              height: "93.175%",
                              background: "#fff",
                              color: "#000",
                              overflowY: "auto",
                              fontSize: "10px",
                              lineHeight: "1.4"
                          }}>
                              <div style={{ marginBottom: "1em", fontWeight: "bold" }}>{activeApp}</div>
                              {activeApp === "YouTube" && (
                                  <div style={bodyStyle}>
                                      <header style={headerStyle}>
                                          <h1>Недвижимость в Санкт-Петербурге</h1>
                                          <p>Лучшие предложения прямо сейчас</p>
                                      </header>
                                      <main style={mainStyle}>
                                          <div style={listingStyle}>
                                              <img
                                                  src="https://yandex-images.clstorage.net/V5t2lR153/5b1b76_Cs6Z/J2fT6H2GNMqQp5pP1PgV1n2hU6uO-QeqmIIO5oUFJLYGmDdlCheTdwp3Fes87_2cZGawZZUtHoYEDrfWOBlbiuYjgPmtwWLeQiBPTdQ5VVEq8ZfsmHgQ7AgVGTbHR7J3R1e4bddLCTyQvMi04j_pSmQy9iMF_IUd1JkuWinczlhhK1WtM5byh965VsSTMNfWbyFXJR71HOMX0Rw31Y_p6pfcemgeRsf2335F-O3zoYSuPrl1TTeCksKfLpcukMeRISgY6HjUd0NRNRyK1_QfkCfrkiYVc5oglB6Xt9-MYaLXmjWjFccHcRa2yvqouCvFazm99gHwwxdOGGMWIFgClmkiWaZ8EzXHnrUfhB24kdXm6F6qkDrZ5FiVEz5Uh2ipkFD0ZFNHwrRY88t4LbXqxOl9PrrANY-TgZnplSDSDJchKllhNdTzzdF2VYSduBHY465UYpy6EWqZ2NO51YUpKl3QvOPViYP-mHyNuupxbUPtv3V0TLPD1kAQ518omM_eJGCXoDpUMoFUNNlF1PHY0Ssg0aVVsF3h3xNeN9qKrqNR3faslMZOt9Z8jTtgu-gE5PH1vIh8TN8H3Cle5tPEWCRuW-553fpCnbfSTBR8FhujqZzqm7Dbq9QYkPBfh6evnhU6rl4HhbXRfkR26HpiAK7ydLMMcElZxV9unC3Zy1Tjq1Nu8ZU7i9c1HsXcvZ0aJWRRJJC5E-2b29H3GkjtZ5ibdy-eSAI30LbN-CT56cqlfzoyinGA2Y2ZoFutGUsXqiSdrXPecY5XfJnMU79enmUnUS1Q-VKgVFxZ-5LB56rfkXXsX0UHux0wwj8g9yrKofW0M4j3T5NCmqsdaVwMGCbpVqX0mTOL0Lfdwdyw0FovaJ9j3HbVqtVWXPMUACVh1Z757FJHzDyaO8I64LVpjGQ3PTSK9A4bhlap2igVChZqbxli91w-ipgxXcPWPBoTL-pRqBg3He7UUN_zms"
                                                  alt="Квартира у метро"
                                                  style={imageStyle}
                                              />
                                              <h3 style={listingTitleStyle}>2-комнатная квартира у метро</h3>
                                              <p>Площадь: 58 м² | Цена: 9 500 000 ₽</p>
                                          </div>
                                          <div style={listingStyle}>
                                              <img
                                                  src="https://img.gta5-mods.com/q95/images/beach-apartment/69814f-GTA5%202016-03-06%2023-11-55-41.png"
                                                  alt="ЖК Комфорт"
                                                  style={imageStyle}
                                              />
                                              <p>Студия 28 м² | Цена: 5 800 000 ₽</p>
                                          </div>
                                      </main>
                                  </div>
                              )}
                              {activeApp === "Gmail" && (
                                  <div>
                                      <p>📧 Входящие:</p>
                                      <ul>
                                          <li><b>От:</b> Папа — "Где ты гуляешь?"</li>
                                          <li><b>От:</b> Курьер — "Ваш заказ доставлен"</li>
                                          <li><b>От:</b> Izя — "Ты идешь сегодня?" ❤️</li>
                                      </ul>
                                  </div>
                                  )}
                              {activeApp === "Camera" && (
                                  <div style={bodyStyle}>
                                      <header style={headerStyle}>
                                          <h1>Недвижимость в Санкт-Петербурге</h1>
                                          <p>Лучшие предложения прямо сейчас</p>
                                      </header>
                                      <main style={mainStyle}>
                                          <div style={listingStyle}>
                                              <img
                                                  src="https://yandex-images.clstorage.net/V5t2lR153/5b1b76_Cs6Z/J2fT6H2GNMqQp5pP1PgV1n2hU6uO-QeqmIIO5oUFJLYGmDdlCheTdwp3Fes87_2cZGawZZUtHoYEDrfWOBlbiuYjgPmtwWLeQiBPTdQ5VVEq8ZfsmHgQ7AgVGTbHR7J3R1e4bddLCTyQvMi04j_pSmQy9iMF_IUd1JkuWinczlhhK1WtM5byh965VsSTMNfWbyFXJR71HOMX0Rw31Y_p6pfcemgeRsf2335F-O3zoYSuPrl1TTeCksKfLpcukMeRISgY6HjUd0NRNRyK1_QfkCfrkiYVc5oglB6Xt9-MYaLXmjWjFccHcRa2yvqouCvFazm99gHwwxdOGGMWIFgClmkiWaZ8EzXHnrUfhB24kdXm6F6qkDrZ5FiVEz5Uh2ipkFD0ZFNHwrRY88t4LbXqxOl9PrrANY-TgZnplSDSDJchKllhNdTzzdF2VYSduBHY465UYpy6EWqZ2NO51YUpKl3QvOPViYP-mHyNuupxbUPtv3V0TLPD1kAQ518omM_eJGCXoDpUMoFUNNlF1PHY0Ssg0aVVsF3h3xNeN9qKrqNR3faslMZOt9Z8jTtgu-gE5PH1vIh8TN8H3Cle5tPEWCRuW-553fpCnbfSTBR8FhujqZzqm7Dbq9QYkPBfh6evnhU6rl4HhbXRfkR26HpiAK7ydLMMcElZxV9unC3Zy1Tjq1Nu8ZU7i9c1HsXcvZ0aJWRRJJC5E-2b29H3GkjtZ5ibdy-eSAI30LbN-CT56cqlfzoyinGA2Y2ZoFutGUsXqiSdrXPecY5XfJnMU79enmUnUS1Q-VKgVFxZ-5LB56rfkXXsX0UHux0wwj8g9yrKofW0M4j3T5NCmqsdaVwMGCbpVqX0mTOL0Lfdwdyw0FovaJ9j3HbVqtVWXPMUACVh1Z757FJHzDyaO8I64LVpjGQ3PTSK9A4bhlap2igVChZqbxli91w-ipgxXcPWPBoTL-pRqBg3He7UUN_zms"
                                                  alt="Квартира у метро"
                                                  style={imageStyle}
                                              />
                                              <h3 style={listingTitleStyle}>2-комнатная квартира у метро</h3>
                                              <p>Площадь: 58 м² | Цена: 9 500 000 ₽</p>
                                          </div>
                                          <div style={listingStyle}>
                                              <img
                                                  src="https://img.gta5-mods.com/q95/images/beach-apartment/69814f-GTA5%202016-03-06%2023-11-55-41.png"
                                                  alt="ЖК Комфорт"
                                                  style={imageStyle}
                                              />
                                              <p>Студия 28 м² | Цена: 5 800 000 ₽</p>
                                          </div>
                                      </main>
                                  </div>
                              )}
                                  {activeApp === "Telegram" && (
                                      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
                                          <div style={{ width: "100%", height: "10%", backgroundColor: "#0088cc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                              <div style={{ fontSize: "150%", color: "white" }}>Shipgram Messenger</div>
                                          </div>

                                          <div style={{ width: "100%", height: "90%", display: "flex" }}>
                                              <div style={{ width: "30%", height: "100%", borderRight: "1px solid #ddd", overflowY: "auto" }}>
                                                  <div style={{ padding: "10px", fontWeight: "bold", borderBottom: "1px solid #ddd" }}>Contacts</div>
                                                  <div id="user-list" style={{ overflowY: "auto" }}>
                                                      {telegramContacts.length === 0 && (
                                                          <div style={{ padding: 10, textAlign: "center" }}>
                                                              {telegramContacts.length === 0
                                                                  ? "Загрузка контактов..."
                                                                  : "Контакты не найдены"}
                                                          </div>
                                                      )}
                                                      {telegramContacts.map((user, index) => (
                                                          <div
                                                              key={index}
                                                              style={{
                                                                  padding: "10px",
                                                                  borderBottom: "1px solid #eee",
                                                                  cursor: "pointer",
                                                                  display: "flex",
                                                                  alignItems: "center"
                                                              }}
                                                              onClick={() => setActiveChat(user)}
                                                          >
                                                              <div>
                                                                  {user.firstName} {user.lastName}
                                                              </div>
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                              <div style={{ width: "70%", height: "100%" }}>
                                                  {activeChat && (
                                                      <div style={{ padding: "10px" }}>
                                                          <h3>Чат с {activeChat.firstName} {activeChat.lastName}</h3>
                                                          {/* Контейнер сообщений с прокруткой */}
                                                          <div
                                                              id="chatContainer"
                                                              style={{
                                                                  flex: 1,
                                                                  border: "1px solid #ddd",
                                                                  padding: "10px",
                                                                  overflowY: "auto",
                                                                  marginBottom: "10px"
                                                              }}
                                                          >
                                                              {messages.length === 0 ? (
                                                                  <p style={{ textAlign: 'center', color: '#888' }}>Нет сообщений</p>
                                                              ) : (
                                                                  messages.map((msg) => (
                                                                      <div
                                                                          key={msg.id}
                                                                          style={{
                                                                              textAlign: msg.sender_id === userProfile?.id ? 'right' : 'left',
                                                                              margin: '10px 0'
                                                                          }}
                                                                      >
                                                                          <div style={{
                                                                              display: 'inline-block',
                                                                              padding: '8px 12px',
                                                                              borderRadius: '12px',
                                                                              background: msg.sender_id === userProfile?.id ? '#0084ff' : '#e5e5ea',
                                                                              color: msg.sender_id === userProfile?.id ? '#fff' : '#000',
                                                                              maxWidth: '80%'
                                                                          }}>
                                                                              {msg.message}
                                                                          </div>
                                                                          <div style={{
                                                                              fontSize: '0.8em',
                                                                              color: '#666',
                                                                              marginTop: '4px'
                                                                          }}>
                                                                              {new Date(msg.created_at).toLocaleTimeString()}
                                                                          </div>
                                                                      </div>
                                                                  ))
                                                              )}
                                                          </div>

                                                          {/* Поле ввода и кнопка отправки */}
                                                          <div style={{ display: 'flex' }}>
                                                              <input
                                                                  type="text"
                                                                  value={newMessage}
                                                                  onChange={(e) => setNewMessage(e.target.value)}
                                                                  placeholder="Введите сообщение..."
                                                                  style={{
                                                                      flex: 1,
                                                                      padding: '8px',
                                                                      borderRadius: '20px',
                                                                      border: '1px solid #ddd'
                                                                  }}
                                                                  onKeyDown={(e) => {
                                                                      if (e.key === 'Enter') sendMessage();
                                                                  }}
                                                              />
                                                              <button
                                                                  onClick={sendMessage}
                                                                  style={{
                                                                      marginLeft: '8px',
                                                                      padding: '8px 16px',
                                                                      background: '#0084ff',
                                                                      color: 'white',
                                                                      border: 'none',
                                                                      borderRadius: '20px',
                                                                      cursor: 'pointer'
                                                                  }}
                                                              >
                                                                  Отправить
                                                              </button>
                                                          </div>
                                                      </div>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  )}


                          </div>
                      )}
                  </div>

                  {/* Нижняя кнопка */}
                  <div style={{
                      backgroundColor: "black",
                      width: "100%",
                      height: "10%",
                      borderTop: "0.5em solid black",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center"
                  }}>
                      <div
                          style={{
                              backgroundColor: "white",
                              width: "15%",
                              aspectRatio: "1 / 1",
                              borderRadius: "50%",
                              border: "2px solid black"
                          }}
                      >
                          <button onClick={closeApp} style={{
                              opacity: 0,
                              position: "absolute",
                              bottom: "6px",
                              left: "50%",
                              transform: "translateX(-50%)",
                              padding: "0.5em 1em",
                              borderRadius: "10em",
                              background: "#000",
                              color: "white",
                              border: "none",
                              cursor: "pointer"
                          }}>
                              ⬅ Назад
                          </button>
                      </div>
                  </div>
              </div>
          </DoubleTapWrapper>
    </div>
  );
}

const btnStyle = {
  flex: 1,
  padding: '8px 12px',
  background: '#17a2b8',
  border: 'none',
  borderRadius: 4,
  color: '#fff',
  cursor: 'pointer'
};

export default Game;