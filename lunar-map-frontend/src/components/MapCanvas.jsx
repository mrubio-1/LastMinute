import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { APOLLO_11_MAP } from '../config/apollo11Map.js';

const IMAGE_URL = '/testImage.webp';
const DEFAULT_API_URL = 'http://127.0.0.1:8000';
const CONFIGURED_API_URL = import.meta.env.VITE_API_URL;
const API_BASE_URL = import.meta.env.DEV
    && (!CONFIGURED_API_URL || CONFIGURED_API_URL === DEFAULT_API_URL)
    ? ''
    : CONFIGURED_API_URL || DEFAULT_API_URL;
const API_URL = `${API_BASE_URL}/navigation/route`;
const HAZARDS_STORAGE_KEY = 'life-hazards';
const ASTRONAUT_TEAMS_STORAGE_KEY = 'life-astronaut-teams';
const DEFAULT_HAZARDS = [
    {
        id: 'hazard-1',
        name: 'Crater rim',
        description: 'Unstable crater edge.',
        severity: 'medium',
        position: { x: 280, y: 350 },
        radius: 28,
    },
    {
        id: 'hazard-2',
        name: 'Potential life forms',
        description: 'Unverified surface anomaly.',
        severity: 'high',
        position: { x: 560, y: 155 },
        radius: 36,
    },
    {
        id: 'hazard-3',
        name: 'Impact debris',
        description: 'Asteroid impact debris field.',
        severity: 'low',
        position: { x: 765, y: 485 },
        radius: 45,
    },
];
const VEHICLE_OPTIONS = [
    { id: 'xEMU Suit', label: 'Suit', icon: '🚶' },
    { id: 'Unpressurized Rover', label: 'Rover', icon: '▣' },
    { id: 'Pressurized Cruiser', label: 'Cruiser', icon: '◈' },
    { id: 'Lunar Hopper', label: 'Hopper', icon: '↗' },
];
const ASTRONAUT_CLUSTER_RADIUS_METERS = 24;
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

function getAstronautInitials(name) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .replace(/[^a-z0-9]/gi, '')
        .toUpperCase();
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[character]);
}

function readStoredAstronautTeams() {
    try {
        const storedTeams = window.localStorage.getItem(ASTRONAUT_TEAMS_STORAGE_KEY);
        const parsedTeams = storedTeams ? JSON.parse(storedTeams) : [];
        if (!Array.isArray(parsedTeams)) {
            return [];
        }

        return parsedTeams
            .filter((team) => Array.isArray(team.memberIds) && team.memberIds.length > 1)
            .map((team) => ({
                id: String(team.id),
                memberIds: team.memberIds.map(Number).filter(Number.isFinite),
                name: String(team.name || ''),
            }));
    } catch {
        return [];
    }
}

function getAstronautColorIndex(astronautId) {
    return (Math.abs(Number(astronautId) || 1) - 1) % 6 + 1;
}

