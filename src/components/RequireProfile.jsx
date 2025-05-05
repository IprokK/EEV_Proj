// src/components/RequireProfile.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate }         from 'react-router-dom';

export default function RequireProfile({ children }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Если уже есть профиль в sessionStorage — не фетчим
    if (sessionStorage.getItem('user_profile')) {
      setLoading(false);
      return;
    }

    // Иначе — берём токен и запрашиваем профиль
    const token = localStorage.getItem('token');
    if (!token) {
      // на всякий случай, если токена вдруг нет
      return navigate('/login', { replace: true });
    }

    fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error('Не авторизован');
      return res.json();
    })
    .then(profile => {
      sessionStorage.setItem('user_profile', JSON.stringify(profile));
      setLoading(false);
    })
    .catch(err => {
      console.error('Ошибка загрузки профиля:', err);
      // скидываем токен и отправляем на логин
      localStorage.removeItem('token');
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  if (loading) {
    return (
      <div style={{
        width:'100vw', height:'100vh',
        display:'flex', alignItems:'center',
        justifyContent:'center', color:'#fff',
        background:'#000'
      }}>
        Загрузка профиля…
      </div>
    );
  }

  // Когда профиль загружен, рендерим детей
  return <>{children}</>;
}
