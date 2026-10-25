import pydantic
from pydantic import BaseModel, FiniteFloat, Field
from typing import Literal

class Astronaut(BaseModel):
    id: int
    name: str # Name of the astronaut
    x: float # X-coordinate of the astronaut's location
    y: float # Y-coordinate of the astronaut's location
    active: bool = False # Whether the astronaut is currently active/selected or not
    current_oxygen_liters: float # Current oxygen supply in liters
    max_oxygen_liters: float # Maximum oxygen capacity in liters

class AstronautLocation(BaseModel):
    x: float # X-coordinate of the astronaut's location
    y: float # Y-coordinate of the astronaut's location

class AstronautMove(BaseModel):
    x: FiniteFloat # New X-coordinate for the astronaut's location (has to be a finite float)
    y: FiniteFloat # New Y-coordinate for the astronaut's location (has to be a finite float)   

class AstronautOxygenResponse(BaseModel):
    oxygen_remaining_liters: FiniteFloat = Field(..., ge=0) # Remaining oxygen supply in liters
    oxygen_percentage: FiniteFloat = Field(..., ge=0, le=100) # Percentage of oxygen remaining
    oxygen_status: Literal["SAFE", "WARNING", "CRITICAL"] # Safety status based on remaining oxygen