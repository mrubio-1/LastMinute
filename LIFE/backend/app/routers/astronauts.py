from fastapi import APIRouter, HTTPException
from app.services import astronaut_service, satellite as satellite_service
from app.models import astronauts, hazard, satellite

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

@router.get("/positioning", response_model=satellite.SatellitePositionResponse)
def get_astronaut_positioning():
    # This endpoint retrieves the astronaut's position using trilateration based on distances from three satellites.
    # It returns the number of satellites used, the distances from each satellite, the estimated position, and the positioning status.
    try:
        return satellite_service.track_astronaut_with_satellites()
    except ValueError as e:
        return {"error": HTTPException(status_code=500, detail=str(e))}

@router.get("/oxygen",response_model=astronauts.AstronautOxygenResponse)
def get_astronuat_oxygen():
    return astronaut_service.get_astronauts_oxygen()

