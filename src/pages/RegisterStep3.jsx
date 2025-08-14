// src/pages/RegisterStep3.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// данные аватаров
const avatars = {
  male: [
    { name:'Мужчина 1', url:'https://models.readyplayer.me/68013c216026f5144dce1613.glb' },
    { name:'Мужчина 2', url:'https://models.readyplayer.me/68013cf0647a08a2e39f842d.glb' },
  ],
  female: [
    { name:'Женщина 1', url:'https://models.readyplayer.me/680d174ea4d963314ffdd26d.glb' },
    { name:'Женщина 2', url:'https://models.readyplayer.me/680d16d12c0e4a08e3b1de22.glb' },
  ],
};

export default function RegisterStep3() {
  const navigate = useNavigate();
  const [gender, setGender] = useState('male');
  const [avatarURL, setAvatarURL] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      // завершающий вызов регистрации (оставь твой URL/тело запроса как было)
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, avatarURL })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert('Ошибка регистрации');
        return;
      }

      // сохраняем токен
      localStorage.setItem('token', data.token);

      // добираем профиль
      const meRes = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${data.token}` }
      });
      const me = meRes.ok ? await meRes.json() : null;

      // собираем профиль для игры
      const user_profile = {
        id: me?.id,
        email: me?.email,
        firstName: me?.firstName,
        lastName: me?.lastName,
        gender: me?.gender ?? gender,
        age: me?.age,
        city: me?.city,
        avatarURL: avatarURL || me?.avatarURL,
        balance: me?.balance ?? 0,
        satiety: me?.satiety ?? 100,
        thirst: me?.thirst ?? 100,
        last_city_id: me?.lastCityId ?? 1
      };

      sessionStorage.setItem('user_profile', JSON.stringify(user_profile));
      navigate('/game');
    } catch (e) {
      console.error(e);
      alert('Ошибка регистрации (шаг 3)');
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '40px auto' }}>
      <h2>Шаг 3: профиль</h2>
      <label style={{ display: 'block', marginBottom: 8 }}>
        Пол:
        <select value={gender} onChange={e => setGender(e.target.value)} style={{ marginLeft: 8 }}>
          <option value="male">Мужской</option>
          <option value="female">Женский</option>
        </select>
      </label>
      <label style={{ display: 'block', marginBottom: 8 }}>
        URL аватара:
        <input value={avatarURL} onChange={e => setAvatarURL(e.target.value)} style={{ width: '100%' }} />
      </label>
      <button type="submit">Завершить</button>
    </form>
  );
}

const styles = {
  wrapper: {
    width: '100vw', minHeight:'100vh',
    background: '#111', color:'#fff',
    display: 'flex', flexDirection:'column',
    alignItems:'center', paddingTop:40,
    gap:20
  },
  grid: {
    display:'flex', gap:30, marginBottom:20
  },
  avatarCard: {
    cursor:'pointer', textAlign:'center',
    padding:10, borderRadius:8, background:'#222'
  },
  button: {
    padding:'10px 30px',
    background:'#17a2b8',
    color:'#fff',
    border:'none',
    borderRadius:4
  },
  back: {
    marginTop:10,
    background:'transparent',
    border:'none',
    color:'#aaa',
    cursor:'pointer'
  }
};
