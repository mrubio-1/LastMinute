# This file will contain the data for astronauts in the LIFE project. 
# It will include their names, locations, and other relevant information.

from app.models import astronauts

roster = [
    astronauts.Astronaut(id=1, name="Buzz Lightyear", x=0.0, y=0.0, active=False),
    astronauts.Astronaut(id=2, name="Neil Armstrong", x=5.0, y=5.0, active=False),
    astronauts.Astronaut(id=3, name="Michael Collins", x=10.0, y=10.0, active=False)
]
