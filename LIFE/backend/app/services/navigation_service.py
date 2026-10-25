from fastapi import HTTPException
from app.models import navigation as navigation_models
from app.services import astronaut_service, location_service, oxygen
from app.services.luna_navigator import LunarNavigator

def calculate_route(request: navigation_models.NavigationRequest):
    
    astronaut = astronaut_service.get_astronaut_info()
    astronaut_location = {"x": astronaut.x, "y": astronaut.y}
    incline_deg = 5.0
    
    # Find the destination location based on the provided destination_id
    locations = location_service.get_all_locations()
    destination_location = next((loc for loc in locations if loc.id == request.destination_id), None)
    if not destination_location:
        raise HTTPException(status_code=404, detail="Destination location not found")
    
    # Use the LunarNavigator to calculate the route
    navigator = LunarNavigator(vehicle_type=request.vehicle_type)
    route = navigator.get_route_data(
        current_location=astronaut_location,
        destination={"x": destination_location.x, "y": destination_location.y},
        incline_deg=incline_deg,
        )

    for option in route["routes"]:
        option["oxygen_estimate"] = oxygen.monitor_route_oxygen(
            current_oxygen_liters=astronaut.current_oxygen_liters,
            max_capacity_liters=astronaut.max_oxygen_liters,
            distance_km=option["distanceMeters"] / 1000.0,
            incline_deg=incline_deg,
            vehicle_type=request.vehicle_type,
        )

    return route

