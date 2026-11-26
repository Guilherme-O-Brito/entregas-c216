import uvicorn
from fastapi import FastAPI

from app.api.routes.auth import auth_router
from app.api.routes.friendships import friendships_router
from app.api.routes.movies import movies_router
from app.api.routes.users import users_router

app = FastAPI()
app.include_router(auth_router)
app.include_router(friendships_router)
app.include_router(movies_router)
app.include_router(users_router)


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
