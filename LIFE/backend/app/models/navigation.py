from typing import Literal

from pydantic import BaseModel, Field, FiniteFloat


class NavigationPoint(BaseModel):
    x: FiniteFloat
    y: FiniteFloat


class NavigationRequest(BaseModel):
    current_location: NavigationPoint
    destination: NavigationPoint
    vehicle_type: Literal[
        "xEMU Suit",
        "Unpressurized Rover",
        "Pressurized Cruiser",
        "Lunar Hopper",
    ] = Field("Unpressurized Rover")


class RouteOxygenEstimate(BaseModel):
    travel_time_minutes: FiniteFloat = Field(..., ge=0)
    oxygen_used_liters: FiniteFloat = Field(..., ge=0)
    oxygen_remaining_liters: FiniteFloat = Field(..., ge=0)
    oxygen_percentage: FiniteFloat = Field(..., ge=0, le=100)
    oxygen_status: Literal["SAFE", "WARNING", "CRITICAL"]


class NavigationRoute(BaseModel):
    id: str
    name: str
    description: str
    distanceMeters: FiniteFloat = Field(..., ge=0)
    estimatedTimeMinutes: FiniteFloat = Field(..., ge=0)
    minimumHazardClearanceMeters: FiniteFloat | None
    assumedInclineDegrees: FiniteFloat
    oxygen_sufficient: bool
    risk: Literal["low", "medium", "high"]
    points: list[tuple[float, float]]
    oxygen_estimate: RouteOxygenEstimate


class NavigationResponse(BaseModel):
    routes: list[NavigationRoute]
