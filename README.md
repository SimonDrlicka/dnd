# 🐉⚔️ D&D Combat Tracker + Inventory 📜✨

Welcome to the **table-ready** Dungeons & Dragons toolkit built with **Next.js App Router** + **Tailwind CSS** and powered by **SQLite**.  
Print‑friendly, battle‑ready, and DM‑approved. 🎲🛡️

---

## 🌟 What’s Inside

### 🗡️ Combat Tracker
- Initiative‑sorted combat table with editable cells ✍️
- Death saves tracker for 4 heroes ☠️💀
- Attack menu (auto turn order + rounds) 🔁
- Combat log replay (step‑by‑step history) ⏮️⏭️
- Dead combatants highlighted + removed from turn order 🪦

### 🎒 Inventory & Notes
- Track loot, origin, and estimated sell price 💰
- Add/edit/remove items with clean inline editing 🧾
- Stored in SQLite for persistent sessions 🧠

---

## 🧪 Local Development

```bash
npm install
npm run dev
```

Open the app at `http://localhost:3000` and choose:
- **Open Combat Tracker**
- **Open Inventory**

---

## 🗄️ Database

SQLite lives at:

```
data/app.db
```

Migrations auto‑run on startup (no extra command needed). 🛠️

---

## 🐳 Docker (Dev)

Spin it up with Docker Compose:

```bash
docker-compose up -d
```

Stop it:

```bash
docker-compose down
```

Volumes:
- `./data` → SQLite DB 💾
- `./build` → Next.js build cache ⚡

---

## ☁️ Vercel Deploy

Deploying to Vercel? 🎯  
The app auto‑detects **Postgres** when `POSTGRES_URL` or `DATABASE_URL` is set.

Steps:
1. Create a Postgres integration (Neon / Supabase) 🧠
2. Vercel injects env vars 🧬
3. Deploy 🚀

Schema auto‑creates on first request. ✅

---

## 🖨️ Print‑Friendly

The tracker is designed for **A4 landscape printing**, with clean borders and minimal UI clutter.  
Perfect for physical tables and handwritten notes. 📝

---

## 🧙‍♂️ Credits & Vibes

Crafted for dungeon masters who want **speed**, **clarity**, and **epic encounters**.  
Roll high. Fight smart. Track everything. 🧠🎲🔥

---

## 🚀 Future Ideas (Optional)
- Party notes + session log 🗒️
- Shared multiplayer combat view 🧙‍♀️🧙‍♂️
- Export/print combat log 📤

---

Happy adventuring! ⚔️🐲✨
