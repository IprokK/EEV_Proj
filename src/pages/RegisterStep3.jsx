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
    { name:'Женщина 1', url:'https://models.readyplayer.me/68013c216026f5144dce1613.glb' },
    { name:'Женщина 2', url:'https://models.readyplayer.me/68013c216026f5144dce1613.glb' },
  ],
};

export default function RegisterStep3() {
  const navigate = useNavigate();
  const [gender, setGender] = useState(null);
  const [avatarURL, setAvatarURL] = useState('');

  // подтягиваем данные из sessionStorage
  useEffect(() => {
    const s1 = sessionStorage.getItem('reg_step1');
    const s2 = sessionStorage.getItem('reg_step2');
    if (!s1) return navigate('/register/step1');
    if (!s2) return navigate('/register/step2');
    const { gender } = JSON.parse(s2);
    setGender(gender);
  }, [navigate]);

  const handleSelect = url => setAvatarURL(url);

  const handleSubmit = async () => {
    if (!avatarURL) return;
    const { email, password } = JSON.parse(sessionStorage.getItem('reg_step1'));
    const { firstName, lastName, gender, age, city } =
      JSON.parse(sessionStorage.getItem('reg_step2'));

    const payload = { email, password,
      firstName, lastName,
      gender, age, city,
      avatarURL
    };

    try {
      // либо используйте proxy из CRA, тогда fetch('/api/register')
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        return alert('Ошибка: ' + (err.error || res.statusText));
      }
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        sessionStorage.setItem(
          'user_profile',
          JSON.stringify({ avatarURL, gender })
        );
        navigate('/game');
      } else {
        alert(data.error || 'Не удалось зарегистрироваться');
      }
    } catch (e) {
      console.error(e);
      alert('Сетевая ошибка: ' + e.message);
    }
  };

  return (
    <div style={styles.wrapper}>
      <h2>
        Выберите персонажа&nbsp;
        <small>({gender==='male'?'мужской':'женский'})</small>
      </h2>

      <div style={styles.grid}>
        {avatars[gender]?.map(a => (
          <div
            key={a.url}
            style={{
              ...styles.avatarCard,
              boxShadow: avatarURL===a.url
                ? '0 0 0 3px #0f0'
                : 'none'
            }}
            onClick={() => handleSelect(a.url)}
          >
            <p style={{
              color: avatarURL===a.url ? '#0f0' : '#fff'
            }}>{a.name}</p>
            <model-viewer
              src={a.url}
              camera-controls
              style={{ width:150, height:200 }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!avatarURL}
        style={{
          ...styles.button,
          opacity: avatarURL ? 1 : 0.5,
          cursor: avatarURL ? 'pointer' : 'not-allowed'
        }}
      >
        Завершить регистрацию
      </button>

      <button
        onClick={() => navigate('/register/step2')}
        style={styles.back}
      >
        ← Назад
      </button>
    </div>
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
