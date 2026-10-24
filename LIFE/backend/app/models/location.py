from pydantic import BaseModel, FiniteFloat, Field

class Location(BaseModel):
    id: int
    name: str = Field(..., description="The name of the location")
    description: str = Field(..., description="A brief description of the location")
    x: FiniteFloat = Field(..., description="The X-coordinate of the location (must be a finite float)")
    y: FiniteFloat = Field(..., description="The Y-coordinate of the location (must be a finite float)")