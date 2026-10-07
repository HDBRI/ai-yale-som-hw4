"""Read-only tools the Campus Customs agent can call.

Every fact the bot states about products (description, price, colours, sizes, stock) must come from here.
All SQL is parameterised; the tools never touch users, sessions, chat_messages or password hashes.
"""

import difflib
import json
import re
import sqlite3
from functools import lru_cache

from pydantic_ai import RunContext

from db import get_db
from models import (
    Alternative,
    AlternativesResult,
    LookupFailed,
    PriceInfo,
    ProductCard,
    ProductDetails,
    PageContext,
    PageView,
    ProductSummary,
    SearchResults,
    ShopDeps,
    ShopperProfile,
    VisibleProduct,
    SizeStock,
    StockReport,
    stock_status,
)

SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]
SIZE_ALIASES = {
    "EXTRA SMALL": "XS", "X-SMALL": "XS", "SMALL": "S", "MEDIUM": "M", "MED": "M", "LARGE": "L",
    "EXTRA LARGE": "XL", "X-LARGE": "XL", "XX-LARGE": "XXL", "2XL": "XXL", "XXLARGE": "XXL",
}
MAX_RESULTS = 8

# ---------- clean garment categories (Problem 9) ----------
# The catalogue has 22 inconsistent garment_type strings ("short-sleeve T-shirt", "t-shirt", "hooded pullover
# sweatshirt", ...). Map each product to clean categories so "hoodie" finds every hoodie and "quarter-zip"
# finds only quarter-zips.
CATEGORIES = ["hoodie", "crewneck", "tee", "quarter-zip", "full-zip", "jacket", "long-sleeve", "mockneck", "sweatshirt"]

GARMENT_SYNONYMS = {
    "hoodie": "hoodie", "hoodies": "hoodie", "hood": "hoodie", "hooded": "hoodie", "hoody": "hoodie",
    "crewneck": "crewneck", "crewnecks": "crewneck", "crew": "crewneck", "crew neck": "crewneck", "crew-neck": "crewneck",
    "tee": "tee", "tees": "tee", "t-shirt": "tee", "t-shirts": "tee", "tshirt": "tee", "t shirt": "tee", "shirt": "tee", "shirts": "tee",
    "quarter-zip": "quarter-zip", "quarter zip": "quarter-zip", "quarterzip": "quarter-zip", "1/4 zip": "quarter-zip",
    "1-4-zip": "quarter-zip", "quarter-zips": "quarter-zip", "half zip": "quarter-zip", "half-zip": "quarter-zip",
    "full-zip": "full-zip", "full zip": "full-zip", "zip-up": "full-zip", "zip up": "full-zip", "zip": "full-zip",
    "jacket": "jacket", "jackets": "jacket", "fleece": "jacket", "bomber": "jacket", "coat": "jacket", "outerwear": "jacket",
    "long-sleeve": "long-sleeve", "long sleeve": "long-sleeve", "longsleeve": "long-sleeve", "performance": "long-sleeve",
    "mockneck": "mockneck", "mock neck": "mockneck", "mock-neck": "mockneck",
    "sweatshirt": "sweatshirt", "sweatshirts": "sweatshirt", "sweater": "sweatshirt", "sweaters": "sweatshirt", "pullover": "sweatshirt",
}


def garment_categories(garment_type: str) -> list[str]:
    g = garment_type.lower()
    cats: list[str] = []
    if "t-shirt" in g:
        cats.append("tee")
    elif "hood" in g:
        cats.append("hoodie")
    elif "quarter-zip" in g:
        cats.append("quarter-zip")
    elif "crewneck" in g:
        cats.append("crewneck")
    elif "mockneck" in g:
        cats.append("mockneck")
    elif "long-sleeve" in g:
        cats.append("long-sleeve")
    if "jacket" in g or "fleece" in g:
        cats.append("jacket")
    if "full-zip" in g:
        cats.append("full-zip")
    if any(c in cats for c in ("hoodie", "crewneck", "quarter-zip", "mockneck")):
        cats.append("sweatshirt")
    return cats or ["other"]


def garment_to_category(garment: str) -> str | None:
    """Map a shopper's garment word ('hoodies', '1/4 zip', 'tees') to a clean category, or None if unknown."""
    g = garment.strip().lower()
    if g in GARMENT_SYNONYMS:
        return GARMENT_SYNONYMS[g]
    g2 = g.rstrip("s")
    return GARMENT_SYNONYMS.get(g2)


# ---------- internal helpers ----------

