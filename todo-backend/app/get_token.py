import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# 換成你在 Supabase 後台建立的測試帳號密碼
email = "test@example.com"
password = "TestPassword123!"

try:
    response = supabase.auth.sign_in_with_password({"email": email, "password": password})
    print("\n✅ 登入成功！請複製以下這長串 Token (JWT)：\n")
    print(response.session.access_token)
except Exception as e:
    print("登入失敗：", e)