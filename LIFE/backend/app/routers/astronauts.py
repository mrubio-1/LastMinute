from fastapi import APIRouter
from app.services import astronaut_service
from app.models import astronauts

router = APIRouter(prefix="/astronaut", tags=["Astronaut"])

@router.get("/info", response_model=astronauts.Astronaut)
def get_astronaut_info():
    return astronaut_service.get_astronaut_info()

@router.get("/location", response_model=astronauts.AstronautLocation)
def read_astronaut_location():
    return astronaut_service.get_astronaut_location()

@router.post("/move", response_model=astronauts.AstronautLocation)
def move_astronaut(movement: astronauts.AstronautMove):
    return astronaut_service.move_astronaut(movement)

