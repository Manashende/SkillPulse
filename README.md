# SkillPulse

**An AI-powered career development platform for engineering students.**

SkillPulse connects skill tracking, career matching, AI-driven roadmaps, live job market data, and a resume builder with real ATS scoring into one product — built with an Indian job-market focus, but usable by any student trying to answer one question: *what should I actually be doing right now to get hired?*

Every number SkillPulse shows — a career match %, a salary range, a demand level, a resume keyword match — is either computed live from real external data, or clearly labeled as an AI estimate. Nothing is a static, hardcoded guess dressed up to look authoritative.

🔗 **Live demo:** https://skill-pulse-neon.vercel.app

---

## ✨ Features

- **Skill Map** — track skills by category and proficiency (1–5), visualized on a radar chart, with deterministic client-side insights (strongest area, weakest skill, gaps) at zero cost.
- **Career Paths** — real-time match percentage against curated career profiles, backed by **live salary and demand data** pulled from Adzuna, not static numbers. Includes an "Explore any career" mode where AI estimates requirements for roles outside the curated list — clearly tagged as AI-estimated.
- **AI Career Agent** — a conversational agent built on native Gemini function calling. From a single message, it can search live jobs, find live courses, build a roadmap, and propose goals — nothing is written to your tracker without explicit confirmation.
- **Goal Tracker** — AI-generated, step-by-step roadmaps with real resources, time estimates, and a calendar view mapping steps to actual dates.
- **Resume Builder** — a true WYSIWYG, paginated resume editor (real DOM-measured A4 pages, not an estimate) with PDF export, and a dual-track ATS score: an AI-estimated holistic score paired with a genuinely deterministic, non-AI keyword match against a pasted job description.
- **Learning Hub** — AI-personalized study plans, live YouTube course search tied to skill gaps, and a curated resource library with link-verification (every AI-suggested URL is checked before being shown).
- **Achievements & XP** — a 21-achievement catalog across rarity tiers, seeded in MongoDB and checked server-side against real user actions.
- **Auth** — JWT-based email/password authentication with mandatory OTP email verification.

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Chart.js, Axios |
| Backend | Node.js, Express |
| Database | MongoDB (Atlas), Mongoose |
| AI | Google Gemini (native function calling + structured prompting) |
| External Data | Adzuna API (jobs/salary), YouTube Data API v3 |
| Email | Brevo transactional API |
| PDF Export | jsPDF + html2canvas |
| Deployment | Vercel (frontend), Render (backend) |

## 🏗️ Architecture Highlights

- Backend acts as a proxy for every external API call (Gemini, Adzuna, YouTube) — no API keys are ever exposed to the client.
- A multi-key Gemini failover pool with automatic model fallback and rate limiting keeps AI features resilient under free-tier quota limits.
- Cached collections (`SalaryCache`, `JobsCache`, `ExploreCache`, `ResourcesCache`) reduce cost and latency, with TTLs tuned per data type.
- Career match percentage is weighted (`earnedWeight / totalWeight`) so critical skills count more than nice-to-haves.
- Demand is ranked **relative to category peers**, not against a fixed threshold — a self-calibrating design that gets more accurate as more data is cached.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A MongoDB Atlas connection string
- API keys for: Google Gemini, Adzuna, YouTube Data API v3, Brevo

### Installation

```bash
# Clone the repo
git clone https://github.com/<your-username>/skillpulse.git
cd skillpulse

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Variables

Create a `.env` file in `backend/` with:

```
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_jwt_secret
GEMINI_API_KEYS=key1,key2,key3
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
YOUTUBE_API_KEY=your_youtube_api_key
BREVO_API_KEY=your_brevo_api_key
CLIENT_URL=http://localhost:5173
```

Create a `.env` file in `frontend/` with:

```
VITE_API_URL=http://localhost:5000
```

### Run locally

```bash
# Terminal 1 — backend
cd backend
npm run dev

# Terminal 2 — frontend
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`.

## 📸 Screenshots

<img width="1920" height="927" alt="image" src="https://github.com/user-attachments/assets/b196df1d-c5b8-4445-81c9-863f9e6a15dc" />


<img width="1920" height="968" alt="dashboard" src="https://github.com/user-attachments/assets/0eca2f51-e3f6-42b2-b53e-20bcc2aa384f" />


<img width="1920" height="927" alt="image" src="https://github.com/user-attachments/assets/93e1bcdf-4c7f-4939-9d1b-0e0899fb7fab" />


## 🤝 Contributing

This is currently a solo-built project, but issues, feedback, and pull requests are welcome. If you spot a bug or have a feature idea, please open an issue.

---

Built by Manas Shende — https://www.linkedin.com/in/manas-shende 
