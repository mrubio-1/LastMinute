from app.models import navigation as navigation_models
from app.services import astronaut_service, oxygen
from app.services.luna_navigator import LunarNavigator
from fastapi import HTTPException
from app.services.pathfinding import RouteNotFound

def calculate_route(request: navigation_models.NavigationRequest):
    
    astronaut = astronaut_service.get_astronaut_info()
    incline_deg = 5.0
    
    # Use the LunarNavigator to calculate the route
    navigator = LunarNavigator(vehicle_type=request.vehicle_type)

    try:
        route = navigator.get_route_data(
            current_location=request.current_location.model_dump(),
            destination=request.destination.model_dump(),
            incline_deg=incline_deg,
        )
    except RouteNotFound as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    for option in route["routes"]:
        option["oxygen_estimate"] = oxygen.monitor_route_oxygen(
            current_oxygen_liters=astronaut.current_oxygen_liters,
            max_capacity_liters=astronaut.max_oxygen_liters,
            distance_km=option["distanceMeters"] / 1000.0,
            incline_deg=incline_deg,
            vehicle_type=request.vehicle_type,
        )
        option["oxygen_sufficient"] = (
            option["oxygen_estimate"]["oxygen_used_liters"] <= astronaut.current_oxygen_liters
        )

    return route

