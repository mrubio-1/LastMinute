from fastapi import APIRouter
from app.services import location_service
from app.models import location as location_models

router = APIRouter(prefix="/locations", tags=["Locations"])

@router.get("", response_model=list[location_models.Location])
def list_locations():
    return location_service.get_all_locations()