def _norm_size(size: str) -> str:
    s = size.strip().upper()
    return SIZE_ALIASES.get(s, s)


def _sizes(conn: sqlite3.Connection, product_id: str) -> list[SizeStock]:
    rows = conn.execute("SELECT size, quantity FROM inventory WHERE product_id = ?", (product_id,)).fetchall()
    sizes = [SizeStock(size=r["size"], quantity=r["quantity"], status=stock_status(r["quantity"])) for r in rows]
    return sorted(sizes, key=lambda s: SIZE_ORDER.index(s.size) if s.size in SIZE_ORDER else 99)


def _summary(conn: sqlite3.Connection, row: sqlite3.Row) -> ProductSummary:
    return ProductSummary(
        product_id=row["product_id"],
        name=row["name"],
        garment_type=row["garment_type"],
        categories=garment_categories(row["garment_type"]),
        price=row["price"],
        colors=json.loads(row["colors"]),
        in_stock_sizes=[s.size for s in _sizes(conn, row["product_id"]) if s.quantity > 0],
    )


def _tokens(text: str) -> list[str]:
    stop = {"a", "an", "the", "and", "or", "for", "in", "of", "with", "do", "you", "have", "any", "me", "show", "some", "i", "want", "looking"}
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in stop]


def _find_row(conn: sqlite3.Connection, product: str) -> sqlite3.Row | None:
    """Resolve an exact product_id, or fall back to a close name / id match (e.g. 'Big Yale hoodie')."""
    row = conn.execute("SELECT * FROM catalogue WHERE product_id = ?", (product.strip(),)).fetchone()
    if row:
        return row
    rows = conn.execute("SELECT * FROM catalogue").fetchall()
    by_key = {r["name"].lower(): r for r in rows} | {r["product_id"]: r for r in rows}
    match = difflib.get_close_matches(product.strip().lower(), list(by_key), n=1, cutoff=0.75)
    return by_key[match[0]] if match else None


def _not_found(product: str) -> LookupFailed:
    return LookupFailed(
        error=f"No product matches '{product}'.",
        hint="Call search_products to find the exact product_id, then try again. Do not guess a price or stock.",
    )


# ---------- tools ----------

def run_search(
    query: str = "",
    garment: str | None = None,
    color: str | None = None,
    max_price: float | None = None,
    size: str | None = None,
) -> list[str]:
    """Shared catalogue search used by the tool AND by the page-results builder. Returns ranked product_ids."""
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM catalogue").fetchall()
        q_tokens = _tokens(query)
        category = garment_to_category(garment) if garment else None
        scored: list[tuple[int, sqlite3.Row]] = []
        for r in rows:
            if garment:
                if category:  # clean category match (Problem 9)
                    if category not in garment_categories(r["garment_type"]):
                        continue
                else:  # unknown garment word: fall back to the old substring match
                    garment_text = r["garment_type"].lower() + " " + r["product_id"]
                    if not any(g in garment_text for g in _tokens(garment.replace("-", " ")) or [garment.lower()]):
                        continue
            colors = [c.lower() for c in json.loads(r["colors"])]
            if color and not any(color.lower() in c for c in colors):
                continue
            if max_price is not None and r["price"] > max_price:
                continue
            haystack = " ".join([r["product_id"], r["name"], r["garment_type"], r["description"], r["search_tags"], r["colors"]]).lower()
            score = sum(3 if t in r["name"].lower() else 1 for t in q_tokens if t in haystack)
            if q_tokens and score == 0:
                continue
            if size:
                stock = conn.execute(
                    "SELECT quantity FROM inventory WHERE product_id = ? AND size = ?", (r["product_id"], _norm_size(size))
                ).fetchone()
                if not stock or stock["quantity"] <= 0:
                    continue
            scored.append((score, r))
    scored.sort(key=lambda x: (-x[0], x[1]["name"]))
    return [r["product_id"] for _, r in scored]


