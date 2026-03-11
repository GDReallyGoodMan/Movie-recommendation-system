"""
FastAPI бэкенд для гибридной рекомендательной системы фильмов.

Структура проекта:
  movie_rec_backend/
  ├── main.py              ← этот файл
  ├── requirements.txt
  └── movie_rec_artifacts/  ← папка с артефактами из ноутбука
      ├── movies_data.parquet
      ├── embeddings_norm.npy
      ├── collab_vectors.npy
      ├── common_movies.npy
      ├── hybrid_index.faiss
      ├── tmdb_to_data_idx.json
      ├── tmdb_to_common_idx.json
      └── cold_start.json

Запуск:
  pip install -r requirements.txt
  uvicorn main:app --reload
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
import numpy as np
import faiss
import pandas as pd
import json
import sqlite3
import hashlib
import os
from jose import JWTError, jwt
from datetime import datetime, timedelta

# ─────────────────────────────────────────────
# 1. КОНФИГ
# ─────────────────────────────────────────────
ARTIFACTS_DIR = "./movie_rec_artifacts"
SECRET_KEY = os.getenv("SECRET_KEY", "local_dev_key_change_in_prod")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # неделя

TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

# ─────────────────────────────────────────────
# 2. ЗАГРУЗКА АРТЕФАКТОВ
# ─────────────────────────────────────────────
print("Загружаем артефакты...")

data = pd.read_parquet(f"{ARTIFACTS_DIR}/movies_data.parquet")
embeddings_norm = np.load(f"{ARTIFACTS_DIR}/embeddings_norm.npy").astype("float32")
collab_vectors = np.load(f"{ARTIFACTS_DIR}/collab_vectors.npy").astype("float32")
common_movies = np.load(f"{ARTIFACTS_DIR}/common_movies.npy").tolist()
hybrid_index = faiss.read_index(f"{ARTIFACTS_DIR}/hybrid_index.faiss")

with open(f"{ARTIFACTS_DIR}/tmdb_to_data_idx.json") as f:
    tmdb_to_data_idx = {int(k): int(v) for k, v in json.load(f).items()}

with open(f"{ARTIFACTS_DIR}/tmdb_to_common_idx.json") as f:
    tmdb_to_common_idx = {int(k): int(v) for k, v in json.load(f).items()}

with open(f"{ARTIFACTS_DIR}/cold_start.json") as f:
    cold_start_movies = json.load(f)

COLLAB_DIM = collab_vectors.shape[1]
print(f"✅ Загружено {len(data)} фильмов, гибридный индекс: {hybrid_index.ntotal} векторов")

# ─────────────────────────────────────────────
# 3. БД (SQLite — хранит пользователей и их векторы)
# ─────────────────────────────────────────────
DB_PATH = "./users.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            watch_count INTEGER DEFAULT 0,
            avg_text_vec BLOB,        -- numpy bytes
            avg_collab_vec BLOB,      -- numpy bytes или NULL
            watched_ids TEXT DEFAULT '[]'  -- JSON список tmdb_id
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ─────────────────────────────────────────────
# 4. HELPERS — алгоритм рекомендаций
# ─────────────────────────────────────────────
def movie_to_dict(tmdb_id: int, extra_fields: dict = None) -> dict:
    """Преобразует строку из data в dict для API."""
    idx = tmdb_to_data_idx.get(tmdb_id)
    if idx is None:
        return None
    row = data.loc[idx]
    genres = []
    try:
        genres_raw = row.get("genres", "[]")
        if isinstance(genres_raw, str):
            genres = [g["name"] for g in json.loads(genres_raw.replace("'", '"'))]
    except Exception:
        pass

    poster = row.get("poster_path", "")
    poster_url = f"{TMDB_IMAGE_BASE}{poster}" if poster and str(poster) != "nan" else None

    return {
        "tmdb_id": int(tmdb_id),
        "title": str(row["title"]),
        "vote_average": float(row["vote_average"]),
        "vote_count": int(row["vote_count"]),
        "overview": str(row.get("overview", "") or ""),
        "genres": genres,
        "poster_url": poster_url,
        "release_date": str(row.get("release_date", "") or ""),
        **(extra_fields or {}),
    }


def get_movie_vectors(tmdb_id: int):
    data_idx = tmdb_to_data_idx.get(tmdb_id)
    if data_idx is None:
        raise ValueError(f"tmdb_id {tmdb_id} не найден")
    text_vec = embeddings_norm[data_idx]
    collab_vec = None
    if tmdb_id in tmdb_to_common_idx:
        pos = tmdb_to_common_idx[tmdb_id]
        collab_vec = collab_vectors[pos]
    return text_vec, collab_vec


def recommend_hybrid_rerank(
    query_text_vec,
    query_collab_vec=None,
    exclude_ids: set = None,
    k: int = 10,
    alpha: float = 0.8,
    beta: float = 0.75,
    initial_k: int = 100,
):
    """Гибридный поиск + реранкинг по рейтингу."""
    if query_collab_vec is not None:
        query = np.hstack([query_text_vec * alpha, query_collab_vec * (1 - alpha)])
    else:
        query = np.hstack([query_text_vec * alpha, np.zeros(COLLAB_DIM)])
    query = query.astype("float32").reshape(1, -1)

    distances, indices = hybrid_index.search(query, initial_k)

    candidates = []
    for i, pos in enumerate(indices[0]):
        data_idx = common_movies[pos]
        tmdb_id = int(data.loc[data_idx, "id"])
        if exclude_ids and tmdb_id in exclude_ids:
            continue
        row = data.loc[data_idx]
        candidates.append(
            {
                "tmdb_id": tmdb_id,
                "data_idx": data_idx,
                "vote_average": float(row["vote_average"]),
                "hybrid_dist": float(distances[0][i]),
            }
        )

    df = pd.DataFrame(candidates)
    if df.empty:
        return []

    df["rating_norm"] = (df["vote_average"] - 6.0) / (10 - 6.0)
    df["score"] = beta * df["hybrid_dist"] + (1 - beta) * df["rating_norm"]
    df = df.sort_values("score", ascending=False).head(k)

    result = []
    for _, row in df.iterrows():
        m = movie_to_dict(row["tmdb_id"], {"score": round(float(row["score"]), 4)})
        if m:
            result.append(m)
    return result


# ─────────────────────────────────────────────
# 5. AUTH
# ─────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(username: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": username, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
    except JWTError:
        return None
    user = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    return user


# ─────────────────────────────────────────────
# 6. PYDANTIC SCHEMAS
# ─────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    password: str

class MovieClickRequest(BaseModel):
    tmdb_id: int


# ─────────────────────────────────────────────
# 7. FASTAPI APP
# ─────────────────────────────────────────────
app = FastAPI(title="Movie Recommender API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # в проде замени на конкретный домен
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── AUTH ROUTES ──────────────────────────────
@app.post("/auth/register")
def register(req: RegisterRequest, db=Depends(get_db)):
    try:
        db.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (req.username, hash_password(req.password)),
        )
        db.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(400, "Пользователь уже существует")
    return {"token": create_token(req.username)}


@app.post("/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    user = db.execute(
        "SELECT * FROM users WHERE username = ? AND password_hash = ?",
        (form.username, hash_password(form.password)),
    ).fetchone()
    if not user:
        raise HTTPException(401, "Неверный логин или пароль")
    return {"access_token": create_token(form.username), "token_type": "bearer"}


# ── ФИЛЬМЫ ───────────────────────────────────
@app.get("/movies/cold-start")
def cold_start():
    """10 стартовых фильмов."""
    result = []
    for m in cold_start_movies:
        info = movie_to_dict(m["id"])
        if info:
            result.append(info)
    return result


@app.get("/movies/{tmdb_id}")
def get_movie(tmdb_id: int):
    """Инфо о фильме."""
    m = movie_to_dict(tmdb_id)
    if not m:
        raise HTTPException(404, "Фильм не найден")
    return m


@app.get("/movies/{tmdb_id}/similar")
def similar_movies(tmdb_id: int, k: int = 10):
    """'Смотрите также' — похожие на этот фильм."""
    if tmdb_id not in tmdb_to_data_idx:
        raise HTTPException(404, "Фильм не найден")
    text_vec, collab_vec = get_movie_vectors(tmdb_id)
    recs = recommend_hybrid_rerank(
        text_vec, collab_vec, exclude_ids={tmdb_id}, k=k, alpha=0.85
    )
    return recs


# ── КЛИК ПОЛЬЗОВАТЕЛЯ ────────────────────────
@app.post("/user/click")
def user_click(req: MovieClickRequest, user=Depends(get_current_user), db=Depends(get_db)):
    """
    Пользователь кликнул на фильм.
    Возвращает:
      - similar: список "Смотрите также"
      - for_you: список "На основе вашего выбора" (только для авторизованных)
    """
    tmdb_id = req.tmdb_id

    if tmdb_id not in tmdb_to_data_idx:
        raise HTTPException(404, "Фильм не найден")

    # "Смотрите также" — всегда
    similar = similar_movies(tmdb_id, k=10)

    # "На основе вашего выбора" — только для авторизованных
    if not user:
        return {"similar": similar, "for_you": None, "auth_required": True}

    # Обновляем вектор пользователя
    text_vec, collab_vec = get_movie_vectors(tmdb_id)
    watch_count = user["watch_count"]
    
    # Загружаем текущие средние векторы
    if user["avg_text_vec"]:
        avg_text = np.frombuffer(user["avg_text_vec"], dtype=np.float32).copy()
    else:
        avg_text = np.zeros_like(text_vec)
    
    avg_collab = None
    if user["avg_collab_vec"]:
        avg_collab = np.frombuffer(user["avg_collab_vec"], dtype=np.float32).copy()

    # Скользящее среднее
    new_count = watch_count + 1
    avg_text = (avg_text * watch_count + text_vec) / new_count
    if collab_vec is not None:
        avg_collab = (
            avg_collab * watch_count + collab_vec
        ) / new_count if avg_collab is not None else collab_vec.copy()

    # Сохраняем watched_ids
    watched_ids = json.loads(user["watched_ids"] or "[]")
    if tmdb_id not in watched_ids:
        watched_ids.append(tmdb_id)

    db.execute(
        """UPDATE users SET 
            watch_count=?, avg_text_vec=?, avg_collab_vec=?, watched_ids=?
           WHERE username=?""",
        (
            new_count,
            avg_text.astype(np.float32).tobytes(),
            avg_collab.astype(np.float32).tobytes() if avg_collab is not None else None,
            json.dumps(watched_ids),
            user["username"],
        ),
    )
    db.commit()

    # Рекомендации для пользователя
    for_you = recommend_hybrid_rerank(
        avg_text,
        avg_collab,
        exclude_ids=set(watched_ids),
        k=10,
        alpha=0.8,
        beta=0.7,
    )

    return {"similar": similar, "for_you": for_you, "auth_required": False}


@app.get("/user/me")
def me(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(401, "Не авторизован")
    return {
        "username": user["username"],
        "watch_count": user["watch_count"],
        "watched_ids": json.loads(user["watched_ids"] or "[]"),
    }


import httpx

TMDB_API_KEY = "2e22908422b7b1e77610fabea6b3275e"

@app.get("/poster/{tmdb_id}")
async def get_poster(tmdb_id: int):
    """Проксируем запрос к TMDB через бэкенд — решает проблему CORS на Safari."""
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"https://api.themoviedb.org/3/movie/{tmdb_id}",
            params={"api_key": TMDB_API_KEY}
        )
        data = res.json()
        poster = data.get("poster_path")
        return {"poster_url": f"https://image.tmdb.org/t/p/w500{poster}" if poster else None}
