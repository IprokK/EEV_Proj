require('dotenv').config();
const { Pool } = require('pg');

// Проверяем наличие строки подключения
if (!process.env.DATABASE_QUEST_NEW_QUESTS) {
    console.error('❌ Ошибка: DATABASE_QUEST_NEW_QUESTS не задана в .env файле');
    throw new Error('DATABASE_QUEST_NEW_QUESTS environment variable is required');
}

const connectionStr = process.env.DATABASE_QUEST_NEW_QUESTS;
console.log('Подключение к базе данных new_quests');

// Проверяем, содержит ли строка подключения пароль
if (!connectionStr.includes(':')) {
    console.error('❌ Ошибка: Строка подключения не содержит пароль');
    throw new Error('Database connection string must include password');
}

const new_quest_Base = new Pool({
    connectionString: connectionStr,
    ssl: false
});

// Обработчики событий
new_quest_Base.on('error', (err) => {
    console.error('❌ Ошибка подключения к базе данных new_quests:', err.message);
});

new_quest_Base.on('connect', () => {
    console.log('✅ Успешное подключение к базе данных new_quests');
});

// Функция для проверки подключения
new_quest_Base.testConnection = async () => {
    try {
        await new_quest_Base.query('SELECT 1 as test');
        console.log('✅ Тест подключения к new_quests успешен');
        return true;
    } catch (error) {
        console.error('❌ Тест подключения к new_quests failed:', error.message);
        return false;
    }
};

module.exports = {
    query: (text, params) => new_quest_Base.query(text, params),
    testConnection: () => new_quest_Base.testConnection()
};