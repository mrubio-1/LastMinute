# This file will contain the data for the locations the astronauts
# will be visiting in the LIFE project.
from app.models import location as location_models

locations = [
    location_models.Location(id=1, name="Lunar Base", description="Primary habitat for astronauts", x=220.0, y=160.0),
    location_models.Location(id=2, name="Crater Edge", description="Scenic overlook of the lunar crater", x=740.0, y=390.0),
    location_models.Location(id=3, name="Resource Depot", description="Storage facility for mining operations", x=820.0, y=145.0),
]