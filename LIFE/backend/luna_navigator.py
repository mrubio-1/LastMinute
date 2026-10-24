import math
from typing import List, Dict, Tuple, Optional

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
# 4. EXECUTION EXAMPLE & TEST DRIVE
# ==========================================

if __name__ == "__main__":
    print("=== LUNAR NAVIGATION ALGORITHM DEMO ===")
    
    navigator = LunarNavigator(vehicle_type="Unpressurized Rover")
    
    distance_km = 8.5
    incline_angle = 12.0
    stops_visited = 1
    
    time_results = navigator.calculate_travel_time(
        distance_km=distance_km, 
        incline_deg=incline_angle, 
        stops_count=stops_visited
    )
    
    o2_results = navigator.calculate_oxygen_used(
        pure_travel_time_min=time_results["pure_travel_time_min"], 
        incline_deg=incline_angle
    )
    
    print(f"\n[ Vehicle ]: {navigator.vehicle_name}")
    print(f"[ Route Specs ]: Distance = {distance_km} km | Slope = {incline_angle} deg | Stops = {stops_visited}")
    print(f" - Effective Speed : {time_results['effective_speed_kmh']} km/h")
    print(f" - Pure Travel Time : {time_results['pure_travel_time_min']} mins")
    print(f" - Total Travel Time: {time_results['total_travel_time_min']} mins (including overhead)")
    print(f" - Total O2 Consumed: {o2_results['total_oxygen_used_liters']} Liters")
    
    print("\n[ Hazard Detection System Output ]")
    detected_hazards = navigator.detect_hazards(
        incline_deg=12.0,
        is_psr=True,
        has_dte_los=False,
        cumulative_distance_km=14.5,
        continuous_sunlight_hours=4.5
    )
    
    for h in detected_hazards:
        print(f"  [HAZARD] [{h['status']}] {h['hazard']}: {h['action']}")