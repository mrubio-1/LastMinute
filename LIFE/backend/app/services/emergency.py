from app.services import astronaut_service, hazard_service, oxygen, satellite


# Determine the severity of an emergency.
def get_emergency_level(oxygen_status, nearby_hazards):
    if oxygen_status == "CRITICAL":
        return "CRITICAL"

    if any(hazard.severity == "high" for hazard in nearby_hazards):
        return "CRITICAL"

    if nearby_hazards or oxygen_status == "WARNING":
        return "WARNING"

    return "SAFE"


# Generate emergency alerts for an astronaut. 
def monitor_emergencies(current_oxygen_liters, max_capacity_liters):
    # Get the currently selected astronaut.
    astronaut = astronaut_service.get_astronaut_info()

    # Check the astronaut's oxygen supply.
    oxygen_report = oxygen.monitor_oxygen(
        current_oxygen_liters,
        max_capacity_liters,
        oxygen_used_liters=0
    )

    # Check for hazards near the astronaut.
    nearby_hazards = hazard_service.get_hazards_at_position(
        astronaut.x,
        astronaut.y
    )

    #Estimate the astronaut's position using satellites.
    satellite_report = satellite.simulate_satellite_position(
        astronaut.x,
        astronaut.y
    )

    # Determine the overall emergency level.
    emergency_level = get_emergency_level(
        oxygen_report["oxygen_status"],
        nearby_hazards
    )

    # Generate alert messages.
    alerts = []

    if oxygen_report["oxygen_status"] == "CRITICAL":
        alerts.append("CRITICAL: Astronaut oxygen supply is dangerously low.")

    elif oxygen_report["oxygen_status"] == "WARNING":
        alerts.append("WARNING: Astronaut oxygen supply is running low.")

    for hazard in nearby_hazards:
        if hazard.severity == "high":
            alerts.append(f"CRITICAL: Astronaut is near {hazard.name}.")
        else:
            alerts.append(f"WARNING: Astronaut is near {hazard.name}.")

    if not alerts:
        alerts.append("No emergencies detected.")

    return {
        "astronaut_id": astronaut.id,
        "astronaut_name": astronaut.name,
        "emergency_level": emergency_level,
        "alerts": alerts,
        "oxygen_report": oxygen_report,
        "nearby_hazards": [
            hazard.model_dump() for hazard in nearby_hazards
        ],
        "estimated_position": satellite_report["estimated_position"]
    }