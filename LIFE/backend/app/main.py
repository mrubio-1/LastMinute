from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.routers import astronauts
from luna_navigator import LunarNavigator, VEHICLE_SPECS


class Point(BaseModel):
    x: float
    y: float


class RouteRequest(BaseModel):
    current_location: Point
    destination: Point
    vehicle_type: str = "Unpressurized Rover"
from fastapi import FastAPI

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


@app.post("/navigation/route")
def calculate_route(request: RouteRequest):
    if request.vehicle_type not in VEHICLE_SPECS:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown vehicle type: {request.vehicle_type}",
        )

    navigator = LunarNavigator(vehicle_type=request.vehicle_type)
    return navigator.get_route_data(
        current_location=request.current_location.model_dump(),
        destination=request.destination.model_dump(),
    )
app.include_router(astronauts.router)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}

