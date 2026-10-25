# 🌕 L.I.F.E.

### Lunar Integrated Framework for Exploration

**Navigate the Moon. Protect Every Life.**

## 🚀 Overview

**L.I.F.E. (Lunar Integrated Framework for Exploration)** is a lunar navigation and safety simulation system designed to assist astronauts exploring the Moon.

Unlike Earth, the Moon does not currently have a fully operational GPS system comparable to the one used on Earth. Astronauts navigating the lunar surface face challenges such as hazardous terrain, limited resources, and the risk of becoming disoriented.

L.I.F.E. aims to address these challenges by providing a simulated lunar navigation system that helps astronauts plan routes, monitor their positions, identify potential hazards, and safely return to their habitats.

This project was developed as part of a hackathon focused on the challenge:

> "Create a system that helps humans sustain life in extreme off-Earth environments."

## 🎯 Project Objectives

Our primary objectives are to:

* Simulate astronaut positioning and movement on the lunar surface.
* Provide navigation between lunar locations.
* Calculate efficient routes while considering hazardous terrain.
* Identify potential environmental hazards.
* Assist astronauts with safely returning to their lunar habitats.
* Demonstrate how navigation technology can contribute to human survival beyond Earth.

## ✨ Features

### MVP Features

The initial prototype aims to include:

**📍 Astronaut Position Tracking**

* Display an astronaut's simulated position.
* Update coordinates as the astronaut moves.
* Retrieve positioning information through the backend API.

**🗺️ Lunar Navigation**

* Select destinations on a simulated lunar map.
* Calculate routes between locations.
* Display recommended routes.

**⚠️ Hazard Detection**

* Identify dangerous areas on the lunar surface.
* Account for hazardous terrain during route calculations.
* Provide warnings when approaching dangerous locations.

**🏠 Return-to-Base Navigation**

* Identify the astronaut's home habitat.
* Calculate a route back to the habitat.
* Assist with emergency navigation.

### Potential Future Features

* Oxygen-aware navigation and resource monitoring.
* Simulated lunar satellite positioning.
* Real-time astronaut tracking.
* Emergency alerts and mission control notifications.
* Advanced terrain analysis.
* Multiple astronaut support.

## 🛠️ Technology Stack

| Component                 | Technology              |
| ------------------------- | ----------------------- |
| Backend                   | Python, FastAPI         |
| Frontend                  | React, Vite, Leaflit    |
| Navigation Algorithms     | TBD                     |
| Mathematical Calculations | NumPy                   |
| API Documentation         | Swagger UI              |
| Database                  | In-memory storage (MVP) |
| Development Environment   | Visual Studio Code      |
| Version Control           | Git & GitHub            |

## 📁 Project Structure

```text
LIFE/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   │
│   │   ├── routers/
│   │   │
│   │   ├── services/
│   │   │
│   │   └── models/
│   │
│   └── requirements.txt
│
├── frontend/
│
├── .gitignore
└── README.md
```

*Note: The project structure represents the planned organization and may change during development.*

## ⚙️ Getting Started

### Prerequisites

Before running the project, ensure you have:

* Python 3.11 or newer
* Git
* Visual Studio Code (recommended)
* Node.js (if required by the frontend)

### 1. Clone the Repository

```bash
git clone "https://github.com/mrubio-1/LastMinute.git"
cd LIFE
```

### 2. Navigate to the Backend

```bash
cd backend
```

### 3. Create a Virtual Environment

```bash
python -m venv .venv
```

### 4. Activate the Virtual Environment

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
```

**Windows Git Bash:**

```bash
source .venv/Scripts/activate
```

**macOS / Linux:**

```bash
source .venv/bin/activate
```

### 5. Install Dependencies

```bash
python -m pip install -r requirements.txt
```

### 6. Start the Backend Server

```bash
python -m uvicorn app.main:app --reload
```
The backend should be available at:

http://127.0.0.1:8000

### 7. Access API Documentation

FastAPI automatically generates interactive API documentation.

Open:

http://127.0.0.1:8000/docs

This interface allows developers to explore and test available endpoints.

### 🔌 API Endpoints

|   Method	    |   Endpoint            |	Description                         |
|---------------|-----------------------|---------------------------------------|
|   GET	        |   /	                |   API welcome message                 |
|   GET	        |   /health	            |   Check backend status                |
|   GET	        |   /astronaut	        |   List available astronauts            |
|   GET	        |   /astronaut/location	|   Retrieve astronaut position         |
|   POST	    |   /astronaut/select/{id} | Select the active astronaut         |
|   POST	    |   /astronaut/move	    |   Update astronaut position           |
|   GET	        |   /astronaut/hazards	|   Hazards near the active astronaut   |
|   GET	        |   /astronaut/positioning | Satellite position estimate         |
|   POST	    |   /navigation/route	|   Calculate navigation route          |
|   GET	        |   /locations	        |   Retrieve map locations               |
|   GET	        |   /hazards	        |   Retrieve map hazards                 |


Navigation accepts a `destination_id` for a backend location. It also accepts
`current_location` and `destination` coordinate objects, which the frontend
uses for arbitrary points selected directly on the map.

### 👥 Team

L.I.F.E. is being developed by a four-person team.

|      Role              |	                   Responsibilities                              |
|------------------------|-------------------------------------------------------------------|
|  Backend Developer	 |    FastAPI development, API endpoints, backend integration        |
|  Frontend Developer	 |    User interface, map visualization, API integration             |
|  Navigation Developer	 |    Route calculations, coordinate systems, pathfinding            |  
|  Simulation Developer	 |    Astronaut movement, environmental simulation, safety features  |

*Team responsibilities may be adjusted throughout development.*

### 📌 Project Status

## 🚧 In Development — Hackathon Prototype

Development Period: October 23–25, 2026
Submission Deadline: October 25, 2026, at 12:00 PM

The current focus is developing a functional local prototype that demonstrates lunar navigation and astronaut safety capabilities.

## 🌕 L.I.F.E.

Navigate the Moon. Protect Every Life.

## ▶️ Run the local prototype

### Backend

From the repository root:

```bash
python -m venv LIFE/backend/venv
source LIFE/backend/venv/bin/activate
python -m pip install -r requirements.txt
cd LIFE/backend
python -m uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000`. On Windows PowerShell, activate the
environment with `.\LIFE\backend\venv\Scripts\Activate.ps1` instead, then run
`cd LIFE\backend` before starting Uvicorn.

### Frontend

In a second terminal:

```bash
cd lunar-map-frontend
npm install
cp .env.example .env
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.
`VITE_API_URL` controls which backend URL the frontend uses. Update `.env` when
the backend is hosted somewhere other than the local default.

### Smoke checks

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/astronaut/location
curl -X POST http://127.0.0.1:8000/navigation/route \
  -H "Content-Type: application/json" \
  -d '{"current_location":{"x":450,"y":290},"destination":{"x":700,"y":420},"vehicle_type":"Unpressurized Rover"}'
```

Build the frontend before pushing:

```bash
cd lunar-map-frontend
npm run build
```
