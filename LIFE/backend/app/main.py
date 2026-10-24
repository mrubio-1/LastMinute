from fastapi import FastAPI
 
from app.routers import astronauts, hazards, locations, navigation
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title="L.I.F.E API",
    description="Lunar Integrated Framework for Exploration ",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


app.include_router(astronauts.router)
app.include_router(hazards.router)
app.include_router(locations.router)
app.include_router(navigation.router)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}

