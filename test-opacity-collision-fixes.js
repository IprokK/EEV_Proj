// Исправление проблем с прозрачностью и коллизиями
// Файл: test-opacity-collision-fixes.js

console.log('🔧 Исправление проблем с прозрачностью и коллизиями');
console.log('');

console.log('❓ Проблемы:');
console.log('1) Даже когда у коллайдера прозрачность 0, всё равно его видно');
console.log('2) В старом json был объект, сейчас я удалил, его не видно, но при этом сквозь него я всё равно пройти не могу');
console.log('');

console.log('🔍 Причины проблем:');
console.log('');

console.log('1. 👁️ Проблема с прозрачностью:');
console.log('   - В Three.js opacity = 0 не делает объект полностью невидимым');
console.log('   - Нужно дополнительно установить visible = false');
console.log('   - Или использовать alphaTest для правильной обработки прозрачности');
console.log('');

console.log('2. 🚫 Проблема с коллизиями удаленных коллайдеров:');
console.log('   - Игра загружает коллайдеры из разных источников');
console.log('   - Коллизионные коллайдеры (Box3) и визуальные (Mesh) загружаются отдельно');
console.log('   - При удалении коллайдера из редактора игра может не перезагрузить коллайдеры');
console.log('   - Кэширование или рассинхронизация между источниками');
console.log('');

console.log('✅ Исправления:');
console.log('');

console.log('1. 👁️ Исправление прозрачности:');
console.log('   - Добавлена проверка opacity === 0');
console.log('   - При opacity = 0: material.visible = false, alphaTest = 0');
console.log('   - При opacity > 0: material.visible = true, alphaTest = 0.1');
console.log('   - Обновлены все функции создания и изменения коллайдеров');
console.log('');

console.log('2. 🚫 Исправление коллизий удаленных коллайдеров:');
console.log('   - Добавлена функция window.reloadAllColliders() в игре');
console.log('   - Добавлена функция window.checkCollidersInDB() для диагностики');
console.log('   - Перезагрузка как коллизионных, так и визуальных коллайдеров');
console.log('   - Сравнение состояния БД с состоянием игры');
console.log('');

console.log('3. 🔄 Улучшенная синхронизация:');
console.log('   - Функция reloadColliders в редакторе');
console.log('   - Кнопка "🔄 Синхронизировать" в UI редактора');
console.log('   - Глобальные функции для отладки в игре');
console.log('');

console.log('🔧 Технические детали:');
console.log('');

console.log('👁️ Логика прозрачности:');
console.log('- if (opacity === 0) { material.visible = false; alphaTest = 0; }');
console.log('- else { material.visible = true; alphaTest = 0.1; }');
console.log('- Применяется к colliderMaterial, загруженным коллайдерам, изменениям в UI');
console.log('');

console.log('🚫 Логика перезагрузки коллайдеров:');
console.log('- loadCollidersFromJSON(1) - коллизионные коллайдеры (Box3)');
console.log('- loadCustomCollidersForCity(1) - визуальные коллайдеры (Mesh)');
console.log('- window.reloadAllColliders() - перезагрузка всех типов');
console.log('- window.checkCollidersInDB() - диагностика состояния');
console.log('');

console.log('🔄 Источники коллайдеров в игре:');
console.log('- Коллизионные: jsonCollidersRef.current (Box3 объекты)');
console.log('- Визуальные: visualCollidersRef.current (Mesh объекты)');
console.log('- Оба загружаются из /api/colliders/city/1 с fallback на JSON');
console.log('');

console.log('🧪 Как тестировать исправления:');
console.log('');

console.log('1. 👁️ Тест прозрачности:');
console.log('   - Откройте редактор коллизий');
console.log('   - Выберите коллайдер');
console.log('   - Установите прозрачность в 0');
console.log('   - Нажмите "Применить цвет"');
console.log('   - Коллайдер должен стать полностью невидимым');
console.log('   - Установите прозрачность обратно в 0.3');
console.log('   - Коллайдер должен стать видимым');
console.log('');