def search_products(
    ctx: RunContext[ShopDeps],
    query: str = "",
    garment: str | None = None,
    color: str | None = None,
    max_price: float | None = None,
    size: str | None = None,
) -> SearchResults:
    """Search the Campus Customs catalogue to find products and their product_ids.

    When you set show_on_page=true, EVERY match of this search is shown on the website as product cards,
    so keep the filters faithful to what the shopper asked for.

    Args:
        query: Free-text keywords, e.g. "Branford", "baseball", "dad", "vintage bulldog". Empty = everything.
        garment: Garment category: hoodie, crewneck, tee, quarter-zip, full-zip, jacket, long-sleeve, mockneck,
            or sweatshirt (= hoodies + crewnecks + quarter-zips + mocknecks). Synonyms like "hoodies", "t-shirt",
            "1/4 zip", "fleece" are understood.
        color: Colour the product must come in, e.g. "navy", "gray", "white".
        max_price: Only products at or below this USD price.
        size: Only products with this size currently in stock (XS, S, M, L, XL, XXL).

    Returns total_matches plus the top 8 matches with price, colours and in-stock sizes.
    """
    ids = run_search(query, garment, color, max_price, size)
    with get_db() as conn:
        top = [
            _summary(conn, conn.execute("SELECT * FROM catalogue WHERE product_id = ?", (pid,)).fetchone())
            for pid in ids[:MAX_RESULTS]
        ]
    return SearchResults(total_matches=len(ids), shown=len(top), products=top)


def get_product_details(ctx: RunContext[ShopDeps], product_id: str) -> ProductDetails | LookupFailed:
    """Get the full record for one product: description, price, colours and stock for every size.

    Use this for "tell me about X", material/design/feature questions, or before recommending a specific item.

    Args:
        product_id: product_id from search results (an exact product name also works).
    """
    with get_db() as conn:
        row = _find_row(conn, product_id)
        if row is None:
            return _not_found(product_id)
        sizes = _sizes(conn, row["product_id"])
        return ProductDetails(
            **_summary(conn, row).model_dump(),
            description=row["description"],
            sold_out_sizes=[s.size for s in sizes if s.quantity == 0],
            total_in_stock=sum(s.quantity for s in sizes),
            sizes=sizes,
        )


def get_price(ctx: RunContext[ShopDeps], product_id: str) -> PriceInfo | LookupFailed:
    """Get the current price (USD) of one product. Call this whenever the shopper asks what something costs.

    Args:
        product_id: product_id from search results (an exact product name also works).
    """
    with get_db() as conn:
        row = _find_row(conn, product_id)
    if row is None:
        return _not_found(product_id)
    return PriceInfo(product_id=row["product_id"], name=row["name"], price=row["price"])


def check_stock(ctx: RunContext[ShopDeps], product_id: str, size: str | None = None) -> StockReport | LookupFailed:
    """Check live stock for one product, for one size or for all sizes.

    Call this for every availability question ("do you have it in M?", "how many XL are left?", "is it in stock?").
    Always call it again for a new question; stock can change, so never reuse numbers from earlier messages.

    Args:
        product_id: product_id from search results (an exact product name also works).
        size: XS, S, M, L, XL or XXL (words like "medium" are fine). Omit to get every size.
    """
    with get_db() as conn:
        row = _find_row(conn, product_id)
        if row is None:
            return _not_found(product_id)
        all_sizes = _sizes(conn, row["product_id"])
    in_stock = [s.size for s in all_sizes if s.quantity > 0]
    sold_out = [s.size for s in all_sizes if s.quantity == 0]
    total = sum(s.quantity for s in all_sizes)
    name = row["name"]

    if size is None:
        msg = f"{name}: {total} units across sizes. In stock: {', '.join(in_stock) or 'none'}."
        if sold_out:
            msg += f" Sold out: {', '.join(sold_out)}."
        return StockReport(product_id=row["product_id"], name=name, requested_size=None, sizes=all_sizes,
                           in_stock_sizes=in_stock, sold_out_sizes=sold_out, total_in_stock=total, message=msg)

    want = _norm_size(size)
    match = [s for s in all_sizes if s.size == want]
    if not match:
        msg = f"{name} does not come in size '{size}'. Available sizes: {', '.join(s.size for s in all_sizes)}."
    else:
        s = match[0]
        if s.status == "sold_out":
            msg = f"{name} is SOLD OUT in {want}. Sizes still in stock: {', '.join(in_stock) or 'none'}."
        elif s.status == "low_stock":
            msg = f"{name} in {want}: only {s.quantity} left (low stock)."
        else:
            msg = f"{name} in {want}: {s.quantity} in stock."
    return StockReport(product_id=row["product_id"], name=name, requested_size=want, sizes=match,
                       in_stock_sizes=in_stock, sold_out_sizes=sold_out, total_in_stock=total, message=msg)


FAMILY_WORDS = {"mom", "dad", "grandma", "grandpa", "aunt", "uncle", "brother", "sister", "cousin", "family", "parent", "parents"}
RESIDENTIAL_COLLEGES = ["benjamin franklin", "berkeley", "branford", "davenport", "ezra stiles", "grace hopper", "jonathan edwards",
                        "morse", "pauli murray", "pierson", "saybrook", "silliman", "timothy dwight", "trumbull"]
