import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RegisterStep2() {
    const navigate = useNavigate();

    useEffect(() => {
        if (!sessionStorage.getItem('reg_step1')) {
            navigate('/register/step1');
        }
    }, [navigate]);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [gender, setGender] = useState('male');
    const [age, setAge] = useState(18);
    const [city, setCity] = useState('Moscow');

    const handleNext = e => {
        e.preventDefault();
        sessionStorage.setItem(
            'reg_step2',
            JSON.stringify({ firstName, lastName, gender, age, city })
        );
        navigate('/register/step3');
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'black',
            padding: '20px',
            color: 'white'
        }}>
            <form onSubmit={handleNext} style={styles.form}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Регистрация — шаг 2</h2>

                <label style={styles.label}>
                    Имя
                    <input
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        required
                        style={styles.input}
                    />
                </label>

                <label style={styles.label}>
                    Фамилия
                    <input
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        required
                        style={styles.input}
                    />
                </label>

                <label style={styles.label}>
                    Пол
                    <select
                        value={gender}
                        onChange={e => setGender(e.target.value)}
                        style={styles.select}
                    >
                        <option value="male">Мужчина</option>
                        <option value="female">Женщина</option>
                    </select>
                </label>

                <label style={styles.label}>
                    Возраст
                    <input
                        type="number"
                        min={18}
                        value={age}
                        onChange={e => setAge(+e.target.value)}
                        required
                        style={styles.input}
                    />
                </label>

                <label style={styles.label}>
                    Город
                    <select
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        style={styles.select}
                    >
                        <option value="Moscow">Москва</option>
                        <option value="SaintP">Санкт-Петербург</option>
                        <option value="NewYork">Нью-Йорк</option>
                        <option value="LA">Лос-Анджелес</option>
                    </select>
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
        gap: '5px',
        marginBottom: '10px'
    },
    input: {
        backgroundColor: 'gray',
        padding: '8px',
        borderRadius: '7px',
        border: '2px solid #444',
        backgroundColor: '#333',
        color: 'white',
        fontSize: '14px',
        ':hover': {
            background: '#218838'
        }
    },
    select: {
        padding: '8px',
        borderRadius: '7px',
        border: '2px solid #444',
        backgroundColor: '#333',
        color: 'white',
        fontSize: '14px',
        cursor: 'pointer',
        ':hover': {
            background: '#218838'
        }
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
        marginTop: '15px',
        ':hover': {
            background: '#218838'
        }
    }
};
