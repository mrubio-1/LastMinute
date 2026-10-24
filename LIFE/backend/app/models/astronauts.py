import pydantic
from pydantic import BaseModel, FiniteFloat

class Astronaut(BaseModel):
    id: int
    name: str # Name of the astronaut
    x: float # X-coordinate of the astronaut's location
    y: float # Y-coordinate of the astronaut's location
    active: bool = False # Whether the astronaut is currently active/selected or not

class AstronautLocation(BaseModel):
    x: float # X-coordinate of the astronaut's location
    y: float # Y-coordinate of the astronaut's location

class AstronautMove(BaseModel):
    x: FiniteFloat # New X-coordinate for the astronaut's location (has to be a finite float)
    y: FiniteFloat # New Y-coordinate for the astronaut's location (has to be a finite float)   