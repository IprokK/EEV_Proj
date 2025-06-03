import React, { useState } from 'react';

const avatars = {
  male: [
    { name: 'Мужчина 1', url: 'https://models.readyplayer.me/68013c216026f5144dce1613.glb' },
    { name: 'Мужчина 2', url: 'https://models.readyplayer.me/68013cf0647a08a2e39f842d.glb' },
  ],
  female: [
    { name: 'Женщина 1', url: '/avatars/female1.glb' },
    { name: 'Женщина 2', url: '/avatars/female2.glb' },
  ],
};

export default function CharacterSelect({ onSelect }) {
  const [gender, setGender] = useState(null);
  
  const handleGenderSelect = (selected) => setGender(selected);
  return (
    <div style={styles.wrapper}>
      {!gender ? (
        <div style={styles.genderBlock}>
          <h2>Выберите пол</h2>
          <button onClick={() => handleGenderSelect('male')} style={styles.button}>Мужчина</button>
          <button onClick={() => handleGenderSelect('female')} style={styles.button}>Женщина</button>
        </div>
      ) : (
        <div style={styles.avatarBlock}>
          <h2>Выберите персонажа</h2>
          <div style={styles.grid}>
            {avatars[gender].map((a) => (
              <div key={a.url} style={styles.avatarCard} onClick={() => onSelect(a.url, gender)}>
                <p>{a.name}</p>
                <model-viewer
                  src={a.url}
                  camera-controls
                  style={{ width: '150px', height: '200px' }}
                />
              </div>
            ))}
          </div>
          <button onClick={() => setGender(null)} style={styles.back}>Назад</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    width: '100vw',
    height: '100vh',
    background: '#111',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  avatarBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  grid: {
    display: 'flex',
    gap: '30px',
    marginTop: '20px',
  },
  avatarCard: {
    cursor: 'pointer',
    textAlign: 'center',
  },
  button: {
    fontSize: '18px',
    padding: '10px 20px',
    background: '#222',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '8px',
  },
  back: {
    marginTop: '20px',
    fontSize: '16px',
    background: 'transparent',
    border: 'none',
    color: '#aaa',
    cursor: 'pointer',
  },
};
