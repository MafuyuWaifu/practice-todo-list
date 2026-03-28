import os

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from supabase import ClientOptions, create_client

from database import supabase_client


class TodoCreate(BaseModel):
    title: str


class TodoUpdate(BaseModel):
    is_completed: bool


app = FastAPI(title="Todo List API")

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "*",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials

    try:
        response = supabase_client.auth.get_user(token)
        user_id = response.user.id
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        ) from exc

    user_client = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY"),
        options=ClientOptions(headers={"Authorization": f"Bearer {token}"}),
    )

    return {"user_id": user_id, "client": user_client}


@app.post("/todos")
def create_todo(todo_data: TodoCreate, user_data: dict = Depends(get_current_user)):
    payload = {
        "title": todo_data.title,
        "user_id": user_data["user_id"],
    }

    try:
        response = user_data["client"].table("todos").insert(payload).execute()
        return {
            "status": "success",
            "message": "Todo created successfully.",
            "data": response.data[0] if response.data else None,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create todo.",
        ) from exc


@app.get("/todos")
def get_todos(user_data: dict = Depends(get_current_user)):
    try:
        response = (
            user_data["client"]
            .table("todos")
            .select("*")
            .eq("user_id", user_data["user_id"])
            .execute()
        )
        return {
            "status": "success",
            "message": "Todos fetched successfully.",
            "data": response.data,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to fetch todos.",
        ) from exc


@app.patch("/todos/{todo_id}")
def update_todo(
    todo_id: str,
    update_data: TodoUpdate,
    user_data: dict = Depends(get_current_user),
):
    try:
        response = (
            user_data["client"]
            .table("todos")
            .update({"is_completed": update_data.is_completed})
            .eq("id", todo_id)
            .eq("user_id", user_data["user_id"])
            .execute()
        )
        return {
            "status": "success",
            "message": "Todo updated successfully.",
            "data": response.data,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update todo.",
        ) from exc


@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: str, user_data: dict = Depends(get_current_user)):
    try:
        response = (
            user_data["client"]
            .table("todos")
            .delete()
            .eq("id", todo_id)
            .eq("user_id", user_data["user_id"])
            .execute()
        )
        return {
            "status": "success",
            "message": "Todo deleted successfully.",
            "data": response.data,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to delete todo.",
        ) from exc
