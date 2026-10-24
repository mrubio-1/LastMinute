from fastapi import FastAPI
 
from app.routers import astronauts

app = FastAPI(
    title="L.I.F.E API",
    description="Lunar Integrated Framework for Exploration ",
    version="0.1.0",
)

app.include_router(astronauts.router)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}

