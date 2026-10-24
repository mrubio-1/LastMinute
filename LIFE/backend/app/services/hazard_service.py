import app.data.hazards as hazards_data

def get_hazards():
    return hazards_data.hazards # Return the list of hazards from the hazards_data module

# This function checks if a given point (x, y) is within any of the 
# hazard areas defined in the hazards_data module. It returns a list of hazards that contain the point.
def get_hazards_at_position(x: float, y: float):
    in_position_hazards = []

    for hazard in hazards_data.hazards:
        # Calculate the squared distance from the point (x, y) to the hazard's center (hazard.x, hazard.y)
        distance_squared = (x - hazard.x) ** 2 + (y - hazard.y) ** 2 
        # If the squared distance is less than or equal to the squared radius of the hazard
        if distance_squared <= hazard.radius ** 2:
            # Then the point (x, y) is within the hazard's area
            in_position_hazards.append(hazard)

    return in_position_hazards

    