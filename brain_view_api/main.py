from fastapi import FastAPI
from brain_view_api.api.routes import router as api_router

app = FastAPI(title="My API")

# dodajemy wszystkie endpointy
app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Hello World"}