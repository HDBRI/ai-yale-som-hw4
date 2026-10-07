"""Pydantic / PydanticAI structured types for the Campus Customs chatbot."""

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, Field


# ---------- agent dependencies (injected per request, never chosen by the model) ----------

PageType = Literal["home", "products", "product_detail", "about", "login", "signup", "other"]


class VisibleProduct(BaseModel):
    product_id: str
    name: str


class PageView(BaseModel):
    """What the shopper is looking at right now, RESOLVED SERVER-SIDE from the client's PageContext.
    Product ids are checked against the DB and names come from the DB, so the client can't inject text."""
    path: str
    page_type: PageType
    product_id: str | None = Field(default=None, description="Product open on a product_detail page")
    product_name: str | None = None
    garment_type: str | None = None
    search_query: str | None = Field(default=None, description="Text in the Products page search box")
    results_title: str | None = Field(default=None, description="Heading of chat search results shown on the page")
    visible_products: list[VisibleProduct] = Field(default_factory=list, description="Products currently shown as cards (max 60)")


@dataclass
class ShopDeps:
    """Per-request context injected into the agent. Built in main.py from the session cookie + resolved page;
    the model can read it (via instructions/tools) but can never choose or change it."""
    user_id: int | None = None
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    page: PageView | None = None

    @property
    def logged_in(self) -> bool:
        return self.user_id is not None

    @property
    def full_name(self) -> str | None:
        return " ".join(p for p in (self.first_name, self.last_name) if p) or None


# ---------- tool return types ----------
# Every number the bot quotes (price, quantity) must come from one of these objects.

StockStatus = Literal["in_stock", "low_stock", "sold_out"]
LOW_STOCK_THRESHOLD = 5


def stock_status(quantity: int) -> StockStatus:
    if quantity <= 0:
        return "sold_out"
    return "low_stock" if quantity <= LOW_STOCK_THRESHOLD else "in_stock"


class SizeStock(BaseModel):
    """Stock for one size (inventory row)."""
    size: str = Field(description="XS, S, M, L, XL or XXL")
    quantity: int = Field(description="Exact units on hand right now")
    status: StockStatus = Field(description="sold_out = 0, low_stock = 1-5, in_stock = 6+")


class ProductSummary(BaseModel):
    """Compact product row returned by search_products (for browsing / comparing)."""
    product_id: str
    name: str
    garment_type: str
    categories: list[str] = Field(default_factory=list, description="Clean categories, e.g. ['hoodie', 'sweatshirt']")
    price: float = Field(description="USD, from catalogue.price")
    colors: list[str]
    in_stock_sizes: list[str] = Field(description="Sizes with quantity > 0")


class SearchResults(BaseModel):
    """Returned by search_products. The website shows ALL matches; the model only sees the top few."""
    total_matches: int = Field(description="How many catalogue items match these filters in total")
    shown: int = Field(description="How many are included in `products` below (max 8)")
    products: list[ProductSummary]


class ProductDetails(ProductSummary):
    """Full product returned by get_product_details (description + price + stock by size)."""
    description: str = Field(description="Full catalogue description; the only source for product features")
    sold_out_sizes: list[str]
    total_in_stock: int
    sizes: list[SizeStock]


class PriceInfo(BaseModel):
    """Returned by get_price."""
    product_id: str
    name: str
    price: float = Field(description="USD, from catalogue.price")
    currency: Literal["USD"] = "USD"


class StockReport(BaseModel):
    """Returned by check_stock. If `size` was asked, `sizes` has just that one row."""
    product_id: str
    name: str
    requested_size: str | None = Field(description="The size the shopper asked about, or None for all sizes")
    sizes: list[SizeStock]
    in_stock_sizes: list[str]
    sold_out_sizes: list[str]
    total_in_stock: int
    message: str = Field(description="Plain-English summary to base the reply on")


class Alternative(ProductSummary):
    """One suggested replacement, with the reasons it was picked."""
    match_reasons: list[str] = Field(description="Why it's similar, e.g. 'same category: hoodie', 'also Saybrook'")
    in_requested_size: bool | None = Field(default=None, description="True if in stock in the size asked for")


class AlternativesResult(BaseModel):
    """Returned by find_alternatives."""
    for_product_id: str
    for_product_name: str
    requested_size: str | None
    requested_color: str | None
    alternatives: list[Alternative]
    message: str


class ShopperProfile(BaseModel):
    """Returned by get_my_account: the CURRENT shopper only (from deps.user_id)."""
    first_name: str
    last_name: str
    full_name: str
    email: str
    member_since: str
    saved_chat_messages: int


class LookupFailed(BaseModel):
    """Returned instead of raising when a lookup fails, so the agent can recover."""
    error: str
    hint: str


# ---------- agent output ----------

class AgentOutput(BaseModel):
    """What the LLM must return. Product cards are built from the DB, not from model text."""
    reply: str = Field(description="Friendly reply to the shopper in Campus Customs voice. Short; may use **bold** and '- ' bullets.")
    product_ids: list[str] = Field(
        default_factory=list,
        description="product_id values (exactly as returned by tools) to show as mini cards in the chat, max 6. Empty if none.",
    )
    show_on_page: bool = Field(
        default=False,
        description="True when the shopper is browsing a TYPE/CATEGORY of items (e.g. 'which hoodies do you have?'). "
        "The website then shows every match from your search_products call(s) this turn as product cards on the page.",
    )
    page_title: str | None = Field(
        default=None,
        description="Short heading for the on-page results when show_on_page is true, e.g. 'Hoodies' or 'Navy crewnecks under $60'.",
    )


# ---------- API types (FastAPI <-> frontend) ----------

class ProductCard(BaseModel):
    """One card on the page or in the chat. Built from SQLite by product_id, never from model text."""
    product_id: str
    name: str
    garment_type: str
    price: float
    image_url: str
    short_description: str = ""
    categories: list[str] = Field(default_factory=list)
    colors: list[str]
    in_stock_sizes: list[str]


class SearchFilters(BaseModel):
    """The exact search_products arguments the agent used (echoed so the UI can show what was searched)."""
    query: str = ""
    garment: str | None = None
    color: str | None = None
    max_price: float | None = None
    size: str | None = None


class PageResults(BaseModel):
    """Chat-driven search results the website renders as product cards on the page."""
    title: str
    searches: list[SearchFilters]
    total: int
    products: list[ProductCard]


class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class PageContext(BaseModel):
    """Raw page info sent by the website with every chat message (untrusted; resolved into PageView)."""
    path: str = Field(default="/", max_length=300)
    product_id: str | None = Field(default=None, max_length=120)
    search_query: str | None = Field(default=None, max_length=200)
    results_title: str | None = Field(default=None, max_length=100)
    visible_product_ids: list[str] = Field(default_factory=list, max_length=60)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    # Only used for logged-out shoppers; logged-in history is loaded from chat_messages.
    history: list[HistoryMessage] = Field(default_factory=list, max_length=20)
    page: PageContext | None = None


class ChatReply(BaseModel):
    reply: str
    products: list[ProductCard] = Field(default_factory=list)  # mini cards inside the chat bubble
    page_results: PageResults | None = None                     # cards the website shows on the page
