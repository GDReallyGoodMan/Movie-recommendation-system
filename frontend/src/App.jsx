import { useState, useEffect, useRef } from "react";

// ── CONFIG ──────────────────────────────────────────────
const API = "https://movie-recommendation-system-9gzk.onrender.com";
const TMDB_API_KEY = "2e22908422b7b1e77610fabea6b3275e";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";
const PLACEHOLDER = `https://placehold.co/300x450/141420/e2b04a?text=No+Poster`;

// Кэш постеров чтобы не делать лишние запросы
const posterCache = {};

async function fetchPoster(tmdbId, posterPath) {
  if (posterPath && posterPath !== "null" && posterPath !== "nan") {
    return `${TMDB_IMG}${posterPath}`;
  }
  if (posterCache[tmdbId]) return posterCache[tmdbId];
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`
    );
    const data = await res.json();
    const url = data.poster_path ? `${TMDB_IMG}${data.poster_path}` : PLACEHOLDER;
    posterCache[tmdbId] = url;
    return url;
  } catch {
    return PLACEHOLDER;
  }
}

// ── HELPERS ─────────────────────────────────────────────
function getToken() { return localStorage.getItem("token"); }
function setToken(t) { localStorage.setItem("token", t); }
function removeToken() { localStorage.removeItem("token"); }

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Ошибка запроса");
  }
  return res.json();
}

// ── STYLES (injected once) ──────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0d0d14;
    --surface: #141420;
    --surface2: #1c1c2e;
    --border: rgba(255,255,255,0.07);
    --gold: #e2b04a;
    --gold2: #f5d080;
    --text: #e8e6f0;
    --muted: #7a788e;
    --accent: #7c5cbf;
    --radius: 12px;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-weight: 300;
    min-height: 100vh;
    overflow-x: hidden;
    max-width: 100vw;
  }

  .grain {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
    opacity: 0.4;
  }

  /* NAV */
  nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 48px;
    background: linear-gradient(to bottom, rgba(13,13,20,0.98), rgba(13,13,20,0));
    backdrop-filter: blur(4px);
  }
  .nav-logo {
    font-family: 'DM Serif Display', serif;
    font-size: 22px;
    color: var(--gold);
    letter-spacing: 0.02em;
    cursor: pointer;
  }
  .nav-logo span { font-style: italic; color: var(--text); }
  .nav-right { display: flex; gap: 12px; align-items: center; }
  .btn {
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    padding: 8px 20px;
    border-radius: 100px;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }
  .btn-outline {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text);
  }
  .btn-outline:hover { border-color: var(--gold); color: var(--gold); }
  .btn-gold {
    background: var(--gold);
    color: #0d0d14;
    font-weight: 600;
  }
  .btn-gold:hover { background: var(--gold2); }
  .username {
    font-size: 13px; color: var(--muted);
  }

  /* HERO */
  .hero {
    min-height: 60vh;
    display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    text-align: center;
    padding: 120px 24px 40px;
    position: relative;
  }
  .hero-eyebrow {
    font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
    color: var(--gold); margin-bottom: 20px; font-weight: 500;
  }
  .hero h1 {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(40px, 6vw, 80px);
    line-height: 1.05;
    color: var(--text);
    margin-bottom: 20px;
    text-align: center;
  }
  .hero h1 em { font-style: italic; color: var(--gold); }
  .hero p {
    font-size: 16px; color: var(--muted); max-width: 480px;
    line-height: 1.7; margin-bottom: 32px;
    text-align: center;
  }

  /* GRID начальная */
  .grid-section {
    padding: 0 48px 80px;
    position: relative; z-index: 1;
  }
  .section-title {
    font-family: 'DM Serif Display', serif;
    font-size: 28px; color: var(--text);
    margin-bottom: 28px;
  }
  .section-title span { color: var(--gold); font-style: italic; }
  .movies-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 16px;
  }
  @media (max-width: 1400px) {
    .movies-grid { grid-template-columns: repeat(5, 1fr); }
  }
  @media (max-width: 800px) {
    .movies-grid { grid-template-columns: repeat(3, 1fr); }
  }

  /* КАРТОЧКА */
  .movie-card {
    cursor: pointer;
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--surface);
    border: 1px solid var(--border);
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s;
    position: relative;
    display: flex; flex-direction: column;
  }
  .movie-card:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(226,176,74,0.3);
    border-color: rgba(226,176,74,0.4);
    z-index: 2;
  }
  .movie-card-img-wrap {
    width: 100%; aspect-ratio: 2/3; overflow: hidden;
    background: var(--surface2); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .movie-card-img-wrap img {
    width: 100%; height: 100%; object-fit: cover; display: block;
  }
  .movie-card-img-placeholder { font-size: 32px; opacity: 0.3; }
  .movie-card-info {
    padding: 12px; flex: 1;
  }
  .movie-card-title {
    font-size: 13px; font-weight: 500; color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-bottom: 4px;
  }
  .movie-card-rating {
    font-size: 12px; color: var(--gold);
    display: flex; align-items: center; gap: 4px;
  }
  .movie-card-badge {
    position: absolute; top: 8px; right: 8px;
    background: rgba(13,13,20,0.85);
    backdrop-filter: blur(4px);
    font-size: 11px; font-weight: 600;
    color: var(--gold); padding: 3px 8px;
    border-radius: 100px;
    border: 1px solid rgba(226,176,74,0.3);
  }

  /* ДЕТАЛЬНАЯ СТРАНИЦА */
  .detail-page {
    padding: 100px 48px 80px;
    min-height: 100vh;
    position: relative; z-index: 1;
    overflow-x: hidden;
    max-width: 100vw;
  }
  .detail-back {
    font-size: 13px; color: var(--muted); cursor: pointer;
    margin-bottom: 32px; display: flex; align-items: center; gap: 6px;
    transition: color 0.2s;
  }
  .detail-back:hover { color: var(--gold); }
  .detail-hero {
    display: flex; gap: 48px; margin-bottom: 60px;
    flex-wrap: wrap;
  }
  .detail-poster {
    flex-shrink: 0; width: 220px;
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid var(--border);
    box-shadow: 0 40px 80px rgba(0,0,0,0.5);
  }
  .detail-poster img { width: 100%; display: block; }
  .detail-meta { flex: 1; min-width: 260px; }
  .detail-meta h2 {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(28px, 4vw, 48px);
    color: var(--text); margin-bottom: 12px; line-height: 1.1;
  }
  .detail-tags {
    display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;
  }
  .detail-tag {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;
    padding: 4px 12px; border-radius: 100px;
    border: 1px solid var(--border); color: var(--muted);
  }
  .detail-overview {
    font-size: 15px; line-height: 1.8;
    color: var(--muted); max-width: 540px;
    margin-bottom: 28px;
  }
  .detail-rating {
    font-family: 'DM Serif Display', serif;
    font-size: 42px; color: var(--gold);
    display: flex; align-items: baseline; gap: 6px;
  }
  .detail-rating small { font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--muted); }

  /* СЛАЙДЕР */
  .slider-section { margin-bottom: 48px; }
  .slider-header {
    display: flex; align-items: baseline; gap: 16px;
    margin-bottom: 20px;
  }
  .slider-title {
    font-family: 'DM Serif Display', serif;
    font-size: 22px; color: var(--text);
  }
  .slider-count { font-size: 12px; color: var(--muted); }
  .slider-wrap {
    position: relative;
    overflow: hidden;
    width: 100%;
  }
  .slider-scroll {
    display: flex; gap: 16px;
    overflow-x: auto;
    padding-bottom: 12px;
    scrollbar-width: thin;
    scrollbar-color: var(--surface2) transparent;
    scroll-behavior: smooth;
    align-items: stretch;
    -webkit-overflow-scrolling: touch;
  }
  .slider-scroll::-webkit-scrollbar { height: 4px; }
  .slider-scroll::-webkit-scrollbar-track { background: transparent; }
  .slider-scroll::-webkit-scrollbar-thumb { background: var(--surface2); border-radius: 2px; }
  .slider-scroll .movie-card { flex-shrink: 0; width: 150px; }

  /* AUTH LOCKED БЛОК */
  .auth-locked {
    flex-shrink: 0;
    min-width: 260px; max-width: 340px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 32px 28px;
    text-align: center;
    display: flex; flex-direction: column;
    align-items: center; gap: 12px;
  }
  .auth-locked-icon { font-size: 32px; margin-bottom: 4px; }
  .auth-locked h3 {
    font-family: 'DM Serif Display', serif;
    font-size: 18px; color: var(--text);
  }
  .auth-locked p { font-size: 13px; color: var(--muted); line-height: 1.6; }

  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.7);
    backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; padding: 24px;
  }
  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 48px 40px;
    width: 100%; max-width: 400px;
    position: relative;
  }
  .modal h2 {
    font-family: 'DM Serif Display', serif;
    font-size: 28px; margin-bottom: 8px;
  }
  .modal p { font-size: 14px; color: var(--muted); margin-bottom: 28px; }
  .modal-close {
    position: absolute; top: 16px; right: 20px;
    font-size: 22px; cursor: pointer; color: var(--muted);
    background: none; border: none; line-height: 1;
  }
  .modal-close:hover { color: var(--text); }
  .field {
    margin-bottom: 16px;
  }
  .field label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 6px; letter-spacing: 0.08em; text-transform: uppercase; }
  .field input {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 15px; color: var(--text);
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.2s;
  }
  .field input:focus { border-color: var(--gold); }
  .modal-toggle { font-size: 13px; color: var(--muted); text-align: center; margin-top: 16px; }
  .modal-toggle a { color: var(--gold); cursor: pointer; }
  .error-msg { font-size: 13px; color: #e05e5e; margin-top: 8px; text-align: center; }

  /* LOADING */
  .loading { display: flex; gap: 8px; justify-content: center; padding: 40px; }
  .loading span {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--gold);
    animation: pulse 1.2s ease-in-out infinite;
  }
  .loading span:nth-child(2) { animation-delay: 0.2s; }
  .loading span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes pulse {
    0%, 100% { opacity: 0.2; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.2); }
  }
`;

function injectStyles() {
  if (document.getElementById("mrs-styles")) return;
  const s = document.createElement("style");
  s.id = "mrs-styles";
  s.textContent = STYLES;
  document.head.appendChild(s);
}

// ── COMPONENTS ──────────────────────────────────────────
function Loading() {
  return (
    <div className="loading">
      <span /><span /><span />
    </div>
  );
}

function MovieCard({ movie, onClick }) {
  const [poster, setPoster] = useState(movie.poster_url || null);

  useEffect(() => {
    if (!poster || poster === "nan" || poster === "null") {
      fetchPoster(movie.tmdb_id, movie.poster_url).then(setPoster);
    }
  }, [movie.tmdb_id]);

  return (
    <div className="movie-card" onClick={() => onClick(movie)}>
      <div className="movie-card-img-wrap">
        {poster && poster !== "nan" && poster !== "null" ? (
          <img
            src={poster}
            alt={movie.title}
            loading="lazy"
            onError={() => fetchPoster(movie.tmdb_id, null).then(setPoster)}
          />
        ) : (
          <div className="movie-card-img-placeholder">🎬</div>
        )}
      </div>
      <div className="movie-card-badge">{movie.vote_average?.toFixed(1)}</div>
      <div className="movie-card-info">
        <div className="movie-card-title">{movie.title}</div>
        <div className="movie-card-rating">★ {movie.vote_average?.toFixed(1)}</div>
      </div>
    </div>
  );
}

function MovieSlider({ title, movies, onMovieClick, lockedMessage }) {
  const scrollRef = useRef(null);

  if (lockedMessage) {
    return (
      <div className="slider-section">
        <div className="slider-header">
          <div className="slider-title">{title}</div>
        </div>
        <div className="auth-locked">
          <div className="auth-locked-icon">🔒</div>
          <h3>Только для участников</h3>
          <p>{lockedMessage}</p>
        </div>
      </div>
    );
  }

  if (!movies || movies.length === 0) return null;

  return (
    <div className="slider-section">
      <div className="slider-header">
        <div className="slider-title">{title}</div>
        <div className="slider-count">{movies.length} фильмов</div>
      </div>
      <div className="slider-wrap">
        <div className="slider-scroll" ref={scrollRef}>
          {movies.map((m) => (
            <MovieCard key={m.tmdb_id} movie={m} onClick={onMovieClick} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(""); setLoading(true);
    try {
      if (mode === "register") {
        const data = await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });
        setToken(data.token);
      } else {
        const form = new FormData();
        form.append("username", username);
        form.append("password", password);
        const data = await fetch(`${API}/auth/login`, { method: "POST", body: form }).then(r => r.json());
        if (!data.access_token) throw new Error(data.detail || "Ошибка");
        setToken(data.access_token);
      }
      onSuccess(username);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>{mode === "login" ? "С возвращением" : "Добро пожаловать"}</h2>
        <p>{mode === "login" ? "Войдите, чтобы получать персональные рекомендации." : "Создайте аккаунт — это займёт секунду."}</p>
        <div className="field">
          <label>Логин</label>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="имя пользователя" />
        </div>
        <div className="field">
          <label>Пароль</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        {error && <div className="error-msg">{error}</div>}
        <button className="btn btn-gold" style={{ width: "100%", marginTop: 8 }} onClick={submit} disabled={loading}>
          {loading ? "..." : mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>
        <div className="modal-toggle">
          {mode === "login" ? (<>Нет аккаунта? <a onClick={() => setMode("register")}>Регистрация</a></>) : (<>Уже есть аккаунт? <a onClick={() => setMode("login")}>Войти</a></>)}
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────
export default function App() {
  injectStyles();

  const [page, setPage] = useState("home"); // "home" | "detail"
  const [coldStart, setColdStart] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [detailPoster, setDetailPoster] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [forYou, setForYou] = useState(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [loadingClick, setLoadingClick] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState(null);
  const [scrollY, setScrollY] = useState(0);

  // Проверяем токен при загрузке
  useEffect(() => {
    if (getToken()) {
      apiFetch("/user/me").then(u => setUser(u)).catch(() => removeToken());
    }
  }, []);

  // Загружаем стартовые фильмы
  useEffect(() => {
    apiFetch("/movies/cold-start").then(setColdStart).catch(console.error);
  }, []);

  // Трек скролла для hero-эффекта
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  async function handleMovieClick(movie) {
    setLoadingClick(true);
    setSimilar([]); setForYou(null); setAuthRequired(false);
    setSelectedMovie(movie);
    setDetailPoster(null);
    setPage("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Всегда идём в TMDB API для детальной страницы
    fetch(`https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${TMDB_API_KEY}`)
      .then(r => r.json())
      .then(d => setDetailPoster(d.poster_path ? `${TMDB_IMG}${d.poster_path}` : PLACEHOLDER))
      .catch(() => setDetailPoster(PLACEHOLDER));

    try {
      const res = await apiFetch("/user/click", {
        method: "POST",
        body: JSON.stringify({ tmdb_id: movie.tmdb_id }),
      });
      setSimilar(res.similar || []);
      setForYou(res.for_you);
      setAuthRequired(res.auth_required);
      if (res.auth_required === false && user) {
        setUser(prev => prev ? { ...prev, watch_count: (prev.watch_count || 0) + 1 } : prev);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClick(false);
    }
  }

  function handleAuthSuccess(username) {
    setShowAuth(false);
    apiFetch("/user/me").then(setUser).catch(() => {});
    // Перекликаем текущий фильм чтобы получить for_you
    if (selectedMovie) handleMovieClick(selectedMovie);
  }

  function logout() {
    removeToken();
    setUser(null);
    setForYou(null);
    setAuthRequired(true);
  }

  const heroBg = `radial-gradient(ellipse 80% 60% at 50% ${20 - scrollY * 0.02}%, rgba(124,92,191,0.15) 0%, transparent 70%)`;

  // ── HOME PAGE ────────────────────────────────
  if (page === "home") return (
    <>
      <div className="grain" />
      <nav>
        <div className="nav-logo">cin<span>e</span>match</div>
        <div className="nav-right">
          {user ? (
            <>
              <span className="username">👤 {user.username} · {user.watch_count} фильмов</span>
              <button className="btn btn-outline" onClick={logout}>Выйти</button>
            </>
          ) : (
            <>
              <button className="btn btn-outline" onClick={() => setShowAuth(true)}>Войти</button>
              <button className="btn btn-gold" onClick={() => setShowAuth(true)}>Регистрация</button>
            </>
          )}
        </div>
      </nav>

      <section className="hero" style={{ background: heroBg }}>
        <div className="hero-eyebrow">AI · Персонализация · Кино</div>
        <h1>Кино, которое<br/>тебя <em>поймёт</em></h1>
        <p>Гибридная рекомендательная система: анализирует сюжеты и вкусы миллионов людей, чтобы найти твой следующий любимый фильм.</p>
      </section>

      <div className="grid-section">
        <div className="section-title">Начни с <span>этих</span> фильмов</div>
        {coldStart.length === 0 ? <Loading /> : (
          <div className="movies-grid">
            {coldStart.map(m => (
              <MovieCard key={m.tmdb_id} movie={m} onClick={handleMovieClick} />
            ))}
          </div>
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />}
    </>
  );

  // ── DETAIL PAGE ──────────────────────────────
  return (
    <>
      <div className="grain" />
      <nav>
        <div className="nav-logo" onClick={() => setPage("home")}>cin<span>e</span>match</div>
        <div className="nav-right">
          {user ? (
            <>
              <span className="username">👤 {user.username} · {user.watch_count} фильмов</span>
              <button className="btn btn-outline" onClick={logout}>Выйти</button>
            </>
          ) : (
            <>
              <button className="btn btn-outline" onClick={() => setShowAuth(true)}>Войти</button>
              <button className="btn btn-gold" onClick={() => setShowAuth(true)}>Регистрация</button>
            </>
          )}
        </div>
      </nav>

      <div className="detail-page">
        <div className="detail-back" onClick={() => setPage("home")}>
          ← Назад
        </div>

        {selectedMovie && (
          <div className="detail-hero">
            <div className="detail-poster">
              <img
                src={detailPoster || PLACEHOLDER}
                alt={selectedMovie.title}
                onError={e => { e.target.src = PLACEHOLDER; }}
              />
            </div>
            <div className="detail-meta">
              <h2>{selectedMovie.title}</h2>
              <div className="detail-tags">
                {(selectedMovie.genres || []).map(g => (
                  <span key={g} className="detail-tag">{g}</span>
                ))}
                {selectedMovie.release_date && (
                  <span className="detail-tag">{selectedMovie.release_date.slice(0, 4)}</span>
                )}
              </div>
              <div className="detail-overview">{selectedMovie.overview || "Описание отсутствует."}</div>
              <div className="detail-rating">
                {selectedMovie.vote_average?.toFixed(1)}
                <small>/ 10 · {selectedMovie.vote_count?.toLocaleString()} голосов</small>
              </div>
            </div>
          </div>
        )}

        {loadingClick ? <Loading /> : (
          <>
            <MovieSlider
              title="Смотрите также"
              movies={similar}
              onMovieClick={handleMovieClick}
            />

            <MovieSlider
              title="На основе вашего выбора"
              movies={forYou}
              onMovieClick={handleMovieClick}
              lockedMessage={
                authRequired
                  ? "Войдите в аккаунт, чтобы получать персональные рекомендации на основе вашей истории просмотров."
                  : null
              }
            />
          </>
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />}
    </>
  );
}
