# Campus Customs — HW4 (AI @ Yale SOM)

A Yale apparel storefront (**React + Vite + TypeScript**) with **Boola**, a **PydanticAI** shopping agent (**FastAPI**, SQLite, `gpt-5.6-luna` via Portkey) that checks real stock and prices, puts search results on the page, remembers logged-in shoppers, and follows safety rules.

Everything is in [`hw4/`](hw4/).

## Where to find each deliverable

| Problem | File |
|---|---|
| Prompt log | [`hw4/prompt_log.md`](hw4/prompt_log.md) |
| Harness: data, auth, architecture, models, tools, safety, specs, audit | [`hw4/output/harness.md`](hw4/output/harness.md) |
| System prompt | [`hw4/backend/prompts/prompt.md`](hw4/backend/prompts/prompt.md) |
| Agent: entry, tools, types | [`hw4/backend/agent.py`](hw4/backend/agent.py), [`tools.py`](hw4/backend/tools.py), [`models.py`](hw4/backend/models.py) |
| API (run with uvicorn) | [`hw4/backend/main.py`](hw4/backend/main.py) |
| Usability improvements (P9) | [`hw4/output/usability.md`](hw4/output/usability.md) |
| Design (P10) | [`hw4/output/design.md`](hw4/output/design.md) |
| App check with screenshots (P11) | [`hw4/output/app_check.html`](hw4/output/app_check.html) (download and open; images in `app_check_images/`) |
| Audit trail (P12) | [`hw4/output/audit_trail.json`](hw4/output/audit_trail.json) |

## Run it locally

**Prerequisites:** Python 3.11+ (built on 3.13), Node 20+ (built on 24), and a Portkey API key.

```bash
git clone https://github.com/HDBRI/ai-yale-som-hw4.git
cd ai-yale-som-hw4/hw4
```

**1. Add the course data (not in the repo).** Unzip the course `data.zip` into `hw4/data/` so you have `hw4/data/campus_customs.db` and `hw4/data/products/*.jpg`. See [`hw4/data/README.md`](hw4/data/README.md).

**2. Add your API key.**
```bash
cp .env.example .env        # then edit .env and set PORTKEY_API_KEY
```

**3. Start the backend** on http://127.0.0.1:8000:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**4. Start the frontend** in a second terminal, on http://localhost:5173:
```bash
cd hw4/frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Test login: `test@campuscustoms.yale.edu` / `password`, or create a new account.

## What's not in the repo, on purpose
- `.env` (API keys): use `hw4/.env.example` as the template.
- `campus_customs.db` and `data/products/` images: course data.
- `node_modules/`, `dist/`, `__pycache__/`: rebuilt by `npm install` and `pip install`.

## Credits
Evans Hall photos in `hw4/frontend/public/som/` are from Wikimedia Commons; the Yale SOM logo belongs to the Yale School of Management. They're used here for a class project.
