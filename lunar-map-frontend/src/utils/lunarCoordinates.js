import { APOLLO_11_MAP } from '../config/apollo11Map.js';

const LUNAR_REFERENCE_RADIUS_METERS = 1_737_400;

export function localMetersToLunarCoordinates(xMeters, yMeters) {
    if (!Number.isFinite(xMeters) || !Number.isFinite(yMeters)) {
        return null;
    }

    const { reference, landingSite } = APOLLO_11_MAP;
    const latitudeRadians = reference.latitude * Math.PI / 180;

    return {
        latitude: reference.latitude
            + ((yMeters - landingSite.yMeters) / LUNAR_REFERENCE_RADIUS_METERS)
            * (180 / Math.PI),
        longitude: reference.longitude
            + ((xMeters - landingSite.xMeters)
                / (LUNAR_REFERENCE_RADIUS_METERS * Math.cos(latitudeRadians)))
            * (180 / Math.PI),
    };
}

export function formatLunarCoordinates(xMeters, yMeters) {
    const coordinates = localMetersToLunarCoordinates(xMeters, yMeters);
    if (!coordinates) {
        return 'Coordinates unavailable';
    }

    const latitudeDirection = coordinates.latitude < 0 ? 'S' : 'N';
    const longitudeDirection = coordinates.longitude < 0 ? 'W' : 'E';
    return `${Math.abs(coordinates.latitude).toFixed(5)}° ${latitudeDirection}, `
        + `${Math.abs(coordinates.longitude).toFixed(5)}° ${longitudeDirection}`;
}
