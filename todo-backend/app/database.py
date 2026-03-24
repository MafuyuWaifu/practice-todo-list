#get key on .env file
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import supabase
# 載入 .env 檔案中的環境變數
load_dotenv()

# 從環境變數中獲取 Supabase 的 URL 和 Key
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD")

# 建立 Supabase 客戶端
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

#確認是否成功連接到 Supabase
# try:
#     # 測試查詢我們剛剛建好的 todos 資料表
#     response = supabase_client.table("todos").select("*").limit(1).execute()
    
#     print("🎉 成功連接到 Supabase！連線測試正常。")
#     print("目前 todos 資料表的內容：", response.data)
    
# except Exception as e:
#     print("連接到 Supabase 失敗:", e)

