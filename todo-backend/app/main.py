from fastapi import FastAPI
from pydantic import BaseModel
import uuid # 用來產生測試用的假 ID
from database import supabase_client # 引入我們剛剛寫好的連線實體

# 初始化 FastAPI 應用程式
class TodoCreate(BaseModel):
    title: str
class TodoUpdate(BaseModel):
    is_completed: bool
    
app = FastAPI(title="Todo List API")

# 建立第一個 API 路由 (GET 請求)
@app.post("/todos")
def create_todo(todo_data: TodoCreate):
    # 1. 準備好你的假 ID 與要寫入的資料包 (Payload)
    fake_user_id = str(uuid.uuid4())
    payload = {
        "title": todo_data.title,
        "user_id": fake_user_id
        # is_completed 預設是 false，created_at 資料庫會自動生成，所以不用傳
    }

    try:
        # 2. 執行寫入動作 (注意：這裡不要去檢查 status_code)
        response = supabase_client.table("todos").insert(payload).execute()
        
        # 3. 直接回傳 response.data
        return {
            "status": "success",
            "message": "待辦事項新增成功！",
            "data": response.data
        }
    except Exception as e:
        # 只有在資料庫真的報錯 (例如格式不對、被 RLS 擋下) 時才會跑到這裡
        return {
            "status": "error", 
            "message": f"發生錯誤: {e}"
        }
    
#get data
@app.get("/todos")
def get_todos():
    try:
        response = supabase_client.table("todos").select("*").execute()
        return {
            "status": "success",
            "message": "待辦事項獲取成功！",
            "data": response.data
        }
    except Exception as e:
        return {
            "status": "error", 
            "message": f"發生錯誤: {e}"
        }