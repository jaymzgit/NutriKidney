"""
routers/auth.py

JWT validation against Supabase JWKS.

Provides `get_current_user` dependency for other routers to extract
the authenticated user_id from the Authorization header.
"""

import os
import jwt
import httpx
from fastapi import APIRouter, Depends, HTTPException, Header
from functools import lru_cache

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")


@lru_cache(maxsize=1)
def _fetch_jwks() -> dict:
    """Fetch Supabase JWKS (cached for process lifetime)."""
    url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    resp = httpx.get(url, timeout=10)
    resp.raise_for_status()
    return resp.json()


def _get_signing_key(token: str) -> jwt.algorithms.RSAAlgorithm:
    """Match the token's kid to a key in the JWKS."""
    jwks = _fetch_jwks()
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")

    for key_data in jwks.get("keys", []):
        if key_data["kid"] == kid:
            return jwt.algorithms.RSAAlgorithm.from_jwk(key_data)

    raise HTTPException(status_code=401, detail="Signing key not found")


async def get_current_user(authorization: str = Header(...)) -> str:
    """
    FastAPI dependency — extracts and validates the JWT from the
    Authorization header. Returns the user_id (sub claim).

    Usage in a router:
        @router.get("/something")
        async def something(user_id: str = Depends(get_current_user)):
            ...
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization[7:]

    try:
        public_key = _get_signing_key(token)
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing sub claim")

    return user_id


@router.get("/test")
def test_auth():
    return {"message": "auth router working"}


@router.get("/me")
async def get_me(user_id: str = Depends(get_current_user)):
    """Verify token and return the authenticated user_id."""
    return {"user_id": user_id}
