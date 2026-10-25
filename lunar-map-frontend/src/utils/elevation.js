import { localMetersToLunarCoordinates } from './lunarCoordinates.js';

const ELEVATION_DATA_URL = '/elevation/apollo11-sldem2015.json';

export async function loadElevationGrid() {
    const response = await fetch(ELEVATION_DATA_URL);
    if (!response.ok) {
        throw new Error(`Elevation data request failed with status ${response.status}.`);
    }

    const grid = await response.json();
    const { metadata, values } = grid ?? {};
    if (
        metadata?.schemaVersion !== 1
        || !Number.isFinite(metadata.pixelsPerDegree)
        || metadata.pixelsPerDegree <= 0
        || !Number.isInteger(metadata.rows)
        || !Number.isInteger(metadata.columns)
        || !Number.isFinite(metadata.westLongitudeDegrees)
        || !Number.isFinite(metadata.northLatitudeDegrees)
        || !Number.isFinite(metadata.referenceRadiusMeters)
        || metadata.referenceRadiusMeters <= 0
        || !Array.isArray(values)
        || values.length !== metadata.rows
        || values.some((row) => !Array.isArray(row) || row.length !== metadata.columns)
    ) {
        throw new Error('Elevation data has an invalid grid format.');
    }

    return grid;
}

export function sampleElevationMeters(grid, position) {
    if (!grid || !Number.isFinite(position?.xMeters) || !Number.isFinite(position?.yMeters)) {
        return null;
    }

    const { metadata, values } = grid;
    const coordinates = localMetersToLunarCoordinates(position.xMeters, position.yMeters);
    if (!coordinates) {
        return null;
    }
    const column = (coordinates.longitude - metadata.westLongitudeDegrees)
        * metadata.pixelsPerDegree - 0.5;
    const row = (metadata.northLatitudeDegrees - coordinates.latitude)
        * metadata.pixelsPerDegree - 0.5;

    if (
        column < 0
        || row < 0
        || column > metadata.columns - 1
        || row > metadata.rows - 1
    ) {
        return null;
    }

    const left = Math.floor(column);
    const top = Math.floor(row);
    const right = Math.min(left + 1, metadata.columns - 1);
    const bottom = Math.min(top + 1, metadata.rows - 1);
    const columnWeight = column - left;
    const rowWeight = row - top;
    const samples = [
        [values[top][left], (1 - columnWeight) * (1 - rowWeight)],
        [values[top][right], columnWeight * (1 - rowWeight)],
        [values[bottom][left], (1 - columnWeight) * rowWeight],
        [values[bottom][right], columnWeight * rowWeight],
    ].filter(([value, weight]) => Number.isFinite(value) && weight > 0);
    const totalWeight = samples.reduce((total, [, weight]) => total + weight, 0);

    if (totalWeight === 0) {
        return null;
    }

    return samples.reduce((total, [value, weight]) => total + value * weight, 0) / totalWeight;
}
