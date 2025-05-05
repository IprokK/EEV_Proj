import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Loading from './Loading';

export default function GameWrapper() {
  const [GameComponent, setGameComponent] = useState(null);
  const [timerDone, setTimerDone] = useState(false);

  // Проверяем наличие профиля
  const raw = sessionStorage.getItem('user_profile');
  if (!raw) {
    return <Navigate to="/login" replace />;
  }
  const profile = JSON.parse(raw);

  useEffect(() => {
    let cancelled = false;
    // Начинаем динамическую загрузку модуля Game сразу
    import('../Game').then(module => {
      if (!cancelled) setGameComponent(() => module.default);
    });
    // Минимальное время загрузочного экрана
    const timeoutId = setTimeout(() => {
      setTimerDone(true);
    }, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  // Когда оба условия выполнены, рендерим игру
  if (GameComponent && timerDone) {
    return <GameComponent avatarUrl={profile.avatarURL} gender={profile.gender} />;
  }

  // Иначе показываем экран загрузки
  return <Loading />;
}
