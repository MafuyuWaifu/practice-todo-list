import os

from dotenv import load_dotenv
from supabase import create_client


load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
email = os.getenv("TEST_USER_EMAIL")
password = os.getenv("TEST_USER_PASSWORD")

if not email or not password:
    raise RuntimeError("TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in the environment.")

try:
    response = supabase.auth.sign_in_with_password({"email": email, "password": password})
    token = response.session.access_token
    masked_token = f"{token[:12]}...{token[-6:]}" if token else "missing"
    print(f"Login succeeded for {email}.")
    print(f"Access token preview: {masked_token}")
except Exception as exc:
    print(f"Login failed: {exc}")