function createAstronautIcon(astronaut) {
    const colorIndex = getAstronautColorIndex(astronaut.id);
    const initials = getAstronautInitials(astronaut.name);
    const activeClass = astronaut.active ? ' lunar-astronaut-dot--active' : '';

    return L.divIcon({
        className: 'lunar-marker lunar-marker--astronaut',
        html: `<span class="lunar-astronaut-dot lunar-astronaut-dot--${colorIndex}${activeClass}">${initials}</span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -22],
    });
}

function createTeamIcon(team, members) {
    const anchor = members.find((astronaut) => astronaut.active) || members[0];
    const colorIndex = getAstronautColorIndex(anchor.id);
    const markerInitials = members.map((astronaut) => getAstronautInitials(astronaut.name)).join('+');
    const initials = markerInitials.length > 5 ? `${members.length}×` : markerInitials;

    return L.divIcon({
        className: 'lunar-marker lunar-marker--astronaut lunar-marker--team',
        html: `<div class="lunar-team-marker"><small class="lunar-astronaut-marker__initials lunar-astronaut-marker__initials--${colorIndex}">${escapeHtml(team.name)}</small><span class="lunar-astronaut-dot lunar-astronaut-dot--${colorIndex}">${initials}</span></div>`,
        iconSize: [110, 62],
        iconAnchor: [55, 38],
        popupAnchor: [0, -48],
    });
}

function createLocationMarkerIcon(type, astronautsAtLocation = []) {
    const initials = astronautsAtLocation.map((astronaut) =>
        `<small class="lunar-location-astronaut lunar-location-astronaut--${getAstronautColorIndex(astronaut.id)}">${getAstronautInitials(astronaut.name)}</small>`).join('');
    if (astronautsAtLocation.length === 0) {
        return createMarkerIcon(type);
    }

    const symbols = { base: '⌂', oxygen: 'O₂', landing: '★', current: '●', destination: '◆', start: '●' };
    const symbol = symbols[type] || symbols.base;
    const width = Math.max(48, astronautsAtLocation.length * 27);
    return L.divIcon({
        className: `lunar-marker lunar-marker--${type} lunar-marker--location-grouped`,
        html: `<div class="lunar-location-marker"><div class="lunar-location-astronauts">${initials}</div><span><b>${symbol}</b></span></div>`,
        iconSize: [width, 68],
        iconAnchor: [width / 2, 64],
        popupAnchor: [0, -58],
    });
}

function getTeamPosition(members) {
    return members.reduce((position, member) => ({
        x: position.x + member.x / members.length,
        y: position.y + member.y / members.length,
    }), { x: 0, y: 0 });
}

function createDefaultTeamName(members) {
    return members.map((astronaut) => getAstronautInitials(astronaut.name)).join(' + ');
}

function getElevationMeters(position) {
    return Number.isFinite(position?.zMeters) ? position.zMeters : 0;
}

function formatLiters(value) {
    return Number(value).toFixed(3);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error(`Request timed out after ${timeoutMs / 1000} seconds.`);
        }
        throw error;
    } finally {
        window.clearTimeout(timeoutId);
    }
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
    const routeAbortControllerRef = useRef(null);
    const [mousePosition, setMousePosition] = useState(null);
    const [destination, setDestination] = useState(null);
    const [destinationId, setDestinationId] = useState(null);
    const [destinationSearch, setDestinationSearch] = useState('');
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
    const [markerOverrides, setMarkerOverrides] = useState({});
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
    const [hazards, setHazards] = useState(() => {
        const storedHazards = readStoredHazards();
        return storedHazards.length > 0 ? storedHazards : DEFAULT_HAZARDS;
    });
    const [backendLocations, setBackendLocations] = useState([]);
    const [astronauts, setAstronauts] = useState([]);
    const [astronautTeams, setAstronautTeams] = useState(() => readStoredAstronautTeams());
    const [selectedAstronaut, setSelectedAstronaut] = useState(null);
    const [teamNameDraft, setTeamNameDraft] = useState('');
    const [positioning, setPositioning] = useState(null);
    const [nearbyHazards, setNearbyHazards] = useState([]);
    const [oxygenReport, setOxygenReport] = useState(null);
    const [emergencyReport, setEmergencyReport] = useState(null);
    const [simulationStatus, setSimulationStatus] = useState('idle');
    const [simulationStep, setSimulationStep] = useState(0);
    const [simulationError, setSimulationError] = useState('');
    const [missionError, setMissionError] = useState('');

    const resetRoutes = () => {
        if (simulationStatus === 'running') {
            return;
        }

        routeAbortControllerRef.current?.abort();
        routeAbortControllerRef.current = null;
        setRoutes([]);
        setSelectedRouteId(null);
        setRouteStatus('idle');
        setRouteError('');
        setSimulationStatus('idle');
        setSimulationStep(0);
        setSimulationError('');
    };

    const closeRouteSimulation = () => {
        if (simulationStatus === 'running') {
            return;
        }

        setRoutes([]);
        setSelectedRouteId(null);
        setRouteStatus('idle');
        setRouteError('');
        setSimulationStatus('idle');
        setSimulationStep(0);
        setSimulationError('');
    };

    useEffect(() => {
        try {
            window.localStorage.setItem(ASTRONAUT_TEAMS_STORAGE_KEY, JSON.stringify(astronautTeams));
        } catch (error) {
            setMissionError(error instanceof Error ? error.message : 'Unable to save astronaut teams.');
        }
    }, [astronautTeams]);

    useEffect(() => () => routeAbortControllerRef.current?.abort(), []);

    const refreshMissionData = async () => {
        const endpoints = [
            'astronaut',
            'astronaut/location',
            'astronaut/oxygen',
            'astronaut/emergency',
            'astronaut/positioning',
            'astronaut/hazards',
        ];
        const responses = await Promise.all(
            endpoints.map((endpoint) => fetchWithTimeout(`${API_BASE_URL}/${endpoint}`)),
        );
        const failedIndex = responses.findIndex((response) => !response.ok);
        if (failedIndex !== -1) {
            throw new Error(
                `${endpoints[failedIndex]} request failed with status ${responses[failedIndex].status}.`,
            );
        }

        const [roster, location, oxygen, emergency, satellitePosition, hazardList] =
            await Promise.all(responses.map((response) => response.json()));
        const activeAstronaut = roster.find((astronaut) => astronaut.active) || null;
        const activeTeam = astronautTeams.find((team) =>
            team.memberIds.includes(activeAstronaut?.id));
        const activeTeamMembers = activeTeam
            ? roster.filter((astronaut) => activeTeam.memberIds.includes(astronaut.id))
            : [];
        const activePosition = activeTeamMembers.length > 1
            ? getTeamPosition(activeTeamMembers)
            : { x: location.x, y: location.y };

        setAstronauts(roster);
        setSelectedAstronaut(activeAstronaut);
        setCurrentLocation(activePosition);
        if (startLocation.id === 'landing-site' || startLocation.id === 'current-location') {
            const label = activeTeam
                ? `${activeTeam.name} team current location`
                : `${activeAstronaut?.name || 'Astronaut'} current location`;
            setStartLocation({
                id: 'current-location',
                label,
                position: { lat: activePosition.y, lng: activePosition.x },
            });
            setStartSearch(label);
        }
        setOxygenReport(oxygen);
        setEmergencyReport(emergency);
        setPositioning(satellitePosition);
        setNearbyHazards(hazardList);
        setMissionError('');
    };

    const simulateSelectedRoute = async () => {
        const route = routes.find((candidate) => candidate.id === selectedRouteId);
        if (!route || !Array.isArray(route.points) || route.points.length === 0 || simulationStatus === 'running') {
            return;
        }

        setSimulationStatus('running');
        setSimulationStep(0);
        setSimulationError('');
        setInteractionMode('normal');
        setSelectingField(null);

        try {
            for (let index = 0; index < route.points.length; index += 1) {
                const [y, x] = route.points[index];
                const movingTeam = astronautTeams.find((team) =>
                    team.memberIds.includes(selectedAstronaut?.id));
                const response = await fetchWithTimeout(`${API_BASE_URL}/astronaut/move`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        x,
                        y,
                        vehicle_type: vehicleType,
                        team_member_ids: movingTeam?.memberIds || [],
                    }),
                }, 10000);

                if (!response.ok) {
                    const errorBody = await response.json().catch(() => null);
                    const detail = typeof errorBody?.detail === 'string'
                        ? errorBody.detail
                        : `Movement failed with status ${response.status}.`;
                    throw new Error(detail);
                }

                setSimulationStep(index + 1);
                await refreshMissionData();
                if (index < route.points.length - 1) {
                    await new Promise((resolve) => window.setTimeout(resolve, 450));
                }
            }

            setSimulationStatus('complete');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to simulate this route.';
            setSimulationError(message);
            setSimulationStatus('error');
            try {
                await refreshMissionData();
            } catch (refreshError) {
                const refreshMessage = refreshError instanceof Error
                    ? refreshError.message
                    : 'Mission status could not be refreshed.';
                setSimulationError(`${message} ${refreshMessage}`);
            }
        }
    };

    useEffect(() => {
        let cancelled = false;

        const loadAstronaut = async () => {
            try {
                const rosterResponse = await fetchWithTimeout(`${API_BASE_URL}/astronaut`);
                if (!rosterResponse.ok) {
                    throw new Error(`Astronaut request failed with status ${rosterResponse.status}.`);
                }

                const roster = await rosterResponse.json();
                if (cancelled) {
                    return;
                }
                if (!Array.isArray(roster) || roster.length === 0) {
                    throw new Error('No astronauts are available from the navigation backend.');
                }

                setAstronauts(roster);
                let activeAstronaut = roster.find((astronaut) => astronaut.active);
                if (!activeAstronaut) {
                    const selectResponse = await fetchWithTimeout(
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
                await refreshMissionData();
            } catch (error) {
                setMissionError(error instanceof Error ? error.message : 'Unable to load astronaut mission data.');
            }
        };

        loadAstronaut();

        fetchWithTimeout(`${API_BASE_URL}/locations`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Lunar locations request failed with status ${response.status}.`);
                }
                return response.json();
            })
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
            .catch((error) => {
                setMissionError(error instanceof Error ? error.message : 'Unable to load saved lunar locations.');
            });

        fetchWithTimeout(`${API_BASE_URL}/hazards`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Surface hazards request failed with status ${response.status}.`);
                }
                return response.json();
            })
            .then((data) => {
                if (data) {
                    setHazards(normalizeHazards(data));
                }
            })
            .catch((error) => {
                setHazards((previousHazards) =>
                    previousHazards.length > 0 ? previousHazards : DEFAULT_HAZARDS);
                setMissionError(error instanceof Error ? error.message : 'Unable to load surface hazards.');
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

    const selectAstronaut = async (astronautId) => {
        try {
            const requestedAstronautId = Number(astronautId);
            const astronautInRoster = astronauts.find((astronaut) =>
                astronaut.id === requestedAstronautId);
            if (!astronautInRoster) {
                throw new Error('The selected astronaut is no longer available.');
            }

            const response = await fetchWithTimeout(
                `${API_BASE_URL}/astronaut/select/${requestedAstronautId}`,
                { method: 'POST' },
            );
            if (!response.ok) {
                throw new Error(`Astronaut selection failed with status ${response.status}.`);
            }

            const astronaut = await response.json();
            if (astronaut.id !== requestedAstronautId || astronaut.active !== true) {
                throw new Error('The backend did not activate the selected astronaut.');
            }

            setSelectedAstronaut(astronaut);
            setCurrentLocation({ x: astronaut.x, y: astronaut.y });
            setStartLocation({
                id: 'current-location',
                label: `${astronaut.name} current location`,
                position: { lat: astronaut.y, lng: astronaut.x },
            });
            setStartSearch(`${astronaut.name} current location`);
            setAstronauts((previousAstronauts) => previousAstronauts.map((member) => ({
                ...member,
                active: member.id === astronaut.id,
            })));
            setMissionError('');
            resetRoutes();
            setMarkerEditor((previous) => {
                if (!previous?.marker.astronauts) {
                    return previous;
                }

                return {
                    ...previous,
                    marker: {
                        ...previous.marker,
                        astronauts: previous.marker.astronauts.map((member) => ({
                            ...member,
                            active: member.id === astronaut.id,
                        })),
                        ...(previous.marker.nearbyAstronauts && {
                            nearbyAstronauts: previous.marker.nearbyAstronauts.map((member) => ({
                                ...member,
                                active: member.id === astronaut.id,
                            })),
                        }),
                    },
                };
            });
            await refreshMissionData();
        } catch (error) {
            setMissionError(error instanceof Error ? error.message : 'Unable to select astronaut.');
        }
    };

    const addAstronautToTeam = (teamId, astronautId) => {
        const existingTeam = astronautTeams.find((team) => team.id === teamId);
        if (!existingTeam) {
            return;
        }

        const memberIds = [...new Set([...existingTeam.memberIds, Number(astronautId)])];
        setAstronautTeams((previousTeams) => previousTeams.map((team) => (
            team.id === teamId
                ? { ...team, memberIds }
                : team
        )));
        setMarkerEditor((previous) => {
            if (previous?.marker.teamId !== teamId) {
                return previous;
            }
            return {
                ...previous,
                marker: {
                    ...previous.marker,
                    astronauts: astronauts.filter((astronaut) => memberIds.includes(astronaut.id)),
                    nearbyAstronauts: previous.marker.nearbyAstronauts.filter(
                        (astronaut) => astronaut.id !== Number(astronautId),
                    ),
                },
            };
        });
    };

    const groupAstronauts = (anchorAstronaut, nearbyAstronaut) => {
        const existingTeam = astronautTeams.find((team) =>
            team.memberIds.includes(anchorAstronaut.id));
        const teamId = existingTeam?.id || `team-${Date.now()}`;
        const memberIds = [...new Set([
            ...(existingTeam?.memberIds || [anchorAstronaut.id]),
            nearbyAstronaut.id,
        ])];
        const members = astronauts.filter((astronaut) => memberIds.includes(astronaut.id));
        const nextTeam = {
            id: teamId,
            memberIds,
            name: existingTeam?.name || createDefaultTeamName(members),
        };

        setAstronautTeams((previousTeams) => [
            ...previousTeams.filter((team) => team.id !== teamId
                && !team.memberIds.includes(nearbyAstronaut.id)),
            nextTeam,
        ]);
        if (memberIds.includes(selectedAstronaut?.id)) {
            const position = getTeamPosition(members);
            const label = `${nextTeam.name} team current location`;
            setCurrentLocation(position);
            setStartLocation({
                id: 'current-location',
                label,
                position: { lat: position.y, lng: position.x },
            });
            setStartSearch(label);
        }
        setTeamNameDraft(nextTeam.name);
        setMarkerEditor({
            mode: 'view',
            marker: {
                id: teamId,
                teamId,
                title: nextTeam.name,
                description: `${members.length} astronauts travelling together.`,
                position: {
                    lat: members.reduce((sum, member) => sum + member.y, 0) / members.length,
                    lng: members.reduce((sum, member) => sum + member.x, 0) / members.length,
                },
                astronauts: members,
                isTeam: true,
                nearbyAstronauts: [],
            },
        });
    };

    const saveTeamName = (teamId) => {
        const name = teamNameDraft.trim();
        if (!name) {
            return;
        }

        setAstronautTeams((previousTeams) => previousTeams.map((team) =>
            team.id === teamId ? { ...team, name } : team));
        const renamedTeam = astronautTeams.find((team) => team.id === teamId);
        if (
            renamedTeam?.memberIds.includes(selectedAstronaut?.id)
            && startLocation.id === 'current-location'
        ) {
            const label = `${name} team current location`;
            setStartLocation((previous) => ({ ...previous, label }));
            setStartSearch(label);
        }
        setMarkerEditor((previous) => previous?.marker.teamId === teamId
            ? { ...previous, marker: { ...previous.marker, title: name } }
            : previous);
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
        } else if (userMarkers.some((userMarker) => userMarker.id === marker.id)) {
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
        } else if (marker.sourceKey) {
            setMarkerOverrides((previousOverrides) => ({
                ...previousOverrides,
                [marker.sourceKey]: {
                    ...marker,
                    title: marker.title.trim(),
                    description: marker.description.trim(),
                },
            }));
        } else {
            setUserMarkers((previousMarkers) => [
                ...previousMarkers,
                {
                    ...marker,
                    id: Date.now(),
                    title: marker.title.trim(),
                    description: marker.description.trim(),
                },
            ]);
        }

        setMarkerEditor(null);
    };

    const planRoute = async () => {
        if (!destination) {
            return;
        }

        routeAbortControllerRef.current?.abort();
        const controller = new AbortController();
        routeAbortControllerRef.current = controller;
        const timeoutId = window.setTimeout(() => controller.abort(), 15000);
        setRouteStatus('loading');
        setRouteError('');
        setRoutes([]);
        setSelectedRouteId(null);
        setSimulationStatus('idle');
        setSimulationStep(0);
        setSimulationError('');

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
                signal: controller.signal,
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
            if (routeAbortControllerRef.current !== controller) {
                return;
            }
            setRouteError(
                controller.signal.aborted
                    ? 'Route calculation timed out after 15 seconds. Check the destination and navigation backend, then try again.'
                    : error instanceof TypeError
                        ? 'Could not reach the navigation backend. Start the FastAPI server at 127.0.0.1:8000 and try again.'
                        : error instanceof Error
                            ? error.message
                            : 'Unable to calculate routes.',
            );
            setRouteStatus('error');
        } finally {
            window.clearTimeout(timeoutId);
            if (routeAbortControllerRef.current === controller) {
                routeAbortControllerRef.current = null;
            }
        }
    };

    const selectMapLocation = (position, label, id = 'map-point') => {
        setStartLocation({ id, label, position });
        setStartSearch(label);
        setSelectingField(null);
        resetRoutes();
    };

    const chooseDestination = (position, id = null, label = null) => {
        setDestination(position);
        setDestinationId(Number.isInteger(id) ? id : null);
        setDestinationSearch(label || `Map point (${position.lng.toFixed(0)}, ${position.lat.toFixed(0)})`);
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
        setDestinationSearch(previousStart.label);
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
        const landingOverride = markerOverrides['landing-site'];
        const landingSite = {
            id: 'landing-site',
            locationKey: 'landing-site',
            sourceKey: 'landing-site',
            title: landingOverride?.title || 'Eagle Lunar Module',
            description: landingOverride?.description || 'Apollo 11 landing site. Coordinates: 0.67408° N, 23.47297° E.',
            type: landingOverride?.type || 'landing',
            position: landingOverride?.position || { lat: yMeters, lng: xMeters, zMeters: 0 },
        };
        const visibleAstronauts = astronauts.length > 0
            ? astronauts
            : [{
                id: 'active',
                name: 'Current astronaut',
                x: currentLocation.x,
                y: currentLocation.y,
                active: true,
            }];
        const userPlaceDescriptors = userMarkers.map((marker) => {
            const sourceKey = `user-${marker.id}`;
            return {
                ...marker,
                ...(markerOverrides[sourceKey] || {}),
                locationKey: sourceKey,
                sourceKey,
            };
        });
        const backendPlaceDescriptors = backendLocations.map((location) => {
            const sourceKey = `backend-${location.id}`;
            return {
                ...location,
                ...(markerOverrides[sourceKey] || {}),
                locationKey: sourceKey,
                sourceKey,
            };
        });
        const pointOfInterestLocations = [
            landingSite,
            ...userPlaceDescriptors,
            ...backendPlaceDescriptors,
        ];
        const teamsWithMembers = astronautTeams
            .map((team) => ({
                ...team,
                members: astronauts.filter((astronaut) => team.memberIds.includes(astronaut.id)),
            }))
            .filter((team) => team.members.length > 1);
        const teamMemberIds = new Set(teamsWithMembers.flatMap((team) =>
            team.members.map((astronaut) => astronaut.id)));
        const astronautsByLocation = new Map();
        const teamsAtLocation = new Map();

        teamsWithMembers.forEach((team) => {
            const location = pointOfInterestLocations.find((candidate) =>
                team.members.every((astronaut) => (
                    Math.hypot(
                        astronaut.x - candidate.position.lng,
                        astronaut.y - candidate.position.lat,
                    ) <= ASTRONAUT_CLUSTER_RADIUS_METERS
                )));
            if (location) {
                teamsAtLocation.set(location.locationKey, [
                    ...(teamsAtLocation.get(location.locationKey) || []),
                    ...team.members,
                ]);
            }
        });

        visibleAstronauts
            .filter((astronaut) => !teamMemberIds.has(astronaut.id))
            .forEach((astronaut) => {
                const location = pointOfInterestLocations
                    .map((candidate) => ({
                        candidate,
                        distance: Math.hypot(
                            astronaut.x - candidate.position.lng,
                            astronaut.y - candidate.position.lat,
                        ),
                    }))
                    .filter(({ distance }) => distance <= ASTRONAUT_CLUSTER_RADIUS_METERS)
                    .sort((first, second) => first.distance - second.distance)[0]?.candidate;
                if (location) {
                    astronautsByLocation.set(location.locationKey, [
                        ...(astronautsByLocation.get(location.locationKey) || []),
                        astronaut,
                    ]);
                }
            });

        const getLocationMembers = (location) => [
            ...(teamsAtLocation.get(location.locationKey) || []),
            ...(astronautsByLocation.get(location.locationKey) || []),
        ];
        const locationGroupedIds = new Set([
            ...Array.from(teamsAtLocation.values()).flatMap((members) =>
                members.map((astronaut) => astronaut.id)),
            ...Array.from(astronautsByLocation.values()).flatMap((members) =>
                members.map((astronaut) => astronaut.id)),
        ]);
        const landingSiteMarker = L.marker([landingSite.position.lat, landingSite.position.lng], {
            icon: createLocationMarkerIcon(landingSite.type, getLocationMembers(landingSite)),
            title: getLocationMembers(landingSite).length > 0
                ? `${landingSite.title} · ${getLocationMembers(landingSite).map((astronaut) => astronaut.name).join(', ')}`
                : landingSite.title,
        }).addTo(map);
        landingSiteMarker.on('click', (event) => {
            L.DomEvent.stopPropagation(event);
            if (simulationStatus !== 'running') {
                openExistingMarkerEditor({
                    ...landingSite,
                    astronauts: getLocationMembers(landingSite),
                });
            }
        });

        teamsWithMembers.forEach((team) => {
            if (team.members.every((astronaut) => locationGroupedIds.has(astronaut.id))) {
                return;
            }
            const position = getTeamPosition(team.members);
            const markerPosition = { lat: position.y, lng: position.x, zMeters: 0 };
            const astronautPlace = {
                id: team.id,
                teamId: team.id,
                title: team.name,
                description: `${team.members.length} astronauts travelling together.`,
                position: markerPosition,
                astronauts: team.members,
                isTeam: true,
                nearbyAstronauts: visibleAstronauts.filter((astronaut) =>
                    !teamMemberIds.has(astronaut.id)
                    && !locationGroupedIds.has(astronaut.id)
                    && Math.hypot(astronaut.x - position.x, astronaut.y - position.y)
                        <= ASTRONAUT_CLUSTER_RADIUS_METERS),
            };
            const astronautMarker = L.marker([position.y, position.x], {
                icon: createTeamIcon(team, team.members),
                title: astronautPlace.title,
                zIndexOffset: team.members.some((astronaut) => astronaut.active) ? 180 : 120,
            })
                .addTo(map);

            astronautMarker.on('click', (event) => {
                L.DomEvent.stopPropagation(event);
                if (simulationStatus !== 'running') {
                    setTeamNameDraft(team.name);
                    openExistingMarkerEditor(astronautPlace);
                }
            });
        });

        visibleAstronauts
            .filter((astronaut) => !teamMemberIds.has(astronaut.id)
                && !locationGroupedIds.has(astronaut.id))
            .forEach((astronaut) => {
                const nearbyAstronauts = visibleAstronauts.filter((candidate) =>
                    candidate.id !== astronaut.id
                    && !teamMemberIds.has(candidate.id)
                    && !locationGroupedIds.has(candidate.id)
                    && Math.hypot(candidate.x - astronaut.x, candidate.y - astronaut.y)
                        <= ASTRONAUT_CLUSTER_RADIUS_METERS);
                const astronautPlace = {
                    id: astronaut.id,
                    title: astronaut.name,
                    description: 'Astronaut current position.',
                    position: { lat: astronaut.y, lng: astronaut.x, zMeters: 0 },
                    astronauts: [astronaut],
                    nearbyAstronauts,
                };
                const astronautMarker = L.marker([astronaut.y, astronaut.x], {
                    icon: createAstronautIcon(astronaut),
                    title: astronaut.name,
                    zIndexOffset: astronaut.active ? 180 : 120,
                }).addTo(map);

                astronautMarker.on('click', (event) => {
                    L.DomEvent.stopPropagation(event);
                    if (simulationStatus !== 'running') {
                        openExistingMarkerEditor(astronautPlace);
                    }
                });
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
            circle.on('click', (event) => {
                L.DomEvent.stopPropagation(event);
                if (simulationStatus !== 'running') {
                    openExistingMarkerEditor({
                        id: `hazard-${hazard.id}`,
                        title: hazard.name,
                        description: hazard.description || 'Hazard area',
                        position: {
                            lat: hazard.position.y,
                            lng: hazard.position.x,
                            zMeters: 0,
                        },
                        isHazard: true,
                        severity,
                        radius: hazard.radius,
                    });
                }
            });
        });

        const startMatchesAstronaut = visibleAstronauts.some((astronaut) =>
            astronaut.y === startLocation.position.lat && astronaut.x === startLocation.position.lng);
        if (
            !startMatchesAstronaut
            && (
                startLocation.position.lat !== APOLLO_11_MAP.landingSite.yMeters
                || startLocation.position.lng !== APOLLO_11_MAP.landingSite.xMeters
            )
        ) {
            const startMarker = L.marker([startLocation.position.lat, startLocation.position.lng], {
                icon: createMarkerIcon('start'),
                title: startLocation.label,
            }).addTo(map);
            startMarker.on('click', (event) => {
                L.DomEvent.stopPropagation(event);
                if (simulationStatus !== 'running') {
                    openExistingMarkerEditor({
                        id: startLocation.id,
                        title: startLocation.label,
                        description: 'Current route starting point.',
                        type: 'start',
                        position: startLocation.position,
                    });
                }
            });
        }

        if (
            destination
            && (
                interactionMode === 'destination'
                || simulationStatus === 'running'
                || simulationStatus === 'complete'
            )
        ) {
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

            const destinationMarker = L.marker([destination.lat, destination.lng], {
                icon: createMarkerIcon('destination'),
                title: destinationSearch,
            }).addTo(map);
            destinationMarker.on('click', (event) => {
                L.DomEvent.stopPropagation(event);
                if (simulationStatus !== 'running') {
                    openExistingMarkerEditor({
                        id: destinationId || 'destination',
                        title: destinationSearch,
                        description: 'Selected route destination.',
                        type: 'destination',
                        position: destination,
                    });
                }
            });
        }

        userPlaceDescriptors.forEach((markerDetails) => {
            const astronautsAtLocation = getLocationMembers(markerDetails);
            const mapMarker = L.marker(
                [markerDetails.position.lat, markerDetails.position.lng],
                {
                    icon: createLocationMarkerIcon(markerDetails.type, astronautsAtLocation),
                    title: markerDetails.title,
                    zIndexOffset: 450,
                },
            ).addTo(map);

            mapMarker.on('click', (event) => {
                L.DomEvent.stopPropagation(event);
                if (simulationStatus === 'running') {
                    return;
                }
                openExistingMarkerEditor({
                    ...markerDetails,
                    astronauts: astronautsAtLocation,
                });
            });
        });

        backendPlaceDescriptors.forEach((markerDetails) => {
            const astronautsAtLocation = getLocationMembers(markerDetails);
            const mapMarker = L.marker(
                [markerDetails.position.lat, markerDetails.position.lng],
                {
                    icon: createLocationMarkerIcon(markerDetails.type, astronautsAtLocation),
                    title: markerDetails.title,
                    zIndexOffset: 500,
                },
            ).addTo(map);

            mapMarker.on('click', (event) => {
                L.DomEvent.stopPropagation(event);
                if (simulationStatus !== 'running') {
                    openExistingMarkerEditor({
                        ...markerDetails,
                        astronauts: astronautsAtLocation,
                    });
                }
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
                zMeters: 0,
            });
        }

        function handleMapClick(event) {
            if (markerEditor) {
                setMarkerEditor(null);
            }

            if (interactionMode === 'destination' && simulationStatus !== 'running') {
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
            if (interactionMode === 'normal' && simulationStatus !== 'running') {
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
        astronauts,
        markerOverrides,
        destinationSearch,
        markerEditor,
        selectingField,
        simulationStatus,
        astronautTeams,
    ]);

    const selectedAstronautTeam = astronautTeams.find((team) =>
        team.memberIds.includes(selectedAstronaut?.id));
    const selectedTeamMembers = selectedAstronautTeam
        ? astronauts.filter((astronaut) => selectedAstronautTeam.memberIds.includes(astronaut.id))
        : [];
    const directionStartPosition = selectedTeamMembers.length > 1
        ? getTeamPosition(selectedTeamMembers)
        : currentLocation;
    const directionStartLabel = selectedAstronautTeam
        ? `${selectedAstronautTeam.name} team current location`
        : `${selectedAstronaut?.name || 'Astronaut'} current location`;

    const locationOptions = [
        {
            id: 'current-location',
            label: directionStartLabel,
            position: { lat: directionStartPosition.y, lng: directionStartPosition.x },
            kind: 'Current position',
        },
        {
            id: 'landing-site',
            label: markerOverrides['landing-site']?.title || 'Eagle landing site',
            position: {
                lat: APOLLO_11_MAP.landingSite.yMeters,
                lng: APOLLO_11_MAP.landingSite.xMeters,
            },
            kind: 'Landing site',
        },
        ...astronauts.map((astronaut) => ({
            id: `astronaut-${astronaut.id}`,
            label: `${markerOverrides[`astronaut-${astronaut.id}`]?.title || astronaut.name} position`,
            position: { lat: astronaut.y, lng: astronaut.x },
            kind: astronaut.active ? 'Selected astronaut' : 'Astronaut',
        })),
        ...userMarkers.map((marker) => ({
            ...(markerOverrides[`user-${marker.id}`] || marker),
            label: markerOverrides[`user-${marker.id}`]?.title || marker.title,
            kind: 'Saved marker',
        })),
        ...backendLocations.map((location) => ({
            ...location,
            ...(markerOverrides[`backend-${location.id}`] || {}),
            kind: location.type === 'oxygen' ? 'Oxygen refuel station' : 'Saved lunar location',
        })),
    ];

    const filteredLocations = locationOptions.filter((location) => {
        const query = selectingField === 'destination' ? destinationSearch : startSearch;
        return location.label.toLowerCase().includes(query.toLowerCase());
    });

    return (
        <div className={`map-shell theme-${theme}`}>
            <aside className="map-sidebar" aria-label="Map navigation">
                <button
                    className="sidebar-button sidebar-button--menu"
                    aria-label="Toggle sidebar"
                    onClick={() => {
                        setInteractionMode('normal');
                        setSelectingField(null);
                        setSidebarPanel((current) => current === 'menu' ? null : 'menu');
                    }}
                >
                    ☰
                </button>
                <button
                    className={interactionMode === 'normal' ? 'sidebar-button sidebar-button--active' : 'sidebar-button'}
                    disabled={simulationStatus === 'running'}
                    onClick={() => setInteractionMode('normal')}
                >
                    <span>⌖</span>
                    <small>Explore</small>
                </button>
                <button
                    className={interactionMode === 'destination' ? 'sidebar-button sidebar-button--active' : 'sidebar-button'}
                    disabled={simulationStatus === 'running'}
                    onClick={() => {
                        setInteractionMode('destination');
                        setSelectingField(null);
                        setSidebarPanel(null);
                    }}
                >
                    <span>➜</span>
                    <small>Directions</small>
                </button>
                <div className="sidebar-divider" />
                <button
                    className={sidebarPanel === 'saved' ? 'sidebar-button sidebar-button--active' : 'sidebar-button'}
                    aria-label="Saved places"
                    onClick={() => {
                        setInteractionMode('normal');
                        setSelectingField(null);
                        setSidebarPanel((current) => current === 'saved' ? null : 'saved');
                    }}
                >
                    <span>♡</span>
                    <small>Saved</small>
                </button>
            </aside>

            {sidebarPanel && (
                <div className="sidebar-panel">
                    <div className="sidebar-panel__header">
                        <h2>{sidebarPanel === 'saved' ? 'Saved places' : 'L.I.F.E. map'}</h2>
                        <button
                            className="icon-button"
                            onClick={() => {
                                setSidebarPanel(null);
                                setInteractionMode('normal');
                                setSelectingField(null);
                            }}
                            aria-label="Close sidebar panel"
                        >
                            ×
                        </button>
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
                                        disabled={simulationStatus === 'running'}
                                        onChange={(event) => selectAstronaut(event.target.value)}
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
                            {oxygenReport && (
                                <div className={`mission-status mission-status--${oxygenReport.oxygen_status.toLowerCase()}`}>
                                    <strong>Oxygen {oxygenReport.oxygen_status}</strong>
                                    <span>
                                        {formatLiters(oxygenReport.oxygen_remaining_liters)} L remaining · {oxygenReport.oxygen_percentage}%
                                    </span>
                                </div>
                            )}
                            {emergencyReport?.alerts?.length > 0 && (
                                <div className={`mission-alert mission-alert--${emergencyReport.emergency_level.toLowerCase()}`}>
                                    <strong>{emergencyReport.emergency_level} alert</strong>
                                    <span>{emergencyReport.alerts[0]}</span>
                                </div>
                            )}
                            {missionError && <p className="route-error">{missionError}</p>}
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

            {missionError && (
                <div className="map-data-warning" role="alert">
                    Map data is incomplete: {missionError}
                </div>
            )}

            <div className="coordinate-tracker">
                {mousePosition ? (
                    <>
                        <div>X: {mousePosition.xMeters.toFixed(2)} m</div>
                        <div>Y: {mousePosition.yMeters.toFixed(2)} m</div>
                        <div>Z: {mousePosition.zMeters.toFixed(2)} m</div>
                        <small>Elevation uses the flat prototype datum.</small>
                    </>
                ) : (
                    <>
                        <div>Move your pointer over the map</div>
                        <small>Elevation uses the flat prototype datum.</small>
                    </>
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
                                disabled={simulationStatus === 'running'}
                                title={vehicle.id}
                                onClick={() => {
                                    setVehicleType(vehicle.id);
                                    resetRoutes();
                                }}
                            >
                                <span aria-hidden="true">{vehicle.icon}</span> {vehicle.label}
                            </button>
                        ))}
                        <button
                            className="directions-close"
                            disabled={simulationStatus === 'running'}
                            onClick={() => {
                                setInteractionMode('normal');
                                setSelectingField(null);
                            }}
                        >
                            ×
                        </button>
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
                            onFocus={() => setSelectingField('start')}
                            disabled={simulationStatus === 'running'}
                            onChange={(event) => {
                                setStartSearch(event.target.value);
                                resetRoutes();
                            }}
                        />
                        <button className="swap-locations" onClick={swapLocations} aria-label="Swap start and destination">↕</button>
                        <input
                            type="text"
                            aria-label="Destination"
                            placeholder="Search or choose a destination"
                            value={destinationSearch}
                            onFocus={() => setSelectingField('destination')}
                            disabled={simulationStatus === 'running'}
                            onChange={(event) => {
                                setDestinationSearch(event.target.value);
                                setDestination(null);
                                setDestinationId(null);
                                resetRoutes();
                            }}
                        />
                    </div>
                    <div className="map-pick-actions">
                        <button
                            disabled={simulationStatus === 'running'}
                            className={selectingField === 'start' ? 'map-pick-button map-pick-button--active' : 'map-pick-button'}
                            onClick={() => setSelectingField('start')}
                        >
                            {selectingField === 'start' ? 'Click map for start' : 'Pick starting point on map'}
                        </button>
                        <button
                            disabled={simulationStatus === 'running'}
                            className={selectingField === 'destination' ? 'map-pick-button map-pick-button--active' : 'map-pick-button'}
                            onClick={() => setSelectingField('destination')}
                        >
                            {selectingField === 'destination' ? 'Click map for destination' : 'Pick destination on map'}
                        </button>
                    </div>
                    <div className="location-results">
                        {filteredLocations.map((location) => (
                            <button
                                key={`${location.kind}-${location.id}`}
                                className="location-result"
                                disabled={simulationStatus === 'running'}
                                onClick={() => {
                                    if (selectingField === 'destination') {
                                        chooseDestination(location.position, location.id, location.label);
                                    } else {
                                        selectMapLocation(location.position, location.label, location.id);
                                    }
                                }}
                            >
                                <strong>{location.label}</strong>
                                <span>{location.kind}</span>
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
                            disabled={routeStatus === 'loading' || simulationStatus === 'running'}
                        >
                            {routeStatus === 'loading' ? 'Calculating...' : 'Plan route'}
                        </button>
                    )}
                    {!destination && (
                        <p className="directions-hint">Choose a destination from the list or pick one on the map.</p>
                    )}
                    {routeStatus === 'error' && (
                        <p className="route-error">{routeError}</p>
                    )}
                </div>
            )}

            {destination && routeStatus === 'success' && (
                <div className="route-panel">
                    <div className="route-panel__header">
                        <h2>
                            {simulationStatus === 'running' || simulationStatus === 'complete'
                                ? 'Route simulation'
                                : 'Available routes'}
                        </h2>
                        {(simulationStatus === 'complete' || simulationStatus === 'error') && (
                            <button
                                className="icon-button"
                                aria-label="Close route simulation"
                                onClick={closeRouteSimulation}
                            >
                                ×
                            </button>
                        )}
                    </div>
                    {simulationStatus === 'running' || simulationStatus === 'complete' ? (
                        <div className="route-simulation">
                            <div className="route-simulation__mission">
                                <strong>{selectedAstronaut?.name || 'Astronaut'}</strong>
                                <span>
                                    {positioning
                                        ? `${positioning.satellites_used} satellites · ${positioning.positioning_status}`
                                        : 'Satellite status unavailable'}
                                </span>
                                <span>
                                    {oxygenReport
                                        ? `O₂ ${formatLiters(oxygenReport.oxygen_remaining_liters)} L · ${oxygenReport.oxygen_status}`
                                        : 'Oxygen status unavailable'}
                                </span>
                                <span>
                                    {emergencyReport
                                        ? `Safety ${emergencyReport.emergency_level}`
                                        : 'Safety status unavailable'}
                                </span>
                            </div>
                            {simulationStatus === 'running' && (
                                <>
                                    <p className="simulation-progress" role="status" aria-live="polite">
                                        Traversing route: {simulationStep} / {
                                            routes.find((route) => route.id === selectedRouteId)?.points.length || 0
                                        } waypoints
                                    </p>
                                    <progress
                                        className="simulation-progress-bar"
                                        value={simulationStep}
                                        max={routes.find((route) => route.id === selectedRouteId)?.points.length || 1}
                                        aria-label="Route simulation progress"
                                    />
                                </>
                            )}
                            {simulationStatus === 'complete' && (
                                <p className="simulation-result simulation-result--complete">
                                    Traversal complete. Current position and mission stats updated.
                                </p>
                            )}
                            {simulationError && (
                                <p className="simulation-result simulation-result--error">{simulationError}</p>
                            )}
                        </div>
                    ) : routes.map((route) => (
                        <button
                            key={route.id}
                            className={selectedRouteId === route.id
                                ? 'route-option route-option--selected'
                                : 'route-option'}
                            disabled={simulationStatus === 'running'}
                            onClick={() => {
                                setSelectedRouteId(route.id);
                                setSimulationStatus('idle');
                                setSimulationStep(0);
                                setSimulationError('');
                            }}
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
                                    <span>Oxygen needed: {formatLiters(route.oxygen_estimate.oxygen_used_liters)} L</span>
                                    <span>Projected remaining: {formatLiters(route.oxygen_estimate.oxygen_remaining_liters)} L ({route.oxygen_estimate.oxygen_percentage}%)</span>
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
                    {selectedRouteId && simulationStatus !== 'complete' && simulationStatus !== 'running' && (
                        <div className="route-simulation">
                            <div className="route-simulation__mission">
                                <strong>{selectedAstronaut?.name || 'Astronaut'}</strong>
                                <span>
                                    {positioning
                                        ? `${positioning.satellites_used} satellites · ${positioning.positioning_status}`
                                        : 'Satellite status unavailable'}
                                </span>
                                <span>
                                    {oxygenReport
                                        ? `O₂ ${formatLiters(oxygenReport.oxygen_remaining_liters)} L · ${oxygenReport.oxygen_status}`
                                        : 'Oxygen status unavailable'}
                                </span>
                                <span>
                                    {emergencyReport
                                        ? `Safety ${emergencyReport.emergency_level}`
                                        : 'Safety status unavailable'}
                                </span>
                            </div>
                            {simulationStatus === 'running' && (
                                <p className="simulation-progress" role="status" aria-live="polite">
                                    Traversing route: {simulationStep} / {
                                        routes.find((route) => route.id === selectedRouteId)?.points.length || 0
                                    } waypoints
                                </p>
                            )}
                            {simulationStatus === 'complete' && (
                                <p className="simulation-result simulation-result--complete">
                                    Traversal complete. Current position and mission stats updated.
                                </p>
                            )}
                            {simulationError && (
                                <p className="simulation-result simulation-result--error">{simulationError}</p>
                            )}
                            <button
                                className="simulate-route-button"
                                disabled={simulationStatus === 'running' || simulationStatus === 'complete'}
                                onClick={simulateSelectedRoute}
                            >
                                {simulationStatus === 'running'
                                    ? 'Simulating...'
                                    : simulationStatus === 'complete'
                                        ? 'Simulation complete'
                                        : 'Simulate selected route'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {markerEditor && (
                <div className="place-panel">
                    <div className="place-panel__header">
                        <div className="place-panel__eyebrow">
                            {markerEditor.mode === 'create'
                                ? 'New place'
                                : markerEditor.mode === 'view'
                                    ? 'Map location'
                                    : 'Edit place'}
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
                            {markerEditor.marker.isTeam && (
                                <div className="place-panel__team-name">
                                    <label htmlFor="team-name">Team name</label>
                                    <div>
                                        <input
                                            id="team-name"
                                            value={teamNameDraft}
                                            onChange={(event) => setTeamNameDraft(event.target.value)}
                                            maxLength={32}
                                        />
                                        <button
                                            className="place-panel__select-astronaut"
                                            disabled={!teamNameDraft.trim()}
                                            onClick={() => saveTeamName(markerEditor.marker.teamId)}
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            )}
                            {markerEditor.marker.isHazard && (
                                <div className={`place-panel__hazard place-panel__hazard--${markerEditor.marker.severity}`}>
                                    <strong>Severity: {markerEditor.marker.severity}</strong>
                                    <span>Hazard radius: {markerEditor.marker.radius} m</span>
                                </div>
                            )}
                            {markerEditor.marker.astronauts && (
                                <div className="place-panel__astronauts">
                                    <strong>
                                        {markerEditor.marker.isTeam
                                            ? 'Team members'
                                            : markerEditor.marker.nearbyAstronauts
                                                ? 'Astronauts'
                                                : markerEditor.marker.locationKey
                                                    ? 'Astronauts at this location'
                                                    : 'Astronaut'}
                                    </strong>
                                    {markerEditor.marker.astronauts.map((astronaut) => (
                                        <div className="place-panel__astronaut" key={astronaut.id}>
                                            <div>
                                                <strong>{astronaut.name}</strong>
                                                <span>
                                                    {astronaut.active ? 'Selected' : 'Available'} ·{' '}
                                                    O₂ {formatLiters(astronaut.current_oxygen_liters)} / {formatLiters(astronaut.max_oxygen_liters)} L
                                                </span>
                                                <span>X: {astronaut.x} m · Y: {astronaut.y} m · Z: 0 m</span>
                                            </div>
                                            {!astronaut.active && (
                                                <button
                                                    className="place-panel__select-astronaut"
                                                    disabled={simulationStatus === 'running'}
                                                    onClick={() => selectAstronaut(astronaut.id)}
                                                >
                                                    Select
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {markerEditor.marker.nearbyAstronauts?.length > 0 && (
                                <div className="place-panel__astronauts">
                                    <strong>Nearby astronauts</strong>
                                    <span className="place-panel__hint">
                                        Group nearby astronauts to travel as one team.
                                    </span>
                                    {markerEditor.marker.nearbyAstronauts.map((astronaut) => (
                                        <div className="place-panel__astronaut" key={astronaut.id}>
                                            <div>
                                                <strong>{astronaut.name}</strong>
                                                <span>
                                                    {astronaut.active ? 'Selected' : 'Available'} ·{' '}
                                                    O₂ {formatLiters(astronaut.current_oxygen_liters)} / {formatLiters(astronaut.max_oxygen_liters)} L
                                                </span>
                                                <span>X: {astronaut.x} m · Y: {astronaut.y} m · Z: 0 m</span>
                                            </div>
                                            <button
                                                className="place-panel__select-astronaut"
                                                disabled={simulationStatus === 'running'}
                                                onClick={() => markerEditor.marker.isTeam
                                                    ? addAstronautToTeam(markerEditor.marker.teamId, astronaut.id)
                                                    : groupAstronauts(markerEditor.marker.astronauts[0], astronaut)}
                                            >
                                                {markerEditor.marker.isTeam ? 'Add' : 'Group'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="place-panel__coordinates">
                                    X: {markerEditor.marker.position.lng.toFixed(2)} m ·{' '}
                                    Y: {markerEditor.marker.position.lat.toFixed(2)} m ·{' '}
                                    Z: {getElevationMeters(markerEditor.marker.position).toFixed(2)} m (flat datum)
                                </div>
                            {!markerEditor.marker.isHazard && (
                                <div className="place-panel__actions">
                                    <button
                                        className="place-panel__directions"
                                        onClick={() => {
                                            chooseDestination(
                                                markerEditor.marker.position,
                                                markerEditor.marker.id,
                                                markerEditor.marker.title,
                                            );
                                            setInteractionMode('destination');
                                            setMarkerEditor(null);
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
                            )}
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
