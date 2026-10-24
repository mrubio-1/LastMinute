export function createMockRoutes(start, destination) {
    const [startY, startX] = start;
    const [destinationY, destinationX] = destination;

    const midpointY = (startY + destinationY) / 2;
    const midpointX = (startX + destinationX) / 2;

    return [
        {
            id: 'route-safe',
            name: 'Safest route',
            description: 'Follows gentler terrain',
            distanceMeters: 840,
            estimatedTimeMinutes: 28,
            risk: 'low',
            points: [
                [startY, startX],
                [midpointY - 40, midpointX - 20],
                [destinationY, destinationX],
            ],
        },
        {
            id: 'route-direct',
            name: 'Direct route',
            description: 'Shortest path to destination',
            distanceMeters: 650,
            estimatedTimeMinutes: 20,
            risk: 'medium',
            points: [
                [startY, startX],
                [midpointY, midpointX],
                [destinationY, destinationX],
            ],
        },
        {
            id: 'route-wide',
            name: 'Wide detour',
            description: 'Avoids the central hazard area',
            distanceMeters: 1100,
            estimatedTimeMinutes: 35,
            risk: 'low',
            points: [
                [startY, startX],
                [midpointY + 50, midpointX + 30],
                [destinationY, destinationX],
            ],
        },
    ];
}