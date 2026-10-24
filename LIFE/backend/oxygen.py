from .luna_navigator import LunarNavigator

# Track an astronaut's remaining oxygen supply.
def calculate_remaining_oxygen(current_oxygen_liters, oxygen_used_liters):

    remaining = max (0, current_oxygen_liters - oxygen_used_liters)

    return remaining


# Calculate the percentage of oxygen remaining.
def calculate_oxygen_percentage(remaining_liters, max_capacity_liters):

    if max_capacity_liters <= 0:
        raise ValueError("Maximum oxygen capacity must be greater than zero.")

    percentage = (remaining_liters / max_capacity_liters) * 100

    return round(percentage, 2)


# Determine oxygen safety status.
def check_oxygen_status(oxygen_percentage):

    if oxygen_percentage <=20:
        return "CRITICAL"

    elif oxygen_percentage <= 40:
        return "WARNING"

    else:
        return "SAFE"


# Generate a complete oxygen monitoring report.
def monitor_oxygen(current_oxygen_liters, max_capacity_liters, oxygen_used_liters):

    if max_capacity_liters <= 0:
        raise ValueError("Maximum oxygen capacity must be positive.")

    if not 0 <= current_oxygen_liters <= max_capacity_liters:
        raise ValueError("Current oxygen must be between 0 and maximum capacity.")

    if oxygen_used_liters < 0:
        raise ValueError("Oxygen consumption cannot be negative.")

    remaining = calculate_remaining_oxygen(
        current_oxygen_liters, oxygen_used_liters
    )

    percentage = calculate_oxygen_percentage(
        remaining, max_capacity_liters
    )

    status = check_oxygen_status(percentage)

    return {
        "oxygen_remaining_liters": remaining,
        "oxygen_percentage": percentage,
        "oxygen_status": status
    }

# Monitor oxygen consumption during a lunar route.
def monitor_route_oxygen(
    current_oxygen_liters,
    max_capacity_liters,
    distance_km,
    incline_deg,
    vehicle_type="Unpressurized Rover"
):
    navigator = LunarNavigator(vehicle_type)

    travel = navigator.calculate_travel_time(
        distance_km=distance_km,
        incline_deg=incline_deg
    )

    consumption = navigator.calculate_oxygen_used(
        pure_travel_time_min=travel["pure_travel_time_min"],
        incline_deg=incline_deg
    )

    oxygen_report = monitor_oxygen(
        current_oxygen_liters,
        max_capacity_liters,
        consumption["total_oxygen_used_liters"]
    )

    return {
        "travel_time_minutes": travel ["total_travel_time_min"],
        "oxygen_used_liters": consumption["total_oxygen_used_liters"],
        **oxygen_report
    }

