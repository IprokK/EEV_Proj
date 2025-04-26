import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RegisterStep2() {
  const navigate = useNavigate();
  // Проверяем, что шаг 1 заполнен
  useEffect(() => {
    if (!sessionStorage.getItem('reg_step1')) {
      navigate('/register/step1');
    }
  }, [navigate]);

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName ] = useState('');
  const [gender,    setGender   ] = useState('male');
  const [age,       setAge      ] = useState(18);
  const [city,      setCity     ] = useState('Moscow');

  const handleNext = e => {
    e.preventDefault();
    sessionStorage.setItem(
      'reg_step2',
      JSON.stringify({ firstName, lastName, gender, age, city })
    );
    navigate('/register/step3');
  };

  return (
    <form onSubmit={handleNext} style={styles.form}>
      <h2>Регистрация — шаг 2</h2>
      <label>
        Имя
        <input
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          required
        />
      </label>
      <label>
        Фамилия
        <input
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          required
        />
      </label>
      <label>
        Пол
        <select value={gender} onChange={e => setGender(e.target.value)}>
          <option value="male">Мужчина</option>
          <option value="female">Женщина</option>
        </select>
      </label>
      <label>
        Возраст
        <input
          type="number"
          min={18}
          value={age}
          onChange={e => setAge(+e.target.value)}
          required
        />
      </label>
      <label>
        Город
        <select value={city} onChange={e => setCity(e.target.value)}>
          <option value="Moscow">Москва</option>
          <option value="SaintP">Санкт-Петербург</option>
          <option value="NewYork">Нью-Йорк</option>
          <option value="LA">Лос-Анджелес</option>
        </select>
      </label>
      <button type="submit" style={styles.button}>Далее →</button>
    </form>
  );
}

const styles = {
  form: {
    maxWidth: 400, margin: '50px auto', padding: 20,
    display: 'flex', flexDirection: 'column', gap: 12,
    background: '#f7f7f7', borderRadius: 8
  },
  button: {
    padding: '10px 20px',
    background: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer'
  }
};
