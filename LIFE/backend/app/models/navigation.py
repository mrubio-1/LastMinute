from pydantic import BaseModel, Field, FiniteFloat
from typing import Literal

class NavigationRequest(BaseModel):
    destination_id: int = Field(..., description="The ID of the destination location")
    vehicle_type: Literal["xEMU Suit", "Unpressurized Rover", "Pressurized Cruiser", "Lunar Hopper"] = Field("Unpressurized Rover", description="The type of vehicle used for navigation (either rover, cruiser, suit, or hopper)")

class RouteOxygenEstimate(BaseModel):
    travel_time_minutes: FiniteFloat = Field(..., ge=0)
    oxygen_used_liters: FiniteFloat = Field(..., ge=0)
    oxygen_remaining_liters: FiniteFloat = Field(..., ge=0)
    oxygen_percentage: FiniteFloat = Field(..., ge=0, le=100)
    oxygen_status: Literal["SAFE", "WARNING", "CRITICAL"]

class NavigationRoute(BaseModel):
    id: str = Field(..., description="A unique identifier for the route")
    name: str = Field(..., description="The name of the route")
    description: str = Field(..., description="A brief description of the route")
    distanceMeters: int = Field(..., description="The total distance of the route in meters")
    estimatedTimeMinutes: int = Field(..., description="The estimated time to complete the route in minutes")
    risk: Literal["low", "medium", "high"] = Field(..., description="The risk level associated with the route (low, medium, or high)")
    points: list[tuple[float, float]] = Field(..., description="A list of (x, y) coordinate points that define the route")
    oxygen_estimate: RouteOxygenEstimate

class NavigationResponse(BaseModel):
    routes: list[NavigationRoute] = Field(..., description="A list of possible navigation routes to the destination")