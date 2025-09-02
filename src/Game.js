/*
gjhghjhgjghj
- Проблема с игроками они множатся
- Проблема с перемещением между городами (исчезновение и появление игроков)
- Проблема с Null полусферами
*/
import PF from 'pathfinding';
import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useDialogManager } from './components/DialogSystem/DialogManager';
import { DialogWindow } from './components/DialogSystem/DialogWindow';
import Inventory from './components/Inventory';
import OrgControlPanel from './components/OrgControlPanel';
import DoubleTapWrapper from './pages/DoubleTapWrapper';
import WaveformPlayer from './pages/WaveformPlayer';
function Game({ avatarUrl, gender }) {

    // 1) реф для хранилища сцены
    const sceneRef = useRef(new THREE.Scene());

    // 2) реф для группы «города»
    const cityGroupRef = useRef(null);

    // 3) реф для группы «интерьера»
    const interiorGroupRef = useRef(null);
    const interiorCollidersRef = useRef([]);
    const interiorExitPosRef = useRef(null);
    const fpHiddenNodesRef = useRef([]);
    const cleanupTimerRef = useRef(null);
    // Глобальный менеджер прогресса загрузки (используем в GLTFLoader)
    const loadingManagerRef = useRef(null);
    // Кликабельные объекты внутри интерьера
    const interiorInteractablesRef = useRef([]);
    const npcMeshesRef = useRef([]);

    // камеры
    const orthoCamRef = useRef(null);
    const fpCamRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const moveInputRef = useRef({ forward: false, backward: false, left: false, right: false, strafeLeft: false, strafeRight: false });
    const fpPitchRef = useRef(0);
    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const isInInteriorRef = useRef(false);
    const altHeldRef = useRef(false);
    const LOAD_RADIUS = 120;

    const [activeApp, setActiveApp] = useState(null);

    const [selectedHouse, setSelectedHouse] = useState(null);
    const [isInInterior, setIsInInterior] = useState(false);
    const mountRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        console.log('useEffect isInInterior изменился:', isInInterior);
        isInInteriorRef.current = isInInterior;
        console.log('isInInteriorRef.current установлен в:', isInInteriorRef.current);
    }, [isInInterior]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [playerStats, setPlayerStats] = useState(null);
    const [micEnabled, setMicEnabled] = useState(false);
    const [orgMenu, setOrgMenu] = useState(null);
    const [orgPanelId, setOrgPanelId] = useState(null);
    const [satiety, setSatiety] = useState(() => {
        const p = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
        return p.satiety ?? 100;
    });
    const [thirst, setThirst] = useState(() => {
        const p = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
        return p.thirst ?? 100;
    });
    const [inventory, setInventory] = useState([]);
    const [showInventory, setShowInventory] = useState(false);
    const [gameTime, setGameTime] = useState(null);
    const [balance, setBalance] = useState(() => {
        const p = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
        return p.balance ?? 0;
    });
    const [playerCoords, setPlayerCoords] = useState({ x: 0, y: 0, z: 0 });
    const [programmingLanguages, setProgrammingLanguages] = useState([]);
    const [passwordCorrect, setPasswordCorrect] = useState(false);
    const [showMiniGame, setShowMiniGame] = useState(false);
    const [questsProgress, setQuestsProgress] = useState([]);
    const statsRef = useRef(null);
    const voiceConnections = useRef({});
    const localStream = useRef(null);
    const voiceIcons = useRef({});
    const [isPlaying, setIsPlaying] = useState(true);
    //Телефон\
    const [audioUrl, setAudioUrl] = useState("/audio/firs.ogg");
    // for Mini-game_2
    const [showCleanupGame, setShowCleanupGame] = useState(false);
    const [cleanupGameData, setCleanupGameData] = useState(null);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [markedTransactions, setMarkedTransactions] = useState([]);
    const [decryptAttempts, setDecryptAttempts] = useState(3);
    const [timeLeft, setTimeLeft] = useState(180); // 3 минуты
    const [suspiciousFound, setSuspiciousFound] = useState(0);
    const [gameResult, setGameResult] = useState(null);
    const [personalArchive, setPersonalArchive] = useState([]);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [gameCompleted, setGameCompleted] = useState(false);

    const [activeChat, setActiveChat] = useState(null);
    // Добавьте этот код в начало компонента Game, рядом с другими состояниями
    const [telegramContacts, setTelegramContacts] = useState([]);
    const [tgLoading, setTgLoading] = useState(false);
    const [tgError, setTgError] = useState(null);
    const [sysTime, setSysTime] = useState(new Date());
    const isPhoneNarrow = true; // экран виртуального телефона — всегда узкий

    const [isIframeOpen, setIsIframeOpen] = useState(false);
    const [iframeUrl, setIframeUrl] = useState('');

    const [appsHidden, setAppsHidden] = useState(false);
    const [isPhoneVisible, setIsPhoneVisible] = useState(true);
    const [isChatVisible, setIsChatVisible] = useState(true);

    const [seregaComments, setSeregaComments] = useState([]);
    const [currentExit, setCurrentExit] = useState(null);
    const currentExitRef = useRef(null);
    useEffect(() => { currentExitRef.current = currentExit; }, [currentExit]);

    useEffect(() => {
        const decay = setInterval(() => {
            setSatiety(s => Math.max(0, s - 0.05));
            setThirst(t => Math.max(0, t - 0.07));
        }, 10000);
        return () => clearInterval(decay);
    }, []);

    useEffect(() => {
        const profile = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
        profile.satiety = satiety;
        profile.thirst = thirst;
        sessionStorage.setItem('user_profile', JSON.stringify(profile));
        socketRef.current?.emit('economy:updateStats', { satiety, thirst });
    }, [satiety, thirst]);


    //const [currentDialog, setCurrentDialog] = useState(null);
    //const [dialogIndex, setDialogIndex] = useState(0);
    //const [showDialog, setShowDialog] = useState(false);
    //const [formData, setFormData] = useState({});
    //const [currentForm, setCurrentForm] = useState(null);

    //Телефон
    let scene, renderer;
    const playerRef = useRef(null);
    const cityMeshesRef = useRef([]);
    const cityObjectsDataRef = useRef([]);
    const loadedCityObjectsRef = useRef({});
    const loadedInteriorMeshesRef = useRef({});
    const interiorsDataRef = useRef([]);
    const groundRef = useRef(null);
    const cityGroup = new THREE.Group();
    cityGroupRef.current = cityGroup;
    // группа интерьера создаётся при входе в здание
    const savedPositionRef = useRef(new THREE.Vector3());
    const remotePlayersRef = useRef({});


    const {
        currentDialog,
        dialogIndex,
        showDialog,
        formData,
        currentForm,
        loadDialog,
        handleAnswerSelect,
        handleFormSubmit,
        handleFormChange,
        setShowDialog
    } = useDialogManager();

    useEffect(() => {
        const id = setInterval(() => {
            if (playerRef.current) {
                const p = playerRef.current.position;
                setPlayerCoords({
                    x: p.x.toFixed(1),
                    y: p.y.toFixed(1),
                    z: p.z.toFixed(1)
                });
            }
        }, 100);
        return () => clearInterval(id);
    }, []);
    const handleAppClick = (appName) => {
        setAppsHidden(true);
        setActiveApp(appName);
        if (appName === "Telegram") {
            setTgError(null);
            setTgLoading(true);
            loadTelegramContacts().finally(() => setTgLoading(false));
        }
        if (appName === "Chrome") {
            loadQuestsProgress();
        }
        if (appName === "Settings") {
            setShowMiniGame(true);
        }
    };

    const handlePasswordInput = (e) => {
        if (e.key === 'Enter') {
            const input = e.target.value.trim();
            e.target.value = "";

            const negativeComments = [
                "Ты чё, братан, спишь?!",
                "Мимо кассы, как всегда!",
                "Это даже я знаю, что не так!",
                "Ну и лажа...",
                "Ты вообще в теме или как?",
                "Не-а, попробуй ещё раз!"
            ];

            const positiveComments = [
                "О, да ты в ударе сегодня!",
                "В точку, братишка!",
                "Ну наконец-то угадал!",
                "Так держать, хакер!",
                "Бинго! Правильный ответ!",
                "Ты меня удивляешь!"
            ];

            if (input === "mN8 2kP 5zX") {
                setTimeout(() => {
                    addSeregaComment(positiveComments[Math.floor(Math.random() * positiveComments.length)]);
                    setPasswordCorrect(true);
                    setProgrammingLanguages(["TR4 FG8 HJ2", "Z9 xC3 vB1", "mN8 2kP 5zX", "kL5 mN7 qW0"]);
                    setAudioUrl("/audio/TR4-FG8-Hj2.ogg");
                }, 800);
            }
            else if (input === "TR4 FG8 HJ2") {
                setTimeout(() => {
                    addSeregaComment(positiveComments[Math.floor(Math.random() * positiveComments.length)]);
                    setPasswordCorrect(true);
                    setProgrammingLanguages(["X b7kG z3Lp", "vn4 Zq J8mr", "sW 1Rt yK 90", "q9 Xgd2 BwF"]);
                    setAudioUrl("/audio/X-b7kG-z3Lp.ogg");
                }, 800);
            }
            else if (input === "X b7kG z3Lp") {
                setTimeout(() => {
                    addSeregaComment(positiveComments[Math.floor(Math.random() * positiveComments.length)]);
                    setPasswordCorrect(true);
                    setShowMiniGame(false);
                    loadCleanupGame();
                }, 800);
            }
            else {
                // Добавляем обработку неправильного ввода
                setTimeout(() => {
                    addSeregaComment(negativeComments[Math.floor(Math.random() * negativeComments.length)]);
                }, 800);
            }
        }
    };
    function addSeregaComment(text) {
        setSeregaComments(prev => [...prev, { text, id: Date.now() }]);
    }
    async function loadCleanupGame() {

        if (cleanupTimerRef.current) {
            clearInterval(cleanupTimerRef.current);
        }
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found');
                return;
            }
            if (gameCompleted) return;
            const res = await fetch(`/api/cleanup-game/data?level=${currentLevel}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            cleanupTimerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 0) {
                        clearInterval(cleanupTimerRef.current);
                        handleGameFinish(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            // Добавьте проверку типа контента
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await res.text();
                throw new Error(`Ожидался JSON, получено: ${text.substring(0, 100)}...`);
            }

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error || 'Неизвестная ошибка сервера');
            }

            setCleanupGameData(data.transactions);

            if (!res.ok) {
                throw new Error(`Server error: ${res.status}`);
            }

            setCleanupGameData(data.transactions);
            setShowCleanupGame(true);
            setTimeLeft(180);
            setDecryptAttempts(3);
            setMarkedTransactions([]);
            setSuspiciousFound(0);
            setGameResult(null);
            setSeregaComments([]);
            setSelectedTransaction(null);


            return () => clearInterval(timer);
        } catch (err) {
            console.error('Ошибка загрузки игры:', err);
            if (cleanupTimerRef.current) {
                clearInterval(cleanupTimerRef.current);
            }
        }
    }
    useEffect(() => {
        return () => {
            if (cleanupTimerRef.current) {
                clearInterval(cleanupTimerRef.current);
            }
        };
    }, []);

    function addSeregaComment(text) {
        setSeregaComments(prev => [...prev, { text, id: Date.now() }]);
    }

    function handleMarkTransaction(id) {
        setMarkedTransactions(prev => {
            const transaction = cleanupGameData.find(tx => tx.id === id);
            const isCurrentlyMarked = prev.includes(id);
            let newMarkedTransactions;
            let newSuspiciousFound = suspiciousFound;

            if (isCurrentlyMarked) {
                newMarkedTransactions = prev.filter(t => t !== id);
                if (transaction._isSuspicious) {
                    newSuspiciousFound = Math.max(0, suspiciousFound - 1);
                    addSeregaComment("Снята отметка с подозрительной транзакции.");
                } else {
                    addSeregaComment("Снята отметка с транзакции.");
                }
            } else {
                newMarkedTransactions = [...prev, id];
                if (transaction._isSuspicious) {
                    newSuspiciousFound = suspiciousFound + 1;
                    addSeregaComment("Верно! Это явно что-то нечистое.");
                } else {
                    addSeregaComment("Эээ... Ты уверен? Это выглядит нормально.");
                }
            }

            // Обновляем suspiciousFound синхронно с markedTransactions
            setSuspiciousFound(newSuspiciousFound);

            // Проверяем завершение игры с новым значением
            if (transaction._isSuspicious && !isCurrentlyMarked && newSuspiciousFound >= 3) {
                handleGameFinish(true);
            }

            return newMarkedTransactions;
        });
    }

    function handleDecryptField(transactionId, field) {
        if (decryptAttempts <= 0) return;

        setDecryptAttempts(prev => prev);

        setCleanupGameData(prev => {
            return prev.map(tx => {
                if (tx.id === transactionId) {
                    return {
                        ...tx,
                        [field]: field === 'ip' ? tx._realIp : tx._realDevice
                    };
                }
                return tx;
            });
        });

        // Добавляем комментарий от Серёги
        addSeregaComment(field === 'ip'
            ? "Хм... Это VPN или прокси. Подозрительно!"
            : "Старое устройство или эмулятор. Нечисто!");
    }

    function handleAddToArchive(id) {
        if (personalArchive.includes(id)) return;

        setPersonalArchive(prev => [...prev, id]);
        addSeregaComment("Опасно... но может пригодиться.");
    }

    function handleGameFinish(success) {
        if (success) {
            const correctMarks = cleanupGameData.filter(tx =>
                markedTransactions.includes(tx.id) && tx._isSuspicious
            ).length;

            const score = Math.min(3, correctMarks);

            setGameResult('success');
            addSeregaComment(`Уровень ${currentLevel} пройден! Найдено ${score} из 3 аномалий.`);

            // Отправка результата на сервер
            const token = localStorage.getItem('token');
            fetch('/api/cleanup-game/finish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    success,
                    score,
                    markedTransactions,
                    personalArchive,
                    level: currentLevel
                })
            });

            // Если это 5 уровень - завершаем игру
            if (currentLevel >= 5) {
                setTimeout(() => {
                    setGameResult('complete');
                    setShowCleanupGame(false);
                }, 3000);
            } else {
                // Иначе загружаем следующий уровень
                setTimeout(() => {
                    setCurrentLevel(prev => prev + 1);
                    loadCleanupGame();
                }, 3000);
            }
        } else {
            setGameResult('fail');
            addSeregaComment('Время вышло! Попробуй еще раз.');

            // Добавляем таймер для автоматического перезапуска через 3 секунды
            setTimeout(() => {
                setGameResult(null);
                loadCleanupGame(); // Перезапускаем игру
            }, 3000);
        }
    }


    // Добавляем кнопку для запуска игры в интерфейс
    const cleanupGameButton = (
        <button
            style={{
                position: 'absolute',
                top: 20,
                right: 180,
                zIndex: 1000,
                padding: '10px 18px',
                background: '#d35400',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
            onClick={loadCleanupGame}
        >
            Чистка или компромат
        </button>
    );


    const buttonStyle = {
        padding: '10px 20px',
        background: '#444',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
    };

    /*const loadDialog = async (npcId) => {
        try {
            const response = await fetch(`/dialogs/${npcId}.json`);
            const data = await response.json();
            setCurrentDialog(data);
            setDialogIndex(0);
            setShowDialog(true);
        } catch (error) {
            console.error('Ошибка загрузки диалога:', error);
        }
    };*/
    const loader = new GLTFLoader();
    // базовая геометрия для объектов типа "chair"
    const baseChairMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ visible: false })
    );

    async function loadGLTF(url) {
        return new Promise((resolve, reject) => {
            loader.load(url, gltf => resolve(gltf), undefined, err => reject(err));
        });
    }

    async function enterInteriorMode(interiorId) {
        console.log('enterInteriorMode вызвана для интерьера:', interiorId);

        // Сохраняем текущую позицию игрока
        if (playerRef.current) {
            savedPositionRef.current.copy(playerRef.current.position);
        }

        // Загружаем модель интерьера
        console.log('Загружаем модель интерьера');
        await loadInteriorModel(interiorId);

        // Переключаемся на камеру от первого лица
        console.log('Переключаемся на камеру от первого лица');
        switchToFirstPersonCamera();

        // Включаем управление мышью для интерьера
        // Курсор оставляем активным (без pointer lock)
        document.body.style.cursor = 'default';

        // Устанавливаем состояние "в интерьере"
        console.log('Устанавливаем setIsInInterior(true)');
        setIsInInterior(true);
        setSelectedHouse(null);

        console.log('isInInterior установлен в true');
        // Сброс кликово-путевого движения и визуальных маркеров
        if (typeof currentPath !== 'undefined') currentPath = [];
        if (typeof pathIndex !== 'undefined') pathIndex = 0;
        if (typeof destination !== 'undefined') destination = null;
        if (typeof blockedTime !== 'undefined') blockedTime = 0;
        if (typeof destinationMarker !== 'undefined' && destinationMarker) destinationMarker.visible = false;
        // Сброс нажатых направлений
        if (moveInputRef.current) {
            Object.keys(moveInputRef.current).forEach(k => { moveInputRef.current[k] = false; });
        }

        // Телепортируем игрока в интерьер (если нужно)
        console.log('Вызываем teleportPlayerToInterior для интерьера:', interiorId);
        await teleportPlayerToInterior(interiorId);
        // Отправляем мгновенное обновление позиции перед уведомлением об интерьере
        if (socketRef.current && playerRef.current) {
            socketRef.current.emit('playerMovement', { x: playerRef.current.position.x, y: playerRef.current.position.y, z: playerRef.current.position.z });
        }
        // Сообщаем серверу о смене интерьера, чтобы видимость игроков фильтровалась по interiorId
        socketRef.current?.emit('interiorChange', { interiorId });
        console.log('teleportPlayerToInterior завершена');
    }
    const teleportPlayerToInterior = async (interiorId) => {
        console.log('teleportPlayerToInterior вызвана для интерьера:', interiorId);
        console.log('playerRef.current:', playerRef.current);
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Пожалуйста, войдите в систему, чтобы войти в здание');
            return;
        }
        try {
            const res = await fetch(`/api/interiors/${interiorId}/enter`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include',
                cache: 'no-cache'
            });
            if (!res.ok) {
                const errText = await res.text();
                console.error(`Ошибка ${res.status} при получении spawn-координат: ${errText}`);
                alert(`Не удалось получить координаты интерьера: ${errText}`);
                return;
            }
            const { spawn, exit, exitInt } = await res.json();
            if (!spawn) {
                alert('Для этого интерьера не заданы координаты входа');
                return;
            }
            // Нормализуем типы в числа (pg для NUMERIC отдает строки)
            const nSpawn = {
                x: Number(spawn.x),
                y: Number(spawn.y),
                z: Number(spawn.z),
                rot: Number(spawn.rot) || 0
            };
            const nExit = exit && typeof exit === 'object' ? {
                x: Number(exit.x),
                y: Number(exit.y),
                z: Number(exit.z),
                rot: Number(exit.rot) || 0
            } : null;
            const nExitInt = exitInt && typeof exitInt === 'object' ? {
                x: Number(exitInt.x),
                y: Number(exitInt.y),
                z: Number(exitInt.z)
            } : null;
            // Телепортируем игрока в интерьер
            if (playerRef.current) {
                console.log('[ENTER INTERIOR] spawn from server:', nSpawn);
                playerRef.current.position.set(nSpawn.x, nSpawn.y, nSpawn.z);
                playerRef.current.rotation.set(0, nSpawn.rot || 0, 0);
                // Полный сброс движения/целей при входе
                if (typeof currentPath !== 'undefined') currentPath = [];
                if (typeof pathIndex !== 'undefined') pathIndex = 0;
                if (typeof destination !== 'undefined') destination = null;
                if (typeof blockedTime !== 'undefined') blockedTime = 0;
                if (typeof destinationMarker !== 'undefined' && destinationMarker) destinationMarker.visible = false;
                if (moveInputRef.current) {
                    Object.keys(moveInputRef.current).forEach(k => { moveInputRef.current[k] = false; });
                }
            }
            console.log('[ENTER INTERIOR] exit from server:', nExit);
            setCurrentExit(nExit || null);
            // Визуализируем маркер выхода внутри интерьера, чтобы по клику можно было выйти
            if (nExit && typeof nExit.x === 'number' && typeof nExit.z === 'number') {
                try { addExitMarker(nExit); } catch (e) { console.warn('[ENTER INTERIOR] addExitMarker failed', e); }
            }
            // Запоминаем позицию внутреннего триггера выхода, если пришла
            if (nExitInt && typeof nExitInt.x === 'number') {
                console.log('[ENTER INTERIOR] exitInt (internal exit trigger):', nExitInt);
                interiorExitPosRef.current = new THREE.Vector3(nExitInt.x, nExitInt.y || 0, nExitInt.z);
            }
            console.log('teleportPlayerToInterior завершена успешно');
        } catch (e) {
            console.error('Failed to enter interior:', e);
        }
    };

    async function loadInteriorModel(interiorId) {
        console.log('loadInteriorModel вызвана для интерьера:', interiorId);
        const token = localStorage.getItem('token');

        try {
            const defRes = await fetch(`/api/interiors/${interiorId}/definition`, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include',
                cache: 'no-cache'
            });

            if (!defRes.ok) {
                const errText = await defRes.text();
                console.error(`Ошибка ${defRes.status} при загрузке определения интерьера: ${errText}`);
                return;
            }

            const { glb, objects } = await defRes.json();
            const baseUrl = window.location.origin;
            const glbUrl = baseUrl + glb;
            console.log('Loading interior GLB from', glbUrl);

            // Проверяем доступность GLB файла
            const headResp = await fetch(glbUrl, { method: 'HEAD', cache: 'no-cache' });
            if (!headResp.ok) {
                console.error(`GLB not reachable: HTTP ${headResp.status}`);
                return;
            }

            const gltf = await loadGLTF(glbUrl);
            const scene = sceneRef.current;

            // Создаем группу для интерьера
            const intGroup = new THREE.Group();
            intGroup.name = 'interiorGroup';
            intGroup.add(gltf.scene);

            // Декуплируем и гарантируем непрозрачность материалов интерьера
            gltf.scene.traverse((child) => {
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

            // Построение коллайдеров интерьера (простые коробки по мешам)
            const colliders = [];
            gltf.scene.traverse((child) => {
                if (child.isMesh && child.geometry) {
                    colliders.push(child);
                }
            });
            interiorCollidersRef.current = colliders;

            // Добавляем объекты интерьера
            interiorInteractablesRef.current = []; // сбрасываем реестр интерактива

            // Хелпер для определения ID NPC по пути к модели
            const getNpcIdFromModel = (url) => {
                if (!url || typeof url !== 'string') return null;
                const lower = url.toLowerCase();
                if (lower.includes('/models/npc/galina.glb')) return 'Adventurer';
                if (lower.includes('/models/npc/oxranik.glb')) return 'Oxranik';
                if (lower.includes('/models/npc/guard.glb')) return 'guard';
                if (lower.includes('/models/npc/beachcharacter.glb')) return 'BeachCharacter';
                if (lower.includes('/models/npc/bartender.glb')) return 'bartender';
                if (lower.includes('/models/npc/computer.glb')) return 'Computer';
                return null;
            };

            for (const o of objects) {
                if (o.model_url) {
                    try {
                        const objGltf = await loadGLTF(baseUrl + o.model_url);
                        objGltf.scene.position.set(o.x, o.y, o.z);
                        objGltf.scene.rotation.set(o.rot_x, o.rot_y, o.rot_z);
                        objGltf.scene.scale.set(o.scale, o.scale, o.scale);
                        intGroup.add(objGltf.scene);

                        // Добавляем меши объекта как коллайдеры интерьера
                        objGltf.scene.traverse((child) => {
                            if (child.isMesh && child.geometry) {
                                colliders.push(child);
                            }
                        });

                        // Если это NPC внутри интерьера — добавим кликабельную хит‑зону
                        const isNpc = (o.type === 'npc') || (typeof o.model_url === 'string' && o.model_url.includes('/models/npc/'));
                        if (isNpc) {
                            const npcId = o.id || getNpcIdFromModel(o.model_url);
                            console.log('[INTERIOR NPC] detected npc, id:', npcId, 'at', { x: o.x, y: o.y, z: o.z });
                            const hit = new THREE.Mesh(
                                new THREE.SphereGeometry(1.2),
                                new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.0001, depthWrite: false })
                            );
                            hit.position.set(o.x, (o.y ?? 0) + 1.0, o.z);
                            hit.userData.interactable = true;
                            hit.userData.payload = { type: 'npc', id: npcId };
                            hit.visible = true;
                            intGroup.add(hit);
                            interiorInteractablesRef.current.push(hit);

                            // Также помечаем сам корень модели как кликабельный NPC
                            try {
                                objGltf.scene.userData = objGltf.scene.userData || {};
                                objGltf.scene.userData.interactable = true;
                                objGltf.scene.userData.payload = { type: 'npc', id: npcId };
                                interiorInteractablesRef.current.push(objGltf.scene);
                                // и помечаем как isNpc/npcId для fallback
                                objGltf.scene.userData.isNpc = true;
                                objGltf.scene.userData.npcId = npcId;
                            } catch (_) { }
                        }
                    } catch (e) {
                        console.warn('Не удалось загрузить объект интерьера', o.model_url, e);
                    }
                } else {
                    const mesh = baseChairMesh.clone();
                    mesh.position.set(o.x, o.y, o.z);
                    mesh.rotation.set(o.rot_x, o.rot_y, o.rot_z);
                    mesh.scale.set(o.scale, o.scale, o.scale);
                    if (mesh.material) {
                        if (Array.isArray(mesh.material)) {
                            mesh.material = mesh.material.map(mat => {
                                if (!mat) return mat;
                                const m = mat.clone();
                                m.transparent = false;
                                m.opacity = 1;
                                m.depthWrite = true;
                                m.needsUpdate = true;
                                return m;
                            });
                        } else {
                            mesh.material = mesh.material.clone();
                            mesh.material.transparent = false;
                            mesh.material.opacity = 1;
                            mesh.material.depthWrite = true;
                            mesh.material.needsUpdate = true;
                        }
                    }
                    intGroup.add(mesh);
                    // Плейсхолдер не рендерим, но используем как коллайдер
                    try { mesh.visible = false; } catch (_) { }
                    // Плейсхолдер без GLTF тоже участвует в коллизиях
                    colliders.push(mesh);
                }

                // Если сервер пометил объект как «интерактивный/маркер» — кликабельная зона
                if (o.interactable || o.marker) {
                    const hit = new THREE.Mesh(
                        new THREE.SphereGeometry(0.6),
                        new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.0001, depthWrite: false })
                    );
                    hit.position.set(o.x, o.y + 1.0, o.z);
                    hit.userData.interactable = true;
                    hit.userData.payload = { type: o.type || 'marker', id: o.id || null, label: o.label || 'Интерактив' };
                    hit.visible = true; // кликабелен
                    try { if (hit.material) hit.material.visible = false; } catch (_) { }
                    intGroup.add(hit);
                    interiorInteractablesRef.current.push(hit);
                }
                // Сохраним позицию внутреннего выхода, если есть
                if (typeof o.exit_int_x === 'number' && typeof o.exit_int_y === 'number' && typeof o.exit_int_z === 'number') {
                    interiorExitPosRef.current = new THREE.Vector3(o.exit_int_x, o.exit_int_y, o.exit_int_z);
                }
            }

            // Добавляем освещение для интерьера
            const light = new THREE.AmbientLight(0xffffff, 1);
            intGroup.add(light);

            // Добавляем группу в сцену
            scene.add(intGroup);
            interiorGroupRef.current = intGroup;

            console.log('Модель интерьера загружена успешно');
        } catch (e) {
            console.error('Ошибка загрузки модели интерьера:', e);
        }
    }

    // Кэш для загруженных текстурпаков
    const texturePackCache = new Map();



    function loadTexturePackForMesh(texturePackUrl, mesh, forceReplace = false) {
        console.log('loadTexturePackForMesh вызвана:', { texturePackUrl, mesh });

        // Проверяем, есть ли уже загруженный текстурпак в кэше
        if (texturePackCache.has(texturePackUrl)) {
            console.log('Используем кэшированный текстурпак:', texturePackUrl);
            const cachedTextures = texturePackCache.get(texturePackUrl);
            applyTexturesToMesh(mesh, cachedTextures, forceReplace, texturePackUrl);
            return;
        }

        console.log('Загружаем текстурпак для меша:', texturePackUrl);

        // Загружаем текстурпак асинхронно
        const baseUrl = window.location.origin;
        const fullUrl = texturePackUrl.startsWith('http') ? texturePackUrl : baseUrl + texturePackUrl;
        console.log('Полный URL для загрузки:', fullUrl);

        fetch(fullUrl)
            .then(response => {
                console.log('Ответ сервера для текстурпака:', response.status, response.statusText);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                console.log('Начинаем парсинг JSON...');
                return response.json();
            })
            .then(texturePack => {
                console.log('Загруженный текстурпак:', texturePack);

                // Кэшируем загруженный текстурпак
                texturePackCache.set(texturePackUrl, texturePack);

                // Проверяем, что меш все еще существует и валиден
                if (mesh && mesh.isMesh && mesh.material) {
                    // Применяем текстуры к мешу (функция сама проверит типы материалов/массивы)
                    applyTexturesToMesh(mesh, texturePack, forceReplace, texturePackUrl);
                } else {
                    console.warn('Меш не подходит для применения текстурпака:', {
                        hasMesh: !!mesh,
                        isMesh: mesh?.isMesh,
                        hasMaterial: !!mesh?.material
                    });
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки текстурпака:', texturePackUrl, error);
                // В случае ошибки оставляем оригинальные материалы
                if (mesh.material) {
                    mesh.material.needsUpdate = true;
                }
            });
    }

    // Предсоздаём материал в стиле MapEditor для citypack.json
    const cityPackMaterialCache = new Map(); // url -> material

    function getCityPackMaterial(texturePackUrl, texturePack) {
        if (cityPackMaterialCache.has(texturePackUrl)) return cityPackMaterialCache.get(texturePackUrl);
        const mat = new THREE.MeshStandardMaterial();
        if (typeof texturePack.baseColor === 'string') {
            const loader = new THREE.TextureLoader();
            const tex = loader.load(texturePack.baseColor);
            if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
            mat.map = tex;
        }
        mat.roughness = typeof texturePack.roughness === 'number' ? texturePack.roughness : 0.5;
        mat.metalness = typeof texturePack.metalness === 'number' ? texturePack.metalness : 0.1;
        cityPackMaterialCache.set(texturePackUrl, mat);
        return mat;
    }

    function applyTexturesToMesh(mesh, texturePack, forceReplace = false, texturePackUrl) {
        console.log('applyTexturesToMesh вызвана:', { mesh, texturePack });

        if (!mesh || !texturePack) {
            console.warn('applyTexturesToMesh: отсутствует меш или текстурпак', {
                hasMesh: !!mesh,
                hasTexturePack: !!texturePack
            });
            return;
        }

        if (!mesh.material) {
            console.warn('У меша нет материала');
            return;
        }

        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const targetMaterials = materials.filter(m => m && m.isMaterial && (m.type === 'MeshStandardMaterial' || m.type === 'MeshPhysicalMaterial' || m.type === 'MeshPhongMaterial'));
        if (targetMaterials.length === 0) {
            console.warn('Нет подходящих материалов для применения текстур:', mesh.material);
            return;
        }

        // Особый режим: если это citypack.json — ведём себя как MapEditor: заменяем материал на единый стандартный
        if (texturePackUrl === '/packs/citypack.json') {
            const mat = getCityPackMaterial(texturePackUrl, texturePack).clone();
            if (Array.isArray(mesh.material)) {
                mesh.material = mesh.material.map(() => mat.clone());
            } else {
                mesh.material = mat.clone();
            }
            mesh.traverse?.((child) => {
                if (child.isMesh) {
                    child.material = Array.isArray(child.material) ? child.material.map(() => mat.clone()) : mat.clone();
                }
            });
            return;
        }

        // baseColor map — по умолчанию не перетираем; при forceReplace перезаписываем
        if (typeof texturePack.baseColor === 'string') {
            console.log('Загружаем baseColor текстуру:', texturePack.baseColor);
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(texturePack.baseColor, (texture) => {
                if (THREE.SRGBColorSpace) {
                    texture.colorSpace = THREE.SRGBColorSpace;
                }
                targetMaterials.forEach(mat => {
                    if (mat.type === 'MeshStandardMaterial' || mat.type === 'MeshPhysicalMaterial') {
                        if (forceReplace || !mat.map) {
                            mat.map = texture;
                            if (mat.color && mat.color.set) mat.color.set(0xffffff);
                            mat.needsUpdate = true;
                        }
                    }
                });
            }, undefined, (error) => {
                console.error('Ошибка загрузки baseColor текстуры:', error);
            });
        }

        // normal map
        if (typeof texturePack.normal === 'string') {
            console.log('Загружаем normal текстуру:', texturePack.normal);
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(texturePack.normal, (texture) => {
                targetMaterials.forEach(mat => {
                    if (mat.type === 'MeshStandardMaterial' || mat.type === 'MeshPhysicalMaterial') {
                        if (forceReplace || !mat.normalMap) {
                            mat.normalMap = texture;
                            mat.needsUpdate = true;
                        }
                    }
                });
            }, undefined, (error) => {
                console.error('Ошибка загрузки normal текстуры:', error);
            });
        }

        // roughness map or value
        if (typeof texturePack.roughness === 'string') {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(texturePack.roughness, (texture) => {
                targetMaterials.forEach(mat => {
                    if (mat.type === 'MeshStandardMaterial' || mat.type === 'MeshPhysicalMaterial') {
                        if (forceReplace || !mat.roughnessMap) {
                            mat.roughnessMap = texture;
                            mat.needsUpdate = true;
                        }
                    }
                });
            }, undefined, (error) => {
                console.error('Ошибка загрузки roughness текстуры:', error);
            });
        } else if (typeof texturePack.roughness === 'number') {
            targetMaterials.forEach(mat => {
                if (mat.type === 'MeshStandardMaterial' || mat.type === 'MeshPhysicalMaterial') {
                    if (forceReplace || mat.roughnessMap == null) {
                        mat.roughness = texturePack.roughness;
                        mat.needsUpdate = true;
                    }
                }
            });
        }

        // metalness map or value (key metallic for map, metalness for value)
        if (typeof texturePack.metallic === 'string') {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(texturePack.metallic, (texture) => {
                targetMaterials.forEach(mat => {
                    if (mat.type === 'MeshStandardMaterial' || mat.type === 'MeshPhysicalMaterial') {
                        if (forceReplace || !mat.metalnessMap) {
                            mat.metalnessMap = texture;
                            mat.needsUpdate = true;
                        }
                    }
                });
            }, undefined, (error) => {
                console.error('Ошибка загрузки metallic текстуры:', error);
            });
        }
        if (typeof texturePack.metalness === 'number') {
            targetMaterials.forEach(mat => {
                if (mat.type === 'MeshStandardMaterial' || mat.type === 'MeshPhysicalMaterial') {
                    if (forceReplace || mat.metalnessMap == null) {
                        mat.metalness = texturePack.metalness;
                        mat.needsUpdate = true;
                    }
                }
            });
        }

        // ambient occlusion map
        if (typeof texturePack.ao === 'string') {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(texturePack.ao, (texture) => {
                targetMaterials.forEach(mat => {
                    if (mat.type === 'MeshStandardMaterial' || mat.type === 'MeshPhysicalMaterial') {
                        if (forceReplace || !mat.aoMap) {
                            mat.aoMap = texture;
                            mat.needsUpdate = true;
                        }
                    }
                });
            }, undefined, (error) => {
                console.error('Ошибка загрузки ao текстуры:', error);
            });
        }

        // specular only for Phong
        if (typeof texturePack.specular === 'string') {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(texturePack.specular, (texture) => {
                targetMaterials.forEach(mat => {
                    if (mat.type === 'MeshPhongMaterial') {
                        mat.specularMap = texture;
                        mat.needsUpdate = true;
                    }
                });
            }, undefined, (error) => {
                console.error('Ошибка загрузки specular текстуры:', error);
            });
        }
    }

    function addExitMarker(exit) {
        // Удаляем старый маркер, если был
        if (window.exitMarkerMesh && sceneRef.current) {
            sceneRef.current.remove(window.exitMarkerMesh);
            window.exitMarkerMesh = null;
        }
        // Создаём маркер выхода
        const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.5),
            new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 })
        );
        marker.position.set(exit.x, exit.y, exit.z);
        marker.userData.isExitMarker = true;
        if (sceneRef.current) sceneRef.current.add(marker);
        window.exitMarkerMesh = marker;
    }

    const exitInterior = () => {
        console.log('exitInterior вызвана');

        // Телепортируем на координаты выхода из интерьера, если заданы; иначе возвращаем на сохранённую позицию
        if (playerRef.current) {
            const cx = currentExitRef.current;
            console.log('[EXIT] currentExit before teleport:', cx);
            if (cx && typeof cx.x === 'number') {
                playerRef.current.position.set(
                    cx.x,
                    typeof cx.y === 'number' ? cx.y : playerRef.current.position.y,
                    cx.z
                );
                playerRef.current.rotation.set(0, cx.rot || 0, 0);
                console.log('[EXIT] Teleported to exit coords');
                // Гарантируем выход из интерьера на сервере
                socketRef.current?.emit('interiorChange', { interiorId: null });
                // Включаем мир (закрытие могло скрыть город)
                try { toggleWorldVisibility(true); } catch (_) { }
            } else if (savedPositionRef.current) {
                console.log('[EXIT] No exit coords, using savedPositionRef');
                playerRef.current.position.copy(savedPositionRef.current);
            }
            // Сразу шлём позицию наружу
            socketRef.current?.emit('playerMovement', {
                x: playerRef.current.position.x,
                y: playerRef.current.position.y,
                z: playerRef.current.position.z
            });
        }

        // Удаляем маркер выхода, если был
        if (window.exitMarkerMesh && sceneRef.current) {
            sceneRef.current.remove(window.exitMarkerMesh);
            window.exitMarkerMesh = null;
        }

        // Удаляем группу интерьера, если она есть
        if (interiorGroupRef.current && sceneRef.current) {
            sceneRef.current.remove(interiorGroupRef.current);
            interiorGroupRef.current = null;
            console.log('Группа интерьера удалена');
        }

        // Возвращаем третье лицо/камеру и актуализировать видимость объектов города
        switchToThirdPersonCamera?.();
        // Безопасный вызов без ReferenceError, даже если функция ещё не определена
        if (typeof updateCityObjectVisibility === 'function') {
            updateCityObjectVisibility();
        }
        // Повторно закрепляем телепорт на выход уже после очистки интерьера (на случай перезаписи позы)
        if (playerRef.current) {
            const cx2 = currentExitRef.current;
            console.log('[EXIT AFTER CLEANUP] currentExit:', cx2);
            if (cx2 && typeof cx2.x === 'number') {
                playerRef.current.position.set(
                    cx2.x,
                    typeof cx2.y === 'number' ? cx2.y : playerRef.current.position.y,
                    cx2.z
                );
                playerRef.current.rotation.set(0, cx2.rot || 0, 0);
                console.log('[EXIT AFTER CLEANUP] Position applied');
            }
            if (typeof lastPlayerPosition !== 'undefined') {
                try { lastPlayerPosition = playerRef.current.position.clone(); } catch (_) { }
            }
            socketRef.current?.emit('playerMovement', {
                x: playerRef.current.position.x,
                y: playerRef.current.position.y,
                z: playerRef.current.position.z
            });
        }
        // Полный сброс путевого движения и ввода
        if (typeof currentPath !== 'undefined') currentPath = [];
        if (typeof pathIndex !== 'undefined') pathIndex = 0;
        if (typeof destination !== 'undefined') destination = null;
        if (typeof blockedTime !== 'undefined') blockedTime = 0;
        if (typeof destinationMarker !== 'undefined' && destinationMarker) destinationMarker.visible = false;
        if (moveInputRef.current) {
            Object.keys(moveInputRef.current).forEach(k => { moveInputRef.current[k] = false; });
        }
        // Сообщаем серверу, что покинули интерьер
        socketRef.current?.emit('interiorChange', { interiorId: null });

        // Возвращаем курсор и отключаем pointer lock
        document.body.style.cursor = 'default';
        document.exitPointerLock();

        setIsInInterior(false);
        setCurrentExit(null);
        interiorExitPosRef.current = null;
    };


    // В useEffect для кликов по сцене:
    useEffect(() => {
        function onDocumentClick(event) {
            if (!rendererRef.current || !cameraRef.current) return;
            const rect = rendererRef.current.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1
            );
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, cameraRef.current);
            const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
            for (let i = 0; i < intersects.length; i++) {
                const obj = intersects[i].object;
                if (obj.userData.isExitMarker) {
                    exitInterior();
                    break;
                }
            }
        }
        window.addEventListener('mousedown', onDocumentClick);
        return () => window.removeEventListener('mousedown', onDocumentClick);
    }, [currentExit]);

    /*const handleAnswerSelect = (answer) => {
        if (answer.end) {
            setShowDialog(false);
        } else if (answer.next !== undefined) {
            // Если следующий узел - форма
            if (typeof answer.next === 'string' && answer.next.startsWith('form_')) {
                const nextNode = currentDialog.dialog.find(node => node.id === answer.next);
                if (nextNode && nextNode.type === 'form') {
                    setCurrentForm(nextNode);
                    return;
                }
            }

            const nextIndex = currentDialog.dialog.findIndex(node => node.id === answer.next);
            if (nextIndex !== -1) {
                setDialogIndex(nextIndex);
            } else {
                console.error('Диалоговый узел не найден:', answer.next);
                setShowDialog(false);
            }
        } else {
            setShowDialog(false);
        }
    };
    // Добавьте эту функцию для обработки отправки формы
    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (currentForm.next) {
            const nextIndex = currentDialog.dialog.findIndex(node => node.id === currentForm.next);
            if (nextIndex !== -1) {
                setDialogIndex(nextIndex);
                setCurrentForm(null);

                // Здесь можно отправить данные формы на сервер
                console.log('Отправленные данные:', formData);
                // Например: socketRef.current?.emit('dialogFormSubmit', formData);
            }
        }
    };

    // Добавьте эту функцию для обработки изменения полей формы
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };*/

    // Добавить функцию загрузки прогресса квестов:
    async function loadQuestsProgress() {
        const token = localStorage.getItem('token');
        try {
            console.log("Попытка загрузить");
            const res = await fetch('/api/quests/progress', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setQuestsProgress(data);
            } else {
                console.error('Ошибка загрузки прогресса квестов');
            }
        } catch (err) {
            console.error('Ошибка сети:', err);
        }
    }


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
            setTgError(null);
            const res = await fetch('/api/users', {
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include',
                cache: 'no-cache'
            });
            if (res.ok) {
                const data = await res.json();
                setTelegramContacts(data);
            } else {
                const txt = await res.text().catch(() => '');
                console.error('Ошибка загрузки контактов Telegram', res.status, txt);
                setTgError('Не удалось загрузить контакты');
            }
        } catch (err) {
            console.error('Ошибка сети:', err);
            setTgError('Проблема сети');
        }
    }

    // Дополняем состояния
    const [newMessage, setNewMessage] = useState("");
    const [messageInterval, setMessageInterval] = useState(null);
    const [messages, setMessages] = useState([]);
    //const [readmes, setReadmes] = useState('false');
    const [userProfile, setUserProfile] = useState(null);

    // Функция загрузки сообщений
    async function loadMessages(contactId) {
        if (!contactId) return;

        const token = localStorage.getItem('token');
        async function markMessagesAsRead(contactId, token) {
            try {
                const res = await fetch('/api/messages-read-true-false', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contactId: contactId
                    })
                });

                if (!res.ok) {
                    console.error('Ошибка отметки сообщений как прочитанных');
                }
            } catch (error) {
                console.error('Error marking as read:', error);
            }
        }

        try {
            // 1. Загружаем сообщения
            const res = await fetch(`/api/messages/${contactId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(data);
                console.log('Сообщения загружены');

                // 2. Отмечаем сообщения как прочитанные
                await markMessagesAsRead(contactId, token);

                // Прокручиваем чат вниз
                setTimeout(() => {
                    const chatContainer = document.getElementById('chatContainer');
                    if (chatContainer) {
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                }, 1000);
            } else {
                console.error('Ошибка загрузки сообщений');
            }
        } catch (err) {
            console.error('Ошибка:', err);
        }
    }
   /* async function readmessages(contactId) {
        if (!contactId) return;

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/messages-read/${contactId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.text();
                if (data == "true") {
                    readmes('true'); // Есть непрочитанные
                } else {
                    readmes('false'); // Нет непрочитанных
                }
                console.log('Статус прочитанности проверен:', data);
            } else {
                console.error('Ошибка проверки сообщений');
                readmes('false');
            }
        } catch (err) {
            console.error('Ошибка:', err);
            readmes('false');
        }
    }*/

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
                console.log("Сообщение ушло");
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
            //readmessages(activeChat.id)
            // Запускаем интервал для проверки новых сообщений
            const interval = setInterval(() => {
                loadMessages(activeChat.id);
                //readmessages(activeChat.id);
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

    //Телефон конец

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

    async function onObjectClick(mesh) {
        const objectId = mesh.userData.id;        // <-- USER DATA ID из city_objects
        const token = localStorage.getItem('token');

        try {
            const resp = await fetch(
                `/api/city_objects/${objectId}/interior`,  // <-- обязательно "/interior"
                {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: 'include',
                    cache: 'no-cache'
                }
            );
            if (!resp.ok) {
                console.warn(`Для объекта ${objectId} не задан interior_id (status ${resp.status})`);
                return;
            }
            const { interiorId } = await resp.json();
            if (!interiorId) return;

            console.log(`Переходим в интерьер ${interiorId} из объекта ${objectId}`);
            movePlayerToInterior(interiorId);
        } catch (err) {
            console.error(`Ошибка при запросе interior_id для объекта ${objectId}:`, err);
        }
    }


    async function openOrganizationMenu(orgId) {
        const token = localStorage.getItem('token');
        try {
            const orgRes = await fetch(`/api/organizations/${orgId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            let name = 'Организация';
            if (orgRes.ok) {
                const org = await orgRes.json();
                name = org.name;
            }

            const setRes = await fetch(`/api/organizations/${orgId}/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const settings = setRes.ok ? await setRes.json() : { menu: [] };

            // сервер уже отдаёт menu как массив
            const menuArray = Array.isArray(settings.menu) ? settings.menu : [];

            setOrgMenu({ id: orgId, name, menu: menuArray });
            setSelectedHouse(null);
        } catch (e) {
            console.error('Не удалось загрузить меню организации', orgId, e);
            alert('Ошибка загрузки меню организации');
        }
    }


    function openOrganizationPanel(orgId) {
        setOrgPanelId(orgId);
        setOrgMenu(null);
        setSelectedHouse(null);
    }


    async function movePlayerToInterior(interiorId) {
        await enterInteriorMode(interiorId);
    }

    function switchToFirstPersonCamera() {
        console.log('switchToFirstPersonCamera вызвана');
        console.log('isInInteriorRef.current:', isInInteriorRef.current);

        if (fpCamRef.current) {
            cameraRef.current = fpCamRef.current;
            console.log('Камера переключена на fpCamRef');
        }
        if (playerRef.current) {
            // Скрываем полностью собственную модель в режиме FPV
            playerRef.current.visible = false;
            // На всякий случай также скрываем голову/шею (если модель будет вновь показана без выхода из режима)
            const hidden = [];
            playerRef.current.traverse((child) => {
                if (!child.isMesh) return;
                const name = (child.name || '').toLowerCase();
                if (name.includes('head') || name.includes('neck') || name.includes('helmet') || name.includes('hair')) {
                    child.visible = false;
                    hidden.push(child);
                }
            });
            fpHiddenNodesRef.current = hidden;
            console.log('Скрыты узлы для FPV:', hidden.map(n => n.name));
        }
        fpPitchRef.current = 0;

        // Настраиваем камеру от первого лица для интерьера
        if (isInInteriorRef.current) {
            console.log('Настраиваем камеру для интерьера');
            // Устанавливаем позицию камеры на уровне глаз игрока
            const headHeight = 1.6;
            fpCamRef.current.position.set(
                playerRef.current.position.x,
                playerRef.current.position.y + headHeight,
                playerRef.current.position.z
            );
            // Не большой сдвиг камеры вперёд, чтобы не упираться в скрытую голову
            const forward = new THREE.Vector3(0, 0, -0.08).applyEuler(new THREE.Euler(0, playerRef.current.rotation.y, 0));
            fpCamRef.current.position.add(forward);

            // Направляем камеру в том же направлении, что и игрок
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyEuler(new THREE.Euler(0, playerRef.current.rotation.y, 0));
            fpCamRef.current.lookAt(
                fpCamRef.current.position.clone().add(direction)
            );
            console.log('Камера настроена для интерьера');
        }
    }

    function switchToThirdPersonCamera() {
        console.log('switchToThirdPersonCamera вызвана');
        if (orthoCamRef.current) {
            cameraRef.current = orthoCamRef.current;
            console.log('Камера переключена на orthoCamRef');
        }
        if (playerRef.current) {
            playerRef.current.visible = true;
            // Вернуть видимость скрытых для FPV узлов
            if (Array.isArray(fpHiddenNodesRef.current)) {
                fpHiddenNodesRef.current.forEach(n => { n.visible = true; });
                fpHiddenNodesRef.current = [];
            }
            console.log('Игрок показан');
        }
        fpPitchRef.current = 0;
    }

    function startMove(dir) {
        moveInputRef.current[dir] = true;
    }

    function stopMove(dir) {
        moveInputRef.current[dir] = false;
    }


    // ─────────────────────────────────────────────────────
    // КЛИКИ ВНУТРИ ИНТЕРЬЕРА (интерактивные маркеры/NPC)
    // ─────────────────────────────────────────────────────
    useEffect(() => {
        const onClick = (e) => {
            console.log('[INTERIOR CLICK] handler start; isInInterior:', isInInteriorRef.current);
            if (!isInInteriorRef.current) return;
            const mount = mountRef.current;
            if (!mount || !cameraRef.current) return;

            // координаты мыши в NDC
            // Пытаемся получить координаты из элемента рендера (FP вид)
            const canvas = rendererRef.current && rendererRef.current.domElement;
            const rect = (canvas || mount).getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, cameraRef.current);
            // Ищем пересечения по интерактивам (включая NPC)
            const objects = interiorInteractablesRef.current.filter(obj => obj?.isObject3D);
            // Добавим в список интерактивов саму группу интерьера, чтобы traverse детектил payload у вложенных узлов
            const extraTargets = [];
            if (interiorGroupRef.current) extraTargets.push(interiorGroupRef.current);
            const rayHits = raycaster.intersectObjects(objects.concat(extraTargets), true);
            console.log('[INTERIOR CLICK] rayHits count:', rayHits.length);
            const hits = rayHits.filter(h => {
                const obj = h.object;
                // учитываем payload на мешах и на родителях
                if (obj && obj.userData && (obj.userData.interactable || obj.userData.payload || obj.userData.isNpc)) return true;
                let p = obj;
                while (p && p.parent) {
                    p = p.parent;
                    if (p.userData && (p.userData.interactable || p.userData.payload || p.userData.isNpc)) return true;
                }
                return false;
            });
            console.log('[INTERIOR CLICK] interactable hits count:', hits.length);
            if (hits.length) {
                const top = hits[0].object;
                // поднимаем до узла, где лежит payload
                let node = top;
                while (node && !node.userData?.payload && node.parent) node = node.parent;
                let payload = (node && node.userData && node.userData.payload) || (top.userData.payload) || {};
                // Если у попавшего меша нет payload, но это часть NPC, поднимемся до isNpc
                if ((!payload || !payload.type) && node) {
                    let p = node;
                    while (p && !p.userData?.isNpc && p.parent) p = p.parent;
                    if (p && p.userData?.npcId) {
                        payload = { type: 'npc', id: p.userData.npcId };
                    }
                }
                console.log('[INTERIOR CLICK] payload:', payload);
                if (payload.type === 'marker') {
                    console.log('Нажат маркер:', payload);
                } else if (payload.type === 'npc') {
                    console.log('Нажат NPC:', payload);
                    try { if (payload.id) { loadDialog(payload.id); } } catch (_) { }
                } else {
                    console.log('Интерактив:', payload);
                }
                return;
            }

            // Если своих интерактивов не нашли, пробуем поймать NPC из общего массива npcMeshes
            try {
                const npcHit = raycaster.intersectObjects(npcMeshesRef.current || [], true);
                console.log('[INTERIOR CLICK] npcMeshes hits:', npcHit.length);
                if (npcHit.length) {
                    let root = npcHit[0].object;
                    while (root.parent && !root.userData?.isNpc) root = root.parent;
                    if (root.userData && root.userData.npcId) {
                        console.log('[INTERIOR CLICK] NPC root found:', root.userData.npcId);
                        if (root.userData.npcId === 'Computer') {
                            setShowMiniGame(true);
                            setPasswordCorrect(false);
                            setAudioUrl('/audio/firs.ogg');
                            addSeregaComment('Ну чё, хакер, разберёшься?');
                        } else {
                            loadDialog(root.userData.npcId);
                        }
                        return;
                    }
                }
            } catch (e) {
                console.warn('[INTERIOR CLICK] npcMeshes raycast failed:', e);
            }
        };

        const target = rendererRef.current ? rendererRef.current.domElement : window;
        target.addEventListener('click', onClick);
        target.addEventListener('pointerdown', onClick);
        return () => { target.removeEventListener('click', onClick); target.removeEventListener('pointerdown', onClick); };
    }, []);

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
            setThirst(data.thirst);
            setBalance(data.balance);
            const profile = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
            profile.satiety = data.satiety;
            profile.thirst = data.thirst;
            profile.balance = data.balance;
            sessionStorage.setItem('user_profile', JSON.stringify(profile));
            socketRef.current.emit('economy:getInventory', { userId: profile.id });
        }
    }

    function handleItemAction(item) {
        const act = window.prompt('1 - использовать, 2 - выкинуть');
        const prof = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
        if (act === '1') {
            if (item.name.toLowerCase().includes('вода')) {
                setThirst(t => Math.min(100, t + 20));
            } else {
                setSatiety(s => Math.min(100, s + 20));
            }
            socketRef.current.emit('economy:removeItem', { userId: prof.id, itemId: item.item_id, quantity: 1 });
        } else if (act === '2') {
            socketRef.current.emit('economy:removeItem', { userId: prof.id, itemId: item.item_id, quantity: 1 });
        }
        socketRef.current.emit('economy:getInventory', { userId: prof.id });
    }
    function toggleWorldVisibility(visible) {
        groundRef.current && (groundRef.current.visible = visible);
        cityMeshesRef.current.forEach(m => m.visible = visible);
    }

    function createInterior() {
        const group = new THREE.Group();
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x808080 });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
        floor.rotation.x = -Math.PI / 2;
        group.add(floor);

        const wallMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
        const wallGeo = new THREE.PlaneGeometry(20, 10);
        const back = new THREE.Mesh(wallGeo, wallMat);
        back.position.set(0, 5, -10);
        group.add(back);
        const front = back.clone();
        front.position.set(0, 5, 10);
        front.rotation.y = Math.PI;
        group.add(front);
        const left = back.clone();
        left.position.set(-10, 5, 0);
        left.rotation.y = Math.PI / 2;
        group.add(left);
        const right = back.clone();
        right.position.set(10, 5, 0);
        right.rotation.y = -Math.PI / 2;
        group.add(right);

        const light = new THREE.PointLight(0xffffff, 1);
        light.position.set(0, 5, 0);
        group.add(light);

        return group;
    }

    function enterHouse(house) {
        if (!house || !sceneRef.current || !playerRef.current) return;
        const id = parseInt(house.id, 10);
        if (id === 9) {
            savedPositionRef.current.copy(playerRef.current.position);
            toggleWorldVisibility(false);
            interiorGroupRef.current = createInterior();
            sceneRef.current.add(interiorGroupRef.current);
            playerRef.current.position.set(0, 0, 0);
            playerRef.current.quaternion.identity();
            setSelectedHouse(null);
            switchToFirstPersonCamera();
            setIsInInterior(true);
        }
    }

    useEffect(() => {
        console.log('[DEBUG] useEffect вызван');
        const mount = mountRef.current;
        if (!mount) {
            console.log('[DEBUG] mountRef.current не определён!');
            return;
        }

        // ─────────────────────────────────────────────
        // Красивый загрузочный оверлей + LoadingManager
        // ─────────────────────────────────────────────
        let overlayEl = null, barEl = null, textEl = null;
        function createLoadingOverlay() {
            if (overlayEl) return;
            overlayEl = document.createElement('div');
            Object.assign(overlayEl.style, {
                position: 'fixed', inset: '0', zIndex: 2000,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg,#0f172a,#1e293b)',
                color: '#fff', fontFamily: 'system-ui, Arial, sans-serif'
            });
            textEl = document.createElement('div');
            Object.assign(textEl.style, {
                fontSize: '24px', fontWeight: 700, opacity: 0.9, marginBottom: '16px'
            });
            textEl.textContent = 'Загрузка ресурсов...';
            overlayEl.appendChild(textEl);
            const barWrap = document.createElement('div');
            Object.assign(barWrap.style, {
                width: '320px', height: '10px',
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '999px', overflow: 'hidden',
                boxShadow: '0 6px 20px rgba(0,0,0,0.35)'
            });
            barEl = document.createElement('div');
            Object.assign(barEl.style, {
                width: '0%', height: '100%',
                transition: 'width .15s ease',
                background: 'linear-gradient(90deg,#22d3ee,#38bdf8,#60a5fa)'
            });
            barWrap.appendChild(barEl);
            overlayEl.appendChild(barWrap);
            const pct = document.createElement('div');
            Object.assign(pct.style, { marginTop: '12px', fontSize: '14px', opacity: 0.8 });
            pct.id = 'loadingPct';
            pct.textContent = '0%';
            overlayEl.appendChild(pct);
            document.body.appendChild(overlayEl);
        }
        function updateLoadingOverlay(percent, text) {
            if (!overlayEl) return;
            const p = Math.max(0, Math.min(100, Math.round(percent || 0)));
            if (barEl) barEl.style.width = p + '%';
            const pct = overlayEl.querySelector('#loadingPct');
            if (pct) pct.textContent = p + '%';
            if (text && textEl) textEl.textContent = text;
        }
        function removeLoadingOverlay() {
            if (!overlayEl) return;
            overlayEl.style.transition = 'opacity .2s ease';
            overlayEl.style.opacity = '0';
            setTimeout(() => {
                overlayEl && overlayEl.remove();
                overlayEl = barEl = textEl = null;
            }, 220);
        }
        // Общий менеджер загрузки (для GLTF/Texture и т.п.)
        const loadingManager = new THREE.LoadingManager();
        loadingManagerRef.current = loadingManager;
        loadingManager.onStart = (_url, loaded, total) => {
            createLoadingOverlay();
            updateLoadingOverlay(total ? (loaded / total) * 100 : 5, 'Загрузка ресурсов...');
        };
        loadingManager.onProgress = (_url, loaded, total) => {
            updateLoadingOverlay(total ? (loaded / total) * 100 : 50);
        };
        loadingManager.onLoad = () => {
            updateLoadingOverlay(100, 'Инициализация сцены...');
            setTimeout(removeLoadingOverlay, 150);
        };


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
        const maxZoom = zoom * 3.5;

        let orthoCamera, fpCamera;
        let player, mixer;
        let idleAction, walkAction, currentAction;
        let remotePlayers = remotePlayersRef.current;
        let obstacles = [];
        let destination = null;
        let blockedTime = 0;
        const moveSpeed = 2.5;
        const WALK_ANIM_SPEED_MPS = 2;
        let clock;
        try {
            clock = new THREE.Clock();
        } catch (error) {
            console.error('Ошибка создания THREE.Clock:', error);
            return;
        }
        const keys = {};
        let npcMeshes = [];
        const territorySize = 500;
        const boundary = territorySize / 2;
        const gridSize = 300;
        const nodeSize = territorySize / gridSize;

        let pathfinderGrid;
        let currentPath = [];
        let pathIndex = 0;
        let groundPlane;
        let destinationMarker;
        let customMaterial;

        const token = localStorage.getItem('token');
        // Подключаемся к локальному серверу
        const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:4000'
            : window.location.origin;

        socketRef.current = io(serverUrl, {
            transports: ['websocket', 'polling'],
            auth: { token },
            timeout: 20000 // Увеличиваем timeout до 20 секунд
        });
        const socket = socketRef.current;

        console.log('socket инстанс:', socket);
        console.log('Подключение к серверу:', serverUrl);

        socket.on('connect', () => {
            console.log('✔ Socket connected, id=', socket.id);
            console.log('Подключение успешно установлено');
        });

        socket.on('connect_error', err => {
            console.error('Socket connect_error:', err);
            console.error('Ошибка подключения к серверу:', serverUrl);
            console.error('Проверьте, что сервер запущен на порту 4000');
        });

        socket.on('disconnect', reason => {
            console.warn('Socket disconnected:', reason);
            console.warn('Соединение разорвано, причина:', reason);
        });
        const profile = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
        if (profile?.id) {
            socket.emit('economy:getBalance', { userId: profile.id });
        }
        const balanceInterval = setInterval(() => {
            const p = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
            if (p?.id) socket.emit('economy:getBalance', { userId: p.id });
        }, 3000);
        socket.on('economy:balanceChanged', ({ userId, newBalance }) => {
            if (userId === profile.id) {
                setBalance(newBalance);
                const upd = { ...(profile || {}), balance: newBalance };
                sessionStorage.setItem('user_profile', JSON.stringify(upd));
            }
        });
        socket.emit('economy:getInventory', { userId: profile.id });
        socket.on('economy:inventory', setInventory);
        socket.on('gameTime:update', ({ time }) => setGameTime(time));
        // Лоадеры, учитывающиеся в прогрессе через loadingManagerRef
        const gltfLoader = new GLTFLoader(loadingManagerRef.current || undefined);
        const animLoader = new GLTFLoader(loadingManagerRef.current || undefined);

        async function loadPlayerModel(avatarUrl) {
            return new Promise((resolve, reject) => {
                console.log('GLTFLoader загружает:', avatarUrl);

                // Проверяем, что URL начинается с правильного пути
                if (!avatarUrl.startsWith('/') && !avatarUrl.startsWith('http')) {
                    console.error('Неправильный формат URL:', avatarUrl);
                    reject(new Error('Неправильный формат URL'));
                    return;
                }

                gltfLoader.load(
                    avatarUrl,
                    (gltf) => {
                        console.log('GLTF загружен успешно:', gltf);
                        if (!gltf.scene) {
                            console.error('GLTF.scene отсутствует в загруженном файле');
                            return reject('GLTF.scene отсутствует');
                        }
                        resolve(gltf);
                    },
                    (progress) => {
                        console.log('Прогресс загрузки:', progress);
                    },
                    (err) => {
                        console.error('Ошибка загрузки GLTF:', err);
                        reject(err);
                    }
                );
            });
        }

        async function addOtherPlayer(id, x, z, avatarURL, genderRemote = 'male', firstName = '', lastName = '', y = 0) {
            if (remotePlayers[id]) {
                // Уже есть — не пересоздаём
                return;
            }
            let model;
            try {
                if (!avatarURL) throw new Error('no avatarURL');
                const gltf = await loadPlayerModel(avatarURL);
                model = gltf.scene;

                // Проверяем и исправляем материалы модели
                model.traverse((child) => {
                    if (child.isMesh && child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                if (!mat || !mat.isMaterial) {
                                    console.warn(`Неправильный материал в аватаре ${id}, заменяем на стандартный`);
                                    if (THREE.MeshStandardMaterial) {
                                        child.material = new THREE.MeshStandardMaterial({ color: 0x808080 });
                                    } else {
                                        console.error('THREE.MeshStandardMaterial не доступен для замены материала');
                                    }
                                }
                            });
                        } else if (!child.material.isMaterial) {
                            console.warn(`Неправильный материал в аватаре ${id}, заменяем на стандартный`);
                            child.material = new THREE.MeshStandardMaterial({ color: 0x808080 });
                        }
                    }
                });
            } catch (e) {
                console.warn(`Не удалось загрузить аватар ${id}, рисуем сферу`, e);
                model = new THREE.Mesh(
                    new THREE.SphereGeometry(1),
                    new THREE.MeshBasicMaterial({ color: 0x888888 })
                );
            }
            model.scale.set(1, 1, 1);
            model.position.set(x, y || 0, z);
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

            // Синхронизируем анимацию ходьбы с скоростью перемещения
            remotePlayers[id].walkAction.setEffectiveTimeScale(moveSpeed / WALK_ANIM_SPEED_MPS);
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

            texture.generateMipmaps = false;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = 1;

            texture.needsUpdate = true;

            const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthTest: false,     // рисуем поверх геометрии
                depthWrite: false,
                toneMapped: false,    // чтобы белый не «теплился» тон-меппингом
                sizeAttenuation: false
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(0.5, 0.5, 1);

            // ↓↓↓ добавь это ↓↓↓
            sprite.raycast = () => { };
            sprite.userData.isUiSprite = true;

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
                } catch { }
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
            // Получаем профиль (только для ФИО/аватара)
            const myProfile = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
            // Добавляем/обновляем игроков из пришедшего списка
            Object.keys(players).forEach(id => {
                if (id === socket.id) return;
                const { x, y, z, avatarURL, gender, firstName, lastName } = players[id];
                if (!remotePlayers[id]) {
                    addOtherPlayer(id, x, z, avatarURL, gender, firstName, lastName, y);
                }
            });
            // Удаляем тех, кого нет в актуальном списке (после входа/выхода из интерьера и т.п.)
            const validIds = new Set(Object.keys(players));
            Object.keys(remotePlayers).forEach((rid) => {
                if (rid === socket.id) return;
                if (!validIds.has(rid)) {
                    if (remotePlayers[rid] && remotePlayers[rid].model) {
                        scene.remove(remotePlayers[rid].model);
                    }
                    delete remotePlayers[rid];
                    if (voiceIcons.current[rid]) delete voiceIcons.current[rid];
                    cleanupVoiceConnection(rid);
                }
            });

            // После получения списка игроков, отправляем newPlayer о себе ТОЛЬКО когда мы не в интерьере
            // Отправляем себя только если это первый коннект и ещё не отправляли
            if (!window.__newPlayerSentOnce) {
                const profile = myProfile;
                socket.emit('newPlayer', {
                    x: player?.position?.x || 0,
                    y: player?.position?.y || 0,
                    z: player?.position?.z || 0,
                    avatarURL: avatarUrl,
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    userId: profile.id
                });
                window.__newPlayerSentOnce = true;
            }
        });

        socket.on('chatMessage', ({ playerId, name, message, position }) => {
            console.log('← chatMessage получил:', message);
            if (!player || !cameraRef.current || !scene || !obstacles) return;

            const origin = cameraRef.current.position.clone();
            const targetPos = new THREE.Vector3(position.x, player.position.y, position.z);
            const direction = new THREE.Vector3().subVectors(targetPos, origin).normalize();

            const raycaster = new THREE.Raycaster(origin, direction);
            raycaster.camera = cameraRef.current; // ← ВАЖНО для спрайтов

            const obstacleMeshes = obstacles.map(o => o.mesh).filter(Boolean); // ← фильтр от null
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

            const newPos = new THREE.Vector3(data.x, typeof data.y === 'number' ? data.y : remote.model.position.y, data.z);
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
                // Более плавный переход к анимации ходьбы
                const fadeTime = 0.3;
                remote.currentAction.fadeOut(fadeTime);
                remote.walkAction.reset().fadeIn(fadeTime).play();
                remote.currentAction = remote.walkAction;

                // Синхронизируем время анимации
                remote.walkAction.time = 0;
            }

            clearTimeout(remote._idleTimeout);
            remote._idleTimeout = setTimeout(() => {
                if (remote.currentAction !== remote.idleAction) {
                    // Более плавный переход к idle анимации
                    const fadeTime = 0.3;
                    remote.currentAction.fadeOut(fadeTime);
                    remote.idleAction.reset().fadeIn(fadeTime).play();
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

            // Проверяем, не существует ли уже игрок с таким ID
            if (remotePlayers[playerId]) {
                console.log(`Игрок ${playerId} уже существует, обновляем позицию`);
                // Обновляем позицию существующего игрока
                remotePlayers[playerId].model.position.set(x, 0, z);
                return;
            }

            // Если мы сейчас внутри интерьера, показывать новых игроков следует только когда они тоже будут в нашем списке currentPlayers,
            // который уже фильтруется сервером по interiorId. Здесь просто добавляем как обычно.
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




        // Throttling для колеса мыши
        let wheelTimeout = null;

        function onMouseWheel(e) {
            e.preventDefault();

            // Throttling - обрабатываем только каждые 16ms (60fps)
            if (wheelTimeout) return;

            wheelTimeout = setTimeout(() => {
                wheelTimeout = null;
            }, 16);

            const delta = -e.deltaY * 0.001;

            if (e.ctrlKey) {
                cameraPitchOffset = THREE.MathUtils.clamp(
                    cameraPitchOffset + delta,
                    -maxPitch,
                    maxPitch
                );
            } else {
                if (cameraRef.current === orthoCamRef.current) {
                    zoom = THREE.MathUtils.clamp(zoom * (1 + delta), minZoom, maxZoom);
                    orthoCamRef.current.zoom = zoom;
                    orthoCamRef.current.updateProjectionMatrix();
                }
            }
        }

        // Throttling для движения мыши
        let mouseMoveTimeout = null;

        function onMouseLookMove(e) {
            if (!isInInteriorRef.current || cameraRef.current !== fpCamRef.current || !playerRef.current) return;
            if (altHeldRef.current) return; // при зажатом Alt не вращаем камеру

            // Throttling - обрабатываем только каждые 8ms (120fps для более плавного движения)
            if (mouseMoveTimeout) return;

            mouseMoveTimeout = setTimeout(() => {
                mouseMoveTimeout = null;
            }, 8);

            const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
            const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

            // Уменьшаем чувствительность для более плавного движения
            const sensitivity = 0.0015;

            // В интерьере поворачиваем только камеру, не игрока
            if (isInInteriorRef.current) {
                // Поворачиваем камеру по горизонтали (влево-вправо)
                const yawDelta = -movementX * sensitivity;
                const currentYaw = playerRef.current.rotation.y;
                playerRef.current.rotation.y = currentYaw + yawDelta;

                // Поворачиваем камеру по вертикали (вверх-вниз)
                const pitchDelta = -movementY * sensitivity;
                fpPitchRef.current = THREE.MathUtils.clamp(
                    fpPitchRef.current + pitchDelta,
                    -Math.PI / 2 + 0.1,
                    Math.PI / 2 - 0.1
                );
            } else {
                // В обычном режиме поворачиваем игрока
                playerRef.current.rotation.y -= movementX * sensitivity;
                fpPitchRef.current = THREE.MathUtils.clamp(
                    fpPitchRef.current - movementY * sensitivity,
                    -Math.PI / 2 + 0.1,
                    Math.PI / 2 - 0.1
                );
            }
        }

        async function init() {
            console.log('[DEBUG] init вызван');

            // Проверяем, что THREE загружен
            if (!THREE) {
                console.error('THREE.js не загружен');
                return;
            }

            // Проверяем, что THREE.Clock доступен
            if (!THREE.Clock) {
                console.error('THREE.Clock не доступен');
                return;
            }

            // Проверяем, что THREE.Scene доступен
            if (!THREE.Scene) {
                console.error('THREE.Scene не доступен');
                return;
            }

            scene = new THREE.Scene();
            //scene.fog = new THREE.FogExp2(0xcce0ff, 0.002);
            sceneRef.current = scene;
            const aspect = window.innerWidth / window.innerHeight;
            const d = 200;

            // Проверяем, что THREE.OrthographicCamera доступен
            if (!THREE.OrthographicCamera) {
                console.error('THREE.OrthographicCamera не доступен');
                return;
            }

            // Проверяем, что THREE.PerspectiveCamera доступен
            if (!THREE.PerspectiveCamera) {
                console.error('THREE.PerspectiveCamera не доступен');
                return;
            }

            orthoCamera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
            orthoCamera.position.set(200, 200, 200);
            orthoCamera.zoom = zoom;
            orthoCamera.updateProjectionMatrix();
            orthoCamera.lookAt(scene.position);

            fpCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);

            cameraRef.current = orthoCamera;
            orthoCamRef.current = orthoCamera;
            fpCamRef.current = fpCamera;

            // Проверяем поддержку WebGL
            if (!window.WebGLRenderingContext) {
                console.error('WebGL не поддерживается в этом браузере');
                return;
            }

            // Проверяем, что THREE.WebGLRenderer доступен
            if (!THREE.WebGLRenderer) {
                console.error('THREE.WebGLRenderer не доступен');
                return;
            }

            try {
                renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: true,
                    preserveDrawingBuffer: false
                });
            } catch (error) {
                console.error('Ошибка создания WebGL renderer:', error);
                // Попытка создать renderer без antialias
                try {
                    renderer = new THREE.WebGLRenderer({
                        antialias: false,
                        alpha: true,
                        preserveDrawingBuffer: false
                    });
                } catch (secondError) {
                    console.error('Не удалось создать WebGL renderer даже без antialias:', secondError);
                    return;
                }
            }
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setClearColor(0x87CEEB, 1); // Голубое небо
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.0;
            rendererRef.current = renderer;

            if (mountRef.current) {
                mountRef.current.appendChild(renderer.domElement);
            } else {
                console.error('mountRef.current не найден');
                return;
            }

            if (renderer && renderer.domElement) {
                renderer.domElement.addEventListener('wheel', onMouseWheel, { passive: false });
                renderer.domElement.addEventListener('mousemove', onMouseLookMove);
            } else {
                console.error('renderer или renderer.domElement не найден');
                return;
            }

            // Pointer lock больше не используется в интерьере — курсор всегда активен

            // Проверяем, что THREE.PlaneGeometry доступен
            if (!THREE.PlaneGeometry) {
                console.error('THREE.PlaneGeometry не доступен');
                return;
            }

            // Проверяем, что THREE.MeshBasicMaterial доступен
            if (!THREE.MeshBasicMaterial) {
                console.error('THREE.MeshBasicMaterial не доступен');
                return;
            }

            const planeGeometry = new THREE.PlaneGeometry(territorySize, territorySize);
            const planeMaterial = new THREE.MeshBasicMaterial({
                color: 0x00aa00,
                transparent: true,
                opacity: 0,        // невидим
                depthWrite: false  // не трогает Z-буфер
            });

            // Проверяем, что THREE.Mesh доступен
            if (!THREE.Mesh) {
                console.error('THREE.Mesh не доступен');
                return;
            }

            groundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
            groundPlane.rotation.x = -Math.PI / 2;
            scene.add(groundPlane);
            groundRef.current = groundPlane;

            // Проверяем, что THREE.AmbientLight доступен
            if (!THREE.AmbientLight) {
                console.error('THREE.AmbientLight не доступен');
                return;
            }

            // Проверяем, что THREE.DirectionalLight доступен
            if (!THREE.DirectionalLight) {
                console.error('THREE.DirectionalLight не доступен');
                return;
            }

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(50, 100, 50);
            scene.add(directionalLight);

            // Проверяем, что THREE.SphereGeometry доступен
            if (!THREE.SphereGeometry) {
                console.error('THREE.SphereGeometry не доступен');
                return;
            }

            const markerGeometry = new THREE.SphereGeometry(0.5, 16, 16);
            const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            destinationMarker = new THREE.Mesh(markerGeometry, markerMaterial);
            destinationMarker.visible = false;
            scene.add(destinationMarker);

            // Проверяем, что THREE.LoadingManager доступен
            if (!THREE.LoadingManager) {
                console.error('THREE.LoadingManager не доступен');
                return;
            }

            // Проверяем, что THREE.TextureLoader доступен
            if (!THREE.TextureLoader) {
                console.error('THREE.TextureLoader не доступен');
                return;
            }

            const loadingManager = new THREE.LoadingManager(() => {
                console.log("Все текстуры загружены");
            });
            const textureLoader = new THREE.TextureLoader(loadingManager);
            const baseTexture = textureLoader.load('textures/base.png',
                // onLoad callback
                (texture) => {
                    console.log('Текстура base.png загружена успешно');
                    if (THREE.SRGBColorSpace) {
                        texture.colorSpace = THREE.SRGBColorSpace;
                    }
                },
                // onProgress callback
                (progress) => {
                    console.log('Прогресс загрузки текстуры:', progress);
                },
                // onError callback
                (error) => {
                    console.error('Ошибка загрузки текстуры base.png:', error);
                    // Создаем материал без текстуры в случае ошибки
                    if (THREE.MeshStandardMaterial) {
                        customMaterial = new THREE.MeshStandardMaterial({
                            color: 0x808080
                        });
                    } else {
                        console.error('THREE.MeshStandardMaterial не доступен');
                    }
                }
            );

            // Проверяем, что THREE.MeshStandardMaterial доступен
            if (!THREE.MeshStandardMaterial) {
                console.error('THREE.MeshStandardMaterial не доступен');
                return;
            }

            customMaterial = new THREE.MeshStandardMaterial({
                map: baseTexture,
                roughness: 0.5,
                metalness: 0.1
            });


            const npcMixersArray = [];
            // Добавление персонажей 
            const npcData = [
                { id: 'bartender', model: '/models/npc/bartender.glb', position: [0, 0, 10] },
                { id: 'guard', model: '/models/npc/guard.glb', position: [0, 0, 5] },
                { id: 'Adventurer', model: '/models/npc/galina.glb', position: [-16.5, -100, -68.8] },
                { id: 'BeachCharacter', model: '/models/npc/BeachCharacter.glb', position: [0, 0, 3] },
                { id: 'Oxranik', model: '/models/npc/Oxranik.glb', position: [0, 0, -3] },
                { id: 'Computer', model: '/models/npc/Computer.glb', position: [0.1, 0.1, 2.1] }
            ];
            for (const npc of npcData) {
                try {
                    const gltf = await gltfLoader.loadAsync(npc.model);
                    const model = gltf.scene;

                    // Проверяем и исправляем материалы модели
                    model.traverse((child) => {
                        if (child.isMesh && child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    if (!mat || !mat.isMaterial) {
                                        console.warn(`Неправильный материал в ${npc.id}, заменяем на стандартный`);
                                        if (THREE.MeshStandardMaterial) {
                                            child.material = new THREE.MeshStandardMaterial({ color: 0x808080 });
                                        } else {
                                            console.error('THREE.MeshStandardMaterial не доступен для замены материала');
                                        }
                                    }
                                });
                            } else if (!child.material.isMaterial) {
                                console.warn(`Неправильный материал в ${npc.id}, заменяем на стандартный`);
                                if (THREE.MeshStandardMaterial) {
                                    child.material = new THREE.MeshStandardMaterial({ color: 0x808080 });
                                } else {
                                    console.error('THREE.MeshStandardMaterial не доступен для замены материала');
                                }
                            }
                        }
                    });

                    model.position.set(...npc.position);
                    model.userData.npcId = npc.id;
                    model.userData.isNpc = true;

                    // Добавляем метку с именем
                    let label;
                    if (npc.id == 'bartender') {
                        label = createPlayerLabel('Серега Пират');
                    }
                    else if (npc.id == 'guard') {
                        label = createPlayerLabel('Саша Белый');
                    }
                    else if (npc.id == 'Adventurer') {
                        label = createPlayerLabel('Галина');
                    }
                    else if (npc.id == 'BeachCharacter') {
                        label = createPlayerLabel('Костя Ключник');
                    }
                    else if (npc.id == 'Oxranik') {
                        label = createPlayerLabel('Охранник');
                    }

                    if (label) {
                        label.position.set(0, 2.2, 0);
                        model.add(label);
                    }

                    model.rotateY(Math.PI); // Развернуть персонажа 
                    scene.add(model);
                    npcMeshes.push(model); // Правильное добавление в массив
                    npcMeshesRef.current.push(model);
                    cityMeshesRef.current.push(model);

                    if (npc.id == 'Computer') {
                        model.scale.set(0.001, 0.001, 0.001);
                    }

                    if (npc.id == 'Oxranik') {
                        model.scale.set(0.2, 0.2, 0.2);
                    }

                } catch (error) {
                    console.error(`Ошибка загрузки NPC ${npc.id}:`, error);
                }
            }
            // Загрузка объектов города из базы данных
            let cityObjects = [];
            try {
                const profile = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
                const cityId = profile.last_city_id || 1;
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/cities/${cityId}/objects`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                cityObjects = await res.json();
            } catch (e) {
                console.error('[DEBUG] Ошибка загрузки объектов города:', e);
                cityObjects = [];
            }

            cityObjectsDataRef.current = cityObjects;
            let interiors = [];
            try {
                const token = localStorage.getItem('token');
                const resInt = await fetch('/api/interiors', { headers: { Authorization: `Bearer ${token}` } });
                interiors = await resInt.json();
            } catch (e) {
                console.error('Ошибка загрузки списка интерьеров', e);
            }
            interiorsDataRef.current = interiors;
            updateCityObjectVisibility();

            window.addEventListener('keydown', onKeyDown);
            window.addEventListener('keyup', onKeyUp);
            renderer.domElement.addEventListener('pointerdown', onDocumentMouseDown);
            renderer.domElement.addEventListener('mousemove', onMouseLookMove);

            try {
                // Проверяем, что avatarUrl существует и валиден
                let modelUrl = avatarUrl;
                if (!avatarUrl || avatarUrl === 'undefined' || avatarUrl === 'null') {
                    console.warn('avatarUrl не определен, используем fallback модель');
                    modelUrl = '/models/character.glb';
                }

                console.log('Загружаем модель игрока:', modelUrl);
                const gltf = await loadPlayerModel(modelUrl);
                player = gltf.scene;
                scene.add(player);
                playerRef.current = player;
                player.scale.set(1, 1, 1);
                player.position.set(0, 0, 0);

                const profile = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
                const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();

                // Устанавливаем имя игрока в mountRef для отладки
                if (mountRef.current) {
                    mountRef.current.setAttribute('data-player-name', myName);
                }

                const nameLabel = createPlayerLabel(myName);
                nameLabel.position.set(0, 2.2, 0);
                player.add(nameLabel);

                mixer = new THREE.AnimationMixer(player);

                const isFemale = gender === 'female';
                const animGender = isFemale ? 'feminine' : 'masculine';

                const idlePath = `/animations/${animGender}/glb/idle/${isFemale ? 'F_Standing_Idle_001.glb' : 'M_Standing_Idle_001.glb'
                    }`;
                const walkPath = `/animations/${animGender}/glb/locomotion/${isFemale ? 'F_Walk_002.glb' : 'M_Walk_001.glb'
                    }`;

                console.log('Загружаем анимации:', { idlePath, walkPath });

                const [idleGltf, walkGltf] = await Promise.all([
                    animLoader.loadAsync(idlePath).catch(err => {
                        console.error('Ошибка загрузки idle анимации:', err);
                        throw err;
                    }),
                    animLoader.loadAsync(walkPath).catch(err => {
                        console.error('Ошибка загрузки walk анимации:', err);
                        throw err;
                    })
                ]);

                idleGltf.animations.forEach(stripPositionTracks);
                walkGltf.animations.forEach(stripPositionTracks);

                console.log('Idle GLB анимации:', idleGltf.animations);
                console.log('Walk GLB анимации:', walkGltf.animations);

                // Проверяем, что анимации загружены
                if (idleGltf.animations.length === 0) {
                    console.warn('Idle анимации не найдены, создаем пустую анимацию');
                    const emptyClip = new THREE.AnimationClip('idle', 1, []);
                    idleGltf.animations.push(emptyClip);
                }

                if (walkGltf.animations.length === 0) {
                    console.warn('Walk анимации не найдены, создаем пустую анимацию');
                    const emptyClip = new THREE.AnimationClip('walk', 1, []);
                    walkGltf.animations.push(emptyClip);
                }

                idleAction = mixer.clipAction(idleGltf.animations[0], player);
                walkAction = mixer.clipAction(walkGltf.animations[0], player);

                // синхронизация темпа шага с линейной скоростью
                walkAction.setEffectiveTimeScale(moveSpeed / WALK_ANIM_SPEED_MPS);

                idleAction.play();
                currentAction = idleAction;

                updateCameraFollow();

                // Не отправляем здесь newPlayer — делаем это централизованно после currentPlayers
            } catch (err) {
                console.error("Ошибка загрузки модели игрока:", err);
                console.error("Детали ошибки:", {
                    avatarUrl,
                    gender,
                    error: err.message,
                    stack: err.stack
                });

                // Создаем простую модель-заглушку в случае ошибки
                console.log("Создаем fallback модель для игрока");

                // Пробуем загрузить локальную модель
                try {
                    const fallbackGltf = await loadPlayerModel('/models/character.glb');
                    player = fallbackGltf.scene;
                    console.log("Fallback модель загружена успешно");
                } catch (fallbackErr) {
                    console.error("Ошибка загрузки fallback модели:", fallbackErr);

                    // Создаем простую геометрию
                    const fallbackGeometry = new THREE.BoxGeometry(1, 2, 1);
                    const fallbackMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                    player = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
                    console.log("Создана простая модель-заглушка");
                }

                scene.add(player);
                playerRef.current = player;
                player.scale.set(1, 1, 1);
                player.position.set(0, 0, 0);

                // Создаем простые анимации для fallback
                mixer = new THREE.AnimationMixer(player);
                const emptyIdleClip = new THREE.AnimationClip('idle', 1, []);
                const emptyWalkClip = new THREE.AnimationClip('walk', 1, []);

                idleAction = mixer.clipAction(emptyIdleClip, player);
                walkAction = mixer.clipAction(emptyWalkClip, player);

                idleAction.play();
                currentAction = idleAction;

                updateCameraFollow();

                // Отправляем данные о новом игроке
                const profile = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
                socketRef.current?.emit('newPlayer', {
                    x: player.position.x,
                    z: player.position.z,
                    avatarURL: avatarUrl || '/models/character.glb',
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    userId: profile.id
                });
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
            if (!pathfinderGrid) {
                console.warn('Pathfinder grid not ready');
                return [];
            }
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

        function loadCityObject(obj) {
            console.log('loadCityObject вызвана для объекта:', {
                id: obj.id,
                name: obj.name,
                textures: obj.textures,
                model_url: obj.model_url
            });

            gltfLoader.load(
                obj.model_url,
                (gltf) => {
                    const model = gltf.scene;

                    // Проверяем и исправляем материалы модели
                    model.traverse((child) => {
                        if (child.isMesh && child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    if (!mat || !mat.isMaterial) {
                                        console.warn(`Неправильный материал в объекте ${obj.name}, заменяем на стандартный`);
                                        child.material = new THREE.MeshStandardMaterial({ color: 0x808080 });
                                    }
                                });
                            } else if (!child.material.isMaterial) {
                                console.warn(`Неправильный материал в объекте ${obj.name}, заменяем на стандартный`);
                                child.material = new THREE.MeshStandardMaterial({ color: 0x808080 });
                            }
                        }
                    });

                    model.userData = {
                        id: obj.id,
                        type: obj.name,
                        organizationId: obj.organization_id,
                        rent: obj.rent,
                        tax: obj.tax
                    };
                    // Применяем масштаб из БД, если есть
                    const sx = (obj.scale_x ?? 1) || 1;
                    const sy = (obj.scale_y ?? 1) || 1;
                    const sz = (obj.scale_z ?? 1) || 1;
                    model.scale.set(sx, sy, sz);
                    model.position.set(obj.pos_x, obj.pos_y, obj.pos_z);
                    model.rotation.set(obj.rot_x, obj.rot_y, obj.rot_z);

                    console.log('Обрабатываем материалы для объекта:', obj.name);

                    // Обрабатываем материалы в зависимости от поля textures
                    model.traverse(child => {
                        if (child.isMesh) {
                            console.log('Найден меш в объекте:', obj.name, {
                                hasMaterial: !!child.material,
                                materialType: child.material ? child.material.type : 'none'
                            });

                            // Сохраняем оригинальные материалы для интерьеров
                            if (obj.name && obj.name.toLowerCase().includes('interior')) {
                                console.log('Объект интерьера - оставляем оригинальные материалы');
                                // Для интерьеров оставляем оригинальные материалы
                                if (child.material) {
                                    child.material.needsUpdate = true;
                                }
                            } else {
                                // Проверяем поле textures
                                if (obj.textures && obj.textures !== '-') {
                                    console.log('Загружаем текстурпак для объекта:', obj.name, 'текстурпак:', obj.textures);

                                    // Для citypack.json используем тот же принцип, что в MapEditor: единый стандартный материал с baseColor
                                    if (obj.textures === '/packs/citypack.json') {
                                        // Присваиваем клон стандартного материала с базовой текстурой из пака
                                        const forceReplace = true;
                                        loadTexturePackForMesh(obj.textures, child, forceReplace);
                                    } else {
                                        loadTexturePackForMesh(obj.textures, child);
                                    }
                                } else {
                                    console.log('Оставляем встроенные текстуры для объекта:', obj.name);
                                    // Если textures = '-' или не указано, оставляем встроенные текстуры
                                    if (child.material) {
                                        child.material.needsUpdate = true;
                                    }
                                }
                            }
                        }
                    });

                    scene.add(model);
                    cityMeshesRef.current.push(model);
                    const boundingBox = new THREE.Box3().setFromObject(model);
                    const isCollidable = obj.collidable !== false && !/road/i.test(obj.name);
                    if (isCollidable) {
                        obstacles.push({ mesh: model, box: boundingBox });
                    }
                    loadedCityObjectsRef.current[obj.id] = { mesh: model, data: obj };
                    buildPathfindingGrid();
                },
                undefined,
                (error) => console.error('Ошибка загрузки объекта', obj.name, error)
            );
        }

        function unloadCityObject(id) {
            const entry = loadedCityObjectsRef.current[id];
            if (!entry) return;
            const { mesh } = entry;
            scene.remove(mesh);
            cityMeshesRef.current = cityMeshesRef.current.filter(m => m !== mesh);
            obstacles = obstacles.filter(o => o.mesh !== mesh);
            delete loadedCityObjectsRef.current[id];
            buildPathfindingGrid();
        }

        // Кэш для оптимизации вычислений расстояний
        let lastPlayerPosition = null;
        let lastVisibilityUpdate = 0;

        function updateCityObjectVisibility() {
            if (!player) return;

            const p = player.position;
            const now = Date.now();

            // Проверяем, изменилась ли позиция игрока значительно
            if (lastPlayerPosition &&
                Math.abs(lastPlayerPosition.x - p.x) < 5 &&
                Math.abs(lastPlayerPosition.z - p.z) < 5 &&
                now - lastVisibilityUpdate < 1000) {
                return; // Пропускаем обновление, если игрок не двигался значительно
            }

            lastPlayerPosition = p.clone();
            lastVisibilityUpdate = now;

            // Оптимизированные вычисления расстояний
            const loadRadiusSq = LOAD_RADIUS * LOAD_RADIUS;

            cityObjectsDataRef.current.forEach(obj => {
                const dx = obj.pos_x - p.x;
                const dz = obj.pos_z - p.z;
                const distSq = dx * dx + dz * dz; // Используем квадрат расстояния для избежания sqrt

                if (distSq <= loadRadiusSq) {
                    if (!loadedCityObjectsRef.current[obj.id]) {
                        console.log('Загружаем объект:', { id: obj.id, name: obj.name, textures: obj.textures });
                        loadCityObject(obj);
                    }
                } else {
                    if (loadedCityObjectsRef.current[obj.id]) unloadCityObject(obj.id);
                }
            });

            interiorsDataRef.current.forEach(int => {
                const dx = int.pos_x - p.x;
                const dz = int.pos_z - p.z;
                const distSq = dx * dx + dz * dz;

                if (distSq <= loadRadiusSq) {
                    if (!loadedInteriorMeshesRef.current[int.id]) loadInteriorPlaceholder(int);
                } else if (loadedInteriorMeshesRef.current[int.id]) {
                    unloadInteriorPlaceholder(int.id);
                }
            });
        }

        function loadInteriorPlaceholder(int) {
            // Упрощённый невидимый placeholder с кликабельной зоной
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(2, 2, 2),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            mesh.position.set(int.pos_x, int.pos_y, int.pos_z);
            mesh.userData.interiorId = int.id;
            scene.add(mesh);
            cityMeshesRef.current.push(mesh);
            loadedInteriorMeshesRef.current[int.id] = mesh;
        }

        function unloadInteriorPlaceholder(id) {
            const mesh = loadedInteriorMeshesRef.current[id];
            if (!mesh) return;
            scene.remove(mesh);
            cityMeshesRef.current = cityMeshesRef.current.filter(m => m !== mesh);
            delete loadedInteriorMeshesRef.current[id];
        }

        // В функции onDocumentMouseDown заменяем существующий код на:
        async function onDocumentMouseDown(event) {
            if (!player) return;
            if (isInInteriorRef.current) return; // disable clicks when inside
            event.preventDefault();

            const rect = renderer.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1
            );
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, cameraRef.current);

            // NPC
            const npcHit = raycaster.intersectObjects(npcMeshes, true);
            if (npcHit.length) {
                let root = npcHit[0].object;
                while (root.parent && !root.userData.isNpc) root = root.parent;
                if (root.userData.npcId) {
                    if (root.userData.npcId === 'Computer') {
                        setShowMiniGame(true);
                        setPasswordCorrect(false);
                        setAudioUrl("/audio/firs.ogg");
                        addSeregaComment("Ну чё, хакер, разберёшься?");
                    } else {
                        loadDialog(root.userData.npcId);
                    }
                    return;
                }
            }

            // Здания/объекты
            const houseHit = raycaster.intersectObjects(obstacles.map(o => o.mesh).filter(Boolean), true);
            if (houseHit.length) {
                let obj = houseHit[0].object;
                while (obj && !obj.userData.id && !obj.userData.interiorId) obj = obj.parent;
                if (obj && obj.userData.id) {
                    setSelectedHouse(obj.userData);
                    return;
                }
                if (obj && obj.userData.interiorId) {
                    console.log('Клик по интерьеру:', obj.userData.interiorId);
                    await enterInteriorMode(obj.userData.interiorId);
                    return;
                }
            }

            // 3. Проверка игроков
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

            // Сброс выделений
            setSelectedHouse(null);
            setOrgMenu(null);
            setSelectedPlayer(null);

            // 4. Проверка земли
            if (!groundPlane) {
                console.warn('groundPlane ещё не готов');
                return;
            }

            const groundIntersects = raycaster.intersectObject(groundPlane);
            if (groundIntersects.length === 0) {
                console.log("Клик не попал по плоскости");
                return;
            }

            destination = groundIntersects[0].point.clone();
            destination.y = player.position.y;

            const newPath = computePath(player.position, destination);
            if (newPath.length === 0) {
                console.warn("Путь не найден");
                return;
            }
            currentPath = newPath;
            pathIndex = 0;

            if (destinationMarker) {
                destinationMarker.position.copy(destination);
                destinationMarker.visible = true;
            }
        }

        function onKeyDown(event) {
            keys[event.key] = true;
            if (event.key === 'Alt') altHeldRef.current = true;

            console.log('onKeyDown:', event.key, 'isInInteriorRef.current:', isInInteriorRef.current);

            // ESC больше не выходит из интерьера

            if (isInInteriorRef.current) {
                console.log('Обрабатываем клавишу в интерьере:', event.key);
                const k = event.key.toLowerCase();
                if (k === 'arrowup' || k === 'w') startMove('forward');
                if (k === 'arrowdown' || k === 's') startMove('backward');
                if (k === 'arrowleft' || k === 'a') startMove('left');
                if (k === 'arrowright' || k === 'd') startMove('right');
                if (k === 'q') startMove('strafeLeft');
                if (k === 'e') startMove('strafeRight');
            }

            if (event.key.toLowerCase() === 'i') {
                const prof = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
                socket.emit('economy:getInventory', { userId: prof.id });
                setShowInventory(v => !v);
            }

            // Сбрасываем назначение только если не в интерьере
            if (!isInInteriorRef.current) {
                destination = null;
                destinationMarker.visible = false;
            }
        }

        function onKeyUp(event) {
            keys[event.key] = false;
            if (event.key === 'Alt') altHeldRef.current = false;
            if (isInInteriorRef.current) {
                const k = event.key.toLowerCase();
                if (k === 'arrowup' || k === 'w') stopMove('forward');
                if (k === 'arrowdown' || k === 's') stopMove('backward');
                if (k === 'arrowleft' || k === 'a') stopMove('left');
                if (k === 'arrowright' || k === 'd') stopMove('right');
                if (k === 'q') stopMove('strafeLeft');
                if (k === 'e') stopMove('strafeRight');
            }
        }

        function createPlayerLabel(text) {
            const canvas = document.createElement('canvas');
            canvas.width = 512; // Увеличиваем размер canvas
            canvas.height = 128;
            const ctx = canvas.getContext('2d');

            // Добавляем фон для лучшей видимости
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const fontSize = 32; // Увеличиваем размер шрифта
            ctx.fillStyle = 'white';
            ctx.font = `bold ${fontSize}px Arial`;

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Добавляем обводку для лучшей видимости
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);

            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;

            const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthTest: false, // Рисуем поверх всего
                depthWrite: false
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(1, 0.25, 1); // Увеличиваем размер спрайта

            // ↓↓↓ добавь это ↓↓↓
            sprite.raycast = () => { };
            sprite.userData.isUiSprite = true;

            return sprite;
        }

        function switchAnimation(newAction) {
            if (!newAction || !currentAction || newAction === currentAction) return;

            // Увеличиваем время перехода для более плавной анимации
            const fadeTime = 0.3;

            // Плавно убираем текущую анимацию
            currentAction.fadeOut(fadeTime);

            // Плавно включаем новую анимацию
            newAction.reset().fadeIn(fadeTime).play();

            // Обновляем текущую анимацию
            currentAction = newAction;

            // Синхронизируем время для избежания подлагов
            if (newAction === walkAction) {
                newAction.time = 0;
            }
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
            const dir = new THREE.Vector3().subVectors(target, player.position);
            dir.y = 0;
            const dist = dir.length();

            const stepDistance = moveSpeed * delta;
            if (dist < stepDistance) {
                player.position.copy(target);
                pathIndex++;
                blockedTime = 0;
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

            dir.normalize();
            const step = dir.clone().multiplyScalar(stepDistance);

            // Кандидаты перемещения: прямо, слайд по X, слайд по Z
            const tryMoves = [
                player.position.clone().add(step),
                player.position.clone().add(new THREE.Vector3(step.x, 0, 0)),
                player.position.clone().add(new THREE.Vector3(0, 0, step.z))
            ];

            // Помощник: «привязка» к верхней поверхности
            const stickToTopSurface = (pos) => {
                const downRay = new THREE.Raycaster(
                    new THREE.Vector3(pos.x, 100, pos.z),
                    new THREE.Vector3(0, -1, 0),
                    0,
                    300
                );
                downRay.camera = cameraRef.current; // важное дополнение для спрайтов

                // фильтруем null/undefined
                const walkables = [groundPlane, ...(cityMeshesRef.current || [])].filter(Boolean);

                const hits = downRay
                    .intersectObjects(walkables, true)
                    .filter(h => !h.object.isSprite && h.face && h.face.normal && h.face.normal.y > 0.6);

                if (hits.length) {
                    pos.y = hits[0].point.y + 0.02; // лёгкий "антизалип"
                }
            };


            let moved = false;
            for (const candidate of tryMoves) {
                if (canMove(candidate)) {
                    stickToTopSurface(candidate);
                    player.position.copy(candidate);
                    moved = true;
                    blockedTime = 0;
                    break;
                }
            }

            if (moved) {
                const angle = Math.atan2(dir.x, dir.z);
                const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0));
                player.quaternion.slerp(targetQuat, Math.min(1, 10 * delta));
                socketRef.current?.emit('playerMovement', { x: player.position.x, y: player.position.y, z: player.position.z });

                if (currentAction !== walkAction) {
                    currentAction.fadeOut(0.2);
                    walkAction.reset().fadeIn(0.2).play();
                    currentAction = walkAction;
                }
            } else {
                // полностью заблокированы
                blockedTime += delta;

                // Пробуем перепроложить путь к текущей цели,
                // либо через 0.35с сдаёмся и ставим idle
                if (destination && blockedTime > 0.1) {
                    const newPath = computePath(player.position, destination);
                    if (newPath.length > 0) {
                        currentPath = newPath;
                        pathIndex = 0;
                        // оставляем walk
                        if (currentAction !== walkAction) {
                            currentAction.fadeOut(0.2);
                            walkAction.reset().fadeIn(0.2).play();
                            currentAction = walkAction;
                        }
                        return;
                    }
                }
                if (blockedTime > 0.35) {
                    currentPath = [];
                    destination = null;
                    if (currentAction !== idleAction) {
                        currentAction.fadeOut(0.2);
                        idleAction.reset().fadeIn(0.2).play();
                        currentAction = idleAction;
                    }
                }
            }
        }


        function updateTransparency() {
            if (!player) return;

            // Если мы в интерьере, не применяем прозрачность
            if (isInInteriorRef.current) return;

            obstacles.forEach(obstacle => {
                obstacle.mesh.traverse(child => {
                    if (child.isMesh && child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                if (!mat) return;
                                mat.transparent = false;
                                mat.opacity = 1.0;
                                mat.depthWrite = true;
                                mat.needsUpdate = true;
                            });
                        } else {
                            child.material.transparent = false;
                            child.material.opacity = 1.0;
                            child.material.depthWrite = true;
                            child.material.needsUpdate = true;
                        }
                    }
                });
            });
            const direction = new THREE.Vector3()
                .subVectors(player.position, cameraRef.current.position)
                .normalize();

            const raycaster = new THREE.Raycaster(cameraRef.current.position, direction);
            raycaster.camera = cameraRef.current; // ← ВАЖНО для спрайтов

            const camToPlayerDist = cameraRef.current.position.distanceTo(player.position);

            const obstacleMeshes = obstacles.map(ob => ob.mesh).filter(Boolean); // ← фильтр от null
            if (obstacleMeshes.length === 0) return;

            const intersects = raycaster.intersectObjects(obstacleMeshes, true);

            intersects.forEach(hit => {
                if (hit.object === player) return;
                if (hit.distance < camToPlayerDist) {
                    if (hit.object.parent === scene) {
                        if (hit.object.isMesh && hit.object.material) {
                            if (Array.isArray(hit.object.material)) {
                                hit.object.material.forEach(mat => {
                                    if (!mat) return;
                                    mat.transparent = true;
                                    mat.opacity = 0.3;
                                    mat.depthWrite = false;
                                    mat.needsUpdate = true;
                                });
                            } else {
                                hit.object.material.transparent = true;
                                hit.object.material.opacity = 0.3;
                                hit.object.material.depthWrite = false;
                                hit.object.material.needsUpdate = true;
                            }
                        }
                    } else {
                        hit.object.parent.traverse(child => {
                            if (child.isMesh && child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => {
                                        if (!mat) return;
                                        mat.transparent = true;
                                        mat.opacity = 0.3;
                                        mat.depthWrite = false;
                                        mat.needsUpdate = true;
                                    });
                                } else {
                                    child.material.transparent = true;
                                    child.material.opacity = 0.3;
                                    child.material.depthWrite = false;
                                    child.material.needsUpdate = true;
                                }
                            }
                        });
                    }
                }
            });
        }

        function updateFirstPersonMovement(delta) {
            if (!isInInteriorRef.current || cameraRef.current !== fpCamRef.current || !player) return;

            const move = moveInputRef.current;
            const speed = 2; // Уменьшаем скорость для более плавного движения в интерьере
            const rotSpeed = Math.PI * 0.5; // Уменьшаем скорость поворота

            // Проверка триггера выхода по внутренней точке
            if (interiorExitPosRef.current && player.position.distanceTo(interiorExitPosRef.current) < 0.7) {
                exitInterior();
                return;
            }

            // Поворот влево-вправо (A/D или стрелки)
            if (move.left) player.rotation.y += rotSpeed * delta;
            if (move.right) player.rotation.y -= rotSpeed * delta;
            // Камера следует за вращением тела
            const headHeight = 1.6;
            const camBase = new THREE.Vector3(player.position.x, player.position.y + headHeight, player.position.z);
            const camForward = new THREE.Vector3(0, 0, -0.08).applyEuler(new THREE.Euler(0, player.rotation.y, 0));
            fpCamRef.current.position.copy(camBase.add(camForward));
            const lookForward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, player.rotation.y, 0));
            fpCamRef.current.lookAt(fpCamRef.current.position.clone().add(lookForward));

            // Движение с проверкой коллизий
            const tryMove = (dirVec) => {
                const candidate = player.position.clone().addScaledVector(dirVec, speed * delta);
                // Обновляем AABB игрока (простая капсула не используется, только коробка)
                const half = 0.25; // чуточку уже, чтобы не цепляться за стены
                const height = 1.7; // немного ниже, чтобы не пересекать потолок
                const playerBox = new THREE.Box3(
                    new THREE.Vector3(candidate.x - half, candidate.y, candidate.z - half),
                    new THREE.Vector3(candidate.x + half, candidate.y + height, candidate.z + half)
                );
                // Обновляем мировые матрицы статических коллайдеров для корректных AABB
                try { interiorGroupRef.current && interiorGroupRef.current.updateMatrixWorld(true); } catch (_) { }

                // В интерьере учитываем только внутренние коллайдеры, без городских объектов
                const blockingMeshes = Array.isArray(interiorCollidersRef.current)
                    ? interiorCollidersRef.current
                    : [];

                let hits = false;
                for (const mesh of blockingMeshes) {
                    if (!mesh) continue;
                    const box = new THREE.Box3().setFromObject(mesh);
                    // небольшой зазор, чтобы скользить вдоль стен
                    const expanded = box.clone().expandByScalar(0.01);
                    if (expanded.intersectsBox(playerBox)) { hits = true; break; }
                }
                if (!hits) {
                    player.position.copy(candidate);
                }
            };

            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(player.quaternion);
            if (move.forward) tryMove(forward);
            if (move.backward) tryMove(forward.clone().multiplyScalar(-1));
            if (move.strafeLeft) tryMove(right.clone().multiplyScalar(-1));
            if (move.strafeRight) tryMove(right);

            // Отправляем позицию внутри интерьера, чтобы нас видели другие внутри
            if (socketRef.current) {
                socketRef.current.emit('playerMovement', { x: player.position.x, y: player.position.y, z: player.position.z });
            }
        }

        function updateCameraFollow() {
            if (!player) return;

            const target = player.position.clone();
            if (cameraRef.current === fpCamRef.current) {
                const yaw = player.rotation.y;
                const pitch = fpPitchRef.current;
                const headPos = target.clone().add(new THREE.Vector3(0, 1.6, 0));
                cameraRef.current.position.copy(headPos);
                const forward = new THREE.Vector3(0, 0, -1).applyEuler(
                    new THREE.Euler(pitch, yaw, 0, 'YXZ')
                );
                cameraRef.current.lookAt(headPos.clone().add(forward));
                return;
            }

            const polar = basePolar + cameraPitchOffset;
            const planar = radius * Math.cos(polar);
            const yOff = radius * Math.sin(polar);
            const xOff = planar * Math.cos(baseAzimuth);
            const zOff = planar * Math.sin(baseAzimuth);

            // Плавная интерполяция позиции камеры
            const targetPosition = new THREE.Vector3(
                target.x + xOff,
                target.y + yOff,
                target.z + zOff
            );

            cameraRef.current.position.lerp(targetPosition, 0.1);
            cameraRef.current.lookAt(target);
        }

        function animate() {
            requestAnimationFrame(animate);

            // Проверяем, что все необходимые объекты инициализированы
            if (!renderer || !scene || !cameraRef.current) {
                console.warn('Пропускаем анимацию - не все объекты инициализированы');
                return;
            }

            if (!clock || typeof clock.getDelta !== 'function') {
                console.warn('Clock не инициализирован');
                return;
            }
            const delta = Math.min(clock.getDelta(), 0.1); // Ограничиваем delta для стабильности

            // Обновляем анимации
            if (mixer && typeof mixer.update === 'function') {
                mixer.update(delta);
            }

            // Обновляем движение игрока
            // В интерьере отключаем автодвижение по кликам (двигаемся только WASD)
            if (!isInInteriorRef.current && typeof updateDestinationMovement === 'function') {
                updateDestinationMovement(delta);
            }
            if (typeof updateFirstPersonMovement === 'function') {
                updateFirstPersonMovement(delta);
            }

            // Обновляем других игроков
            if (remotePlayers) {
                for (let id in remotePlayers) {
                    const r = remotePlayers[id];
                    if (r && r.model && r.targetPosition) {
                        r.model.position.lerp(r.targetPosition, 0.15); // Увеличиваем скорость интерполяции
                    }
                    if (r && r.mixer && typeof r.mixer.update === 'function') {
                        r.mixer.update(delta);
                    }
                }
            }

            // Обновляем прозрачность и видимость объектов (реже)
            if (Math.floor(Date.now() / 100) % 3 === 0) {
                if (typeof updateTransparency === 'function') {
                    updateTransparency();
                }
                if (typeof updateCityObjectVisibility === 'function') {
                    updateCityObjectVisibility();
                }
            }

            // Обновляем камеру
            if (typeof updateCameraFollow === 'function') {
                updateCameraFollow();
            }

            // Рендерим сцену
            if (renderer && scene && cameraRef.current) {
                try {
                    renderer.render(scene, cameraRef.current);
                } catch (error) {
                    console.error('Ошибка рендеринга:', error);
                    // Не освобождаем материалы здесь, чтобы не усугублять ошибку на следующих кадрах
                }
            } else {
                console.warn('Renderer, scene или camera не инициализированы:', {
                    renderer: !!renderer,
                    scene: !!scene,
                    camera: !!cameraRef.current
                });
            }
        }

        (async () => {
            await init();
            animate();
        })();

        function onWindowResize() {
            const aspect = window.innerWidth / window.innerHeight;
            if (orthoCamRef.current) {
                orthoCamRef.current.left = -200 * aspect;
                orthoCamRef.current.right = 200 * aspect;
                orthoCamRef.current.top = 200;
                orthoCamRef.current.bottom = -200;
                orthoCamRef.current.updateProjectionMatrix();
            }
            if (fpCamRef.current) {
                fpCamRef.current.aspect = aspect;
                fpCamRef.current.updateProjectionMatrix();
            }
            if (rendererRef.current) {
                rendererRef.current.setSize(window.innerWidth, window.innerHeight);
            }
        }
        window.addEventListener('resize', onWindowResize, false);

        return () => {
            clearInterval(balanceInterval);

            // Очищаем таймеры throttling
            if (wheelTimeout) {
                clearTimeout(wheelTimeout);
                wheelTimeout = null;
            }
            if (mouseMoveTimeout) {
                clearTimeout(mouseMoveTimeout);
                mouseMoveTimeout = null;
            }

            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            if (renderer && renderer.domElement) {
                renderer.domElement.removeEventListener('pointerdown', onDocumentMouseDown);
                renderer.domElement.removeEventListener('wheel', onMouseWheel);
                renderer.domElement.removeEventListener('mousemove', onMouseLookMove);
            }
            document.removeEventListener('pointerlockchange');
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
            if (interiorGroupRef.current) {
                scene.remove(interiorGroupRef.current);
                interiorGroupRef.current = null;
            }
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
            <div style={{ position: 'absolute', top: 50, left: 20, zIndex: 1000, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 8px', borderRadius: 4 }}>
                Жажда: {thirst}
            </div>
            {/* HUD: сытость/жажда */}
            <div style={{
                position: 'absolute',
                left: 20, top: 20,
                display: 'flex',
                gap: 12,
                flexDirection: 'column',
                zIndex: 10000,
                width: 260,
            }}>
                {[{ label: 'Сытость', value: satiety }, { label: 'Жажда', value: thirst }].map((bar) => (
                    <div key={bar.label} style={{
                        background: 'rgba(15,15,20,0.75)',
                        borderRadius: 12,
                        padding: '10px 12px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                        backdropFilter: 'blur(4px)',
                    }}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            fontSize: 13, color: '#B8C0CC', marginBottom: 6,
                            fontWeight: 600, letterSpacing: 0.3,
                        }}>
                            <span>{bar.label}</span>
                            <span>{Math.round(bar.value)}%</span>
                        </div>
                        <div style={{
                            height: 10,
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.08)',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${Math.max(0, Math.min(100, bar.value))}%`,
                                borderRadius: 999,
                                // красивый градиент: зелёный → жёлтый → красный
                                background: 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)',
                                transition: 'width 300ms ease',
                                boxShadow: '0 0 6px rgba(255,255,255,0.35) inset',
                            }} />
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ position: 'absolute', top: 80, left: 20, zIndex: 1000, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 8px', borderRadius: 4 }}>
                Баланс: {balance}
            </div>
            <div style={{ position: 'absolute', top: 20, right: 150, zIndex: 1000, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 8px', borderRadius: 4 }}>
                X: {playerCoords.x} Y: {playerCoords.y} Z: {playerCoords.z}
            </div>
            <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 1000, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 8px', borderRadius: 4 }}>
                {(() => {
                    if (!gameTime) return 'Загрузка времени...';
                    // Сервер шлёт ISO (gameTime.js -> toISOString). Отображаем игровое время (ускоренное в 8 раз)
                    const d = new Date(gameTime);
                    return d.toLocaleString();
                })()}
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

            {isInInterior && (
                <button
                    style={{
                        position: 'absolute',
                        top: 60,
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
                    onClick={exitInterior}
                >
                    Выйти
                </button>
            )}

            {isInInterior && isTouchDevice && (
                <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 1000 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '40px 40px', gridTemplateRows: '40px 40px 40px', gap: '5px', gridTemplateAreas: "'up up' 'left right' 'down down'" }}>
                        <button style={{ gridArea: 'up' }} onTouchStart={() => startMove('forward')} onTouchEnd={() => stopMove('forward')}>↑</button>
                        <button style={{ gridArea: 'left' }} onTouchStart={() => startMove('left')} onTouchEnd={() => stopMove('left')}>←</button>
                        <button style={{ gridArea: 'right' }} onTouchStart={() => startMove('right')} onTouchEnd={() => stopMove('right')}>→</button>
                        <button style={{ gridArea: 'down' }} onTouchStart={() => startMove('backward')} onTouchEnd={() => stopMove('backward')}>↓</button>
                    </div>
                </div>
            )}

            {selectedHouse && !isInInterior && (
                <div style={{
                    position: 'absolute',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    zIndex: 1000
                }}>
                    <button
                        onClick={() => enterInteriorMode(selectedHouse.id)}
                        style={{
                            fontSize: '18px',
                            padding: '8px 16px',
                            background: '#00aaff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Войти в здание
                    </button>
                    <button
                        onClick={() => setSelectedHouse(null)}
                        style={{
                            marginLeft: '10px',
                            fontSize: '18px',
                            background: '#aaa',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Отмена
                    </button>
                </div>
            )}


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
                        <b>ID:</b> {selectedHouse.id}
                    </p>
                    <p style={{ margin: '4px 0' }}>
                        <b>Стоимость аренды:</b> {selectedHouse.rent}
                    </p>
                    <p style={{ margin: '4px 0' }}>
                        <b>Налог:</b> {selectedHouse.tax}
                    </p>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <button onClick={() => enterHouse(selectedHouse)} style={btnStyle}>Войти</button>
                        <button onClick={() => viewStats(selectedHouse)} style={btnStyle}>Статистика</button>
                        {selectedHouse.organizationId && (
                            <>
                                <button onClick={() => openOrganizationMenu(selectedHouse.organizationId)} style={btnStyle}>Меню</button>
                                <button onClick={() => openOrganizationPanel(selectedHouse.organizationId)} style={btnStyle}>Управление</button>
                            </>
                        )}
                    </div>
                </div>
            )}
            {showDialog && currentDialog && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.85)',
                    color: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    zIndex: 3000,
                    minWidth: '300px',
                    border: '2px solid #555',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '15px',
                        borderBottom: '1px solid #444',
                        paddingBottom: '10px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            {currentDialog.avatar && (
                                <img
                                    src={currentDialog.avatar}
                                    alt={currentDialog.name}
                                    style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '50%',
                                        marginRight: '10px',
                                        objectFit: 'cover'
                                    }}
                                />
                            )}
                            <h3 style={{ margin: 0 }}>{currentDialog.name}</h3>
                        </div>
                        <button
                            onClick={() => setShowDialog(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                fontSize: '20px',
                                cursor: 'pointer'
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {currentForm ? (
                        <form onSubmit={handleFormSubmit}>
                            <h4 style={{ marginTop: 0 }}>{currentForm.title}</h4>
                            {currentForm.fields.map((field, idx) => (
                                <div key={idx} style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px' }}>
                                        {field.label}
                                    </label>
                                    {field.type === 'textarea' ? (
                                        <textarea
                                            name={field.name}
                                            placeholder={field.placeholder}
                                            required={field.required}
                                            onChange={handleFormChange}
                                            style={{
                                                width: '100%',
                                                minHeight: '80px',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                background: 'rgba(255,255,255,0.1)',
                                                border: '1px solid #555',
                                                color: 'white'
                                            }}
                                        />
                                    ) : (
                                        <input
                                            type={field.type}
                                            name={field.name}
                                            placeholder={field.placeholder}
                                            required={field.required}
                                            onChange={handleFormChange}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                background: 'rgba(255,255,255,0.1)',
                                                border: '1px solid #555',
                                                color: 'white'
                                            }}
                                        />
                                    )}
                                </div>
                            ))}
                            <button
                                type="submit"
                                style={{
                                    padding: '8px 16px',
                                    background: '#3a5f8d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    width: '100%'
                                }}
                            >
                                {currentForm.submit_text || 'Отправить'}
                            </button>
                        </form>
                    ) : (
                        <>
                            <p style={{ marginBottom: '20px', minHeight: '60px' }}>
                                {currentDialog.dialog[dialogIndex].text}
                            </p>
                            {currentDialog.dialog[dialogIndex].answers?.length > 0 ? (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    marginBottom: '20px'
                                }}>
                                    {currentDialog.dialog[dialogIndex].answers.map((answer, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswerSelect(answer)}
                                            style={{
                                                padding: '8px 16px',
                                                background: '#3a5f8d',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                textAlign: 'left'
                                            }}
                                        >
                                            {answer.text}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => setShowDialog(false)}
                                        style={{
                                            padding: '8px 16px',
                                            background: '#4a76a8',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Закрыть
                                    </button>
                                </div>
                            )}
                        </>
                    )}
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
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.85)',
                    color: '#fff',
                    padding: 16,
                    borderRadius: 10,
                    minWidth: 260,
                    maxWidth: 420,
                    zIndex: 3000
                }}>
                    <h3 style={{ marginTop: 0, marginBottom: 10 }}>{orgMenu.name}</h3>

                    {/* orgMenu.menu теперь массив элементов */}
                    {(!orgMenu.menu || orgMenu.menu.length === 0) && <p>Меню пусто</p>}
                    {Array.isArray(orgMenu.menu) && orgMenu.menu.map(it => (
                        <div key={it.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>{it.title || it.key}</div>
                                {it.price != null && <div style={{ opacity: .8, fontSize: 12 }}>{Number(it.price)} ₽</div>}
                            </div>
                            <button onClick={() => purchaseItem(orgMenu.id, it.key)}>Купить</button>
                        </div>
                    ))}

                    <div style={{ textAlign: 'right', marginTop: 10 }}>
                        <button onClick={() => setOrgMenu(null)}>Закрыть</button>
                    </div>
                </div>
            )}


            {orgPanelId && (
                <OrgControlPanel orgId={orgPanelId} onClose={() => setOrgPanelId(null)} />
            )}

            {showInventory && (
                <Inventory items={inventory} onUse={handleItemAction} />
            )}
            {selectedTransaction && (
                <div style={{
                    padding: '20px',
                    background: '#1a1a1a',
                    borderTop: '1px solid #333'
                }}>
                    <h3 style={{ marginTop: 0 }}>Детали транзакции #{selectedTransaction.id}</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '10px',
                        marginBottom: '15px'
                    }}>
                        <div><strong>Дата:</strong> {selectedTransaction.date} {selectedTransaction.time}</div>
                        <div><strong>Сумма:</strong> {selectedTransaction.amount}</div>
                        <div><strong>Назначение:</strong> {selectedTransaction.purpose || '—'}</div>
                        <div><strong>IP-адрес:</strong> {selectedTransaction.ip || 'скрыто'}</div>
                        <div><strong>Город:</strong> {selectedTransaction.city}</div>
                        <div><strong>Устройство:</strong> {selectedTransaction.device || 'скрыто'}</div>
                        <div><strong>Получатель:</strong> {selectedTransaction.recipient}</div>
                    </div>

                    {/* Подсказки для подозрительных транзакций */}
                    {selectedTransaction._isSuspicious && markedTransactions.includes(selectedTransaction.id) && (
                        <div style={{
                            padding: '10px',
                            background: '#2a1a1a',
                            borderRadius: '5px',
                            marginBottom: '15px'
                        }}>
                            <h4 style={{ marginTop: 0 }}>🔍 Обнаруженная аномалия:</h4>
                            {selectedTransaction._anomalyType === 0 && (
                                <p>Географический прыжок: транзакция из {selectedTransaction.city} всего через час после предыдущей из другого города.</p>
                            )}
                            {selectedTransaction._anomalyType === 1 && (
                                <p>Подозрительное устройство ({selectedTransaction._realDevice}) и отсутствие назначения платежа.</p>
                            )}
                            {selectedTransaction._anomalyType === 2 && (
                                <p>Многократные переводы одному получателю ({selectedTransaction.recipient}) с большими суммами.</p>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            style={{
                                background: '#3498db',
                                color: 'white',
                                border: 'none',
                                padding: '8px 15px',
                                borderRadius: '3px',
                                cursor: 'pointer'
                            }}
                            onClick={() => handleDecryptField(selectedTransaction.id, 'ip')}
                            disabled={decryptAttempts <= 0 || selectedTransaction.ip}
                        >
                            🕵️ Расшифровать IP ({decryptAttempts} осталось)
                        </button>
                        <button
                            style={{
                                background: '#3498db',
                                color: 'white',
                                border: 'none',
                                padding: '8px 15px',
                                borderRadius: '3px',
                                cursor: 'pointer'
                            }}
                            onClick={() => handleDecryptField(selectedTransaction.id, 'device')}
                            disabled={decryptAttempts <= 0 || selectedTransaction.device}
                        >
                            🕵️ Расшифровать устройство ({decryptAttempts} осталось)
                        </button>
                    </div>
                </div>
            )}

            {gameResult === 'complete' && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 3000
                }}>
                    <div style={{
                        background: '#1a2a1a',
                        padding: '40px',
                        borderRadius: '10px',
                        maxWidth: '600px',
                        textAlign: 'center'
                    }}>
                        <h2 style={{ color: '#4CAF50' }}>Этап пройден!</h2>
                        <p style={{ fontSize: '18px', margin: '20px 0' }}>
                            Поздравляем! Вы успешно завершили все уровни игры "Чистка или компромат".
                        </p>
                        <p style={{ marginBottom: '30px' }}>
                            Ваши навыки анализа транзакций на высоте!
                        </p>
                        <button
                            style={{
                                background: '#2196F3',
                                color: 'white',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '5px',
                                fontSize: '16px',
                                cursor: 'pointer'
                            }}
                            onClick={() => {
                                setGameResult(null);
                                setShowCleanupGame(false);
                                setCurrentLevel(1); // Сброс уровня
                            }}
                        >
                            Закрыть
                        </button>
                    </div>
                </div>
            )}
            {gameResult === 'fail' && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.9)',
                    padding: '20px',
                    borderRadius: '10px',
                    zIndex: 3000,
                    textAlign: 'center'
                }}>
                    <h2 style={{ color: '#e74c3c' }}>Время вышло!</h2>
                    <p style={{ fontSize: '18px' }}>Вы провалили задание, попробуйте еще раз</p>
                    <p style={{ color: '#aaa' }}>Игра перезапустится через 3 секунды...</p>
                </div>
            )}
            {showCleanupGame && !gameCompleted && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.9)',
                    zIndex: 2000,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0f0',
                    fontFamily: 'monospace',
                    padding: '20px'
                }}>
                    <div style={{
                        width: '90%',
                        maxWidth: '1200px',
                        background: '#111',
                        border: '1px solid #333',
                        borderRadius: '5px',
                        overflow: 'hidden'
                    }}>
                        {/* Заголовок */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 20px',
                            background: '#222',
                            borderBottom: '1px solid #333'
                        }}>

                            <h2 style={{ margin: 0 }}>Чистка или компромат (Уровень {currentLevel})</h2>
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <span>Время: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                                <span>Расшифровки: {decryptAttempts}</span>
                                <span>Найдено: {suspiciousFound}/3</span>
                            </div>
                        </div>

                        {/* Комментарии Серёги */}
                        {seregaComments.length > 0 && (
                            <div style={{
                                padding: '10px',
                                background: '#1a1a1a',
                                borderBottom: '1px solid #333',
                                fontStyle: 'italic'
                            }}>
                                {seregaComments[seregaComments.length - 1].text}
                            </div>
                        )}

                        {/* Таблица транзакций */}
                        <div style={{
                            maxHeight: '60vh',
                            overflowY: 'auto'
                        }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse'
                            }}>
                                <thead>
                                    <tr style={{ background: '#1a1a1a' }}>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Дата</th>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Сумма</th>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Назначение</th>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>IP-адрес</th>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Город</th>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Устройство</th>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Получатель</th>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cleanupGameData?.map((tx) => (
                                        <tr
                                            key={tx.id}
                                            style={{
                                                background: markedTransactions.includes(tx.id)
                                                    ? (tx._isSuspicious ? '#2a1a1a' : '#3a1a1a')
                                                    : '#1a1a1a',
                                                borderBottom: '1px solid #333',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => setSelectedTransaction(tx)}
                                        >
                                            <td style={{ padding: '10px' }}>{tx.date}</td>
                                            <td style={{ padding: '10px' }}>{tx.amount}</td>
                                            <td style={{ padding: '10px' }}>{tx.purpose || '—'}</td>
                                            <td style={{ padding: '10px' }}>{tx.ip || 'скрыто'}</td>
                                            <td style={{ padding: '10px' }}>{tx.city}</td>
                                            <td style={{ padding: '10px' }}>{tx.device || 'скрыто'}</td>
                                            <td style={{ padding: '10px' }}>{tx.recipient}</td>
                                            <td style={{ padding: '10px', display: 'flex', gap: '5px' }}>
                                                <button
                                                    style={{
                                                        background: markedTransactions.includes(tx.id)
                                                            ? (tx._isSuspicious ? '#27ae60' : '#e74c3c')
                                                            : '#333',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '5px 10px',
                                                        borderRadius: '3px',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMarkTransaction(tx.id);
                                                    }}
                                                >
                                                    {markedTransactions.includes(tx.id) ? '✓ Помечено' : 'Пометить'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Детали транзакции */}
                        {selectedTransaction && (
                            <div style={{
                                padding: '20px',
                                background: '#1a1a1a',
                                borderTop: '1px solid #333'
                            }}>
                                <h3 style={{ marginTop: 0 }}>Детали транзакции #{selectedTransaction.id}</h3>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '10px',
                                    marginBottom: '15px'
                                }}>
                                    <div><strong>Дата:</strong> {selectedTransaction.date} {selectedTransaction.time}</div>
                                    <div><strong>Сумма:</strong> {selectedTransaction.amount}</div>
                                    <div><strong>Назначение:</strong> {selectedTransaction.purpose || '—'}</div>
                                    <div><strong>IP-адрес:</strong> {selectedTransaction.ip || 'скрыто'}</div>
                                    <div><strong>Город:</strong> {selectedTransaction.city}</div>
                                    <div><strong>Устройство:</strong> {selectedTransaction.device || 'скрыто'}</div>
                                    <div><strong>Получатель:</strong> {selectedTransaction.recipient}</div>
                                </div>

                                {/* Подсказки для подозрительных транзакций */}
                                {selectedTransaction._isSuspicious && markedTransactions.includes(selectedTransaction.id) && (
                                    <div style={{
                                        padding: '10px',
                                        background: '#2a1a1a',
                                        borderRadius: '5px',
                                        marginBottom: '15px'
                                    }}>
                                        <h4 style={{ marginTop: 0 }}>🔍 Обнаруженная аномалия:</h4>
                                        {selectedTransaction._anomalyType === 0 && (
                                            <p>Географический прыжок: транзакция из {selectedTransaction.city} всего через час после предыдущей из другого города.</p>
                                        )}
                                        {selectedTransaction._anomalyType === 1 && (
                                            <p>Подозрительное устройство ({selectedTransaction._realDevice}) и отсутствие назначения платежа.</p>
                                        )}
                                        {selectedTransaction._anomalyType === 2 && (
                                            <p>Многократные переводы одному получателю ({selectedTransaction.recipient}) с большими суммами.</p>
                                        )}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        style={{
                                            background: '#3498db',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 15px',
                                            borderRadius: '3px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => handleDecryptField(selectedTransaction.id, 'ip')}
                                        disabled={decryptAttempts <= 0 || selectedTransaction.ip}
                                    >
                                        🕵️ Расшифровать IP ({decryptAttempts} осталось)
                                    </button>
                                    <button
                                        style={{
                                            background: '#3498db',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 15px',
                                            borderRadius: '3px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => handleDecryptField(selectedTransaction.id, 'device')}
                                        disabled={decryptAttempts <= 0 || selectedTransaction.device}
                                    >
                                        🕵️ Расшифровать устройство ({decryptAttempts} осталось)
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Результат игры */}
                        {gameResult === 'success' && (
                            <div style={{
                                margin: '20px 0',
                                textAlign: 'center',
                                fontSize: '18px'
                            }}>
                                <p>Текущий уровень: {currentLevel}</p>
                                <div style={{
                                    width: '100%',
                                    height: '20px',
                                    backgroundColor: '#333',
                                    borderRadius: '10px',
                                    margin: '10px 0'
                                }}>
                                    <div style={{
                                        width: `${(currentLevel % 5) * 20}%`,
                                        height: '100%',
                                        backgroundColor: '#4CAF50',
                                        borderRadius: '10px'
                                    }}></div>
                                </div>
                                <p>Следующий уровень загружается...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <DialogWindow
                currentDialog={currentDialog}
                dialogIndex={dialogIndex}
                showDialog={showDialog}
                formData={formData}
                currentForm={currentForm}
                handleAnswerSelect={handleAnswerSelect}
                handleFormSubmit={handleFormSubmit}
                handleFormChange={handleFormChange}
                setShowDialog={setShowDialog}
            />
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
            {showMiniGame && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.95)',
                    zIndex: 2000,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: '"Courier New", monospace',
                    color: '#0f0',
                    backdropFilter: 'blur(5px)'
                }}>
                    {/* Terminal-like header */}
                    <div style={{
                        width: '90%',
                        maxWidth: '800px',
                        background: '#111',
                        borderTopLeftRadius: '10px',
                        borderTopRightRadius: '10px',
                        padding: '10px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #333'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: '#ff5f56',
                                marginRight: '8px'
                            }}></div>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: '#ffbd2e',
                                marginRight: '8px'
                            }}></div>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: '#27c93f'
                            }}></div>
                            <span style={{ marginLeft: '15px', color: '#ccc' }}>terminal — hack_system</span>
                        </div>
                        <button
                            onClick={() => {
                                setShowMiniGame(false);
                                setPasswordCorrect(false);
                                setAudioUrl("/audio/firs.ogg");
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ccc',
                                fontSize: '18px',
                                cursor: 'pointer'
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Main terminal content */}
                    <div style={{
                        width: '90%',
                        maxWidth: '800px',
                        height: '60vh',
                        background: 'rgba(0, 20, 0, 0.2)',
                        padding: '20px',
                        overflowY: 'auto',
                        border: '1px solid #0a0',
                        boxShadow: '0 0 20px rgba(0, 255, 0, 0.1)',
                        position: 'relative'
                    }}>
                        {/* Terminal text */}
                        <div style={{ marginBottom: '20px' }}>
                            <p style={{ color: '#0f0', margin: '5px 0' }}>
                                <span style={{ color: '#0af' }}>user@hack-system:</span>~
                                <span style={{ color: '#0f0' }}>$</span> sudo access mainframe
                            </p>
                            <p style={{ color: '#f50', margin: '5px 0' }}>
                                [sudo] password for user: ********
                            </p>
                            <p style={{ color: '#0f0', margin: '5px 0' }}>
                                <span style={{ color: '#0af' }}>user@hack-system:</span>~
                                <span style={{ color: '#0f0' }}>$</span> Trying to bypass security...
                            </p>
                        </div>

                        {/* Waveform visualization */}
                        <div style={{
                            width: '100%',
                            height: '100px',
                            background: 'rgba(0, 30, 0, 0.3)',
                            margin: '20px 0',
                            border: '1px solid #0a0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <WaveformPlayer
                                url={audioUrl}
                                playing={isPlaying}
                                width={600}
                                height={80}
                                waveColor="#0f0"
                                progressColor="#0a0"
                                cursorColor="#0f0"
                            />
                        </div>

                        {/* Serega's comment */}
                        <div style={{
                            padding: '10px',
                            background: 'rgba(0, 40, 0, 0.3)',
                            borderLeft: '3px solid #0f0',
                            margin: '20px 0'
                        }}>
                            <p style={{ color: '#ff0', margin: '0', fontStyle: 'italic' }}>
                                <span style={{ color: '#0af' }}>SEREGA_PIRAT:</span>
                                {seregaComments.length > 0 ? seregaComments[seregaComments.length - 1].text : "Ну чё, хакер, разберёшься?"}
                            </p>
                        </div>

                        {/* Password options */}
                        <div style={{ marginTop: '30px' }}>
                            <p style={{ color: '#0f0', marginBottom: '10px' }}>
                                Available password fragments:
                            </p>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '10px',
                                marginBottom: '20px'
                            }}>
                                {passwordCorrect ? (
                                    programmingLanguages.map((lang, index) => (
                                        <div key={index} style={{
                                            padding: '10px',
                                            background: 'rgba(0, 50, 0, 0.3)',
                                            border: '1px solid #0a0',
                                            borderRadius: '5px',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            ':hover': {
                                                background: 'rgba(0, 80, 0, 0.5)',
                                                boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)'
                                            }
                                        }}>
                                            {lang}
                                        </div>
                                    ))
                                ) : (
                                    ['ab3 Df7 Gh9', 'Q1 wE4 rT6', 'mN8 2kP 5zX', 'L0 p09 vB7'].map((item, index) => (
                                        <div key={index} style={{
                                            padding: '10px',
                                            background: 'rgba(0, 50, 0, 0.3)',
                                            border: '1px solid #0a0',
                                            borderRadius: '5px',
                                            textAlign: 'center'
                                        }}>
                                            {item}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Password input */}
                            <div style={{ position: 'relative' }}>
                                <span style={{ color: '#0f0' }}>Enter password:</span>
                                <input
                                    type="text"
                                    placeholder="Type here and press Enter..."
                                    onKeyDown={handlePasswordInput}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        marginTop: '5px',
                                        background: 'rgba(0, 0, 0, 0.5)',
                                        border: '1px solid #0a0',
                                        color: '#0f0',
                                        fontFamily: '"Courier New", monospace',
                                        fontSize: '16px',
                                        outline: 'none'
                                    }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-20px',
                                    right: '0',
                                    color: '#888',
                                    fontSize: '12px'
                                }}>
                                    Hint: Try common passwords first
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div style={{
                        width: '90%',
                        maxWidth: '800px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '15px 20px',
                        background: '#111',
                        borderBottomLeftRadius: '10px',
                        borderBottomRightRadius: '10px',
                        borderTop: '1px solid #333'
                    }}>
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            style={{
                                padding: '8px 15px',
                                background: isPlaying ? '#f50' : '#0a0',
                                border: 'none',
                                borderRadius: '5px',
                                color: '#fff',
                                cursor: 'pointer',
                                fontFamily: '"Courier New", monospace'
                            }}
                        >
                            {isPlaying ? 'Pause Sound' : 'Play Sound'}
                        </button>
                        <div style={{ color: '#888' }}>
                            Status: {passwordCorrect ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                        </div>
                    </div>
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
                        <div key={key} style={{ marginBottom: 8 }}>
                            <span>{orgMenu.menu[key].title} — {orgMenu.menu[key].price}₽</span>
                            <button onClick={() => buyItem(key)} style={{ marginLeft: 8 }}>Купить</button>
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
                        height: '150px',
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
                            width: '65%',
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
                                    { src: "https://cdn-icons-png.flaticon.com/512/732/732190.png", alt: "Chrome", app: "Chrome" },
                                    { src: "https://cdn-icons-png.flaticon.com/512/270/270798.png", alt: "Settings", app: "Settings" },
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

                                {activeApp === "Chrome" && (
                                    <div style={bodyStyle}>
                                        <header style={headerStyle}>
                                            <h1>Прогресс квестов</h1>
                                        </header>
                                        <main style={mainStyle}>
                                            {questsProgress.length === 0 ? (
                                                <p>Нет активных квестов</p>
                                            ) : (
                                                questsProgress.map(quest => (
                                                    <div key={quest.id} style={listingStyle}>
                                                        <h3 style={listingTitleStyle}>{quest.title}</h3>
                                                        <div style={{
                                                            width: '100%',
                                                            height: '20px',
                                                            backgroundColor: '#e0e0e0',
                                                            borderRadius: '10px',
                                                            margin: '10px 0'
                                                        }}>
                                                            <div style={{
                                                                width: `${quest.progress}%`,
                                                                height: '100%',
                                                                backgroundColor: quest.progress === 100 ? '#4CAF50' : '#2196F3',
                                                                borderRadius: '10px',
                                                                transition: 'width 0.3s ease'
                                                            }}></div>
                                                        </div>
                                                        <p>Выполнено: {quest.completed} из {quest.total} ({quest.progress}%)</p>
                                                    </div>
                                                ))
                                            )}
                                        </main>
                                    </div>
                                )}

                                {activeApp === "Telegram" && (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                                        {/* Заголовок приложения */}
                                        <div style={{ padding: '8px 12px', background: '#0088cc', color: '#fff', fontWeight: 700, textAlign: 'center' }}>Shipgram</div>
                                        {/* Контент */}
                                        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                                            {/* Список контактов */}
                                            <div style={{ width: isPhoneNarrow ? (activeChat ? '0%' : '100%') : '30%', display: isPhoneNarrow && activeChat ? 'none' : 'block', borderRight: '1px solid #ddd', overflowY: 'auto', background: '#fff' }}>
                                                <div style={{ padding: 10, fontWeight: 600, borderBottom: '1px solid #eee' }}>Контакты</div>
                                                {tgLoading && (
                                                    <div style={{ padding: 12, color: '#666' }}>Загрузка…</div>
                                                )}
                                                {tgError && (
                                                    <div style={{ padding: 12, color: '#b91c1c' }}>{tgError}</div>
                                                )}
                                                {!tgLoading && !tgError && telegramContacts.length === 0 && (
                                                    <div style={{ padding: 12, color: '#666' }}>Контакты не найдены</div>
                                                )}
                                                {telegramContacts.map((user) => (
                                                    <div key={user.id} onClick={() => setActiveChat(user)} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#111' }}>
                                                        <div style={{ width: 28, height: 28, borderRadius: 14, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                                            {user.firstName?.[0]}{user.lastName?.[0]}
                                                        </div>
                                                        <div style={{ overflow: 'hidden' }}>
                                                            <div style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.firstName} {user.lastName}</div>
                                                            <div style={{ fontSize: 12, color: '#6b7280' }}>Онлайн</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                                {/* Область чата */}
                                                <div style={{ flex: 1, display: isPhoneNarrow && !activeChat ? 'none' : 'flex', flexDirection: 'column', background: '#fff', overflowX: 'hidden', overflowY: 'auto' }}>
                                                    {activeChat && (
                                                        <>
                                                            <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                {isPhoneNarrow && (
                                                                    <button onClick={() => setActiveChat(null)} style={{ border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer' }}>←</button>
                                                                )}
                                                                <span style={{ fontWeight: 600 }}>{activeChat.firstName} {activeChat.lastName}</span>
                                                            </div>
                                                            <div id="chatContainer" style={{ flex: 1, overflowY: 'auto', padding: 10, background: '#fafafa' }}>
                                                                {console.log("UserProfile ID:", activeChat.id, "Type:", typeof activeChat.id)}
                                                                {console.log("First message sender_id:", messages[0]?.sender_id, "Type:", typeof messages[0]?.sender_id)}
                                                                {messages.length === 0 ? (
                                                                    <p style={{ textAlign: 'center', color: '#666' }}>Нет сообщений</p>
                                                                ) : (
                                                                    messages.map(msg => (
                                                                        <div key={msg.id} style={{ display: 'flex', justifyContent: (Number(msg.sender_id) == Number(activeChat.id)) ? 'flex-start' : 'flex-end', margin: '8px 0' }}>
                                                                            <div style={{
                                                                                maxWidth: 'min(40%, 30ch)', // Ограничение и по % и по символам 
                                                                                background: (Number(msg.sender_id) == Number(activeChat.id)) ? '#e5e5ea' : '#0084ff',
                                                                                color: (Number(msg.sender_id) == Number(activeChat.id)) ? '#000' : '#fff',
                                                                                padding: '8px 12px',
                                                                                borderRadius: 12,
                                                                                wordWrap: 'break-word',
                                                                                overflowWrap: 'break-word',
                                                                                whiteSpace: 'pre-wrap'
                                                                            }}>
                                                                                {msg.message}
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                            <div style={{
                                                                padding: 8,
                                                                display: 'flex',
                                                                gap: 8,
                                                                borderTop: '1px solid #eee',
                                                                background: '#fff',
                                                                width: '100%'
                                                            }}>
                                                                <input
                                                                    type="text"
                                                                    value={newMessage}
                                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                                    placeholder="Сообщение"
                                                                    onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                                                                    style={{
                                                                        flex: 1,
                                                                        padding: '8px 8px',
                                                                        width: '80%',
                                                                        maxWidth: '140px',
                                                                        borderRadius: 12,
                                                                        border: '1px solid #ddd',
                                                                        boxSizing: 'border-box',
                                                                        wordWrap: 'break-word',
                                                                        whiteSpace: 'pre-wrap'
                                                                    }}
                                                                />
                                                                <button onClick={sendMessage} style={{ padding: '8px 8px', background: '#0084ff', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}>➤</button>
                                                            </div>
                                                        </>
                                                    )}
                                                {!activeChat && (
                                                    <div style={{ margin: 'auto', color: '#666' }}>Выберите контакт</div>
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