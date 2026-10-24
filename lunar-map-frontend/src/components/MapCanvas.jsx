import { useEffect, useRef, useState, } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { APOLLO_11_MAP } from '../config/apollo11Map.js';
import { createMockRoutes } from '../data/mockroutes.js';

const IMAGE_URL =
    '/testImage.webp';

function MapCanvas() {
    const mapElementRef = useRef(null);
    const [mousePosition, setMousePosition] = useState(null);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [destination, setDestination] = useState(null);
    const [isSelectingDestination, setIsSelectingDestination] = useState(false);
    const [userMarkers, setUserMarkers] = useState([]);
    const [interactionMode, setInteractionMode] = useState('inspect');
    const [selectedRouteId, setSelectedRouteId] = useState(null);
    const [routeStatus, setRouteStatus] = useState('idle');
    const [routes, setRoutes] = useState([]);

    useEffect(() => {
        const { widthPixels, heightPixels } = APOLLO_11_MAP.image;
        const bounds = [
            [0, 0],
            [heightPixels, widthPixels],
        ];

        const map = L.map(mapElementRef.current, {
            crs: L.CRS.Simple,
            minZoom: -3,
            maxZoom: 1,
            maxBounds: bounds,
            maxBoundsViscosity: 1,
        });

        L.imageOverlay(IMAGE_URL, bounds, { crossOrigin: true }).addTo(map);
        map.fitBounds(bounds);

        const { xMeters, yMeters } = APOLLO_11_MAP.landingSite;
        L.circleMarker([yMeters, xMeters], {
            radius: 10,
            color: '#f4c95d',
            fillColor: '#f4c95d',
            fillOpacity: 1,
        })
            .bindPopup(`
                <strong>Eagle Lunar Module</strong><br>
                Apollo 11 landing site<br>
                Coordinates: 0.67408° N, 23.47297° E
            `)
            .addTo(map);

        L.circleMarker([yMeters, xMeters], {
            radius: 5,
            color: '#55aaff',
            fillColor: '#55aaff',
            fillOpacity: 1,
        })
            .bindPopup('<strong>Current location</strong><br>Simulated position')
            .addTo(map);

        if (destination && routes.length > 0) {
            routes.forEach((route) => {
                L.polyline(route.points, {
                    color: selectedRouteId === route.id
                        ? '#ffffff'
                        : route.risk === 'low'
                            ? '#63a163'
                            : route.risk === 'medium'
                                ? '#f1c40f'
                                : route.risk === 'high'
                                    ? '#e74c3c'
                                    : '#95a5a6',
                    weight: selectedRouteId === route.id ? 7 : 4,
                    opacity: selectedRouteId === route.id ? 1 : 0.55,
                })
                    .bindPopup(`
            <strong>${route.name}</strong><br>
            ${route.description}<br>
            Distance: ${route.distanceMeters} m<br>
            Estimated time: ${route.estimatedTimeMinutes} minutes<br>
            Risk: ${route.risk}
        `)
                    .addTo(map);
            });

            L.circleMarker([destination.lat, destination.lng], {
                radius: 5,
                color: '#ff6b6b',
                fillColor: '#ff6b6b',
                fillOpacity: 1,
            })
                .bindPopup(`
                    <strong>Selected destination</strong><br>
                    X: ${destination.lng.toFixed(2)}<br>
                    Y: ${destination.lat.toFixed(2)}
                `)
                .addTo(map);
        }

        userMarkers.forEach((marker) => {
            const mapMarker = L.circleMarker(
                [marker.position.lat, marker.position.lng],
                {
                    radius: 5,
                    color: '#b084cc',
                    fillColor: '#b084cc',
                    fillOpacity: 1,
                },
            )
                .bindPopup(`
            <strong>${marker.title}</strong><br>
            ${marker.description}<br>
            X: ${marker.position.lng.toFixed(2)}<br>
            Y: ${marker.position.lat.toFixed(2)}
        `);
            mapMarker.on('click', () => {
                setDestination(marker.position);
                setSlectedRouteId(null);
                setRoutes([]);
                setRouteStatus('idle');
            });

            mapMarker.addTo(map);
        });


        map.on('mousemove', handleMouseMove);
        function handleMouseMove(e) {
            const { lat, lng } = e.latlng;
            const metersPerPixel = APOLLO_11_MAP.image.metersPerPixel;
            const xMeters = lng * metersPerPixel;
            const yMeters = lat * metersPerPixel;
            setMousePosition({ lng, lat, xMeters, yMeters });
        }

        map.on('click', handleMapClick);

        function handleMapClick(e) {
            if (isSelectingDestination) {
                setDestination(e.latlng);
                setIsSelectingDestination(false);
                setSelectedRouteId(null);
                setRoutes([]);
                setRouteStatus('idle');
                return;
            }

            if (interactionMode === 'place-marker') {
                const newMarker = {
                    id: Date.now(),
                    position: e.latlng,
                    title: `Marker ${userMarkers.length + 1}`,
                    description: 'User-defined marker',
                };

                setUserMarkers((previousMarkers) => [
                    ...previousMarkers,
                    newMarker,
                ]);

                setInteractionMode('inspect');
            }
        }

        return () => {
            map.off('mousemove', handleMouseMove);
            map.remove();
        };
    }, [isSelectingDestination, destination, interactionMode, userMarkers, selectedRouteId, routes,]);

    return (
        <div className="map-shell">
            <button
                className="destination-button"
                onClick={() => setIsSelectingDestination(true)}
            >
                Set Destination
            </button>

            <button
                className="marker-button"
                onClick={() => {
                    setInteractionMode('place-marker');
                    setRouteStatus('idle');
                }}
            >
                Place Marker
            </button>

            <div ref={mapElementRef} className="map-canvas" />
            <div className="coordinate-tracker">
                {mousePosition ? (
                    <>
                        <div> X (Meters): {mousePosition.xMeters.toFixed(2)}</div>
                        <div> Y (Meters): {mousePosition.yMeters.toFixed(2)}</div>
                    </>
                ) : (
                    <div> Move your pointer over the map</div>
                )}
            </div>
            {destination && (
                <div className="destination-status">
                    Destination selected:
                    <br />
                    X: {destination.lng.toFixed(2)}, Y: {destination.lat.toFixed(2)}
                </div>
            )}
            {destination && routeStatus === 'idle' && (
                <button
                    className="plan-route-button"
                    onClick={() => {
                        setRouteStatus('loading');

                        window.setTimeout(() => {
                            const { xMeters, yMeters } = APOLLO_11_MAP.landingSite;

                            const nextRoutes = createMockRoutes(
                                [yMeters, xMeters],
                                [destination.lat, destination.lng],
                            );

                            setRoutes(nextRoutes);
                            setRouteStatus('success');
                        }, 500);
                    }}
                >
                    Plan Route
                </button>
            )}
            {routeStatus === 'loading' && (
                <div className="route-status">
                    Calculating possible route...
                </div>
            )}

            {destination && routeStatus === 'success' && (
                <div className="route-panel">
                    <h2>Available routes</h2>

                    {routes.map((route) => (
                        <button
                            key={route.id}
                            className={`route-option ${selectedRouteId === route.id
                                ? 'route-option--selected'
                                : ''
                                }`}
                            onClick={() => setSelectedRouteId(route.id)}
                        >
                            <strong>{route.name}</strong>
                            <span>{route.description}</span>
                            <span>{route.distanceMeters} m</span>
                            <span>{route.estimatedTimeMinutes} minutes</span>
                            <span>Risk: {route.risk}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default MapCanvas;
