// Скрипт для миграции коллайдеров из JSON в базу данных
// Файл: migrate-json-to-db.js

const fs = require('fs');
const path = require('path');
const { query } = require('./db');

async function migrateJsonToDb() {
  try {
    console.log('🚀 Запуск миграции коллайдеров из JSON в базу данных...');
    
    // Читаем JSON файл
    const jsonPath = path.join(__dirname, 'public', 'colliders_city_1.json');
    
    if (!fs.existsSync(jsonPath)) {
      console.log('❌ JSON файл не найден:', jsonPath);
      return;
    }
    
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(jsonContent);
    
    if (!data.colliders || !Array.isArray(data.colliders)) {
      console.log('❌ Неверный формат JSON файла');
      return;
    }
    
    console.log(`📊 Найдено ${data.colliders.length} коллайдеров в JSON файле`);
    
    // Начинаем транзакцию
    await query('BEGIN');
    
    // Очищаем существующие коллайдеры для города 1
    await query('DELETE FROM colliders WHERE city_id = $1', [1]);
    console.log('🗑️ Очищены существующие коллайдеры для города 1');
    
    // Вставляем коллайдеры из JSON
    let insertedCount = 0;
    for (const collider of data.colliders) {
      try {
        await query(`
          INSERT INTO colliders (
            city_id, type,
            position_x, position_y, position_z,
            rotation_x, rotation_y, rotation_z,
            scale_x, scale_y, scale_z,
            color_r, color_g, color_b,
            opacity
          ) VALUES (
            $1, $2,
            $3, $4, $5,
            $6, $7, $8,
            $9, $10, $11,
            $12, $13, $14,
            $15
          )
        `, [
          1, // city_id
          collider.type || 'box',
          collider.position?.x || 0,
          collider.position?.y || 0,
          collider.position?.z || 0,
          collider.rotation?.x || 0,
          collider.rotation?.y || 0,
          collider.rotation?.z || 0,
          collider.scale?.x || 1,
          collider.scale?.y || 1,
          collider.scale?.z || 1,
          collider.color?.r || 1,
          collider.color?.g || 0,
          collider.color?.b || 0,
          collider.opacity || 0.3
        ]);
        
        insertedCount++;
        console.log(`✅ Коллайдер ${insertedCount} мигрирован:`, {
          type: collider.type,
          position: collider.position,
          color: collider.color
        });
        
      } catch (error) {
        console.error(`❌ Ошибка при миграции коллайдера ${insertedCount + 1}:`, error);
        throw error;
      }
    }
    
    // Подтверждаем транзакцию
    await query('COMMIT');
    
    console.log(`🎉 Миграция завершена успешно!`);
    console.log(`📊 Мигрировано ${insertedCount} коллайдеров из JSON в базу данных`);
    
    // Проверяем результат
    const result = await query('SELECT COUNT(*) as count FROM colliders WHERE city_id = $1', [1]);
    console.log(`🔍 Проверка: в БД теперь ${result.rows[0].count} коллайдеров для города 1`);
    
  } catch (error) {
    // Откатываем транзакцию в случае ошибки
    await query('ROLLBACK');
    console.error('💥 Ошибка при миграции:', error);
    process.exit(1);
  }
}

// Запускаем миграцию
migrateJsonToDb().then(() => {
  console.log('🚀 Миграция JSON -> БД завершена!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});
