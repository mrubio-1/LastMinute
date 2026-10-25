# L.I.F.E. — Lunar Integrated Framework for Exploration

L.I.F.E. is a local lunar navigation and safety prototype. Its React map
provides a simulated lunar surface for exploring destinations, planning routes,
and viewing astronaut status. A FastAPI backend supplies the map data,
navigation, and mission status.

## Project status

The project is an in-development hackathon prototype. It runs locally and uses
in-memory backend state; it is not a production navigation system. Map
coordinates and elevation readouts are for demonstration and should not be used
for real mission planning.

## Features

- Explore and Directions workflows on a lunar surface map, with selectable
  points for route start and destination.
- Backend-provided locations and hazards, plus typed markers for map points
  and hazards.
- Route planning for an xEMU Suit, Unpressurized Rover, Pressurized Cruiser,
  or Lunar Hopper. Route options include distance, estimated time, risk,
  hazard clearance, and oxygen estimates.
- Astronaut selection and simulated location, with oxygen, satellite
  positioning, nearby-hazard, and emergency status panels.
- Pointer and marker elevation readouts using a local Apollo 11-area crop of
  the [SLDEM2015 LOLA/Kaguya terrain model](https://imbrium.mit.edu/DATA/SLDEM2015/TILES/JP2/SLDEM2015_256_0N_60N_000_120.JP2).
- Responsive interface, light and dark themes, route loading/error states, and
  route selection highlighting.

The elevation crop has 256 pixels per degree (about 118 m per pixel at the
equator); it is suitable for a prototype readout, not precise site navigation.
The current route planner uses hazard data and does not calculate route slope
from the elevation model.

## Technology

| Area | Technology |
| --- | --- |
| Frontend | React, Vite, Leaflet, React-Leaflet |
| Backend | Python, FastAPI, Pydantic, Uvicorn |
| State | In-memory backend data |

## Repository layout

```text
LastMinute/
├── LIFE/
│   └── backend/
│       ├── app/
│       │   ├── data/          # In-memory astronauts, locations, and hazards
│       │   ├── models/        # API request and response models
│       │   ├── routers/       # FastAPI endpoints
│       │   ├── services/      # Navigation and mission logic
│       │   └── main.py        # FastAPI application
│       ├── tests/
│       └── requirements.txt
├── lunar-map-frontend/
│   ├── public/                # Map image, logo, and elevation data
│   └── src/                   # React application and map components
├── README.md
└── requirements.txt
```

## Run locally

### Prerequisites

- Python 3.11 or newer
- Node.js and npm

### 1. Start the backend

From the repository root, in PowerShell:

```powershell
cd .\LIFE\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

The API is available at <http://127.0.0.1:8000>; interactive API
documentation is at <http://127.0.0.1:8000/docs>.

If PowerShell blocks virtual-environment activation, either allow activation
for the current user or run the Python commands using
`.\.venv\Scripts\python.exe -m pip ...` and
`.\.venv\Scripts\python.exe -m uvicorn ...` without activating it.

### 2. Start the frontend

Open a second terminal at the repository root:

```powershell
cd .\lunar-map-frontend
npm install
npm run dev
```

Open the local URL printed by Vite, normally
<http://localhost:5173>. In development, Vite proxies the API requests to
`http://127.0.0.1:8000` by default. If the backend uses another address, set
`VITE_API_URL` in `lunar-map-frontend/.env` to that API base URL.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Backend health check |
| `GET` | `/astronaut` | List astronauts |
| `GET` | `/astronaut/info` | Get the selected astronaut |
| `GET` | `/astronaut/location` | Get the selected astronaut’s location |
| `POST` | `/astronaut/select/{astronaut_id}` | Select an astronaut |
| `POST` | `/astronaut/move` | Update astronaut location |
| `GET` | `/astronaut/hazards` | Get nearby hazards |
| `GET` | `/astronaut/positioning` | Get satellite-based position estimate |
| `GET` | `/astronaut/oxygen` | Get oxygen status |
| `GET` | `/astronaut/emergency` | Get emergency status and alerts |
| `POST` | `/navigation/route` | Calculate route options |
| `GET` | `/locations` | List map locations |
| `GET` | `/hazards` | List map hazards |

The route endpoint accepts `current_location` and `destination` points, each
with numeric `x` and `y` coordinates, and an optional `vehicle_type`:

```json
{
  "current_location": { "x": 450, "y": 290 },
  "destination": { "x": 700, "y": 420 },
  "vehicle_type": "Unpressurized Rover"
}
```

Supported vehicle types are `xEMU Suit`, `Unpressurized Rover`,
`Pressurized Cruiser`, and `Lunar Hopper`.

## Development checks

Build the frontend:

```powershell
cd .\lunar-map-frontend
npm run build
```

Run the frontend linter:

```powershell
npm run lint
```

Run the backend tests from `LIFE\backend`:

```powershell
python -m pytest
```

Restarting the backend resets astronaut selection, position, and oxygen to
their in-memory defaults.
