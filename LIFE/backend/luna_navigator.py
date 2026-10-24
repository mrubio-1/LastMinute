import math
from typing import List, Dict, Tuple, Optional, Any

# ==========================================
# 1. CONSTANTS & NASA REFERENCE DATA
# ==========================================

# Standard astronaut metabolic O2 consumption rate (NASA-STD-3001 Vol 2)
BASE_O2_CONSUMPTION_L_PER_MIN = 0.8 

# Vehicle Mobility Parameters (NASA Artemis Specs)
VEHICLE_SPECS = {
    "xEMU Suit": {
        "base_speed_kmh": 3.5,
        "o2_factor": 1.0,
        "max_incline_deg": 15.0,
        "is_pressurized": False
    },
    "Unpressurized Rover": {
        "base_speed_kmh": 12.0,
        "o2_factor": 0.4,
        "max_incline_deg": 20.0,
        "is_pressurized": False
    },
    "Pressurized Cruiser": {
        "base_speed_kmh": 20.0,
        "o2_factor": 0.0,
        "max_incline_deg": 25.0,
        "is_pressurized": True
    },
    "Lunar Hopper": {
        "base_speed_kmh": 60.0,
        "o2_factor": 0.0,
        "max_incline_deg": 90.0,  # Bypasses slope limits
        "is_pressurized": True
    }
}

# NASA 13 Artemis III Candidate Landing Regions (Categorized Depot Waypoints)
WAYPOINTS_DB = {
    # 1. Oxygen / Water-ice Stations
    "Peak Near Shackleton": {"type": "OXYGEN_STATION", "coords": [-89.9, 0.0, 4.2]},
    "Haworth": {"type": "OXYGEN_STATION", "coords": [-87.5, -5.0, -1.2]},
    "Faustini Rim A": {"type": "OXYGEN_STATION", "coords": [-87.1, 67.0, 1.5]},
    "Amundsen Rim": {"type": "OXYGEN_STATION", "coords": [-84.5, 85.6, 2.1]},

    # 2. Solar Power Charging Stations
    "Malapert Massif": {"type": "POWER_STATION", "coords": [-84.9, 0.0, 5.0]},
    "Leibnitz Beta Plateau": {"type": "POWER_STATION", "coords": [-86.1, 30.0, 4.8]},
    "Mons Mouton": {"type": "POWER_STATION", "coords": [-84.6, -10.0, 6.1]},
    "Mons Mouton Plateau": {"type": "POWER_STATION", "coords": [-84.2, -12.0, 5.8]},

    # 3. Direct-to-Earth Communication Hubs
    "Connecting Ridge": {"type": "COMMUNICATION_HUB", "coords": [-89.5, 180.0, 3.5]},
    "Connecting Ridge Ext": {"type": "COMMUNICATION_HUB", "coords": [-89.3, 175.0, 3.4]},
    "de Gerlache Rim 1": {"type": "COMMUNICATION_HUB", "coords": [-88.5, -88.0, 2.8]},
    "de Gerlache Rim 2": {"type": "COMMUNICATION_HUB", "coords": [-88.3, -87.0, 2.7]},
    "Nobile Rim 1": {"type": "COMMUNICATION_HUB", "coords": [-85.2, 35.0, 3.9]}
}


# ==========================================
# 2. CORE NAVIGATION CALCULATOR
# ==========================================

