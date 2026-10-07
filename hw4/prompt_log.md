# HW4 Prompt Log — Ria Vijh

<!-- Format per task:
## Task N: Title
**Prompt:**
> ...

**Follow-up prompts:**
> ...
-->

## Task 1: Maintain a Prompt Log
**Prompt:**
> yk the drill, create a prompt log, add teh prompts I give you 1 per task, & follow up if needed, check with me before adding the additional ones, format - task number, title, prompt & then follow up prompts if required

## Task 2: Analyse the Database
**Prompt:**
> look at the database data/campus_customs.db & understand the fields of each table. AT a min we should understand catalogue, inventory & users. Start the file output/harness.md. Write down each table & its fields & one short line on why each field matters for the shop or the chatbot. You will keep growing this harness file in later problems (models, tools, safety, specs)

## Task 3: Build the Campus Customs Website
**Prompt:**
> Scaffold a React + Vite + Typescript front end for Campus Customs. Put a Nav bar at the top that links to the main pages: Home, Products, About Us, Log In, Create Account. CUstoms style wording from yalebulldogblue.com for Home & About Us but write these pages in your own voice - dont copy the site text.  On the products page, show product images from the catalogue (use the image paths in the database) with basic product info (name, price, short description). Mkae each product open a single item page (large image on one side, full product text on the other - description, price, sizes/stock when u have them) Clicking a card on products should atke the customer there. Add a chat interfcae in the bottom right of the site - a floating chat panel is good. It doesnot need to talk to an agent yet - a stub that will call your backend later is enough for this problem. We will need a small API soon to read the database. It is fine to start a simple FastAPI app in backend/main.py just to serve the products & images, then grow it into the agent backend in Problem 5.

## Task 4: Create Account & Login
**Prompt:**
> Build a normal create account/login flow - Create account - first name, last name, email password & confirm password. New account go into the users table. Make sure to store passwords securely so hackers (human or AI) cannot access them. The seed database already has a test user you can use while building - email - test@campuscustoms.yale.edu. Password - password. Confirm you can log in as that user, and that a brand new account you create also works. Update output/harness.md with how auth works (what you store for a user & how passwords are protected).

## Task 5: Build the Shop Chatbot (PydanticAI Agent)
**Prompt:**
> Build the sop chatbot as a PydanticAI agent behind FastAPI, plugged into your front end. Put the API app in backend/main.py - that is the file u run with Uvicorn. Keep the agent as these 4 files next to it.
>
> * `backend/prompts/prompt.md` — system prompt (grow this same file later)
> * `backend/agent.py` — agent entry / wiring
> * `backend/tools.py` — tools the agent can call
> * `backend/models.py` — Pydantic / PydanticAI structured types
>
> In `main.py`, expose a chat route so a message from the website returns a reply from the agent (and whatever else you need for products/auth). You will need your AI model API key for the agent.
>
> Put Campus Customs voice & safety basics into prompts/prompt.md (we will expand tools & safety later). Start or update types in  models.py for chat replies/product cards as needed. In putput/harness.md note how the front end talks to FastAPI & how the agent is loaded (prompt + model). Make sure the backend runs from the backend/ folder like this: uvicorn main:app --reload --port 8000

## Task 6: Database Lookup Tools (Description, Price, Stock)
**Prompt:**
> give the agent tools that look up real information from campus_customs.db: product description, price, how many are in stock (by size when the customer asks). the agent must use the database - it should not invent prices or quantities. If a size is out of stock, say so clearly. Expand prompts/prompt.md so the agent knows to call these tools for price & stock questions. Add or update return types in models.py. In output/harness.md, list each tool & explain which model fields you choose for lookup results & why.

## Task 7: Chat Search That Updates the Page
**Prompt:**
> now we wanna add a feature to the site, when a customer asks aboyt a type of item - for example which hoodies do u have, the agent should search the catalogue & teh website shoudl dynamically show these matching items as product cards (image, name, price, short info). This is an API contract: the agent returns structured product matches & then the front end renders them on the website.  After th dynamic product cards are loaded by your new feature, make sure the same single item page behaviour you built in problem 3 still works - each product card including the ones the chat just put on the page - shoudl still open that detail view (large image + full info) when clicked. Update prompts/prompt.md & output/harness.md so it is clear how search results reach the page.

