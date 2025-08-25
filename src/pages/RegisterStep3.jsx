// src/pages/RegisterStep3.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// ======= ПРЕСЕТЫ GLB-МОДЕЛЕЙ =======
// Поменяй url на свои (например, на хостинге или CDN с включённым CORS).
const AVATAR_PRESETS = {
  male: [
    { name: "Astronaut (demo)", url: "https://modelviewer.dev/shared-assets/models/Astronaut.glb" },
    { name: "Robot Expressive", url: "https://modelviewer.dev/shared-assets/models/RobotExpressive.glb" },
    { name: "Person", url: "https://models.readyplayer.me/68a96d372185159c38c47c19.glb" },
  ],
  female: [
    { name: "Virtual Human 1 (demo)", url: "https://models.readyplayer.me/68a96e884dd25e5878afb28f.glb" }, // при желании замени на свой GLB
    { name: "Virtual Human 2 (demo)", url: "https://modelviewer.dev/shared-assets/models/Woman.glb" }, // при желании замени на свой GLB
  ],
};

// простые стили (без внешних css)
const styles = {
  page: { minHeight: "100vh", display: "flex", justifyContent: "center", background: "#0b0f1a", color: "#e9eef5", padding: 24 },
  card: { width: "min(1000px,96vw)", background: "#111827", border: "1px solid #1f2937", borderRadius: 16, padding: 24 },
  header: { fontSize: 28, fontWeight: 800, margin: "0 0 20px" },
  row: { display: "flex", gap: 12, alignItems: "center", marginBottom: 12 },
  select: { background: "#0f172a", color: "#e5e7eb", border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", outline: "none" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12, margin: "8px 0 18px" },
  cardItem: (active) => ({
    border: `2px solid ${active ? "#22d3ee" : "transparent"}`,
    background: "#0b1220",
    borderRadius: 14,
    padding: 12,
    cursor: "pointer",
  }),
  mvWrap: { width: "100%", aspectRatio: "1 / 1", borderRadius: 10, overflow: "hidden", background: "#0a0f1a", marginBottom: 8 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #334155", outline: "none", background: "#0f172a", color: "#e5e7eb" },
  hint: { fontSize: 13, opacity: 0.8, marginTop: 6 },
  actions: { display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" },
  primaryBtn: { background: "linear-gradient(90deg,#2563eb,#06b6d4)", border: "none", color: "#fff", padding: "12px 18px", fontWeight: 700, borderRadius: 12, cursor: "pointer" },
  secondaryBtn: { background: "transparent", border: "1px solid #334155", color: "#e5e7eb", padding: "12px 18px", fontWeight: 600, borderRadius: 12, cursor: "pointer" },
  error: { marginTop: 10, padding: "10px 12px", background: "#7f1d1d", border: "1px solid #ef4444", color: "#fff", borderRadius: 10, whiteSpace: "pre-wrap" },
};

export default function RegisterStep3() {
  const navigate = useNavigate();

  // Достаём шаги 1–2
  const step1 = useMemo(() => { try { return JSON.parse(sessionStorage.getItem("reg_step1") || "{}"); } catch { return {}; } }, []);
  const step2 = useMemo(() => { try { return JSON.parse(sessionStorage.getItem("reg_step2") || "{}"); } catch { return {}; } }, []);

  // если шаги не пройдены — назад
  useEffect(() => {
    if (!step1?.email || !step1?.password || !step2?.firstName || !step2?.lastName) {
      navigate("/register/step1");
    }
  }, [navigate, step1, step2]);

  // подключаем <model-viewer> (один раз)
  useEffect(() => {
    if (!customElements.get("model-viewer")) {
      const s = document.createElement("script");
      s.type = "module";
      s.src = "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js";
      document.head.appendChild(s);
    }
  }, []);

  const [gender, setGender] = useState(step2?.gender === "female" ? "female" : "male");
  const [avatarURL, setAvatarURL] = useState(
    step2?.avatarURL || AVATAR_PRESETS[step2?.gender === "female" ? "female" : "male"][0].url
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  // при смене пола подставляем первый пресет
  useEffect(() => {
    setAvatarURL(AVATAR_PRESETS[gender][0].url);
  }, [gender]);

  async function handleSubmit() {
    setErr("");
    if (submitting) return;
    setSubmitting(true);

    const payload = {
      email: step1.email,
      password: step1.password,
      firstName: step2.firstName,
      lastName: step2.lastName,
      gender,
      age: step2.age ?? null,
      city: step2.city ?? null,
      // ВАЖНО: тут лежит URL на GLB-модель будущего персонажа
      avatarURL: avatarURL || null,
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch {}

      if (!res.ok || !data?.success) {
        const msg = (data && (data.error || data.message)) || text.slice(0, 400) || "Ошибка регистрации";
        setErr(msg);
        setSubmitting(false);
        return;
      }

      if (data.token) localStorage.setItem("token", data.token);
      sessionStorage.removeItem("reg_step1");
      sessionStorage.removeItem("reg_step2");
      navigate("/game");
    } catch (e) {
      setErr(String(e));
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.header}>Шаг 3: профиль (3D-аватар GLB)</h1>

        <div style={styles.row}>
          <div>Пол:&nbsp;</div>
          <select value={gender} onChange={(e) => setGender(e.target.value)} style={styles.select}>
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
          </select>
        </div>

        <div style={styles.grid}>
          {AVATAR_PRESETS[gender].map((a) => (
            <div key={a.url} style={styles.cardItem(a.url === avatarURL)} onClick={() => setAvatarURL(a.url)}>
              <div style={styles.mvWrap}>
                <model-viewer
                  src={a.url}
                  camera-controls
                  auto-rotate
                  ar
                  disable-zoom={false}
                  style={{ width: "100%", height: "100%", background: "transparent" }}
                />
              </div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{a.name}</div>
              <div style={{ fontSize: 12, opacity: 0.8, wordBreak: "break-all" }}>{a.url}</div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ margin: "8px 0 6px" }}>Или свой GLB-URL:</div>
          <input
            placeholder="https://.../my-avatar.glb"
            value={avatarURL}
            onChange={(e) => setAvatarURL(e.target.value)}
            style={styles.input}
          />
          <div style={styles.hint}>
            Вставь ссылку на .glb с включённым CORS (должен грузиться в браузере). Это значение сохранится в поле
            <code> avatarURL </code> профиля — затем клиент игры сможет подхватить и загрузить модель в Three.js.
          </div>
        </div>

        {err ? <div style={styles.error}>{err}</div> : null}

        <div style={styles.actions}>
          <button style={styles.primaryBtn} onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Сохраняю..." : "Завершить"}
          </button>
          <button style={styles.secondaryBtn} onClick={() => navigate("/register/step2")} disabled={submitting}>
            ← Назад
          </button>
        </div>
      </div>
    </div>
  );
}
