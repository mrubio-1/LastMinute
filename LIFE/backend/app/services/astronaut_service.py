from app.data import astronauts 
from app.models import astronauts as astronaut_models

def get_astronaut_info():
    return astronauts.astronauts_info

def get_astronaut_location():
    astronaut_info = get_astronaut_info()
    return {"x": astronaut_info.x, "y": astronaut_info.y}

def move_astronaut(movement: astronaut_models.AstronautMove):
    astronaut_info = get_astronaut_info()
    astronaut_info.x = movement.x
    astronaut_info.y = movement.y
    return {"x": astronaut_info.x, "y": astronaut_info.y}