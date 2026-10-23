/** Authored synthetic sequences, not observations, forecasts, or historical records. */
export const DEMO_DATASETS = [
  {
    id: "mixed",
    name: "Mixed rainfall",
    description: "A little rain, a few dry spells.",
    rainfallMm: [
      0, 4, 12, 6, 0, 0, 3, 18, 8, 0, 0, 0, 5, 14, 2, 0, 0, 9, 22, 4, 0, 0, 7,
      11, 0, 0, 3, 16, 6, 0,
    ],
  },
  {
    id: "dry",
    name: "Dry spell",
    description: "Long gaps put stored water to work.",
    rainfallMm: [
      8, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0,
      0, 0, 0, 0, 0,
    ],
  },
  {
    id: "storm",
    name: "Heavy bursts",
    description: "Short storms test tank capacity.",
    rainfallMm: [
      0, 0, 35, 22, 0, 0, 0, 0, 4, 0, 0, 42, 18, 0, 0, 0, 0, 0, 6, 0, 28, 32, 0,
      0, 0, 0, 0, 12, 0, 0,
    ],
  },
] as const;

export const DEFAULT_SCENARIO = {
  roofAreaM2: 120,
  collectionEfficiency: 0.8,
  tankCapacityL: 2000,
  dailyDemandL: 250,
  initialStorageL: 0,
} as const;
