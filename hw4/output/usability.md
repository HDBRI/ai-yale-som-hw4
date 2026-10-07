# Campus Customs — Usability Improvements (Problem 9)

Four improvements: two front-end and two agent/backend. All of them are live in the running app (verified 2026-10-07).

| # | Type | Improvement | How a grader can see it |
|---|---|---|---|
| 1 | Front end | Smart chat suggestions and "Ask Boola" buttons | Open the chat bubble on Home, then on a product page. The chips change. On a product page, use the "Ask Boola" row under "Add to bag". |
| 2 | Front end | Working shopping bag | On any product page, pick a size → **Add to bag** → bag icon in the nav (count badge) → slide-out bag. |
| 3 | Agent / backend | `find_alternatives` tool: similar items in stock in your size | Yale Grandma Hoodie page → **"Sold out in S? Find alternatives"**, or ask "do you have this in gray?" on the Basic Hoodie Big Yale page. |
| 4 | Agent / backend | Clean garment categories for search | Chat chip **"Which hoodies do you have?"** → 27 hoodies on the page (it was 25, and the plural "hoodies" used to find 0). |

---

## 1. Smart chat suggestions and "Ask Boola" buttons (front end)

**What I added**
- **Starter chips in the chat panel** that change with the page:
  - Home or other pages: "Which hoodies do you have?", "Gift ideas for my mom", "Show me Saybrook gear", "Tees under $40"
  - Products page showing chat results: "Only show navy ones", "Which are under $60?", "Which are in stock in XL?", "Compare the first two"
  - Product page: "Is this in stock in M?", "Do you have this in another colour?", "Show me similar items", "How much is this?"
- **An "Ask Boola" row on every product page:** *Other colours?* and *Similar items*. When any size is sold out, a highlighted chip also appears: **"Sold out in S? Find alternatives"**. Clicking a chip opens the chat and sends the question.
- **Files:** `ChatWidget.tsx` (`suggestions()`, `send()`, listener), `askBoola.ts` (small event helper), `ProductDetail.tsx`, `index.css`.

