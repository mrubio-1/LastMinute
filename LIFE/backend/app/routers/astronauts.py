from fastapi import APIRouter
from app.services import astronaut_service
from app.models import astronauts, hazard

router = APIRouter(prefix="/astronaut", tags=["Astronaut"])

@router.get("", response_model=list[astronauts.Astronaut])
def list_all_astronauts():
    return astronaut_service.get_all_astronauts()

@router.get("/info", response_model=astronauts.Astronaut)
def get_astronaut_info():
    return astronaut_service.get_astronaut_info()

@router.get("/location", response_model=astronauts.AstronautLocation)
def read_astronaut_location():
    return astronaut_service.get_astronaut_location()

@router.post("/select/{astronaut_id}", response_model=astronauts.Astronaut)
def select_astronaut(astronaut_id: int):
    return astronaut_service.select_astronaut_by_id(astronaut_id)

@router.post("/move", response_model=astronauts.AstronautLocation)
def move_astronaut(movement: astronauts.AstronautMove):
    return astronaut_service.move_astronaut(movement)

@router.get("/hazards", response_model=list[hazard.Hazard])
def get_nearby_hazards():
    return astronaut_service.get_nearby_hazards()