# Synthetic groups: products in the same group are strongly related even if their tags share no words.
GROUP_WEIGHT = 3.0


def _raw_theme_words(row: sqlite3.Row) -> set[str]:
    words = {w for t in json.loads(row["search_tags"]) for w in re.findall(r"[a-z]+", t.lower()) if len(w) > 2}
    if words & FAMILY_WORDS:
        words.add("family-gift")  # Yale Mom / Dad / Grandma ... are all family gifts
    name = row["name"].lower()
    if any(c in name for c in RESIDENTIAL_COLLEGES):
        words.add("residential-college")
    if "school" in name and "college" not in name:
        words.add("grad-school")
    return words


@lru_cache(maxsize=1)
def _common_words() -> frozenset[str]:
    """Words on more than 12% of products (yale, navy, pullover, chest...) say nothing about a product's theme."""
    with get_db() as conn:
        rows = conn.execute("SELECT name, search_tags FROM catalogue").fetchall()
    counts: dict[str, int] = {}
    for r in rows:
        for w in _raw_theme_words(r):
            counts[w] = counts.get(w, 0) + 1
    return frozenset(w for w, n in counts.items() if n / len(rows) > 0.12 and "-" not in w)


def _theme_tags(row: sqlite3.Row) -> set[str]:
    """Distinctive theme words for similarity: colleges, schools, sports, family roles, graphics."""
    return _raw_theme_words(row) - _common_words()


def find_alternatives(
    ctx: RunContext[ShopDeps],
    product_id: str,
    size: str | None = None,
    color: str | None = None,
) -> AlternativesResult | LookupFailed:
    """Find up to 5 similar products that ARE in stock, ranked by similarity to one product.

    Call this when a size is sold out, the shopper wants a colour the product doesn't come in,
    or they ask for "something similar" / "other options like this".

    Args:
        product_id: The product they were looking at (product_id or exact name).
        size: Only suggest items in stock in this size (e.g. the sold-out size they wanted).
        color: Prefer/require items that come in this colour (e.g. "pink", "gray").
    """
    with get_db() as conn:
        src = _find_row(conn, product_id)
        if src is None:
            return _not_found(product_id)
        want_size = _norm_size(size) if size else None
        src_cats = set(garment_categories(src["garment_type"])) - {"sweatshirt"}
        src_tags = _theme_tags(src)
        scored: list[tuple[float, Alternative]] = []
        for r in conn.execute("SELECT * FROM catalogue WHERE product_id != ?", (src["product_id"],)).fetchall():
            s = _summary(conn, r)
            if not s.in_stock_sizes:
                continue
            in_size = (want_size in s.in_stock_sizes) if want_size else None
            if want_size and not in_size:
                continue
            colors = [c.lower() for c in s.colors]
            color_ok = bool(color) and any(color.lower() in c for c in colors)
            reasons, score = [], 0.0
            same_cat = src_cats & set(s.categories)
            if same_cat:
                score += 3
                reasons.append(f"same category: {sorted(same_cat)[0]}")
            shared = src_tags & _theme_tags(r)
            groups = {w for w in shared if "-" in w}
            words = shared - groups
            if groups:
                score += GROUP_WEIGHT * len(groups)
                reasons.append("also a " + " & ".join(g.replace("-", " ") for g in sorted(groups)) + " item")
            if words:
                score += min(len(words), 2) * 1.0
                reasons.append("shared theme: " + ", ".join(sorted(words)[:3]))
            if color:
                if color_ok:
                    score += 3
                    reasons.append(f"comes in {color}")
            if abs(r["price"] - src["price"]) <= 10:
                score += 1
                reasons.append("similar price")
            if score < 3:  # must share category or a real theme
                continue
            scored.append((score, Alternative(**s.model_dump(), match_reasons=reasons, in_requested_size=in_size)))
    scored.sort(key=lambda x: (-x[0], x[1].price, x[1].name))
    alts = [a for _, a in scored[:5]]
    if color and alts and not any(any(color.lower() in c.lower() for c in a.colors) for a in alts):
        note = f" None of the close matches come in {color}; these are the most similar in-stock items."
    else:
        note = ""
    msg = (f"{len(alts)} in-stock alternatives to {src['name']}" + (f" in size {want_size}" if want_size else "") + "." + note
           if alts else f"No similar in-stock items found for {src['name']}" + (f" in size {want_size}" if want_size else "") + ".")
    return AlternativesResult(for_product_id=src["product_id"], for_product_name=src["name"], requested_size=want_size,
                              requested_color=color, alternatives=alts, message=msg)


