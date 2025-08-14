// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    try {
      // 1) логинимся
      const res1 = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res1.ok) {
        const err = await res1.json().catch(() => ({ error: res1.statusText }));
        return setError(err.error || 'Ошибка входа');
      }
      const { token } = await res1.json();

      // 2) сохраняем токен
      localStorage.setItem('token', token);

      // 3) подтягиваем профиль сразу из /api/me
      const res2 = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res2.ok) {
        console.error('Не смогли получить профиль:', await res2.text());
        return setError('Не удалось загрузить профиль');
      }
      const profile = await res2.json();

      // 4) сохраняем профиль в sessionStorage
      sessionStorage.setItem('user_profile', JSON.stringify(profile));

      // 5) уведомляем App, что логин состоялся
      onLogin();
    } catch (e) {
      console.error(e);
      setError('Сетевая ошибка');
    }
  };

  return (
    <div style={styles.wrapper}>
      <h2>Вход</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label>
          Почта:
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Пароль:
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" style={styles.button}>Войти</button>
      </form>
      <p>
        Нет аккаунта? <a href="/register/step1">Зарегистрироваться</a>
      </p>
    </div>
  );
}

const styles = {
  wrapper: {
    width:'100vw', minHeight:'100vh',
    background:'#111', color:'#fff',
    display:'flex', flexDirection:'column',
    alignItems:'center', justifyContent:'center',
    gap:20,
  },
  form: {
    display:'flex',
    flexDirection:'column',
    gap:12,
    background:'#222',
    padding:20,
    borderRadius:8,
  },
  button: {
    padding:'10px 20px',
    background:'#17a2b8',
    color:'#fff',
    border:'none',
    borderRadius:4,
    cursor:'pointer'
  },
  error: {
    color:'salmon',
  }
};
