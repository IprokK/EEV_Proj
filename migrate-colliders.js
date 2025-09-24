// Скрипт для выполнения миграции таблицы colliders
// Файл: migrate-colliders.js

const fs = require('fs');
const path = require('path');
const { query } = require('./db');

async function runMigration() {
  try {
    console.log('🚀 Запуск миграции для создания таблицы colliders...');
    
    // Читаем SQL файл миграции
    const migrationPath = path.join(__dirname, 'migrations', 'create_colliders_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Выполняем миграцию
    await query(migrationSQL);
    
    console.log('✅ Миграция успешно выполнена!');
    console.log('📊 Таблица colliders создана');
    
    // Проверяем, что таблица создана
    const result = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'colliders' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Структура таблицы colliders:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Проверяем индексы
    const indexes = await query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'colliders'
    `);
    
    console.log('🔍 Индексы:');
    indexes.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении миграции:', error);
    process.exit(1);
  }
}

// Запускаем миграцию
runMigration().then(() => {
  console.log('🎉 Миграция завершена успешно!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});
