# This file will contain the data for astronauts in the LIFE project. 
# It will include their names, locations, and other relevant information.

from app.models import astronauts

roster = [
    astronauts.Astronaut(id=1, name="Buzz Lightyear", x=390.0, y=270.0, active=False, current_oxygen_liters=50.0, max_oxygen_liters=150.0),
    astronauts.Astronaut(id=2, name="Neil Armstrong", x=405.0, y=280.0, active=False, current_oxygen_liters=100.0, max_oxygen_liters=150.0),
    astronauts.Astronaut(id=3, name="Michael Collins", x=680.0, y=150.0, active=False, current_oxygen_liters=120.0, max_oxygen_liters=150.0)
]
