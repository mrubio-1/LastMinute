from fastapi import HTTPException
from app.models import navigation as navigation_models
from app.services import astronaut_service, location_service
from app.services.luna_navigator import LunarNavigator

def calculate_route(request: navigation_models.NavigationRequest):
    # Prefer a location supplied by the map, while retaining the active astronaut fallback.
    astronaut_location = (
        request.current_location.model_dump()
        if request.current_location
        else astronaut_service.get_astronaut_location()
    )
    
    if request.destination:
        destination_location = request.destination.model_dump()
    else:
        locations = location_service.get_all_locations()
        destination_location = next(
            (loc for loc in locations if loc.id == request.destination_id),
            None,
        )
        if not destination_location:
            raise HTTPException(status_code=404, detail="Destination location not found")
    
    # Use the LunarNavigator to calculate the route
    navigator = LunarNavigator(vehicle_type=request.vehicle_type)
    route = navigator.get_route_data(
        current_location=astronaut_location,
        destination=(
            destination_location
            if isinstance(destination_location, dict)
            else {"x": destination_location.x, "y": destination_location.y}
        ),
    )
    
    return route