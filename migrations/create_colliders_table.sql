-- Миграция для создания таблицы colliders
-- Файл: migrations/create_colliders_table.sql

-- Создание таблицы colliders
CREATE TABLE IF NOT EXISTS colliders (
    id SERIAL PRIMARY KEY,
    city_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('box', 'circle', 'capsule')),
    
    -- Позиция
    position_x DECIMAL(15, 6) NOT NULL DEFAULT 0,
    position_y DECIMAL(15, 6) NOT NULL DEFAULT 0,
    position_z DECIMAL(15, 6) NOT NULL DEFAULT 0,
    
    -- Поворот (в радианах)
    rotation_x DECIMAL(15, 6) NOT NULL DEFAULT 0,
    rotation_y DECIMAL(15, 6) NOT NULL DEFAULT 0,
    rotation_z DECIMAL(15, 6) NOT NULL DEFAULT 0,
    
    -- Масштаб
    scale_x DECIMAL(15, 6) NOT NULL DEFAULT 1,
    scale_y DECIMAL(15, 6) NOT NULL DEFAULT 1,
    scale_z DECIMAL(15, 6) NOT NULL DEFAULT 1,
    
    -- Цвет (RGB 0-1)
    color_r DECIMAL(3, 2) NOT NULL DEFAULT 1.0 CHECK (color_r >= 0 AND color_r <= 1),
    color_g DECIMAL(3, 2) NOT NULL DEFAULT 0.0 CHECK (color_g >= 0 AND color_g <= 1),
    color_b DECIMAL(3, 2) NOT NULL DEFAULT 0.0 CHECK (color_b >= 0 AND color_b <= 1),
    
    -- Прозрачность (0-1)
    opacity DECIMAL(3, 2) NOT NULL DEFAULT 0.3 CHECK (opacity >= 0 AND opacity <= 1),
    
    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Индексы для быстрого поиска
    CONSTRAINT fk_colliders_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_colliders_city_id ON colliders(city_id);
CREATE INDEX IF NOT EXISTS idx_colliders_type ON colliders(type);
CREATE INDEX IF NOT EXISTS idx_colliders_position ON colliders(position_x, position_y, position_z);

-- Создание функции для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггера для автоматического обновления updated_at
CREATE TRIGGER update_colliders_updated_at 
    BEFORE UPDATE ON colliders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Комментарии к таблице и колонкам
COMMENT ON TABLE colliders IS 'Таблица коллайдеров для городов';
COMMENT ON COLUMN colliders.city_id IS 'ID города, к которому принадлежит коллайдер';
COMMENT ON COLUMN colliders.type IS 'Тип коллайдера: box, circle, capsule';
COMMENT ON COLUMN colliders.position_x IS 'X координата позиции';
COMMENT ON COLUMN colliders.position_y IS 'Y координата позиции';
COMMENT ON COLUMN colliders.position_z IS 'Z координата позиции';
COMMENT ON COLUMN colliders.rotation_x IS 'X компонент поворота (радианы)';
COMMENT ON COLUMN colliders.rotation_y IS 'Y компонент поворота (радианы)';
COMMENT ON COLUMN colliders.rotation_z IS 'Z компонент поворота (радианы)';
COMMENT ON COLUMN colliders.scale_x IS 'X компонент масштаба';
COMMENT ON COLUMN colliders.scale_y IS 'Y компонент масштаба';
COMMENT ON COLUMN colliders.scale_z IS 'Z компонент масштаба';
COMMENT ON COLUMN colliders.color_r IS 'Красный компонент цвета (0-1)';
COMMENT ON COLUMN colliders.color_g IS 'Зеленый компонент цвета (0-1)';
COMMENT ON COLUMN colliders.color_b IS 'Синий компонент цвета (0-1)';
COMMENT ON COLUMN colliders.opacity IS 'Прозрачность (0-1)';
COMMENT ON COLUMN colliders.created_at IS 'Время создания записи';
COMMENT ON COLUMN colliders.updated_at IS 'Время последнего обновления записи';
