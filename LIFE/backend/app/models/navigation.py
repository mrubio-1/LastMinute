from pydantic import BaseModel, Field, FiniteFloat
from typing import Literal

class NavigationPoint(BaseModel):
    x: FiniteFloat
    y: FiniteFloat

class NavigationRequest(BaseModel):
    current_location: NavigationPoint
    destination: NavigationPoint
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
    distanceMeters: FiniteFloat = Field(..., ge=0, description="Length of the returned path in meters")
    estimatedTimeMinutes: FiniteFloat = Field(..., ge=0, description="Estimated travel time in minutes")
    minimumHazardClearanceMeters: FiniteFloat | None = Field(..., description="Minimum distance to a hazard boundary; null when no hazards exist")
    assumedInclineDegrees: FiniteFloat = Field(..., description="Simulated constant incline; no elevation data is available")
    oxygen_sufficient: bool
    risk: Literal["low", "medium", "high"] = Field(..., description="The risk level associated with the route (low, medium, or high)")
    points: list[tuple[float, float]] = Field(..., description="A list of (y, x) coordinate points that define the route")
    oxygen_estimate: RouteOxygenEstimate

class NavigationResponse(BaseModel):
    routes: list[NavigationRoute] = Field(..., description="A list of possible navigation routes to the destination")
