// src/components/GameWrapper.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import Game from '../Game';

export default function GameWrapper() {
  const raw = sessionStorage.getItem('user_profile');
  if (!raw) {
    // нет профиля — прямая ссылка на /game → кидаем на логин
    return <Navigate to="/login" replace />;
  }
  const profile = JSON.parse(raw);
  // profile.avatarURL, profile.gender и др.
  return <Game avatarUrl={profile.avatarURL} gender={profile.gender} />;
}
