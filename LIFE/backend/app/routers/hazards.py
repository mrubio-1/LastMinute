from fastapi import APIRouter
from app.services import hazard_service
from app.models import hazard as hazard_models

router = APIRouter(prefix="/hazards",tags=["Hazards"])

@router.get("", response_model=list[hazard_models.Hazard])
def read_hazards():
    return hazard_service.get_hazards()

