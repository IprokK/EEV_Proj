// Исправление проблемы с рамками коллайдеров
// Файл: test-wireframe-fix.js

console.log('🔧 Исправление проблемы с рамками коллайдеров');
console.log('');

console.log('❓ Проблема:');
console.log('У каждого коллайдера два объекта: один только рамка, другой полностью закрашен');
console.log('При перемещении только рамки не сохраняется перемещение');
console.log('При перемещении полностью закрашенного объекта всё сохраняется');
console.log('');

console.log('🔍 Причина проблемы:');
console.log('');

console.log('1. 🏗️ Структура коллайдеров:');
console.log('   - Каждый коллайдер состоит из основного меша (mesh) и рамки (line)');
console.log('   - Рамка добавляется как дочерний объект: mesh.add(line)');
console.log('   - При клике можно выбрать либо основной меш, либо рамку');
console.log('');

console.log('2. 🎯 Проблема выбора:');
console.log('   - Рамка (LineSegments) не имеет userData с параметрами коллайдера');
console.log('   - Только основной меш имеет правильные userData и обновляется в collidersRef');
console.log('   - При выборе рамки TransformControls прикрепляется к ней, но данные не сохраняются');
console.log('');

console.log('3. 💾 Проблема сохранения:');
console.log('   - updateColliderData работает только с основными мешами');
console.log('   - Рамки не участвуют в процессе сохранения');
console.log('   - Перемещение рамки не влияет на позицию основного меша');
console.log('');

console.log('✅ Исправления:');
console.log('');

console.log('1. 🎯 Улучшенная логика выбора:');
console.log('   - Raycaster теперь проверяет все объекты коллайдеров (меши + рамки)');
console.log('   - При клике по рамке автоматически выбирается родительский меш');
console.log('   - Проверка, что выбранный объект действительно является коллайдером');
console.log('');

console.log('2. 🔲 Опция отключения рамок:');
console.log('   - Новое состояние showWireframes для управления видимостью');
console.log('   - Функция toggleWireframes для переключения видимости');
console.log('   - Кнопка в UI для удобного управления');
console.log('');

console.log('3. 🏗️ Обновление создания коллайдеров:');
console.log('   - Новые коллайдеры учитывают настройку видимости рамок');
console.log('   - Дублированные коллайдеры учитывают настройку видимости рамок');
console.log('   - Загруженные коллайдеры учитывают настройку видимости рамок');
console.log('');

console.log('🔧 Технические детали:');
console.log('');

console.log('🎯 Логика выбора:');
console.log('- allColliderObjects = [основные меши, рамки]');
console.log('- if (clickedObject.type === "LineSegments") clickedObject = clickedObject.parent');
console.log('- Проверка через collidersRef.current.find(c => c.mesh === clickedObject)');
console.log('');

console.log('🔲 Управление рамками:');
console.log('- showWireframes: boolean состояние');
console.log('- toggleWireframes(): переключает видимость всех рамок');
console.log('- line.visible = showWireframes при создании');
console.log('- child.visible = newShowWireframes при переключении');
console.log('');

console.log('🏗️ Структура коллайдера:');
console.log('- mesh (основной меш с материалом)');
console.log('- mesh.children[0] (рамка LineSegments)');
console.log('- mesh.userData (параметры коллайдера)');
console.log('- collidersRef содержит ссылки на основные меши');
console.log('');

console.log('🧪 Как тестировать исправления:');
console.log('');

console.log('1. 🎯 Выбор коллайдеров:');
console.log('   - Загрузите редактор коллизий');
console.log('   - Попробуйте кликнуть по рамке коллайдера');
console.log('   - Проверьте консоль: "🎯 Кликнули по рамке, выбираем родительский меш"');
console.log('   - Убедитесь, что TransformControls прикрепился к основному мешу');
console.log('   - Переместите коллайдер и сохраните');
console.log('   - Перезагрузите страницу и проверьте, что позиция сохранилась');
console.log('');

console.log('2. 🔲 Переключение рамок:');
console.log('   - Нажмите кнопку "🔲 Скрыть рамки"');
console.log('   - Проверьте консоль: "🔲 Рамки отключены"');
console.log('   - Убедитесь, что все рамки исчезли');
console.log('   - Нажмите кнопку "🔲 Показать рамки"');
console.log('   - Проверьте консоль: "🔲 Рамки включены"');
console.log('   - Убедитесь, что все рамки появились');
console.log('');

console.log('3. 🆕 Создание с отключенными рамками:');
console.log('   - Отключите рамки');
console.log('   - Создайте новый коллайдер');
console.log('   - Убедитесь, что новый коллайдер создался без рамки');
console.log('   - Включите рамки');
console.log('   - Убедитесь, что рамка появилась у нового коллайдера');
console.log('');

console.log('4. 🔄 Дублирование с отключенными рамками:');
console.log('   - Отключите рамки');
console.log('   - Дублируйте существующий коллайдер');
console.log('   - Убедитесь, что дублированный коллайдер создался без рамки');
console.log('   - Включите рамки');
console.log('   - Убедитесь, что рамка появилась у дублированного коллайдера');
console.log('');

console.log('5. 💾 Сохранение перемещений:');
console.log('   - Кликните по рамке коллайдера');
console.log('   - Переместите его в новое место');
console.log('   - Нажмите "Сохранить сейчас"');
console.log('   - Перезагрузите страницу');
console.log('   - Убедитесь, что коллайдер остался в новом месте');
console.log('');

console.log('🎯 Ожидаемые результаты:');
console.log('');

console.log('✅ Выбор коллайдеров:');
console.log('- [ ] Клик по рамке выбирает основной меш');
console.log('- [ ] TransformControls прикрепляется к основному мешу');
console.log('- [ ] Перемещение рамки перемещает весь коллайдер');
console.log('- [ ] Сохранение работает корректно');
console.log('');

console.log('✅ Управление рамками:');
console.log('- [ ] Кнопка переключает видимость всех рамок');
console.log('- [ ] Новые коллайдеры учитывают настройку');
console.log('- [ ] Дублированные коллайдеры учитывают настройку');
console.log('- [ ] Загруженные коллайдеры учитывают настройку');
console.log('');

console.log('✅ Сохранение перемещений:');
console.log('- [ ] Перемещение через рамку сохраняется');
console.log('- [ ] Перемещение через основной меш сохраняется');
console.log('- [ ] Автоматическое сохранение работает');
console.log('- [ ] Ручное сохранение работает');
console.log('');

console.log('🔍 Отладочная информация:');
console.log('');

console.log('📊 В консоли должно появляться:');
console.log('- "🎯 Кликнули по рамке, выбираем родительский меш"');
console.log('- "🔲 Рамки включены/отключены"');
console.log('- "🎯 Выбран коллайдер: [объект]"');
console.log('');

console.log('🎯 Проверка структуры:');
console.log('- selected.type должен быть "Mesh" (не "LineSegments")');
console.log('- selected.userData должен содержать параметры коллайдера');
console.log('- selected.children[0].type должен быть "LineSegments"');
console.log('');

console.log('🚀 Исправления готовы к тестированию!');
console.log('Откройте: http://localhost:4000/enhanced-collision-editor');
console.log('Попробуйте кликнуть по рамке коллайдера и переместить его');
