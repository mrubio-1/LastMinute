# This file will contain the data for hazards in the LIFE project.
# It will include information about potential risks and safety concerns.

import app.models.hazard as hazard_models

hazards = [
    hazard_models.Hazard(id=1, name="Hazard 1", description="The start of a endless moon crater", x=10.0, y=20.0, radius=5.0, severity="medium"),
    hazard_models.Hazard(id=2, name="Hazard 2", description="Potential life forms", x=30.0, y=40.0, radius=7.0, severity="high"),
    hazard_models.Hazard(id=3, name="Hazard 3", description="Asteroid that crashed into the moon", x=50.0, y=60.0, radius=9.0, severity="low")
]