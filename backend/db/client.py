"""
Supabase client initialisation.
Reads SUPABASE_URL and SUPABASE_KEY from environment variables.
Gracefully degrades (prints a warning) when credentials are absent so that
test runs work without real Supabase credentials.
"""
import os
import warnings

supabase = None

_url = os.getenv("SUPABASE_URL")
_key = os.getenv("SUPABASE_KEY")

if _url and _key:
    try:
        from supabase import create_client, Client  # type: ignore

        supabase: Client = create_client(_url, _key)
    except Exception as exc:  # pragma: no cover
        warnings.warn(f"Supabase client could not be initialised: {exc}")
else:
    warnings.warn(
        "SUPABASE_URL or SUPABASE_KEY not set — Supabase client is unavailable. "
        "Set these env vars before starting the server in production."
    )
