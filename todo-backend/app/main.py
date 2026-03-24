import os
from fastapi.middleware.cors import CORSMiddleware # 這行是為了讓前端能夠跨域請求我們的 API
from supabase import create_client, ClientOptions
from fastapi import FastAPI
from pydantic import BaseModel
from database import supabase_client # 引入我們剛剛寫好的連線實體
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# 初始化 FastAPI 應用程式
class TodoCreate(BaseModel):
    title: str
class TodoUpdate(BaseModel):
    is_completed: bool

app = FastAPI(title="Todo List API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # 允許前端的開發伺服器地址
    allow_methods=["*"],  # 允許所有 HTTP 方法
    allow_headers=["*"],  # 允許所有標頭
)
security = HTTPBearer()

#get current user (for future authentication)
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # 1. 驗證 Token 並取得 user_id
        response = supabase_client.auth.get_user(token)
        user_id = response.user.id
        
        # ✨ 2. 關鍵魔法：建立一個「帶著該使用者專屬 Token」的暫時連線實體！
        # 這樣一來，這個 user_client 做的任何動作，資料庫都會認定是這個 user 做的。
        user_client = create_client(
            os.getenv("SUPABASE_URL"), 
            os.getenv("SUPABASE_KEY"), 
            options=ClientOptions(headers={'Authorization': f'Bearer {token}'})
        )
        
        # 3. 回傳一個字典，同時包含 ID 和專屬連線
        return {
            "user_id": user_id,
            "client": user_client
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無效的通行證或 Token 已過期"
        )


# 建立第一個 API 路由 (GET 請求)
@app.post("/todos")
def create_todo(todo_data: TodoCreate,user_data: dict = Depends(get_current_user)):

    # 從字典裡拿出 ID 和 專屬連線
    user_id = user_data["user_id"]
    user_client = user_data["client"] 
    
    payload = {
        "title": todo_data.title,
        "user_id": user_id
    }

    try:
        # 2. 執行寫入動作 (注意：這裡不要去檢查 status_code)
        response = user_client.table("todos").insert(payload).execute()
        
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
def get_todos(user_data: dict = Depends(get_current_user)):
    # 從字典裡拿出 ID 和 專屬連線
    user_id = user_data["user_id"]
    user_client = user_data["client"]

    try:
        response = user_client.table("todos").select("*").eq("user_id", user_id).execute()
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
#update data
@app.patch("/todos/{todo_id}")
def update_todo(todo_id: str, update_data: TodoUpdate, user_data: dict = Depends(get_current_user)):
    # 從字典裡拿出 ID 和 專屬連線
    user_id = user_data["user_id"]
    user_client = user_data["client"]

    try:
        response = user_client.table("todos").update({"is_completed": update_data.is_completed}).eq("id", todo_id).eq("user_id", user_id).execute() #確保只更新特定 ID 的待辦事項
        return {
            "status": "success",
            "message": "待辦事項更新成功！",
            "data": response.data
        }
    except Exception as e:
        return {
            "status": "error", 
            "message": f"發生錯誤: {e}"
        }
#delete data
@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: str, user_data: dict = Depends(get_current_user)):
    # 從字典裡拿出 ID 和 專屬連線
    user_id = user_data["user_id"]
    user_client = user_data["client"]

    try:
        response = user_client.table("todos").delete().eq("id", todo_id).eq("user_id", user_id).execute() #確保只刪除特定 ID 的待辦事項
        return {
            "status": "success",
            "message": "待辦事項刪除成功！",
            "data": response.data
        }
    except Exception as e:
        return {
            "status": "error", 
            "message": f"發生錯誤: {e}"
        }