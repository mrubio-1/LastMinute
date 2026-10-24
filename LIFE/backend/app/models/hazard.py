from pydantic import BaseModel, FiniteFloat, Field

class Hazard(BaseModel):
    id: int
    name: str 
    description: str
    x: FiniteFloat = Field(..., description="The X-coordinate of the hazard area (must be a finite float)")
    y: FiniteFloat = Field(..., description="The Y-coordinate of the hazard area (must be a finite float)")
    radius: FiniteFloat = Field(..., gt=0, description="The radius of the hazard area (must be a positive finite float)")
    severity: str = Field(..., description="The severity level of the hazard (e.g., low, medium, high)")