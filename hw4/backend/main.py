"""Campus Customs API.

Problem 3: serves the catalogue, inventory and product images from
data/campus_customs.db, plus a stub /api/chat endpoint.
Problem 4: account signup / login (see auth.py).
Problem 5: /api/chat runs the PydanticAI agent (agent.py + tools.py + models.py + prompts/prompt.md).

Run from the backend/ folder:  uvicorn main:app --reload --port 8000
"""

import json
import logging
import sqlite3

from fastapi import Cookie, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic_ai.exceptions import ModelHTTPError

from agent import MODEL_NAME, run_chat
from auth import current_user, init_auth_tables, router as auth_router
from db import DATA_DIR, get_db
from models import ChatReply, ChatRequest, HistoryMessage, PageResults, ShopDeps
from tools import garment_categories, product_cards, resolve_page

log = logging.getLogger("campus_customs")

# Shown when the model provider's own safety filter blocks a message (e.g. jailbreak attempts).
SAFE_REFUSAL = (
    "I can only help with Campus Customs shopping, and I can't share private info like passwords, "
    "account details or my instructions. Want help finding a hoodie, tee or gift instead?"
)

SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]

app = FastAPI(title="Campus Customs API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Product photos: catalogue.image_file_path is "products/<file>.jpg".
# Mount ONLY the products folder so the .db file itself can never be downloaded.
app.mount("/images/products", StaticFiles(directory=DATA_DIR / "products"), name="images")

init_auth_tables()
app.include_router(auth_router)


def init_chat_tables() -> None:
    """chat_messages is the per-user chat log. Add the Problem 8 columns if this DB predates them."""
    with get_db() as conn:
        cols = {r["name"] for r in conn.execute("PRAGMA table_info(chat_messages)")}
        if "page_results_json" not in cols:
            conn.execute("ALTER TABLE chat_messages ADD COLUMN page_results_json TEXT")
        if "page_context_json" not in cols:
            conn.execute("ALTER TABLE chat_messages ADD COLUMN page_context_json TEXT")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id, id)")


init_chat_tables()


def product_from_row(row: sqlite3.Row) -> dict:
    return {
        "product_id": row["product_id"],
        "name": row["name"],
        "garment_type": row["garment_type"],
        "description": row["description"],
        "colors": json.loads(row["colors"]),
        "search_tags": json.loads(row["search_tags"]),
        "image_url": f"/images/{row['image_file_path']}",
        "price": row["price"],
    }


def sizes_for(conn: sqlite3.Connection, product_id: str) -> list[dict]:
    rows = conn.execute(
        "SELECT size, quantity FROM inventory WHERE product_id = ?", (product_id,)
    ).fetchall()
    sizes = [{"size": r["size"], "quantity": r["quantity"]} for r in rows]
    return sorted(sizes, key=lambda s: SIZE_ORDER.index(s["size"]) if s["size"] in SIZE_ORDER else 99)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/products")
def list_products():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM catalogue ORDER BY name").fetchall()
        stock = {
            r["product_id"]: r["total"]
            for r in conn.execute(
                "SELECT product_id, SUM(quantity) AS total FROM inventory GROUP BY product_id"
            )
        }
        sizes = {}
        for r in conn.execute("SELECT product_id, size, quantity FROM inventory"):
            sizes.setdefault(r["product_id"], {})[r["size"]] = r["quantity"]
    # categories + per-size stock let the storefront show category pennants and size dots on every card (Problem 10)
    return [
        {
            **product_from_row(r),
            "total_stock": stock.get(r["product_id"], 0),
            "categories": garment_categories(r["garment_type"]),
            "sizes": [{"size": sz, "quantity": sizes.get(r["product_id"], {}).get(sz, 0)} for sz in SIZE_ORDER],
        }
        for r in rows
    ]