console.log('2. 🚫 Тест коллизий удаленных коллайдеров:');
console.log('   - Откройте игру');
console.log('   - Проверьте консоль: window.checkCollidersInDB()');
console.log('   - Убедитесь, что коллайдеры загружены из БД');
console.log('   - Откройте редактор коллизий');
console.log('   - Удалите коллайдер');
console.log('   - Вернитесь в игру');
console.log('   - Выполните: window.reloadAllColliders()');
console.log('   - Проверьте, что коллизии исчезли');
console.log('');

console.log('3. 🔄 Тест синхронизации:');
console.log('   - В редакторе: нажмите "🔄 Синхронизировать"');
console.log('   - В игре: выполните window.reloadAllColliders()');
console.log('   - Проверьте консоль на наличие ошибок');
console.log('   - Убедитесь, что количество коллайдеров совпадает');
console.log('');

console.log('4. 📊 Диагностика:');
console.log('   - В игре: window.checkCollidersInDB()');
console.log('   - Проверьте количество коллайдеров в БД vs в игре');
console.log('   - Убедитесь, что данные синхронизированы');
console.log('');

console.log('5. 🎯 Тест с несколькими коллайдерами:');
console.log('   - Создайте несколько коллайдеров с разной прозрачностью');
console.log('   - Удалите некоторые из них');
console.log('   - Сохраните изменения');
console.log('   - Перезагрузите игру');
console.log('   - Выполните window.reloadAllColliders()');
console.log('   - Проверьте, что только нужные коллайдеры остались');
console.log('');

console.log('🎯 Ожидаемые результаты:');
console.log('');

console.log('✅ Прозрачность:');
console.log('- [ ] Коллайдеры с opacity = 0 полностью невидимы');
console.log('- [ ] Коллайдеры с opacity > 0 видимы с правильной прозрачностью');
console.log('- [ ] Изменения прозрачности применяются мгновенно');
console.log('- [ ] Сохранение прозрачности работает корректно');
console.log('');

console.log('✅ Коллизии удаленных коллайдеров:');
console.log('- [ ] Удаленные коллайдеры не создают коллизий');
console.log('- [ ] window.reloadAllColliders() обновляет все коллайдеры');
console.log('- [ ] Синхронизация между редактором и игрой');
console.log('- [ ] Отсутствие "призрачных" коллизий');
console.log('');

console.log('✅ Синхронизация:');
console.log('- [ ] Кнопка "Синхронизировать" в редакторе работает');
console.log('- [ ] window.reloadAllColliders() в игре работает');
console.log('- [ ] window.checkCollidersInDB() показывает правильные данные');
console.log('- [ ] Отсутствие рассинхронизации');
console.log('');

console.log('✅ Производительность:');
console.log('- [ ] Быстрая перезагрузка коллайдеров');
console.log('- [ ] Отсутствие задержек в игре');
console.log('- [ ] Стабильная работа коллизий');
console.log('- [ ] Корректная работа прозрачности');
console.log('');

console.log('🔍 Отладочная информация:');
console.log('');

console.log('📊 В консоли должно появляться:');
console.log('- "🔄 Принудительная перезагрузка всех коллайдеров"');
console.log('- "✅ Коллизионные коллайдеры перезагружены"');
console.log('- "✅ Визуальные коллайдеры перезагружены"');
console.log('- "📊 Коллайдеры в БД: X штук"');
console.log('- "📊 Коллизионные коллайдеры в игре: Y штук"');
console.log('');

console.log('🎯 Проверка прозрачности:');
console.log('- Коллайдеры с opacity = 0 не должны быть видны');
console.log('- Коллайдеры с opacity > 0 должны быть видны с правильной прозрачностью');
console.log('- Изменения должны применяться мгновенно');
console.log('');

console.log('🎯 Проверка коллизий:');
console.log('- Удаленные коллайдеры не должны создавать коллизий');
console.log('- Персонаж должен проходить через места, где были удаленные коллайдеры');
console.log('- Коллизии должны работать только для существующих коллайдеров');
console.log('');

console.log('🚀 Исправления готовы к тестированию!');
console.log('Откройте редактор: http://localhost:4000/enhanced-collision-editor');
console.log('Откройте игру: http://localhost:4000');
console.log('Протестируйте прозрачность и коллизии удаленных коллайдеров');
