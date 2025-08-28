# Руководство по созданию квестов

Данный документ описывает процесс добавления NPC, настройки диалогов и регистрации квестов в базе данных проекта.

## Оглавление
- [Добавление моделей персонажей](#добавление-моделей-персонажей)
- [Создание диалоговых файлов](#создание-диалоговых-файлов)
- [Структура диалогового файла](#структура-диалогового-файла)
- [Пример диалога](#пример-диалога)
- [Добавление персонажей на карту](#добавление-персонажей-на-карту)
- [Регистрация квестов в базе данных](#регистрация-квестов-в-базе-данных)
- [Важные примечания](#важные-примечания)

---

## Добавление моделей персонажей

Файлы 3D‑моделей NPC необходимо разместить в директории:

```
public/models/npc/
```

---

## Создание диалоговых файлов

Каждый NPC должен иметь отдельный JSON‑файл с описанием диалога. Пример базовой структуры:

```json
{
  "name": "Имя персонажа",
  "avatar": "/images/npc/avatar.jpg",
  "filename": "my_npc.json",
  "dialog": [
    {
      "id": 0,
      "text": "Приветственная фраза персонажа.",
      "answers": [
        {
          "text": "Ответ игрока 1",
          "next": 1
        },
        {
          "text": "Ответ игрока 2",
          "end": true
        }
      ]
    }
  ]
}
```

---

## Структура диалогового файла

- **name** — имя персонажа, отображаемое игроку  
- **avatar** — путь к изображению персонажа  
- **filename** — название JSON‑файла (для идентификации)  
- **dialog** — массив объектов, описывающих реплики персонажа  

### Поля объекта диалога:
- **id** — уникальный идентификатор реплики (начиная с 0)  
- **text** — текст реплики персонажа  
- **answers** — массив возможных ответов игрока  

### Поля ответа игрока:
- **text** — текст ответа  
- **next** — ID следующей реплики (опционально)  
- **end** — завершает диалог, если установлено `true`  

---

## Пример диалога

```json
{
  "name": "Бармен",
  "avatar": "/images/npc/bartender.jpg",
  "filename": "bartender.json",
  "dialog": [
    {
      "id": 0,
      "text": "Ну что, дружок, застрял как муха в паутине?..",
      "answers": [
        { "text": "Я... кажется, ошибся дверью.", "end": true },
        { "text": "Мне сказали, тут можно «устроиться». От Галины.", "next": 2 }
      ]
    },
    {
      "id": 2,
      "text": "Ага, Галка-весточка. Слушай сюда...",
      "answers": [
        { "text": "И где этот ваш комп?", "next": 3 },
        { "text": "А сложно будет?", "next": 3 }
      ]
    }
  ]
}
```

---

## Добавление персонажей на карту

В файле `Game.js` необходимо зарегистрировать NPC в массиве `npcData`:

```js
const npcData = [
  { id: 'bartender', model: '/models/npc/bartender.glb', position: [0, 0, 10] },
  { id: 'guard', model: '/models/npc/guard.glb', position: [0, 0, 5] },
  { id: 'Adventurer', model: '/models/npc/Adventurer.glb', position: [0, 0, -5] },
  { id: 'BeachCharacter', model: '/models/npc/BeachCharacter.glb', position: [0, 0, 3] },
  { id: 'Oxranik', model: '/models/npc/Oxranik.glb', position: [0, 0, -3] },
  { id: 'Computer', model: '/models/npc/Computer.glb', position: [0.1, 0.1, 2.1] }
];
```

Загрузка и настройка модели:

```js
for (const npc of npcData) {
  try {
    const gltf = await gltfLoader.loadAsync(npc.model);
    const model = gltf.scene;
    model.position.set(...npc.position);
    model.userData.npcId = npc.id;
    model.userData.isNpc = true;

    // Метка над персонажем
    if (npc.id === 'bartender') {
      createPlayerLabel('Серега Пират');
    }

    if (npc.id === 'Oxranik') {
      model.scale.set(0.2, 0.2, 0.2);
    }
  } catch (error) {
    console.error(`Ошибка загрузки NPC ${npc.id}:`, error);
  }
}
```

---

## Регистрация квестов в базе данных

### Добавление квеста в таблицу `quests`:

```sql
INSERT INTO virtual_world.quests (id, title, description)
VALUES (1, 'Первый квест', 'Вводный квест с тремя NPC');
```

### Привязка диалоговых файлов к квесту в таблице `quest_jsons`:

```sql
INSERT INTO virtual_world.quest_jsons (quest_id, json_filename)
VALUES 
  (1, 'Adventurer.json'),
  (1, 'bartender.json'),
  (1, 'guard.json'),
  (1, 'BeachCharacter.json'),
  (1, 'Oxranik.json');
```

---

## Важные примечания

- Все пути к моделям и изображениям должны быть корректными  
- Проверяйте JSON‑файлы на валидность (например, с помощью [JSONLint](https://jsonlint.com/))  
- Убедитесь, что ID реплик уникальны в пределах одного файла  
- Каждый NPC должен иметь отдельный JSON‑файл диалога  

---
