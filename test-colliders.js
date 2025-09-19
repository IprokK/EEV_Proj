// Тестовый скрипт для проверки размеров коллайдеров
// Запустите этот код в консоли браузера для тестирования

console.log('🧪 Тестирование системы коллайдеров');

// Проверяем текущую конфигурацию
console.log('Текущая конфигурация:', window.colliderConfig);

// Тестируем разные коэффициенты
const testMultipliers = [1.0, 2.0, 3.0, 4.0, 5.0];

console.log('📊 Тестируем разные коэффициенты:');
testMultipliers.forEach(multiplier => {
    console.log(`\n--- Тест с коэффициентом ${multiplier} ---`);
    window.updateColliderSize(multiplier);
    
    // Ждем немного для обновления
    setTimeout(() => {
        console.log('Размеры коллайдеров обновлены');
        window.testCollisions();
    }, 100);
});

// Функция для быстрого тестирования
window.quickTest = () => {
    console.log('🚀 Быстрый тест коллайдеров и объектов интерьера');
    
    // Включаем режим отладки
    window.toggleColliderDebug();
    
    // Тестируем цвета коллайдеров
    setTimeout(() => {
        console.log('Тестируем синий цвет коллайдеров...');
        window.setColliderColor(0, 0, 1); // Синий
    }, 1000);
    
    setTimeout(() => {
        console.log('Тестируем зеленый цвет коллайдеров...');
        window.setColliderColor(0, 1, 0); // Зеленый
    }, 2000);
    
    // Тестируем цвета объектов интерьера
    setTimeout(() => {
        console.log('Тестируем красный цвет объектов интерьера...');
        window.setInteriorObjectColor(1, 0, 0); // Красный
    }, 3000);
    
    setTimeout(() => {
        console.log('Тестируем желтый цвет объектов интерьера...');
        window.setInteriorObjectColor(1, 1, 0); // Желтый
    }, 4000);
    
    // Тестируем прозрачность
    setTimeout(() => {
        console.log('Тестируем полупрозрачность объектов интерьера...');
        window.setInteriorObjectOpacity(0.5);
    }, 5000);
    
    setTimeout(() => {
        console.log('Тестируем полную прозрачность объектов интерьера...');
        window.setInteriorObjectOpacity(0.1);
    }, 6000);
    
    // Тестируем случайные цвета коллайдеров
    setTimeout(() => {
        console.log('Тестируем случайные цвета коллайдеров...');
        window.randomizeColliderColors();
    }, 7000);
    
    // Возвращаем стандартные настройки
    setTimeout(() => {
        console.log('Возвращаем стандартные настройки...');
        window.setColliderColor(1, 0, 0); // Красный коллайдер
        window.setInteriorObjectColor(1, 1, 1); // Белый объект
        window.setInteriorObjectOpacity(1.0); // Полная непрозрачность
    }, 8000);
};

console.log('✅ Тестовые функции загружены!');
console.log('Используйте window.quickTest() для быстрого тестирования');
console.log('Используйте window.updateColliderSize(коэффициент) для изменения размера');
console.log('Используйте window.toggleColliderDebug() для включения/выключения визуализации');
console.log('');
console.log('🔧 Функции диагностики:');
console.log('window.debugInteriorObjects() - диагностика объектов интерьера');
console.log('window.setInteriorObjectColor(r,g,b) - цвет объектов интерьера');
console.log('window.setAllObjectsColor(r,g,b) - цвет ВСЕХ объектов в сцене');
console.log('');
console.log('🎯 Целевые функции (только объекты из JSON):');
console.log('window.setColliderObjectsColor(r,g,b) - цвет только объектов из JSON коллайдеров');
console.log('window.applyJsonColorsToObjects() - применить цвета и прозрачность из JSON');
console.log('');
console.log('🎨 Примеры использования:');
console.log('window.applyJsonColorsToObjects() - применить настройки из JSON');
console.log('window.setColliderObjectsColor(1, 0, 0) - красный цвет объектов из JSON');
console.log('window.setColliderObjectsColor(0, 1, 0) - зеленый цвет объектов из JSON');
console.log('window.setAllObjectsColor(0, 0, 1) - синий цвет всех объектов (для сравнения)');
