import pydantic
from pydantic import BaseModel

class Astronaut(BaseModel):
    id: int
    name: str
    x: float # X-coordinate of the astronaut's location
    y: float # Y-coordinate of the astronaut's location

class AstronautLocation(BaseModel):
    x: float # X-coordinate of the astronaut's location
    y: float # Y-coordinate of the astronaut's location

class AstronautMove(BaseModel):
    x: float # New X-coordinate for the astronaut's location
    y: float # New Y-coordinate for the astronaut's location    