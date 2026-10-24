# This file will contain the data for astronauts in the LIFE project. 
# It will include their names, locations, and other relevant information.

from app.models import astronauts

astronauts_info = astronauts.Astronaut(
    id=1,
    name="John Doe",
    x=0.0,
    y=0.0
)
