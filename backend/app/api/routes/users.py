from fastapi import APIRouter, status, HTTPException
from schemas.users import UserCreate, UserResponse, UserListResponse, UserPatch, UserDelete
from models import User

users_router = APIRouter(prefix="/users", tags=["users"])

@users_router.get("/", response_model=UserListResponse, status_code=status.HTTP_200_OK)
def index_users():
    """Indexa todos os usuarios cadastrados"""
    return {"users": []}

@users_router.get("/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
def get_user(user_id: int):
    """Faz a leitura do usuario solicitado"""
    if user_id != 1:
        raise HTTPException(404, "Usuario não encontrado.")
    
    user = User(
        id=1,
        name="Guilherme",
        email="guilherme@email.com",
        password="1234567890",
        admin=True
    )

    return user

@users_router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate):
    """Cria um novo usuario"""
    user = User(1, payload.name, payload.email, payload.password, payload.admin)

    return user

@users_router.put("/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
def update_user(user_id: int, payload: UserCreate):
    """Substitui um usuario por outro"""
    if user_id != 1:
        raise HTTPException(404, "Usuario não encontrado.")
    user = User(1, payload.name, payload.email, payload.password, payload.admin)

    return user

@users_router.patch("/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
def patch_user(user_id: int, payload: UserPatch):
    """Atualiza um usuario"""
    user = User(
        id=1,
        name="Guilherme",
        email="guilherme@email.com",
        password="1234567890",
        admin=True
    )
    
    if user_id != 1:
        raise HTTPException(404, "Usuario não encontrado.")

    if payload.name is not None:
        user.name = payload.name
    if payload.email is not None:
        user.email = payload.email
    if payload.password is not None:
        user.password = payload.password
    if payload.admin is not None:
        user.admin = payload.admin

    return user

@users_router.delete("/{user_id}", response_model=UserDelete, status_code=status.HTTP_200_OK)
def delete_user(user_id: int):
    """Deleta um usuario"""
    user = User(
        id=1,
        name="Guilherme",
        email="guilherme@email.com",
        password="1234567890",
        admin=True
    )
        
    if user_id != 1:
        raise HTTPException(404, "Usuario não encontrado.")

    del user

    return {"message": "Usuario deletado."}