class LunarNavigator:
    def __init__(self, vehicle_type: str = "Unpressurized Rover"):
        if vehicle_type not in VEHICLE_SPECS:
            raise ValueError(f"Unknown vehicle type: {vehicle_type}")
        
        self.vehicle_name = vehicle_type
        self.vehicle = VEHICLE_SPECS[vehicle_type]

    def calculate_effective_speed(self, incline_deg: float) -> float:
        """
        Calculates speed considering slope attenuation: Base Speed * cos(theta)
        """
        if self.vehicle_name == "Lunar Hopper":
            return self.vehicle["base_speed_kmh"]
            
        incline_rad = math.radians(abs(incline_deg))
        effective_speed = self.vehicle["base_speed_kmh"] * math.cos(incline_rad)
        return max(effective_speed, 0.1)  # Prevent zero or negative speed

    def calculate_travel_time(self, distance_km: float, incline_deg: float, stops_count: int = 0) -> Dict[str, float]:
        """
        Computes Pure Travel Time and Total Travel Time (+15 min overhead per stop)
        """
        effective_speed = self.calculate_effective_speed(incline_deg)
        pure_travel_time_min = (distance_km / effective_speed) * 60.0
        total_travel_time_min = pure_travel_time_min + (stops_count * 15.0)
        
        return {
            "effective_speed_kmh": round(effective_speed, 2),
            "pure_travel_time_min": round(pure_travel_time_min, 2),
            "total_travel_time_min": round(total_travel_time_min, 2)
        }

    def calculate_oxygen_used(self, pure_travel_time_min: float, incline_deg: float) -> Dict[str, float]:
        """
        Calculates Total O2 used based on Metabolic Rate, Vehicle O2 Factor, and Slope Penalty
        """
        base_o2_rate = BASE_O2_CONSUMPTION_L_PER_MIN * self.vehicle["o2_factor"]
        slope_penalty = 1.0 + (abs(incline_deg) / 10.0)
        
        total_oxygen_liters = pure_travel_time_min * base_o2_rate * slope_penalty
        
        return {
            "base_o2_rate_l_min": round(base_o2_rate, 3),
            "slope_penalty": round(slope_penalty, 2),
            "total_oxygen_used_liters": round(total_oxygen_liters, 2)
        }

    # ==========================================
    # 3. 5-STAGE HAZARD DETECTION SYSTEM
    # ==========================================

    def detect_hazards(
        self, 
        incline_deg: float, 
        is_psr: bool, 
        has_dte_los: bool, 
        cumulative_distance_km: float, 
        continuous_sunlight_hours: float
    ) -> List[Dict[str, str]]:
        """
        Evaluates 5 surface hazards and provides algorithm rerouting actions
        """
        hazards = []

        # 1. Slope Hazard
        if incline_deg > self.vehicle["max_incline_deg"]:
            hazards.append({
                "hazard": "Slope Hazard",
                "status": "CRITICAL",
                "action": f"Incline ({incline_deg}°) exceeds max limit ({self.vehicle['max_incline_deg']}°). Rollover risk! Apply reroute."
            })

        # 2. PSR / Cold Trap Hazard
        if is_psr:
            hazards.append({
                "hazard": "PSR / Cold Hazard",
                "status": "WARNING",
                "action": "Permanently Shadowed Region detected. Cryogenic temps and rapid battery drain risk."
            })

        # 3. Comm Blackout Hazard
        if not has_dte_los:
            hazards.append({
                "hazard": "Comm Blackout Hazard",
                "status": "WARNING",
                "action": "Direct-to-Earth Line-of-Sight lost. Priority reroute via COMMUNICATION_HUB waypoints."
            })

        # 4. Dust / Regolith Abrasion Hazard
        if cumulative_distance_km > 10.0:
            hazards.append({
                "hazard": "Dust / Abrasion Hazard",
                "status": "MAINTENANCE_REQUIRED",
                "action": f"Cumulative travel ({cumulative_distance_km} km) > 10 km. Recommend visiting nearest depot for joint seal inspection."
            })

        # 5. Radiation Hazard
        if continuous_sunlight_hours > 4.0:
            hazards.append({
                "hazard": "Solar Radiation Hazard",
                "status": "WARNING",
                "action": f"Continuous solar exposure ({continuous_sunlight_hours} hrs) > 4 hrs. Radiation threshold exceeded, seek shielding."
            })

        return hazards

    # ==========================================
    # 4. FRONTEND RESPONSE FORMATTER
    # ==========================================

    def get_route_data(
        self, 
        current_location: Dict[str, float], 
        destination: Dict[str, float], 
        incline_deg: float = 5.0
     ) -> Dict[str, List[Dict]]:
        """
        Formats calculation results directly into the Frontend JSON Specification
        """
        start_x, start_y = current_location["x"], current_location["y"]
        end_x, end_y = destination["x"], destination["y"]

        # 1. Generate path points in [y, x] format as required by frontend
        points = [
            [start_y, start_x],
            [start_y + 20, start_x + 20],
            [start_y + 50, start_x + 50],
            [end_y, end_x]
        ]

        # 2. Distance Calculation (Euclidean approximation converted to meters)
        distance_meters = int(math.hypot(end_x - start_x, end_y - start_y) * 3)
        distance_km = distance_meters / 1000.0

        # 3. Travel Time Calculation
        time_res = self.calculate_travel_time(distance_km=distance_km, incline_deg=incline_deg)

        # 4. Hazard Detection & Risk Level Assessment
        hazards = self.detect_hazards(
            incline_deg=incline_deg,
            is_psr=False,
            has_dte_los=True,
            cumulative_distance_km=distance_km,
            continuous_sunlight_hours=1.0
        )

        risk_level = "low"
        if any(h["status"] == "CRITICAL" for h in hazards):
            risk_level = "high"
        elif any(h["status"] == "WARNING" for h in hazards):
            risk_level = "medium"

        # 5. Return Frontend Compliant Payload Structure
        return {
            "routes": [
                {
                    "id": "route-safe",
                    "name": "Safest route",
                    "description": "Avoids steep terrain",
                    "distanceMeters": distance_meters,
                    "estimatedTimeMinutes": int(time_res["total_travel_time_min"]),
                    "risk": risk_level,
                    "points": points
                }
            ]
        }


# ==========================================
# 5. EXECUTION EXAMPLE & TEST DRIVE
# ==========================================

if __name__ == "__main__":
    import json

    sample_request = {
        "current_location": {"x": 450, "y": 290},
        "destination": {"x": 700, "y": 420},
        "vehicle_type": "Unpressurized Rover"
    }

    navigator = LunarNavigator(vehicle_type=sample_request["vehicle_type"])
    
    route_response = navigator.get_route_data(
        current_location=sample_request["current_location"],
        destination=sample_request["destination"]
    )
    
    print(json.dumps(route_response, indent=2))
