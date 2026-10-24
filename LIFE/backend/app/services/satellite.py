
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
    d1 = distances["SAT-1"]
    d2 = distances["SAT-2"]
    d3 = distances["SAT-3"]

    # Satellite positions are (0,0), (1000,0), and (0, 1000).
    x = (d1**2 - d2**2 + 1000**2) / (2 * 1000)
    y = (d1**2 - d3**2 + 1000**2) / (2 * 1000)

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