
import math
from app.services import astronaut_service


# Simulated satellite positions on the lunar map.
SATELLITES = {
    "SAT-1": (0.0, 0.0),
    "SAT-2": (1000.0, 0.0),
    "SAT-3": (0.0, 1000.0),
}


# Calculate the distance between a satellite and an astronaut.
def calculate_distance(satellite_position, astronaut_position):
    return math.dist(satellite_position, astronaut_position)


#Simulate distance measurments from three satellites.
def get_satellite_distances(astronaut_x, astronaut_y):
    astronaut_position = (astronaut_x, astronaut_y)

    distances = {}

    for satellite_name, satellite_position in SATELLITES.items():
        distances[satellite_name] = calculate_distance(
            satellite_position,
            astronaut_position
        )

    return distances


# Estimate astronaut coordinates using trilateration.
def estimate_position(distances):
    if len(SATELLITES) != 3:
        raise ValueError("Exactly three configured satellites are required for trilateration.")

    for satellite_name in SATELLITES.keys():
        if satellite_name not in distances:
            raise ValueError(f"Distance for {satellite_name} is missing.")

        distance = distances[satellite_name]

        if not math.isfinite(distance) or distance < 0:
            raise ValueError("Distances must be finite and non-negative.")

    satellite_ids = list(SATELLITES)

    x1,y1 = SATELLITES[satellite_ids[0]]
    x2,y2 = SATELLITES[satellite_ids[1]]
    x3,y3 = SATELLITES[satellite_ids[2]]

    d1 = distances[satellite_ids[0]]
    d2 = distances[satellite_ids[1]]
    d3 = distances[satellite_ids[2]]

    # Use trilateration formulas to calculate the estimated position of the astronaut.
    A = 2*(x2 - x1)
    B = 2*(y2 - y1)
    C = d1**2 - d2**2 + x2**2 - x1**2 + y2**2 - y1**2

    D = 2*(x3 - x1)
    E = 2*(y3 - y1)
    F = d1**2 - d3**2 + x3**2 - x1**2 + y3**2 - y1**2

    determinant = A*E - B*D # Calculate the determinant to check for collinearity of the satellite positions.

    if math.isclose(determinant, 0.0, abs_tol=1e-9):
        raise ValueError("The satellite positions are collinear; cannot determine a unique position.")

    x = (C*E - F*B) / determinant # Calculate the estimated X-coordinate of the astronaut's position.
    y = (A*F - C*D) / determinant # Calculate the estimated Y-coordinate of the astronaut's position.

    if not (math.isfinite(x) and math.isfinite(y)):
        raise ValueError("Calculated position is not finite.")

    for satellite_name, satellite_position in SATELLITES.items():
        distance = math.dist(satellite_position, (x, y))

        if not math.isclose(distance, distances[satellite_name], rel_tol=1e-9, abs_tol=1e-6):
            raise ValueError(f"Calculated position does not match the distance from {satellite_name}.")

    return {
        "x": round(x, 2),
        "y": round(y, 2)
    }


# Run a satellite positioning simulation.
def simulate_satellite_position(astronaut_x, astronaut_y):
    distances = get_satellite_distances(astronaut_x, astronaut_y)
    estimated_position = estimate_position(distances)

    return {
        "satellites_used": len(SATELLITES),
        "satellite_distances": distances,
        "estimated_position": estimated_position,
        "positioning_status": "SUCCESS"
    }


# Simulate satellite positioning using the active astronaut's location.
def track_astronaut_with_satellites():
    astronaut_location = astronaut_service.get_astronaut_location()

    return simulate_satellite_position(
        astronaut_location["x"],
        astronaut_location["y"]
    )


# Test the simulation.
if __name__ =="__main__":
    result = simulate_satellite_position(450, 290)
    print(result)