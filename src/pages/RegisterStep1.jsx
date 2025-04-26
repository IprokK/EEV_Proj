import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RegisterStep1() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const navigate = useNavigate();

  const handleNext = e => {
    e.preventDefault();
    if (password !== confirm) return alert('Пароли не совпадают');
    if (!agree)          return alert('Нужно согласиться с условиями');
    // Сохраняем на шаг 1
    sessionStorage.setItem('reg_step1', JSON.stringify({ email, password }));
    navigate('/register/step2');
  };

  return (
    <form onSubmit={handleNext} style={styles.form}>
      <h2>Регистрация — шаг 1</h2>
      <label>
        Почта
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </label>
      <label>
        Пароль
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </label>
      <label>
        Подтверждение пароля
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
        />
      </label>
      <label style={styles.checkbox}>
        <input
          type="checkbox"
          checked={agree}
          onChange={e => setAgree(e.target.checked)}
        />
        Я принимаю условия пользовательского соглашения
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
  checkbox: { display: 'flex', alignItems: 'center', gap: 8 },
  button: {
    padding: '10px 20px',
    background: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer'
  }
};
