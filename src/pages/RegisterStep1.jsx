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
        if (!agree) return alert('Нужно согласиться с условиями');
        sessionStorage.setItem('reg_step1', JSON.stringify({ email, password }));
        navigate('/register/step2');
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'black',
            padding: '20px',
            color: 'white' // Устанавливаем белый цвет для всего текста в контейнере
        }}>
            <form onSubmit={handleNext} style={styles.form}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Регистрация — шаг 1</h2>

                <label style={styles.label}>
                    Почта
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        style={styles.input}
                    />
                </label>

                <label style={styles.label}>
                    Пароль
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        style={styles.input}
                    />
                </label>

                <label style={styles.label}>
                    Подтверждение пароля
                    <input
                        type="password"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        required
                        style={styles.input}
                    />
                </label>

                <label style={styles.checkbox}>
                    <input
                        type="checkbox"
                        checked={agree}
                        onChange={e => setAgree(e.target.checked)}
                        style={{
                            marginRight: '8px',
                            padding: '8px',
                            borderRadius: '7px',
                            border: '2px solid #444',
                            backgroundColor: '#333',
                            color: 'white', // Белый цвет текста в инпутах
                            fontSize: '14px'                        }}
                    />
                    Я принимаю условия пользовательского соглашения
                </label>

                <button type="submit" style={styles.button}>Далее →</button>
            </form>
        </div>
    );
}

const styles = {
    form: {
        maxWidth: 400,
        margin: '50px auto',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 15,
        background: '#222',
        borderRadius: 8
    },
    label: {
        display: 'flex',
        flexDirection: 'column',
        fontSize: '14px',
        gap: '5px'
    },
    input: {
        padding: '8px',
        borderRadius: '7px',
        border: '2px solid #444',
        backgroundColor: '#333',
        color: 'white', // Белый цвет текста в инпутах
        fontSize: '14px'
    },
    checkbox: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: '14px',
        margin: '10px 0'
    },
    button: {
        padding: '12px 20px',
        background: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: '500',
        transition: 'background 0.3s',
        ':hover': {
            background: '#0056b3'
        }
    }
};
