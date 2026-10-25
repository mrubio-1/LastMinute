import math
from fastapi import HTTPException
from app.data import astronauts 
from app.models import astronauts as astronaut_models
from app.services import hazard_service, oxygen, emergency

def get_astronaut_info():
    for astronaut in astronauts.roster:
        if astronaut.active:
            return astronaut    
    raise HTTPException(status_code=409, detail="Please select an astronaut first.")
    

def get_all_astronauts():
    return astronauts.roster

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
    astronaut = get_astronaut_info()
    if movement.team_member_ids:
        requested_ids = set(movement.team_member_ids)
        moving_astronauts = [
            member for member in astronauts.roster
            if member.id in requested_ids
        ]
        if len(moving_astronauts) != len(requested_ids):
            raise HTTPException(status_code=404, detail="One or more team astronauts were not found.")
        if astronaut.id not in requested_ids:
            raise HTTPException(status_code=422, detail="The selected astronaut must be included in the moving team.")
    else:
        moving_astronauts = [astronaut]

    movement_updates = []

    for member in moving_astronauts:
        distance_meters = math.hypot(
            movement.x - member.x,
            movement.y - member.y,
        )
        report = oxygen.monitor_route_oxygen(
            current_oxygen_liters=member.current_oxygen_liters,
            max_capacity_liters=member.max_oxygen_liters,
            distance_km=distance_meters / 1000.0,
            incline_deg=5.0,
            vehicle_type=movement.vehicle_type,
        )
        if report["oxygen_used_liters"] > member.current_oxygen_liters:
            raise HTTPException(
                status_code=409,
                detail=f"{member.name} does not have enough oxygen to complete this movement.",
            )
        movement_updates.append((member, report))

    for member, report in movement_updates:
        member.current_oxygen_liters = report["oxygen_remaining_liters"]
        member.x = movement.x
        member.y = movement.y

    return {"x": astronaut.x, "y": astronaut.y}

def get_nearby_hazards():
    astronaut_location = get_astronaut_location()
    nearby_hazards = hazard_service.get_hazards_at_position(astronaut_location["x"], astronaut_location["y"])
    return nearby_hazards

def get_astronauts_oxygen():
    astronaut = get_astronaut_info()
    return oxygen.monitor_oxygen(
        current_oxygen_liters=astronaut.current_oxygen_liters,
        max_capacity_liters=astronaut.max_oxygen_liters,
        oxygen_used_liters=0
    )

def get_astronaut_emergency():
    astronaut = get_astronaut_info()

    return emergency.monitor_emergencies(
        current_oxygen_liters=astronaut.current_oxygen_liters,
        max_capacity_liters=astronaut.max_oxygen_liters,
    )
