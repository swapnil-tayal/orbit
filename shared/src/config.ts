export const CONFIG = {
  maxUsers: 50,
  office: {
    name: "Office",
    desksPerRow: 4,
    initialRows: 2,
    maxRows: 6,
  },
  movement: {
    unitsPerMetre: 77.3,
    speedMps: 1.4,
    easeInMs: 150,
    avoidRadiusM: 0.4,
    remoteSmoothMs: 100,
    posRateHz: 15,
    seatedEnterUnits: 24,
    seatedExitUnits: 40,
    gridCell: 20,
  },
  zones: {
    exitFactor: 1.3,
    fadeInMs: 600,
    fadeOutMs: 400,
    toastMs: 2000,
  },
  presence: {
    offlineGraceMs: 30000,
    returnHomeOnOffline: true,
  },
  travel: {
    car: { baseS: 4, kmPerS: 60, maxS: 30, maxKm: 1500 },
    flight: { baseS: 4, kmPerS: 1500, maxS: 12, peakKmMax: 900, peakFraction: 0.16 },
    arrivalToleranceMs: 100,
    serverFallbackMs: 250,
    easeFractionMax: 0.25,
    easeMsMax: 1500,
  },
  globe: {
    levels: { orbit: 12000, region: 2000, area: 400, unit: 50 },
    hMinKm: 45,
    clusterPx: 34,
    clusterKeepPx: 42,
    flyMs: 900,
    settleMs: 600,
    vfovDeg: 60,
  },
  geo: {
    earthRadiusKm: 6371,
    unitKm: 50,
    kmPerDeg: 111.32,
    minHabitableLat: -60,
  },
  rates: {
    posPerSec: 20,
    speakingPerSec: 4,
    persistPositionMs: 5000,
  },
} as const;

export const SPEED_UNITS_PER_S = CONFIG.movement.speedMps * CONFIG.movement.unitsPerMetre;
