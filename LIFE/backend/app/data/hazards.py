# This file will contain the data for hazards in the LIFE project.
# It will include information about potential risks and safety concerns.

import app.models.hazard as hazard_models

hazards = [
    hazard_models.Hazard(id=1, name="Hazard 1", description="The start of a endless moon crater", x=28.0, y=28.0, radius=28.0, severity="medium"),
    hazard_models.Hazard(id=2, name="Hazard 2", description="Potential life forms", x=100.0, y=500.0, radius=36.0, severity="high"),
    hazard_models.Hazard(id=3, name="Hazard 3", description="Asteroid that crashed into the moon", x=765.0, y=485.0, radius=45.0, severity="low")
]