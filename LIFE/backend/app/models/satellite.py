from pydantic import BaseModel, FiniteFloat
from typing import Literal

class EstimatedPosition(BaseModel):
    x: FiniteFloat # Estimated X-coordinate of the astronaut's position (has to be a finite float)
    y: FiniteFloat # Estimated Y-coordinate of the astronaut's position (has to be a finite float)

class SatellitePositionResponse(BaseModel):
    satellites_used: int # Number of satellites used to calculate the position
    satellite_distances: dict[str, FiniteFloat] # Dictionary mapping satellite IDs to their distances from the astronaut (has to be a finite float)
    estimated_position: EstimatedPosition # The estimated position of the astronaut based on the distances from the satellites
    positioning_status: Literal["SUCCESS"] # Status of the positioning calculation