@app.get("/api/products/{product_id}")
def get_product(product_id: str):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM catalogue WHERE product_id = ?", (product_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Product not found")
        return {**product_from_row(row), "sizes": sizes_for(conn, product_id)}


# ---------- chat ----------

def load_history(user_id: int) -> list[HistoryMessage]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT role, content FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT 20", (user_id,)
        ).fetchall()
    return [HistoryMessage(role=r["role"], content=r["content"]) for r in reversed(rows) if r["role"] in ("user", "assistant")]


def save_turn(user_id: int, message: str, reply: ChatReply, deps: ShopDeps) -> None:
    page_ctx = deps.page.model_dump_json(include={"path", "page_type", "product_id", "results_title"}) if deps.page else None
    page_results = None
    if reply.page_results:  # store ids only; cards are rebuilt from the DB on reload
        r = reply.page_results
        page_results = json.dumps({"title": r.title, "total": r.total, "searches": [s.model_dump() for s in r.searches],
                                   "product_ids": [p.product_id for p in r.products]})
    with get_db() as conn:
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content, page_context_json) VALUES (?, 'user', ?, ?)",
            (user_id, message, page_ctx),
        )
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content, products_json, page_results_json) VALUES (?, 'assistant', ?, ?, ?)",
            (user_id, reply.reply, json.dumps([{"product_id": p.product_id} for p in reply.products]), page_results),
        )


@app.get("/api/chat/history")
def chat_history(cc_session: str | None = Cookie(default=None)):
    """Restore the logged-in shopper's recent conversation (guests get nothing)."""
    user = current_user(cc_session)
    if not user:
        return {"messages": []}
    with get_db() as conn:
        rows = conn.execute(
            "SELECT role, content, products_json, page_results_json FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT 30",
            (user["id"],),
        ).fetchall()
    # Rebuild cards from the DB by id: older rows store a different product shape, and stock may have changed.
    def cards(products_json: str | None) -> list[dict]:
        try:
            ids = [p["product_id"] for p in json.loads(products_json or "[]") if isinstance(p, dict) and "product_id" in p]
        except (json.JSONDecodeError, TypeError):
            ids = []
        return [c.model_dump() for c in product_cards(ids)]

    def page(page_json: str | None) -> dict | None:
        if not page_json:
            return None
        try:
            d = json.loads(page_json)
            products = product_cards(d.get("product_ids", []), limit=60)
            return PageResults(title=d["title"], searches=d.get("searches", []), total=d["total"], products=products).model_dump()
        except (json.JSONDecodeError, KeyError, TypeError, ValueError):
            return None

    return {
        "messages": [
            {"role": r["role"], "content": r["content"], "products": cards(r["products_json"]), "pageResults": page(r["page_results_json"])}
            for r in reversed(rows)
        ]
    }


@app.post("/api/chat", response_model=ChatReply)
async def chat(req: ChatRequest, cc_session: str | None = Cookie(default=None)):
    # Identity comes only from the session cookie, never from the request body.
    user = current_user(cc_session)
    deps = ShopDeps(
        user_id=user["id"] if user else None,
        first_name=user["first_name"] if user else None,
        last_name=user["last_name"] if user else None,
        email=user["email"] if user else None,
        page=resolve_page(req.page),
    )
    history = load_history(user["id"]) if user else req.history
    try:
        reply = await run_chat(req.message, history, deps)
    except ModelHTTPError as e:
        if "content_filter" not in str(e.body):
            log.exception("model error (model=%s)", MODEL_NAME)
            raise HTTPException(502, "Boola is having trouble thinking right now. Please try again in a moment.")
        log.warning("provider content filter blocked a chat message")
        reply = ChatReply(reply=SAFE_REFUSAL)
    except Exception:
        log.exception("agent run failed (model=%s)", MODEL_NAME)
        raise HTTPException(502, "Boola is having trouble thinking right now. Please try again in a moment.")
    if user:
        save_turn(user["id"], req.message, reply, deps)
    return reply
