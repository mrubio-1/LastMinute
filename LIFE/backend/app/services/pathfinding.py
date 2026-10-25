"""A* over a five-meter grid in the frontend's local meter coordinates.

Hazard circles are obstacles for every vehicle. This models surface travel,
not flight or real terrain elevation. Exact endpoint connectors are checked
against the same circles as every grid edge.
"""

import heapq
import math
from functools import lru_cache

MAP_WIDTH = 979.0
MAP_HEIGHT = 550.0
GRID_SIZE = 5.0
SAFETY_MARGIN = 2.0
PROFILES = (
    ("shortest", "Shortest route", 0.0),
    ("balanced", "Balanced route", 2.0),
    ("clearance", "More clearance", 8.0),
)


class RouteNotFound(ValueError):
    pass


def segment_clearance(a, b, hazards):
    """Minimum distance from a segment to a hazard's actual boundary."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    length_squared = dx * dx + dy * dy
    clearance = math.inf
    for hazard in hazards:
        t = 0.0 if length_squared == 0 else max(0.0, min(1.0,
            ((hazard.x - a[0]) * dx + (hazard.y - a[1]) * dy) / length_squared))
        clearance = min(clearance, math.hypot(
            hazard.x - a[0] - t * dx, hazard.y - a[1] - t * dy
        ) - hazard.radius)
    return clearance


def path_distance(points):
    return sum(math.dist(a, b) for a, b in zip(points, points[1:]))


def find_routes(start, goal, hazards):
    start, goal = tuple(start), tuple(goal)
    for label, point in (("Start", start), ("Destination", goal)):
        if not all(math.isfinite(v) for v in point) or not (
            0 <= point[0] <= MAP_WIDTH and 0 <= point[1] <= MAP_HEIGHT
        ):
            raise ValueError(f"{label} must be inside the 979 by 550 meter map.")
        if segment_clearance(point, point, hazards) <= SAFETY_MARGIN:
            raise ValueError(f"{label} is inside a hazard or its two-meter safety margin.")

    @lru_cache(maxsize=None)
    def clearance(a, b):
        return segment_clearance(a, b, hazards)

    def local_nodes(point):
        ix, iy = round(point[0] / GRID_SIZE), round(point[1] / GRID_SIZE)
        for x in range(ix - 1, ix + 2):
            for y in range(iy - 1, iy + 2):
                node = (x * GRID_SIZE, y * GRID_SIZE)
                if 0 <= node[0] <= MAP_WIDTH and 0 <= node[1] <= MAP_HEIGHT:
                    if node != point and clearance(point, node) > SAFETY_MARGIN:
                        yield node

    goal_neighbors = set(local_nodes(goal))

    def neighbors(node):
        if node == start:
            yield from local_nodes(start)
            if clearance(start, goal) > SAFETY_MARGIN:
                yield goal
        else:
            for dx in (-GRID_SIZE, 0, GRID_SIZE):
                for dy in (-GRID_SIZE, 0, GRID_SIZE):
                    if dx == dy == 0:
                        continue
                    other = (node[0] + dx, node[1] + dy)
                    if 0 <= other[0] <= MAP_WIDTH and 0 <= other[1] <= MAP_HEIGHT:
                        if clearance(node, other) > SAFETY_MARGIN:
                            yield other
            if node in goal_neighbors:
                yield goal

    def edge_cost(a, b, weight):
        gap = clearance(a, b) - SAFETY_MARGIN
        return math.dist(a, b) * (1 + weight * max(0.0, 1 - gap / 30.0))

    def search(weight):
        queue = [(math.dist(start, goal), 0.0, start)]
        costs, parents = {start: 0.0}, {}
        while queue:
            _, cost, node = heapq.heappop(queue)
            if cost > costs[node]:
                continue
            if node == goal:
                path = [goal]
                while path[-1] != start:
                    path.append(parents[path[-1]])
                path.reverse()
                return path
            for other in neighbors(node):
                candidate = cost + edge_cost(node, other, weight)
                if candidate < costs.get(other, math.inf):
                    costs[other], parents[other] = candidate, node
                    heapq.heappush(queue, (candidate + math.dist(other, goal), candidate, other))
        raise RouteNotFound("No traversable route connects these points.")

    results = []
    for identifier, name, weight in PROFILES:
        path = search(weight)
        # Remove only collinear intermediate points; preserve searched geometry.
        simplified = []
        for point in path:
            while len(simplified) >= 2:
                a, b = simplified[-2:]
                cross = (b[0] - a[0]) * (point[1] - b[1]) - (b[1] - a[1]) * (point[0] - b[0])
                dot = (b[0] - a[0]) * (point[0] - b[0]) + (b[1] - a[1]) * (point[1] - b[1])
                if abs(cross) > 1e-8 or dot < 0:
                    break
                simplified.pop()
            simplified.append(point)
        # Suppress paths whose geometry stays within one grid cell of an option.
        def near(first, second):
            return all(min(math.dist(p, q) for q in second) <= GRID_SIZE for p in first)
        if any(near(path, old["raw"]) and near(old["raw"], path) for old in results):
            continue
        gap = min((clearance(a, b) for a, b in zip(path, path[1:])), default=clearance(start, start))
        results.append({"id": identifier, "name": name, "points": simplified,
                        "distance": path_distance(path), "clearance": gap, "raw": path})
    return results
