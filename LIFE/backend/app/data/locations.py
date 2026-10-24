# This file will contain the data for the locations the astronauts
# will be visiting in the LIFE project.
from app.models import location as location_models

locations = [
    location_models.Location(id=1, name="Lunar Base", description="Primary habitat for astronauts", x=0.0, y=0.0),
    location_models.Location(id=2, name="Crater Edge", description="Scenic overlook of the lunar crater", x=10.0, y=5.0),
    location_models.Location(id=3, name="Resource Depot", description="Storage facility for mining operations", x=-5.0, y=15.0),
]