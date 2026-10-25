import math
import unittest
from types import SimpleNamespace

from app.services.pathfinding import find_routes, path_distance, segment_clearance, RouteNotFound
from app.services import astronaut_service, navigation_service
from app.models.navigation import NavigationRequest, NavigationResponse


class PathfindingTests(unittest.TestCase):
    def test_clear_path_preserves_exact_endpoints_and_deduplicates(self):
        routes = find_routes((450.3, 290.1), (700.2, 420.4), [])
        self.assertEqual(len(routes), 1)
        self.assertEqual(routes[0]["points"], [(450.3, 290.1), (700.2, 420.4)])

    def test_obstacle_detours_and_reports_actual_length(self):
        hazards = [SimpleNamespace(x=100, y=100, radius=25)]
        routes = find_routes((30, 100), (170, 100), hazards)
        self.assertGreaterEqual(len(routes), 2)
        for route in routes:
            self.assertGreater(route["distance"], 140)
            self.assertAlmostEqual(route["distance"], path_distance(route["points"]))
            for a, b in zip(route["points"], route["points"][1:]):
                self.assertGreater(segment_clearance(a, b, hazards), 2)

    def test_invalid_endpoints_and_unreachable_destination(self):
        with self.assertRaises(ValueError):
            find_routes((-1, 10), (100, 10), [])
        with self.assertRaises(ValueError):
            find_routes((10, 10), (100, 100), [SimpleNamespace(x=100, y=100, radius=5)])
        wall = [SimpleNamespace(x=500, y=y, radius=40) for y in range(0, 601, 50)]
        with self.assertRaises(RouteNotFound):
            find_routes((400, 100), (600, 100), wall)

    def test_stationary_route(self):
        route = find_routes((450, 290), (450, 290), [])[0]
        self.assertEqual(route["distance"], 0)

    def test_api_response_and_oxygen_do_not_mutate_astronaut(self):
        astronaut_service.select_astronaut_by_id(1)
        astronaut = astronaut_service.get_astronaut_info()
        before = astronaut.model_dump()
        request = NavigationRequest(current_location={"x": 450, "y": 290},
                                    destination={"x": 700, "y": 420}, vehicle_type="xEMU Suit")
        response = NavigationResponse.model_validate(navigation_service.calculate_route(request))
        self.assertEqual(astronaut.model_dump(), before)
        for route in response.routes:
            self.assertEqual(route.points[0], (290, 450))
            self.assertEqual(route.points[-1], (420, 700))
            self.assertGreater(route.oxygen_estimate.oxygen_used_liters, 0)
            self.assertEqual(route.oxygen_sufficient,
                             route.oxygen_estimate.oxygen_used_liters <= astronaut.current_oxygen_liters)
            self.assertTrue(math.isfinite(route.distanceMeters))


if __name__ == "__main__":
    unittest.main()
