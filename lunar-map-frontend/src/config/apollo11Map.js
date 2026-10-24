const image = {
    widthPixels: 979,
    heightPixels: 550,
    metersPerPixel: 1,
};

export const APOLLO_11_MAP = {
    reference: {
        latitude: 0.67408,
        longitude: 23.47297,
    },

    image,

    extent: {
        widthMeters: image.widthPixels * image.metersPerPixel,
        heightMeters: image.heightPixels * image.metersPerPixel,
    },

    landingSite: {
        xMeters: 450,
        yMeters: 290,
    },
};