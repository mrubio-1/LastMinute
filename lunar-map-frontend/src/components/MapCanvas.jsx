import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { APOLLO_11_MAP } from '../config/apollo11Map.js';

const IMAGE_URL = '/testImage.webp';
const API_URL = 'http://127.0.0.1:8000/navigation/route';
const VEHICLE_OPTIONS = [
    { id: 'xEMU Suit', label: 'Suit', icon: '🚶' },
    { id: 'Unpressurized Rover', label: 'Rover', icon: '▣' },
    { id: 'Pressurized Cruiser', label: 'Cruiser', icon: '◈' },
    { id: 'Lunar Hopper', label: 'Hopper', icon: '↗' },
];

function MapCanvas() {
    const mapElementRef = useRef(null);
    const [mousePosition, setMousePosition] = useState(null);
    const [destination, setDestination] = useState(null);
    const [startLocation, setStartLocation] = useState({
        id: 'landing-site',
        label: 'Eagle landing site',
        position: {
            lat: APOLLO_11_MAP.landingSite.yMeters,
            lng: APOLLO_11_MAP.landingSite.xMeters,
        },
    });
    const [userMarkers, setUserMarkers] = useState([]);
    const [interactionMode, setInteractionMode] = useState('normal');
    const [selectedRouteId, setSelectedRouteId] = useState(null);
    const [routeStatus, setRouteStatus] = useState('idle');
    const [routeError, setRouteError] = useState('');
    const [routes, setRoutes] = useState([]);
    const [markerEditor, setMarkerEditor] = useState(null);
    const [startSearch, setStartSearch] = useState('');
    const [theme, setTheme] = useState('dark');
    const [vehicleType, setVehicleType] = useState('Unpressurized Rover');

    const resetRoutes = () => {
        setRoutes([]);
        setSelectedRouteId(null);
        setRouteStatus('idle');
        setRouteError('');
    };

    const openNewMarkerEditor = (position) => {
        setMarkerEditor({
            mode: 'create',
            marker: {
                position,
                title: '',
                description: '',
            },
        });
    };

    const openExistingMarkerEditor = (marker) => {
        setMarkerEditor({
            mode: 'view',
            marker: { ...marker },
        });
    };

    const saveMarker = () => {
        const marker = markerEditor?.marker;
        if (!marker || !marker.title.trim()) {
            return;
        }

        if (markerEditor.mode === 'create') {
            setUserMarkers((previousMarkers) => [
                ...previousMarkers,
                {
                    ...marker,
                    id: Date.now(),
                    title: marker.title.trim(),
                    description: marker.description.trim(),
                },
            ]);
        } else {
            setUserMarkers((previousMarkers) =>
                previousMarkers.map((previousMarker) =>
                    previousMarker.id === marker.id
                        ? {
                            ...marker,
                            title: marker.title.trim(),
                            description: marker.description.trim(),
                        }
                        : previousMarker,
                ),
            );
        }

        setMarkerEditor(null);
    };

    const planRoute = async () => {
        if (!destination) {
            return;
        }

        setRouteStatus('loading');
        setRouteError('');
        setRoutes([]);
        setSelectedRouteId(null);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    current_location: {
                        x: startLocation.position.lng,
                        y: startLocation.position.lat,
                    },
                    destination: {
                        x: destination.lng,
                        y: destination.lat,
                    },
                    vehicle_type: vehicleType,
                }),
            });

            if (!response.ok) {
                throw new Error(`Route request failed with status ${response.status}.`);
            }

            const data = await response.json();
            if (!Array.isArray(data.routes)) {
                throw new Error('Route response did not contain a routes array.');
            }

            setRoutes(data.routes);
            setRouteStatus('success');
        } catch (error) {
            setRouteError(error instanceof Error ? error.message : 'Unable to calculate routes.');
            setRouteStatus('error');
        }
    };

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
            doubleClickZoom: false,
        });

        L.imageOverlay(IMAGE_URL, bounds, { crossOrigin: true }).addTo(map);
        map.fitBounds(bounds);

        const { xMeters, yMeters } = APOLLO_11_MAP.landingSite;
        const landingSiteMarker = L.circleMarker([yMeters, xMeters], {
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
        landingSiteMarker.on('click', (event) => {
            if (interactionMode === 'destination') {
                L.DomEvent.stopPropagation(event);
                setDestination(landingSiteMarker.getLatLng());
                resetRoutes();
            }
        });

        const currentLocationMarker = L.circleMarker([
            APOLLO_11_MAP.landingSite.yMeters,
            APOLLO_11_MAP.landingSite.xMeters,
        ], {
            radius: 7,
            color: '#8ab4f8',
            fillColor: '#1a73e8',
            fillOpacity: 1,
            weight: 3,
        })
            .bindPopup('<strong>Current location</strong><br>Simulated astronaut position')
            .addTo(map);
        currentLocationMarker.on('click', (event) => {
            if (interactionMode === 'destination') {
                L.DomEvent.stopPropagation(event);
                setDestination(currentLocationMarker.getLatLng());
                resetRoutes();
            }
        });

        if (
            startLocation.position.lat !== APOLLO_11_MAP.landingSite.yMeters
            || startLocation.position.lng !== APOLLO_11_MAP.landingSite.xMeters
        ) {
            L.circleMarker([startLocation.position.lat, startLocation.position.lng], {
                radius: 6,
                color: '#34a853',
                fillColor: '#34a853',
                fillOpacity: 1,
            })
                .bindPopup(`<strong>Route starting point</strong><br>${startLocation.label}`)
                .addTo(map);
        }

        if (destination) {
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
                radius: 6,
                color: '#ff6b6b',
                fillColor: '#ff6b6b',
                fillOpacity: 1,
            })
                .bindPopup('<strong>Destination</strong>')
                .addTo(map);
        }

        userMarkers.forEach((marker) => {
            const mapMarker = L.circleMarker(
                [marker.position.lat, marker.position.lng],
                {
                    radius: 6,
                    color: '#b084cc',
                    fillColor: '#b084cc',
                    fillOpacity: 1,
                },
            ).addTo(map);

            mapMarker.on('click', (event) => {
                L.DomEvent.stopPropagation(event);
                if (interactionMode === 'destination') {
                    setDestination(mapMarker.getLatLng());
                    resetRoutes();
                    return;
                }
                openExistingMarkerEditor(marker);
            });
        });

        if (markerEditor?.mode === 'create') {
            L.circleMarker(
                [markerEditor.marker.position.lat, markerEditor.marker.position.lng],
                {
                    radius: 9,
                    color: '#1a73e8',
                    fillColor: '#8ab4f8',
                    fillOpacity: 0.8,
                    dashArray: '4 4',
                },
            )
                .bindTooltip('New marker')
                .addTo(map);
        }

        function handleMouseMove(event) {
            const { lat, lng } = event.latlng;
            const metersPerPixel = APOLLO_11_MAP.image.metersPerPixel;
            setMousePosition({
                lng,
                lat,
                xMeters: lng * metersPerPixel,
                yMeters: lat * metersPerPixel,
            });
        }

        function handleMapClick(event) {
            if (interactionMode === 'destination') {
                setDestination(event.latlng);
                resetRoutes();
            }
        }

        function handleMapDoubleClick(event) {
            if (interactionMode === 'normal') {
                openNewMarkerEditor(event.latlng);
            }
        }

        map.on('mousemove', handleMouseMove);
        map.on('click', handleMapClick);
        map.on('dblclick', handleMapDoubleClick);

        return () => {
            map.off('mousemove', handleMouseMove);
            map.off('click', handleMapClick);
            map.off('dblclick', handleMapDoubleClick);
            map.remove();
        };
    }, [
        destination,
        interactionMode,
        routes,
        selectedRouteId,
        startLocation,
        userMarkers,
        markerEditor,
    ]);

    const locationOptions = [
        {
            id: 'landing-site',
            label: 'Eagle landing site',
            position: {
                lat: APOLLO_11_MAP.landingSite.yMeters,
                lng: APOLLO_11_MAP.landingSite.xMeters,
            },
        },
        ...userMarkers.map((marker) => ({
            ...marker,
            label: marker.title,
        })),
    ];

    const filteredLocations = locationOptions.filter((location) =>
        location.label.toLowerCase().includes(startSearch.toLowerCase()),
    );

    return (
        <div className={`map-shell theme-${theme}`}>
            <aside className="map-sidebar" aria-label="Map navigation">
                <button className="sidebar-button sidebar-button--menu" aria-label="Open menu">☰</button>
                <button
                    className={interactionMode === 'normal' ? 'sidebar-button sidebar-button--active' : 'sidebar-button'}
                    onClick={() => setInteractionMode('normal')}
                >
                    <span>⌖</span>
                    <small>Explore</small>
                </button>
                <button
                    className={interactionMode === 'destination' ? 'sidebar-button sidebar-button--active' : 'sidebar-button'}
                    onClick={() => setInteractionMode('destination')}
                >
                    <span>➜</span>
                    <small>Directions</small>
                </button>
                <div className="sidebar-divider" />
                <button className="sidebar-button" aria-label="Saved places">
                    <span>♡</span>
                    <small>Saved</small>
                </button>
            </aside>

            <button
                className="theme-toggle"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                onClick={() => setTheme((currentTheme) =>
                    currentTheme === 'dark' ? 'light' : 'dark')}
            >
                {theme === 'dark' ? '☀' : '☾'}
            </button>

            <div ref={mapElementRef} className="map-canvas" />

            <div className="coordinate-tracker">
                {mousePosition ? (
                    <>
                        <div>X: {mousePosition.xMeters.toFixed(2)} m</div>
                        <div>Y: {mousePosition.yMeters.toFixed(2)} m</div>
                    </>
                ) : (
                    <div>Move your pointer over the map</div>
                )}
            </div>

            {interactionMode === 'destination' && (
                <div className="destination-tools">
                    <div className="directions-tabs" role="group" aria-label="Vehicle type">
                        {VEHICLE_OPTIONS.map((vehicle) => (
                            <button
                                key={vehicle.id}
                                className={vehicleType === vehicle.id
                                    ? 'directions-tab directions-tab--active'
                                    : 'directions-tab'}
                                title={vehicle.id}
                                onClick={() => {
                                    setVehicleType(vehicle.id);
                                    resetRoutes();
                                }}
                            >
                                <span aria-hidden="true">{vehicle.icon}</span> {vehicle.label}
                            </button>
                        ))}
                        <button className="directions-close" onClick={() => setInteractionMode('normal')}>×</button>
                    </div>
                    <div className="directions-fields">
                        <span className="directions-line directions-line--start" />
                        <span className="directions-line directions-line--end" />
                        <input
                            id="start-location"
                            type="search"
                            aria-label="Starting point"
                            placeholder="Choose starting point"
                            value={startSearch}
                            placeholder={`Starting point: ${startLocation.label}`}
                            onChange={(event) => {
                                setStartSearch(event.target.value);
                                resetRoutes();
                            }}
                        />
                        <button className="swap-locations" aria-label="Swap start and destination">↕</button>
                        <input
                            type="text"
                            aria-label="Destination"
                            placeholder="Click the map to choose destination"
                            value={destination ? `Map point (${destination.lng.toFixed(0)}, ${destination.lat.toFixed(0)})` : ''}
                            readOnly
                        />
                    </div>
                    <div className="location-results">
                        {filteredLocations.map((location) => (
                            <button
                                key={location.id}
                                className="location-result"
                                onClick={() => {
                                    setStartLocation(location);
                                    setStartSearch(location.label);
                                    resetRoutes();
                                }}
                            >
                                <strong>{location.label}</strong>
                                <span>{location.id === 'landing-site' ? 'Current location' : 'Saved marker'}</span>
                            </button>
                        ))}
                    </div>
                    {destination && (
                        <button
                            className="plan-route-button"
                            onClick={planRoute}
                            disabled={routeStatus === 'loading'}
                        >
                            {routeStatus === 'loading' ? 'Calculating...' : 'Plan route'}
                        </button>
                    )}
                    {!destination && (
                        <p className="directions-hint">Select a destination anywhere on the map.</p>
                    )}
                    {routeStatus === 'error' && (
                        <p className="route-error">{routeError}</p>
                    )}
                </div>
            )}

            {destination && routeStatus === 'success' && (
                <div className="route-panel">
                    <h2>Available routes</h2>
                    {routes.map((route) => (
                        <button
                            key={route.id}
                            className={selectedRouteId === route.id
                                ? 'route-option route-option--selected'
                                : 'route-option'}
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

            {markerEditor && (
                <div className="place-panel">
                    <div className="place-panel__header">
                        <div className="place-panel__eyebrow">
                            {markerEditor.mode === 'create' ? 'New place' : 'Saved place'}
                        </div>
                        <button
                            className="icon-button"
                            aria-label="Close place details"
                            onClick={() => setMarkerEditor(null)}
                        >
                            ×
                        </button>
                    </div>

                    {markerEditor.mode === 'view' ? (
                        <>
                            <h2>{markerEditor.marker.title}</h2>
                            <p className="place-panel__description">
                                {markerEditor.marker.description || 'No description added.'}
                            </p>
                            <div className="place-panel__coordinates">
                                {markerEditor.marker.position.lng.toFixed(2)} m,{' '}
                                {markerEditor.marker.position.lat.toFixed(2)} m
                            </div>
                            <div className="place-panel__actions">
                                <button
                                    className="place-panel__directions"
                                    onClick={() => {
                                        setDestination(markerEditor.marker.position);
                                        setInteractionMode('destination');
                                        setMarkerEditor(null);
                                        resetRoutes();
                                    }}
                                >
                                    ➜ Directions
                                </button>
                                <button
                                    className="place-panel__edit"
                                    onClick={() =>
                                        setMarkerEditor({
                                            ...markerEditor,
                                            mode: 'edit',
                                        })}
                                >
                                    Edit
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2>{markerEditor.mode === 'create' ? 'Add a place' : 'Edit place'}</h2>
                            <label htmlFor="marker-title">Name</label>
                            <input
                                id="marker-title"
                                type="text"
                                placeholder="Place name"
                                autoFocus
                                value={markerEditor.marker.title}
                                onChange={(event) =>
                                    setMarkerEditor({
                                        ...markerEditor,
                                        marker: {
                                            ...markerEditor.marker,
                                            title: event.target.value,
                                        },
                                    })}
                            />
                            <label htmlFor="marker-description">Description</label>
                            <textarea
                                id="marker-description"
                                rows="4"
                                placeholder="Add details about this place"
                                value={markerEditor.marker.description}
                                onChange={(event) =>
                                    setMarkerEditor({
                                        ...markerEditor,
                                        marker: {
                                            ...markerEditor.marker,
                                            description: event.target.value,
                                        },
                                    })}
                            />
                            <div className="place-panel__actions">
                                <button onClick={() => setMarkerEditor(null)}>Cancel</button>
                                <button
                                    className="place-panel__save"
                                    onClick={saveMarker}
                                    disabled={!markerEditor.marker.title.trim()}
                                >
                                    Save
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default MapCanvas;
