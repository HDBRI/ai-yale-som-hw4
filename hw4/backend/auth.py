"""Campus Customs auth: password hashing, sessions, signup/login/logout/me.

Passwords: salted PBKDF2-HMAC-SHA256, never stored or returned in plain text.
Sessions: random token in an HttpOnly cookie; only its SHA-256 lives in the DB.
"""

import hashlib
import hmac
import re
import secrets
import sqlite3
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Cookie, HTTPException, Request, Response
from pydantic import BaseModel

from db import get_db

ALGO = "pbkdf2_sha256"
ITERATIONS = 600_000          # OWASP 2023 guidance for PBKDF2-SHA256
LEGACY_ITERATIONS = 120_000   # seed users: "pbkdf2_sha256$<salt>$<hex>"
SESSION_COOKIE = "cc_session"
SESSION_DAYS = 7
MAX_FAILS, LOCK_SECONDS = 5, 15 * 60
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ---------- password hashing ----------

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), ITERATIONS).hex()
    return f"{ALGO}${ITERATIONS}${salt}${digest}"


def _parse(stored: str) -> tuple[int, str, str]:
    parts = stored.split("$")
    if len(parts) == 4 and parts[0] == ALGO:
        return int(parts[1]), parts[2], parts[3]
    if len(parts) == 3 and parts[0] == ALGO:
        return LEGACY_ITERATIONS, parts[1], parts[2]
    raise ValueError("unknown hash format")


def verify_password(password: str, stored: str) -> bool:
    try:
        iterations, salt, expected = _parse(stored)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), iterations).hex()
    return hmac.compare_digest(digest, expected)


def needs_rehash(stored: str) -> bool:
    try:
        return _parse(stored)[0] < ITERATIONS
    except ValueError:
        return True


# Burn equal time for unknown emails so response timing doesn't reveal who has an account.
_DUMMY_HASH = hash_password(secrets.token_hex(8))


# ---------- sessions ----------

def init_auth_tables() -> None:
    with get_db() as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )"""
        )


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def create_session(conn: sqlite3.Connection, response: Response, user_id: int) -> None:
    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)).strftime("%Y-%m-%d %H:%M:%S")
    conn.execute(
        "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
        (_token_hash(token), user_id, expires),
    )
    response.set_cookie(
        SESSION_COOKIE, token, max_age=SESSION_DAYS * 86400,
        httponly=True, samesite="lax", secure=False,  # secure=True once served over HTTPS
    )


def public_user(row: sqlite3.Row) -> dict:
    """The ONLY user shape that leaves the backend. Never includes password_hash."""
    return {
        "id": row["id"],
        "first_name": row["first_name"],
        "last_name": row["last_name"],
        "name": row["name"],
        "email": row["email"],
    }


def current_user(token: str | None) -> dict | None:
    if not token:
        return None
    with get_db() as conn:
        row = conn.execute(
            """SELECT u.id, u.first_name, u.last_name, u.name, u.email
               FROM sessions s JOIN users u ON u.id = s.user_id
               WHERE s.token_hash = ? AND s.expires_at > ?""",
            (_token_hash(token), _now()),
        ).fetchone()
    return public_user(row) if row else None


# ---------- brute-force throttle (in-memory, per email + IP) ----------

_fails: dict[str, list[float]] = {}


def _throttle_key(email: str, request: Request) -> str:
    return f"{email}|{request.client.host if request.client else '?'}"


def _check_locked(key: str) -> None:
    recent = [t for t in _fails.get(key, []) if time.time() - t < LOCK_SECONDS]
    _fails[key] = recent
    if len(recent) >= MAX_FAILS:
        raise HTTPException(429, "Too many failed attempts. Please wait 15 minutes and try again.")


# ---------- routes ----------

class SignupIn(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    confirm_password: str


class LoginIn(BaseModel):
    email: str
    password: str


@router.post("/signup", status_code=201)
def signup(body: SignupIn, response: Response):
    first, last = body.first_name.strip(), body.last_name.strip()
    email = body.email.strip().lower()
    if not first or not last:
        raise HTTPException(400, "First and last name are required.")
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "Please enter a valid email address.")
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters.")
    if body.password != body.confirm_password:
        raise HTTPException(400, "Passwords do not match.")

    with get_db() as conn:
        if conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
            raise HTTPException(409, "An account with that email already exists. Try logging in.")
        cur = conn.execute(
            "INSERT INTO users (name, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)",
            (f"{first} {last}", email, hash_password(body.password), first, last),
        )
        create_session(conn, response, cur.lastrowid)
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    return {"user": public_user(row)}


@router.post("/login")
def login(body: LoginIn, request: Request, response: Response):
    email = body.email.strip().lower()
    key = _throttle_key(email, request)
    _check_locked(key)

    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE lower(email) = ?", (email,)).fetchone()
        ok = verify_password(body.password, row["password_hash"] if row else _DUMMY_HASH) and row is not None
        if not ok:
            _fails.setdefault(key, []).append(time.time())
            raise HTTPException(401, "Incorrect email or password.")  # same message either way
        _fails.pop(key, None)
        if needs_rehash(row["password_hash"]):  # upgrade legacy 120k hashes to 600k on login
            conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(body.password), row["id"]))
        create_session(conn, response, row["id"])
    return {"user": public_user(row)}


@router.post("/logout")
def logout(response: Response, cc_session: str | None = Cookie(default=None)):
    if cc_session:
        with get_db() as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash = ?", (_token_hash(cc_session),))
    response.delete_cookie(SESSION_COOKIE)
    return {"ok": True}


@router.get("/me")
def me(cc_session: str | None = Cookie(default=None)):
    return {"user": current_user(cc_session)}
