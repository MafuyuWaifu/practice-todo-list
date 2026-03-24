from fastapi import FastAPI

# 初始化 FastAPI 應用程式
app = FastAPI(title="Todo List API")

# 建立第一個 API 路由 (GET 請求)
@app.get("/")
def read_root():
    return {
        "status": "success",
        "message": "Hello World! 我的後端伺服器成功運作中！"
    }