**Why it helps**
- **Shoppers:** a blank chat box is intimidating, and most people don't know what the bot can do. One tap shows it understands sizes, colours, gifts, colleges and budgets.
- **Context:** the chips use the page context from Problem 8, so "Is *this* in stock in M?" just works on a product page.
- **Business:** more chat use means more guided discovery. The sold-out chip catches the moment a shopper is about to leave and turns it into a recommendation (it pairs with #3).

## 2. Working shopping bag (front end)

**What I added**
- **Working "Add to bag":** the button on the product page now works. It is disabled until you pick a size, and it shows a confirmation ("✓ Added Yale Grandma Hoodie (L) to your bag · View bag").
- **Bag icon in the nav,** with a live count badge.
- **Slide-out bag:** product image (click it to go back to the product), size, unit price, − / + quantity, Remove, and a subtotal. It closes with Esc or by clicking outside.
- **Stock-aware limits:** you can't add more than the stock for that size. "+" is disabled and shows "max in stock", and the product button changes to "All 5 in XXL are in your bag".
- **Saved in `localStorage`,** so the bag survives refreshes and return visits. Checkout is clearly labelled "coming soon" rather than pretending to work.
- **Files:** `bag.tsx` (context), `BagDrawer.tsx`, `NavBar.tsx`, `ProductDetail.tsx`, `index.css`.

**Why it helps**
- **Shoppers:** before this, the main call to action did nothing, which is the biggest usability gap a store can have. Now they can collect items across pages (a Branford tee *and* a Yale Dad hoodie), compare totals, and come back later without losing anything.
- **Business:** a bag is how browsing turns into an order. The stock limits stop overselling, and saved bags bring back visitors who left without buying.

## 3. `find_alternatives`: similar in-stock items (agent tool)

**What I added**
- **A new tool,** `find_alternatives(product_id, size?, color?)` in `tools.py`. It returns up to 5 similar products that **are in stock** (in the requested size, if given), each with `match_reasons`.
- **How it ranks similarity:**
  - **Category:** same clean category (+3).
  - **Theme groups:** *family gift* (Mom, Dad, Grandma…), *residential college*, *grad school* (+3).
  - **Distinctive shared tags:** tags used on more than 12% of products ("yale", "navy", "pullover", "left chest"…) are ignored, because they say nothing about the theme.
  - **Colour:** comes in the requested colour (+3).
  - **Price:** within $10 (+1).
- **Honest about colours:** if nothing similar comes in the requested colour, its `message` says so, so Boola doesn't pretend.
- **New return types** in `models.py`: `Alternative` and `AlternativesResult`.
- **Prompt rule:** a sold-out size or a missing colour must lead to `find_alternatives`. Never end on a dead "sold out".

**Why it helps**
- **More accurate:** before, the model had to guess "similar" items from a keyword search, often suggesting things that were also sold out in the shopper's size. Now every suggestion is guaranteed in stock in that size, and it really is similar.
  - Grandma Hoodie, sold out in M → Aunt, Dad, Grandpa, Mom and Uncle hoodies (all family gifts, all in stock in M).
  - Saybrook Crewneck in XS → Davenport, Grace Hopper, Jonathan Edwards and Pierson college crewnecks.
- **Verified in the app:** the "Sold out in S? Find alternatives" chip got "Sorry, the Yale Grandma Hoodie is sold out in S, M, and XL. Similar items in stock in S include the Yale Aunt Hoodie ($68), Yale Dad Hoodie ($68), and Yale Grandpa Hoodie ($68)…". The database confirms S stock of 12, 5 and 20. "Do you have this in gray?" on the Basic Hoodie got "only comes in navy blue and white, not gray", plus 3 gray hoodies.
- **Business:** a sold-out size is a lost sale unless the shopper is offered a real alternative straight away.

## 4. Clean garment categories for search (agent/backend accuracy)

**What I added**
- **One clean category per product:** `garment_categories()` maps the catalogue's **22 inconsistent `garment_type` strings** to `hoodie`, `crewneck`, `tee`, `quarter-zip`, `full-zip`, `jacket`, `long-sleeve`, `mockneck` and `sweatshirt` (= hoodies + crewnecks + quarter-zips + mocknecks).
- **Shopper words understood:** `garment_to_category()` maps "hoodies", "tees", "1/4 zip", "fleece", "zip-up" and similar to those categories.
- **Search uses it:** `run_search` (used by both the `search_products` tool and the on-page results) now filters by category. Unknown words fall back to the old matching.
- **Visible to the model:** every product summary now includes `categories`, and the prompt and tool docs list them.

**Why it helps.** I measured accuracy against the database before and after:

| Shopper says | Real items | Before: found / wrong | After: found / wrong |
|---|---|---|---|
| "hoodies" | 27 | **0** / 0 | 27 / 0 |
| "tees" | 25 | **0** / 0 | 25 / 0 |
| "t-shirt" | 25 | 25 / **70** | 25 / 0 |
| "quarter-zip" | 11 | 11 / **7** | 11 / 0 |
| "1/4 zip" | 11 | 11 / **8** | 11 / 0 |
| "fleece" | 8 | **7** / 0 | 8 / 0 |

- **More accurate:** the page shows the right products and Boola's counts are true ("I found **27 hoodies**"). Before, it missed the Champion Full Zip Hood and the UA Gameday Hood, and a "t-shirt" search returned nearly the whole catalogue.
- **Faster and cheaper:** the model no longer has to retry with different keywords when a search comes back empty or noisy.
- **Better recommendations:** #3 uses the same categories, so "similar" means the same kind of garment.

---

**Nothing broken:** Problem 3 product pages, Problem 6 lookup tools and the number check, Problem 7 chat results on the page, and Problem 8 saved history and page context all still work. I re-ran them during testing. The bag and chips add to the existing layout without changing it.
