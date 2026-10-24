from fastapi import APIRouter
from app.models import navigation as navigation_models
from app.services import navigation_service

router = APIRouter(prefix="/navigation", tags=["Navigation"])

@router.post("/route", response_model=navigation_models.NavigationResponse)
def calculate_route(request: navigation_models.NavigationRequest):
    return navigation_service.calculate_route(request)