## Task 8: Saved Chat History, Shopper Identity & Page Context
**Prompt:**
> when the shopper is logged in, save their chat history in the databse in an appropriate table & reload it when they return. the agent should know who is chatting (name, email) - put that in agent deps (or an equivalent clear pattern) and/or tools teh agent can call. Also pass enough page context taht fi someone is on ethe product aoge & asks "do you have this in pink?" the agent knows which items they mean. you can put code into the agent context.

**Follow-up prompts:**
> Guests can still chat, but history only needs to persist for logged in users. DOcumnet in output/harness.md - how user chat history is stored, what customer fields the agent sees & how page context is passed

## Task 9: Usability Improvements
**Prompt:**
> I need to do Problem 9 on usability improvements for the Campus Customs app.
>
> The core shop already works, and now we need to improve it. We need to make:
> - 2 front-end usability improvements
> - 2 agent/backend usability improvements
>
> The front-end improvements should make the site look better and make it easier to use.
>
> The agent/backend improvements should make the agent output better, more accurate, or safer. They can also be new agent tools or changes that make the agent run faster or cheaper.
>
> I also need to create output/usability.md before or while I build. For each of the 4 improvements, I need to explain:
> - What I added
> - Why it helps a Campus Customs shopper or the business
>
> The improvements actually need to show up in the running app because the graders will read the write-up AND check that the features are actually there.
>
> Please first look at the existing app/code and help me identify good improvements that fit the existing app. Don't break any of the existing functionality or make unnecessary changes.

## Task 10: Style the Website
**Prompt:**
> Style the website - add creative design so the site feels like a real campus customs storefront - fonts, coloirs, hierarchy, motion, product presentation & chat feel. We will get more points for imaginatifve & out of the box design so think hard. Write output/design.md - what u changed & why it should help customers stickaround & buy, Keep it short & concrete.

## Task 11: Site Testing (App Check)
**Prompt:**
> test the live site& document it in output/app_check.html - a page we can dluble click to ope. Include clear screenshorts & short captions for 1 - chat checking the inventory level of an item (honest stock/price from the DB) 2 - The dynamic search result cards appearing after a category question (eg hoodies) 3 one of the usability featires we added in problem 9. Make the HTML easy to grade - heading for each check, screenshot & 1-2 lines on what the screenshot proves. Put the screenshot image files in output/app_check_images/ & link them from app_check.html with relative paths for eg app_check_images/inventory.png

## Task 12: Audit Trail, Safety, Finish Harness
**Prompt:**
> Keep an append only output/audit_trail.json of agent loop activity (time, tool name,short args/result, stop reason). Do not wipe it between runs. Also think of some safety rules to give the agent & put them in prompts/prompt.md. Finish output/harness.md so it is clear how the system works. Model fields in models.py & why we chose them, tools & abilities, safety rules, specs (loop limits, result caps, models, how to run front + back).

## Task 13: Submit to GitHub
**Prompt:**
> I need to finish Problem 13 and push my homework to GitHub.
>
> Please help me get the project ready to submit, but don't change the actual functionality of my app unless it's necessary for the GitHub setup.
>
> The requirements are:
>
> - Put all my code in a folder called hw4
> - Push it to a PUBLIC GitHub repository
> - I need to submit the repo URL on Canvas, not a zip file
> - The repo needs to be accessible so the graders can open and clone it
>
> IMPORTANT: Do NOT put any sensitive/local files in the GitHub repo:
> - .env
> - campus_customs.db
> - product images
>
> Use a .gitignore so these files aren't committed.
>
> Also include a .env.example file, but only with placeholder values — no real API keys or secrets.
>
> Please check my project before pushing it and make sure the expected file structure is correct, that sensitive files are excluded, and that everything needed for the graders to clone and run the project is included.
>
> After that, help me push it to GitHub and give me the repo URL I should submit on Canvas.
