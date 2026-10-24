import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { APOLLO_11_MAP } from '../config/apollo11Map.js';

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

        if (destination) {
            L.polyline(
                [
                    [yMeters, xMeters],
                    [destination.lat, destination.lng]
                ],
                {
                    color: '#63a163',
                    weight: 4,
                    opacity: 0.9,
                    dashArray: '10, 8',
                },
            ).addTo(map);

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
    }, [isSelectingDestination, destination, interactionMode, userMarkers,]);

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
                onClick={() => setInteractionMode('place-marker')}
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
        </div>
    )
}

export default MapCanvas;
