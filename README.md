# 🎬 Cinematch - Гибридная рекомендательная система фильмов 

> **Умные рекомендации фильмов на основе Sentence-Transformer эмбеддингов, коллаборативной фильтрации и гибридного реранкинга**

[![Live Demo](https://img.shields.io/badge/🎬_Live_Demo-Online-success?style=for-the-badge)](https://movie-recommendation-system-nu-seven.vercel.app/)
[![Kaggle](https://img.shields.io/badge/Kaggle-6_votes-20BEFF?style=for-the-badge&logo=kaggle)](https://www.kaggle.com/code/gdreallygoodman/movies-recsys-sent-transf-colab-filter-rerank)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)


**[🚀 Демо](https://movie-recommendation-system-nu-seven.vercel.app/)** | **[📓 Ноутбук](https://www.kaggle.com/code/gdreallygoodman/movies-recsys-sent-transf-colab-filter-rerank)** 

---

## 🏆 Признание

<table>
<tr>
<td align="center" width="33%">

### 🏆 Grandmaster
upvote от Kaggle Grandmaster<br>
<sub>Топ 0.1% ML экспертов в мире</sub>

</td>
<td align="center" width="33%">

### 🥇 Master
upvote от Kaggle Master<br>
<sub>Топ 1% сообщества Kaggle</sub>

</td>
<td align="center" width="33%">

### 🥈 Expert
upvote от Kaggle Expert<br>
<sub>Подтверждённый ML-специалист</sub>

</td>
</tr>
<tr>
<td colspan="3" align="center">
<b>6 upvotes от практикующих ML-инженеров</b> · Гибридный подход одобрен сообществом
</td>
</tr>
</table>

---

## 🎯 Что делает проект особенным

**Пример: Вводим "Snatch" (Гай Ричи, 2000)**

```
Рекомендации:
  1. Lock, Stock and Two Smoking Barrels  ← Тот же режиссер! 🎯
  2. Reservoir Dogs                       ← Похожий стиль (Тарантино - актер)
  3. GoodFellas                          ← Классика криминала
  4. The Usual Suspects                  ← Криминал + твист
  5. Whiplash                            ← Интенсивность
```

**Почему это работает:**
- 🧠 **Семантическое понимание** - Находит тематические связи, а не просто совпадения жанров
- 🤝 **Коллективный интеллект** - Знает что фанаты X также любят Y
- 🎯 **Фильтрация качества** - Рекомендует только высокорейтинговые фильмы
- ⚡ **Быстро** - Поиск за 5ms через FAISS оптимизацию

---

## 🚀 Демо онлайн

**Попробуйте сами:** [movie-recommendation-system-nu-seven.vercel.app](https://movie-recommendation-system-nu-seven.vercel.app/)
> 💤 **Первый запуск может занять ~30 секунд** — бэкенд засыпает после простоя. Просто подождите, всё загрузится автоматически.
**Возможности:**
- ✨ Холодный старт с 10 отобранными фильмами
- 🎬 Клик на фильм → Получите 10 умных рекомендаций
- 👤 Персонализированный профиль (адаптируется к вашему вкусу)
- 🔄 Обновление в реальном времени по мере просмотра

---

## 🏗️ Архитектура

```
Пользователь выбирает: "Матрица"
    ↓
┌─────────────────────────────────────────┐
│  1. Генерация вектора запроса           │
│  • Текст: Sentence-Transformer (768-dim)│
│  • Коллаб: ALS факторы (50-dim)         │
│  • Гибрид: Конкатенация → 818-dim       │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  2. FAISS поиск по схожести             │
│     • IndexFlatIP (косинусная близость) │
│     • Топ-100 кандидатов за 5ms         │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  3. Гибридный реранкинг                 │
│   • score = 0.8×text_sim + 0.2×collab   │
│   • Исключение просмотренных фильмов    │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  4. Усиление качества                   │
│   • final = 0.7×hybrid + 0.3×rating     │
│   • Возврат топ-10 рекомендаций         │
└─────────────────────────────────────────┘
    ↓
Результат: Высококачественный персональный список
```

---

## 💡 Ключевые находки исследования

### **Открытие #1: Центроиды жанров не работают**
**Эксперимент:** Усреднили все векторы комедий → нашли ближайших соседей  
**Результат:** Топ совпадений - "Семь", "Леон", "Криминальное чтиво" (не комедии!)  
**Вывод:** Эмбеддинги группируются по *темам*, а не по жанровым ярлыкам  
<img width="1025" height="614" alt="Screenshot 2026-03-06 at 15 40 47" src="https://github.com/user-attachments/assets/94a18baa-d0a6-4381-a5c3-bc0b32a0348e" />
![semantic_3d_genres](https://github.com/user-attachments/assets/a3bd6a45-e288-44cf-9e67-805a17975858)


---

### **Открытие #2: Полные сюжеты > Краткие описания**
**Эксперимент:** Сравнили сюжеты Wikipedia vs описания TMDb  
**Результат:** Сюжеты нашли более глубокие связи (например, "Форрест Гамп" → "Being There")  
**Эффект:** Рекомендации стали более тематически богатыми

---

### **Открытие #3: Коллаборативная фильтрация добавляет магию**
**Проблема:** Текст не может объяснить почему фанаты "Форрест Гампа" любят "Бойцовский клуб"  
**Решение:** ALS на рейтингах пользователей → 50 латентных факторов  
**Результат:** Система теперь знает поведенческие паттерны помимо контента

---

### **Открытие #4: Реранкинг по рейтингу критичен**
**Без реранкинга:** Хорошие совпадения, но смешанное качество  
**С реранкингом (α=0.7):** Результаты совпадают с рекомендациями IMDb  
**Формула:** `score = 0.7×similarity + 0.3×normalized_rating`

---

## 🛠️ Технологический стек

| Компонент | Технология | Назначение |
|-----------|------------|------------|
| **Текстовые эмбеддинги** | Sentence-Transformer (`all-mpnet-base-v2`) | 768-мерные семантические векторы из сюжетов |
| **Коллаборативная** | Implicit ALS | 50-мерные латентные факторы из рейтингов |
| **Поисковый движок** | FAISS (IndexFlatIP) | Ультрабыстрая косинусная близость (5ms) |
| **Backend** | FastAPI + Render | REST API для рекомендаций |
| **Frontend** | React + Vercel | Интерактивный веб-интерфейс |
| **Данные** | TMDb 5000 + MovieLens | 4,187 качественных фильмов (рейтинг≥6.0, голосов>100) |

---

## 📊 Метрики производительности

| Метрика | Значение | Детали |
|---------|----------|--------|
| **Размер датасета** | 4,187 фильмов | Отфильтровано по качеству (рейтинг≥6, голосов>100) |
| **Задержка поиска** | ~5ms | Через FAISS индексирование |
| **Размерность эмбеддингов** | 768 + 50 | Текст + коллаборативные |
| **Качество рекомендаций** | 9.5/10 | Ручная оценка (см. примеры) |
| **API отклик** | <50ms | End-to-end включая реранкинг |

---

## 🎓 Как это работает

### **1. Content-Based фильтрация**

Использует **Sentence-BERT** (`all-mpnet-base-v2`) для семантического понимания:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-mpnet-base-v2')
plot_embeddings = model.encode(movies['plot'].tolist())
# Размерность: (4187, 768)
```

**Почему эта модель?**
- State-of-the-art для семантической схожести
- Захватывает глубокие тематические связи
- Лучше чем TF-IDF или Word2Vec

---

### **2. Коллаборативная фильтрация**

Использует **ALS** (Alternating Least Squares) из библиотеки `implicit`:

```python
from implicit.als import AlternatingLeastSquares

model = AlternatingLeastSquares(
    factors=50,
    regularization=0.01,
    iterations=20
)
model.fit(user_item_matrix)
collab_embeddings = model.item_factors
# Размерность: (4187, 50)
```

**Почему ALS?**
- Захватывает паттерны поведения пользователей
- Работает с implicit feedback
- Находит неочевидные связи

---

### **3. Гибридное слияние**

Конкатенирует оба представления:

```python
hybrid_vector = np.concatenate([
    alpha * text_embedding,      # 768-dim, взвешенный α
    (1-alpha) * collab_embedding # 50-dim, взвешенный 1-α
])
# Размерность: (818,)
```

**По умолчанию α=0.8:** Приоритет семантической схожести с использованием коллаборативных сигналов

---

### **4. FAISS оптимизация**

Быстрый поиск схожести:

```python
import faiss

index = faiss.IndexFlatIP(818)  # Inner Product = косинусная схожесть
index.add(hybrid_embeddings)

distances, indices = index.search(query_vector, k=100)
```

---

### **5. Реранкинг по качеству**

Усиливает высокорейтинговые фильмы:

```python
def rerank(candidates, beta=0.7):
    rating_norm = (movie.rating - 6) / (10 - 6)
    final_score = beta * similarity + (1-beta) * rating_norm
    return sorted(candidates, key=lambda x: final_score, reverse=True)
```

---

## 🎬 Примеры результатов

### **Тест 1: "Матрица" (Sci-Fi)**
```
Топ рекомендаций:
1. The Usual Suspects        (8.1★) - Закрученный нарратив
2. Mad Max: Fury Road        (7.6★) - Постапокалиптик экшн
3. WarGames                  (7.1★) - AI/технологии
4. Eternal Sunshine...       (7.9★) - Вопросы реальности
5. The Matrix Reloaded       (6.7★) - Прямое продолжение
6. Memento                   (8.1★) - Нелинейное повествование
7. Children of Men           (7.6★) - Антиутопия

Качество: 10/10 - Идеальное совпадение жанр + тема
```

---

### **Тест 2: "Snatch" (Криминал/Комедия)**
```
Топ рекомендаций:
1. Lock, Stock and Two...    (7.5★) - Тот же режиссер! ✨
2. Reservoir Dogs            (8.1★) - Криминальный ансамбль
3. GoodFellas                (8.2★) - Классика криминала
4. The Usual Suspects        (8.1★) - Криминал + твист
5. Lucky Number Slevin       (7.4★) - Похожий стиль
6. Thief                     (7.3★) - Тема ограбления

Качество: 10/10 - Нашел того же режиссера + похожий стиль
```

---

## 🚀 Быстрый старт

### **Вариант 1: Попробовать демо**
Перейдите на [movie-recommendation-system-nu-seven.vercel.app](https://movie-recommendation-system-nu-seven.vercel.app/)

---

### **Вариант 2: Запустить локально**

**1. Клонировать репозиторий**
```bash
git clone https://github.com/GDReallyGoodMan/Movie-recommendation-system.git
cd Movie-recommendation-system
```

**2. Установить зависимости**
```bash
pip install -r backend/requirements.txt
```

**3. Запустить Backend**
```bash
cd "/Users/denisgusin/Desktop/code/Movie Recomend Project/backend"
source ../venv/bin/activate
uvicorn main:app --reload
```

**4. Запустить Frontend**
```bash (Запускаем в корне проекта)
cd frontend && npm run dev
```

---

## 📁 Структура проекта

```
Movie-recommendation-system/
├── .gitignore
├── Start.txt
│
├── backend/
│   ├── main.py                    # FastAPI бэкенд
│   ├── requirements.txt           # Python зависимости
│   ├── runtime.txt                # Версия Python для Render
│   ├── users.db                   # SQLite БД (локально, не в git)
│   └── movie_rec_artifacts/       # ML артефакты
│       ├── movies_data.parquet    # Метаданные фильмов
│       ├── embeddings_norm.npy    # Текстовые эмбеддинги
│       ├── collab_vectors.npy     # Коллаборативные векторы
│       ├── common_movies.npy      # Общие фильмы
│       ├── hybrid_index.faiss     # FAISS индекс
│       ├── tmdb_to_data_idx.json  # Маппинг TMDB → data
│       ├── tmdb_to_common_idx.json# Маппинг TMDB → common
│       └── cold_start.json        # Стартовые фильмы
│
└── frontend/
    ├── src/
    │   └── App.jsx                # Весь React фронт
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 👤 Автор

**GDReallyGoodMan**

- 🐙 GitHub: [@GDReallyGoodMan](https://github.com/GDReallyGoodMan)
- 🏆 Kaggle: [Профиль](https://www.kaggle.com/gdreallygoodman)
- 💼 Проект: [Movie Recommendation System](https://github.com/GDReallyGoodMan/Movie-recommendation-system)
- 🌐 Демо: [movie-recommendation-system-nu-seven.vercel.app](https://movie-recommendation-system-nu-seven.vercel.app/)

---

## 🌟 Благодарности

**Особые благодарности:**
- **Команде Sentence-Transformers** за потрясающие модели
- **Facebook AI** за библиотеку FAISS
- **MovieLens** за датасет рейтингов
- **TMDb** за метаданные фильмов

---

<div align="center">

**⭐ Если проект был полезен, поставьте звезду на GitHub! ⭐**

[![Демо](https://img.shields.io/badge/🎬_Попробовать-Демо-success?style=for-the-badge)](https://movie-recommendation-system-nu-seven.vercel.app/)
[![GitHub Stars](https://img.shields.io/github/stars/GDReallyGoodMan/Movie-recommendation-system?style=for-the-badge)](https://github.com/GDReallyGoodMan/Movie-recommendation-system/stargazers)