def get_my_account(ctx: RunContext[ShopDeps]) -> ShopperProfile | LookupFailed:
    """Get the logged-in shopper's own account: name, email, member-since date, saved chat count.

    Only ever returns the person currently chatting (from their login session). Use it when they ask
    "who am I logged in as?", "what email is on my account?", or to personalise help.
    """
    if not ctx.deps.logged_in:
        return LookupFailed(error="The shopper is not logged in.", hint="Invite them to log in or create an account.")
    with get_db() as conn:
        row = conn.execute(
            "SELECT first_name, last_name, name, email, created_at FROM users WHERE id = ?", (ctx.deps.user_id,)
        ).fetchone()
        n = conn.execute("SELECT COUNT(*) FROM chat_messages WHERE user_id = ?", (ctx.deps.user_id,)).fetchone()[0]
    if row is None:
        return LookupFailed(error="Account not found.", hint="Ask them to log in again.")
    return ShopperProfile(
        first_name=row["first_name"] or "", last_name=row["last_name"] or "", full_name=row["name"],
        email=row["email"], member_since=row["created_at"][:10], saved_chat_messages=n,
    )


def get_current_page(ctx: RunContext[ShopDeps]) -> PageView | LookupFailed:
    """Get what the shopper is looking at right now: page type, the open product (on a product page),
    or the product cards currently shown. Use it to resolve "this", "it", "these", "the first one"."""
    if ctx.deps.page is None:
        return LookupFailed(error="No page context was sent.", hint="Ask the shopper which product they mean.")
    return ctx.deps.page


TOOLS = [search_products, get_product_details, get_price, check_stock, find_alternatives, get_my_account, get_current_page]


# ---------- page context (not a tool): untrusted client info -> verified PageView ----------

def _page_type(path: str) -> str:
    if path in ("", "/"):
        return "home"
    if re.fullmatch(r"/products/[^/]+/?", path):
        return "product_detail"
    return {"/products": "products", "/about": "about", "/login": "login", "/signup": "signup"}.get(path.rstrip("/"), "other")


def _clean(text: str | None, n: int) -> str | None:
    if not text:
        return None
    t = re.sub(r"[\r\n\t`<>]", " ", text).strip()[:n]
    return t or None


def resolve_page(ctx: PageContext | None) -> PageView | None:
    if ctx is None:
        return None
    path = ctx.path.split("?")[0][:120]
    page = PageView(path=path, page_type=_page_type(path))
    with get_db() as conn:
        if page.page_type == "product_detail":
            pid = ctx.product_id or path.rstrip("/").rsplit("/", 1)[-1]
            row = conn.execute("SELECT product_id, name, garment_type FROM catalogue WHERE product_id = ?", (pid,)).fetchone()
            if row:
                page.product_id, page.product_name, page.garment_type = row["product_id"], row["name"], row["garment_type"]
        if ctx.visible_product_ids:
            for pid in dict.fromkeys(ctx.visible_product_ids[:60]):
                row = conn.execute("SELECT product_id, name FROM catalogue WHERE product_id = ?", (pid,)).fetchone()
                if row:
                    page.visible_products.append(VisibleProduct(product_id=row["product_id"], name=row["name"]))
    page.search_query = _clean(ctx.search_query, 80)
    page.results_title = _clean(ctx.results_title, 80)
    return page


# ---------- helpers for main/agent (not exposed to the model) ----------

def short_description(text: str, max_len: int = 110) -> str:
    first = re.split(r"(?<=\.)\s", text, maxsplit=1)[0]
    out = first if len(first) <= max_len else text
    return out if len(out) <= max_len else out[:max_len].rstrip() + "…"


def product_cards(product_ids: list[str], limit: int = 6) -> list[ProductCard]:
    """Build cards from the DB for ids the agent chose; silently drops ids that don't exist."""
    cards: list[ProductCard] = []
    with get_db() as conn:
        for pid in dict.fromkeys(product_ids):  # dedupe, keep order
            row = conn.execute("SELECT * FROM catalogue WHERE product_id = ?", (pid,)).fetchone()
            if row is None:
                continue
            cards.append(ProductCard(
                **_summary(conn, row).model_dump(),
                image_url=f"/images/{row['image_file_path']}",
                short_description=short_description(row["description"]),
            ))
            if len(cards) >= limit:
                break
    return cards
