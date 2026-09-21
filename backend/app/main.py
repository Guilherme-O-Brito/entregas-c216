import uvicorn
from fastapi import FastAPI, HTTPException

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Hello World!"}

@app.post("/mul")
def multiply(x: float, y: float):
    """payload must have x and y float values"""
    return x * y

@app.post("/div")
def div(x: float, y: float):
    """payload must have x and y float values and y cant be 0"""
    if y == 0:
        raise HTTPException(status_code=422, detail="Não se pode dividir por 0!")

    return x / y

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)