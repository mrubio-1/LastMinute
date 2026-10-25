import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { APOLLO_11_MAP } from '../config/apollo11Map.js';

const IMAGE_URL = '/testImage.webp';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/navigation/route`;
const HAZARDS_STORAGE_KEY = 'life-hazards';
const VEHICLE_OPTIONS = [
    { id: 'xEMU Suit', label: 'Suit', icon: '🚶' },
    { id: 'Unpressurized Rover', label: 'Rover', icon: '▣' },
    { id: 'Pressurized Cruiser', label: 'Cruiser', icon: '◈' },
    { id: 'Lunar Hopper', label: 'Hopper', icon: '↗' },
];
const MARKER_TYPES = [
    { id: 'base', label: 'Base' },
    { id: 'oxygen', label: 'Oxygen refuel station' },
    { id: 'landing', label: 'Landing site' },
];

function createMarkerIcon(type) {
    const markerType = [
        'base',
        'oxygen',
        'landing',
        'current',
        'destination',
        'start',
    ].includes(type) ? type : 'base';
    const symbols = {
        base: '⌂',
        oxygen: 'O₂',
        landing: '★',
        current: '●',
        destination: '◆',
        start: '●',
    };

    return L.divIcon({
        className: `lunar-marker lunar-marker--${markerType}`,
        html: `<span><b>${symbols[markerType]}</b></span>`,
        iconSize: [34, 42],
        iconAnchor: [17, 38],
        popupAnchor: [0, -34],
    });
}

function normalizeHazards(parsedHazards) {
        const hazards = Array.isArray(parsedHazards)
            ? parsedHazards
            : Array.isArray(parsedHazards?.hazards)
                ? parsedHazards.hazards
                : [];

        return hazards
            .map((hazard, index) => {
                const x = hazard.x ?? hazard.position?.x ?? hazard.coordinates?.x;
                const y = hazard.y ?? hazard.position?.y ?? hazard.coordinates?.y;
                const radius = hazard.radiusMeters
                    ?? hazard.radius
                    ?? hazard.extent
                    ?? 20;

                if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) {
                    return null;
                }

                return {
                    id: hazard.id ?? `hazard-${index}`,
                    name: hazard.name ?? hazard.hazard ?? 'Surface hazard',
                    description: hazard.description ?? hazard.action ?? '',
                    severity: String(hazard.severity ?? hazard.status ?? 'warning').toLowerCase(),
                    position: { x: Number(x), y: Number(y) },
                    radius: Number(radius),
                };
            })
            .filter(Boolean);
}

function readStoredHazards() {
    try {
        const storedHazards = window.localStorage.getItem(HAZARDS_STORAGE_KEY);
        return storedHazards ? normalizeHazards(JSON.parse(storedHazards)) : [];
    } catch {
        return [];
    }
}

function MapCanvas() {
    const mapElementRef = useRef(null);
    const [mousePosition, setMousePosition] = useState(null);
    const [destination, setDestination] = useState(null);
    const [destinationId, setDestinationId] = useState(null);
    const [currentLocation, setCurrentLocation] = useState({
        x: APOLLO_11_MAP.landingSite.xMeters,
        y: APOLLO_11_MAP.landingSite.yMeters,
    });
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
    const [startSearch, setStartSearch] = useState('Eagle landing site');
    const [theme, setTheme] = useState('dark');
    const [vehicleType, setVehicleType] = useState('Unpressurized Rover');
    const [selectingField, setSelectingField] = useState(null);
    const [sidebarPanel, setSidebarPanel] = useState(null);
    const [hazards, setHazards] = useState(() => readStoredHazards());
    const [backendLocations, setBackendLocations] = useState([]);
    const [astronauts, setAstronauts] = useState([]);
    const [selectedAstronaut, setSelectedAstronaut] = useState(null);
    const [positioning, setPositioning] = useState(null);
    const [nearbyHazards, setNearbyHazards] = useState([]);

    const resetRoutes = () => {
        setRoutes([]);
        setSelectedRouteId(null);
        setRouteStatus('idle');
        setRouteError('');
    };

    useEffect(() => {
        let cancelled = false;

        const loadAstronaut = async () => {
            try {
                const rosterResponse = await fetch(`${API_BASE_URL}/astronaut`);
                if (!rosterResponse.ok) {
                    throw new Error(`Astronaut request failed with status ${rosterResponse.status}.`);
                }

                const roster = await rosterResponse.json();
                if (cancelled || !Array.isArray(roster) || roster.length === 0) {
                    return;
                }

                setAstronauts(roster);
                let activeAstronaut = roster.find((astronaut) => astronaut.active);
                if (!activeAstronaut) {
                    const selectResponse = await fetch(
                        `${API_BASE_URL}/astronaut/select/${roster[0].id}`,
                        { method: 'POST' },
                    );
                    if (!selectResponse.ok) {
                        throw new Error(`Astronaut selection failed with status ${selectResponse.status}.`);
                    }
                    activeAstronaut = await selectResponse.json();
                }

                if (cancelled) {
                    return;
                }

                setSelectedAstronaut(activeAstronaut);
                const locationResponse = await fetch(`${API_BASE_URL}/astronaut/location`);
                if (!locationResponse.ok) {
                    throw new Error(`Location request failed with status ${locationResponse.status}.`);
                }
                const location = await locationResponse.json();
                if (Number.isFinite(Number(location.x)) && Number.isFinite(Number(location.y))) {
                    setCurrentLocation({ x: Number(location.x), y: Number(location.y) });
                    setStartLocation((previous) => previous.id === 'landing-site'
                        ? {
                            id: 'current-location',
                            label: 'Current location',
                            position: { lat: Number(location.y), lng: Number(location.x) },
                        }
                        : previous);
                }

                const positioningResponse = await fetch(`${API_BASE_URL}/astronaut/positioning`);
                if (positioningResponse.ok) {
                    setPositioning(await positioningResponse.json());
                }

                const nearbyResponse = await fetch(`${API_BASE_URL}/astronaut/hazards`);
                if (nearbyResponse.ok) {
                    setNearbyHazards(await nearbyResponse.json());
                }
            } catch {
                // The configured Apollo 11 position remains the local fallback.
            }
        };

        loadAstronaut();

        fetch(`${API_BASE_URL}/locations`)
            .then((response) => response.ok ? response.json() : [])
            .then((locations) => {
                if (!cancelled && Array.isArray(locations)) {
                    setBackendLocations(locations.map((location) => ({
                        id: location.id,
                        label: location.name,
                        title: location.name,
                        description: location.description,
                        type: location.name.toLowerCase().includes('oxygen')
                            || location.name.toLowerCase().includes('resource')
                            ? 'oxygen'
                            : location.name.toLowerCase().includes('landing')
                                ? 'landing'
                                : 'base',
                        position: { lat: location.y, lng: location.x },
                    })));
                }
            })
            .catch(() => {});

        fetch(`${API_BASE_URL}/hazards`)
            .then((response) => response.ok ? response.json() : null)
            .then((data) => {
                if (data) {
                    setHazards(normalizeHazards(data));
                }
            })
            .catch(() => {
                // Local storage remains the fallback until the hazards endpoint is available.
            });

        const updateHazards = () => setHazards(readStoredHazards());
        window.addEventListener('storage', updateHazards);
        return () => {
            cancelled = true;
            window.removeEventListener('storage', updateHazards);
        };
    }, []);

    const openNewMarkerEditor = (position) => {
        setMarkerEditor({
            mode: 'create',
            marker: {
                position,
                title: '',
                description: '',
                type: 'base',
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
            const requestBody = {
                current_location: {
                    x: startLocation.position.lng,
                    y: startLocation.position.lat,
                },
                destination: {
                    x: destination.lng,
                    y: destination.lat,
                },
                vehicle_type: vehicleType,
            };
            if (Number.isInteger(destinationId)) {
                requestBody.destination_id = destinationId;
            }

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
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
            setRouteError(
                error instanceof TypeError
                    ? 'Could not reach the navigation backend. Start the FastAPI server at 127.0.0.1:8000 and try again.'
                    : error instanceof Error
                        ? error.message
                        : 'Unable to calculate routes.',
            );
            setRouteStatus('error');
        }
    };

    const selectMapLocation = (position, label, id = 'map-point') => {
        setStartLocation({ id, label, position });
        setStartSearch(label);
        setSelectingField(null);
        resetRoutes();
    };

    const chooseDestination = (position, id = null) => {
        setDestination(position);
        setDestinationId(Number.isInteger(id) ? id : null);
        setSelectingField(null);
        resetRoutes();
    };

    const swapLocations = () => {
        if (!destination) {
            return;
        }

        const previousStart = startLocation;
        setStartLocation({
            id: 'map-point',
            label: `Map point (${destination.lng.toFixed(0)}, ${destination.lat.toFixed(0)})`,
            position: destination,
        });
        setDestination(previousStart.position);
        setDestinationId(Number.isInteger(previousStart.id) ? previousStart.id : null);
        setStartSearch(previousStart.label);
        setSelectingField(null);
        resetRoutes();
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
        const landingSiteMarker = L.marker([yMeters, xMeters], {
            icon: createMarkerIcon('landing'),
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
                if (selectingField === 'start') {
                    selectMapLocation(landingSiteMarker.getLatLng(), 'Eagle landing site', 'landing-site');
                } else {
                    chooseDestination(landingSiteMarker.getLatLng());
                }
            }
        });

        const currentLocationMarker = L.marker([
            currentLocation.y,
            currentLocation.x,
        ], { icon: createMarkerIcon('current') })
            .bindPopup('<strong>Current location</strong><br>Simulated astronaut position')
            .addTo(map);
        currentLocationMarker.on('click', (event) => {
            if (interactionMode === 'destination') {
                L.DomEvent.stopPropagation(event);
                if (selectingField === 'start') {
                    selectMapLocation(currentLocationMarker.getLatLng(), 'Current location', 'current-location');
                } else {
                    chooseDestination(currentLocationMarker.getLatLng());
                }
            }
        });

        hazards.forEach((hazard) => {
            const severity = hazard.severity.includes('critical') || hazard.severity.includes('high')
                ? 'critical'
                : hazard.severity.includes('medium') || hazard.severity.includes('warning')
                    ? 'warning'
                    : 'info';
            const circle = L.circle([hazard.position.y, hazard.position.x], {
                radius: Math.max(hazard.radius, 1),
                color: severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#38bdf8',
                fillColor: severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#38bdf8',
                fillOpacity: 0.2,
                weight: 2,
            }).addTo(map);
            circle.bindPopup(`
                <strong>${hazard.name}</strong><br>
                ${hazard.description || 'Hazard area'}<br>
                Extent: ${hazard.radius} m
            `);
        });

        if (
            startLocation.position.lat !== APOLLO_11_MAP.landingSite.yMeters
            || startLocation.position.lng !== APOLLO_11_MAP.landingSite.xMeters
        ) {
            L.marker([startLocation.position.lat, startLocation.position.lng], {
                icon: createMarkerIcon('start'),
            })
                .bindPopup(`<strong>Route starting point</strong><br>${startLocation.label}`)
                .addTo(map);
        }

        if (destination && interactionMode === 'destination') {
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

            L.marker([destination.lat, destination.lng], {
                icon: createMarkerIcon('destination'),
            })
                .bindPopup('<strong>Destination</strong>')
                .addTo(map);
        }

        userMarkers.forEach((marker) => {
            const mapMarker = L.marker(
                [marker.position.lat, marker.position.lng],
                { icon: createMarkerIcon(marker.type) },
            ).addTo(map);

            mapMarker.on('click', (event) => {
                L.DomEvent.stopPropagation(event);
                if (interactionMode === 'destination') {
                    if (selectingField === 'start') {
                        selectMapLocation(mapMarker.getLatLng(), marker.title, marker.id);
                    } else {
                        chooseDestination(mapMarker.getLatLng(), marker.id);
                    }
                    return;
                }
                openExistingMarkerEditor(marker);
            });

            backendLocations.forEach((location) => {
                const mapMarker = L.marker(
                    [location.position.lat, location.position.lng],
                    { icon: createMarkerIcon(location.type) },
                )
                    .bindPopup(`
                        <strong>${location.title}</strong><br>
                        ${location.description || 'Lunar location'}
                    `)
                    .addTo(map);

                mapMarker.on('click', (event) => {
                    L.DomEvent.stopPropagation(event);
                    if (interactionMode === 'destination') {
                        if (selectingField === 'start') {
                            selectMapLocation(mapMarker.getLatLng(), location.label, location.id);
                        } else {
                            chooseDestination(mapMarker.getLatLng(), location.id);
                        }
                    }
                });
            });
        });

        if (markerEditor?.mode === 'create') {
            L.marker(
                [markerEditor.marker.position.lat, markerEditor.marker.position.lng],
                { icon: createMarkerIcon(markerEditor.marker.type || 'base') },
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
                if (selectingField === 'start') {
                    selectMapLocation(
                        event.latlng,
                        `Map point (${event.latlng.lng.toFixed(0)}, ${event.latlng.lat.toFixed(0)})`,
                    );
                } else {
                    chooseDestination(event.latlng);
                }
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
        currentLocation,
        hazards,
        interactionMode,
        routes,
        selectedRouteId,
        startLocation,
        userMarkers,
        backendLocations,
        markerEditor,
        selectingField,
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
        ...backendLocations,
    ];

    const filteredLocations = locationOptions.filter((location) =>
        location.label.toLowerCase().includes(startSearch.toLowerCase()),
    );

    return (
        <div className={`map-shell theme-${theme}`}>
            <aside className="map-sidebar" aria-label="Map navigation">
                <button
                    className="sidebar-button sidebar-button--menu"
                    aria-label="Toggle sidebar"
                    onClick={() => setSidebarPanel((current) => current === 'menu' ? null : 'menu')}
                >
                    ☰
                </button>
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
                <button
                    className={sidebarPanel === 'saved' ? 'sidebar-button sidebar-button--active' : 'sidebar-button'}
                    aria-label="Saved places"
                    onClick={() => setSidebarPanel((current) => current === 'saved' ? null : 'saved')}
                >
                    <span>♡</span>
                    <small>Saved</small>
                </button>
            </aside>

            {sidebarPanel && (
                <div className="sidebar-panel">
                    <div className="sidebar-panel__header">
                        <h2>{sidebarPanel === 'saved' ? 'Saved places' : 'L.I.F.E. map'}</h2>
                        <button className="icon-button" onClick={() => setSidebarPanel(null)} aria-label="Close sidebar panel">×</button>
                    </div>
                    {sidebarPanel === 'saved' ? (
                        userMarkers.length ? userMarkers.map((marker) => (
                            <button
                                className="sidebar-saved-place"
                                key={marker.id}
                                onClick={() => {
                                    openExistingMarkerEditor(marker);
                                    setSidebarPanel(null);
                                }}
                            >
                                <strong>{marker.title}</strong>
                                <span>{marker.description || 'Saved lunar location'}</span>
                            </button>
                        )) : <p className="directions-hint">Double-click the map to save a place.</p>
                    ) : (
                        <>
                            <p className="directions-hint">Explore the Apollo 11 landing site or open Directions to plan a route.</p>
                            {selectedAstronaut && (
                                <div className="mission-status">
                                    <strong>{selectedAstronaut.name}</strong>
                                    <span>Active astronaut</span>
                                </div>
                            )}
                            {astronauts.length > 1 && (
                                <label className="sidebar-field">
                                    Astronaut
                                    <select
                                        value={selectedAstronaut?.id || ''}
                                        onChange={async (event) => {
                                            const response = await fetch(
                                                `${API_BASE_URL}/astronaut/select/${event.target.value}`,
                                                { method: 'POST' },
                                            );
                                            if (!response.ok) {
                                                return;
                                            }
                                            const astronaut = await response.json();
                                            setSelectedAstronaut(astronaut);
                                            setCurrentLocation({ x: astronaut.x, y: astronaut.y });
                                            setStartLocation({
                                                id: 'current-location',
                                                label: 'Current location',
                                                position: { lat: astronaut.y, lng: astronaut.x },
                                            });
                                            resetRoutes();
                                        }}
                                    >
                                        {astronauts.map((astronaut) => (
                                            <option key={astronaut.id} value={astronaut.id}>
                                                {astronaut.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
                            {positioning && (
                                <div className="mission-status">
                                    <strong>Satellite positioning</strong>
                                    <span>{positioning.satellites_used} satellites · {positioning.positioning_status}</span>
                                </div>
                            )}
                            {nearbyHazards.length > 0 && (
                                <div className="mission-alert">
                                    {nearbyHazards.length} nearby hazard{nearbyHazards.length === 1 ? '' : 's'}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            <button
                className="theme-toggle"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                onClick={() => setTheme((currentTheme) =>
                    currentTheme === 'dark' ? 'light' : 'dark')}
            >
                {theme === 'dark' ? '☀' : '☾'}
            </button>

            <div ref={mapElementRef} className="map-canvas" />

            {routeStatus === 'loading' && (
                <div className="route-loading" role="status" aria-live="polite">
                    <div className="route-loading__spinner" />
                    <strong>Calculating lunar routes</strong>
                    <span>Checking terrain, hazards, and vehicle limits...</span>
                </div>
            )}

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
                            value={startSearch}
                            placeholder={`Starting point: ${startLocation.label}`}
                            onChange={(event) => {
                                setStartSearch(event.target.value);
                                setSelectingField(null);
                                resetRoutes();
                            }}
                        />
                        <button className="swap-locations" onClick={swapLocations} aria-label="Swap start and destination">↕</button>
                        <input
                            type="text"
                            aria-label="Destination"
                            placeholder="Click the map to choose destination"
                            value={destination ? `Map point (${destination.lng.toFixed(0)}, ${destination.lat.toFixed(0)})` : ''}
                            readOnly
                        />
                    </div>
                    <div className="map-pick-actions">
                        <button
                            className={selectingField === 'start' ? 'map-pick-button map-pick-button--active' : 'map-pick-button'}
                            onClick={() => setSelectingField('start')}
                        >
                            {selectingField === 'start' ? 'Click map for start' : 'Pick starting point on map'}
                        </button>
                        <button
                            className={selectingField === 'destination' ? 'map-pick-button map-pick-button--active' : 'map-pick-button'}
                            onClick={() => setSelectingField('destination')}
                        >
                            {selectingField === 'destination' ? 'Click map for destination' : 'Pick destination on map'}
                        </button>
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
                    {selectingField && (
                        <p className="directions-hint">
                            Click anywhere on the map to set the {selectingField === 'start' ? 'starting point' : 'destination'}.
                        </p>
                    )}
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
                            {route.minimumHazardClearanceMeters != null && (
                                <span>Hazard clearance: {route.minimumHazardClearanceMeters.toFixed(1)} m</span>
                            )}
                            {route.oxygen_estimate && (
                                <>
                                    <span>Oxygen needed: {route.oxygen_estimate.oxygen_used_liters} L</span>
                                    <span>Projected remaining: {route.oxygen_estimate.oxygen_remaining_liters} L ({route.oxygen_estimate.oxygen_percentage}%)</span>
                                    <span>Projected oxygen status: {route.oxygen_estimate.oxygen_status}</span>
                                    {route.oxygen_sufficient === false && (
                                        <span className="route-error">Insufficient oxygen for this route</span>
                                    )}
                                </>
                            )}
                            {route.assumedInclineDegrees != null && (
                                <span>Assumed incline: {route.assumedInclineDegrees}°</span>
                            )}
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
                            <label htmlFor="marker-type">Place type</label>
                            <select
                                id="marker-type"
                                value={markerEditor.marker.type || 'base'}
                                onChange={(event) =>
                                    setMarkerEditor({
                                        ...markerEditor,
                                        marker: {
                                            ...markerEditor.marker,
                                            type: event.target.value,
                                        },
                                    })}
                            >
                                {MARKER_TYPES.map((markerType) => (
                                    <option key={markerType.id} value={markerType.id}>
                                        {markerType.label}
                                    </option>
                                ))}
                            </select>
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
