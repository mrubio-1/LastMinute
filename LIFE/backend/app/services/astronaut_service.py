from fastapi import HTTPException
from app.data import astronauts 
from app.models import astronauts as astronaut_models
from app.services import hazard_service

def get_astronaut_info():
    for astronaut in astronauts.roster:
        if astronaut.active:
            return astronaut    
    raise HTTPException(status_code=409, detail="Please select an astronaut first.")
    

def get_all_astronauts():
    return [astronaut_models.Astronaut(id=astronaut.id, name=astronaut.name, x=astronaut.x, y=astronaut.y, active=astronaut.active) for astronaut in astronauts.roster]

def get_astronaut_location():
    astronaut_info = get_astronaut_info()
    return {"x": astronaut_info.x, "y": astronaut_info.y}

# This function selects an astronaut by their ID and sets them as active, 
# while deactivating all other astronauts. It returns the information of 
# the selected astronaut.
def select_astronaut_by_id(astronaut_id: int):
    if astronaut_id not in [astronaut.id for astronaut in astronauts.roster]:
        raise HTTPException(status_code=404, detail="Astronaut not found")
    
    for astronaut in astronauts.roster:
        if astronaut.id == astronaut_id:
            astronaut.active = True
        else:
            astronaut.active = False

    return get_astronaut_info()

def move_astronaut(movement: astronaut_models.AstronautMove):
    astronaut_info = get_astronaut_info()
    astronaut_info.x = movement.x
    astronaut_info.y = movement.y
    return {"x": astronaut_info.x, "y": astronaut_info.y}

def get_nearby_hazards():
    astronaut_location = get_astronaut_location()
    nearby_hazards = hazard_service.get_hazards_at_position(astronaut_location["x"], astronaut_location["y"])
    return nearby_hazards

