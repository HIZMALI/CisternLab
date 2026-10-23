/**
 * Pure, deterministic daily model. Rain arrives before the entire day's demand.
 * 1 mm falling on 1 m² is 1 liter. No sub-daily timing is represented.
 * Volumes retain floating-point precision; round only when presenting results.
 */
export interface SimulationInput {
  roofAreaM2: number;
  rainfallMm: readonly number[];
  collectionEfficiency: number;
  tankCapacityL: number;
  dailyDemandL: number;
  initialStorageL: number;
}

export interface DailyResult {
  day: number;
  rainfallMm: number;
  openingStorageL: number;
  incomingL: number;
  overflowL: number;
  usedL: number;
  remainingStorageL: number;
  unmetDemandL: number;
}

export interface SimulationResult {
  days: DailyResult[];
  totals: {
    rainfallMm: number;
    incomingL: number;
    overflowL: number;
    usedL: number;
    unmetDemandL: number;
    demandL: number;
    finalStorageL: number;
    /** Null when there is no demand: coverage is undefined, not 100%. */
    demandCoverage: number | null;
    massBalanceErrorL: number;
  };
}

function nonnegativeFinite(name: string, value: number): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, non-negative number.`);
  }
}

export function validateInput(input: SimulationInput): void {
  nonnegativeFinite("Roof area", input.roofAreaM2);
  nonnegativeFinite("Collection efficiency", input.collectionEfficiency);
  nonnegativeFinite("Tank capacity", input.tankCapacityL);
  nonnegativeFinite("Daily demand", input.dailyDemandL);
  nonnegativeFinite("Initial storage", input.initialStorageL);
  if (input.collectionEfficiency > 1)
    throw new RangeError("Collection efficiency must be between 0 and 1.");
  if (input.initialStorageL > input.tankCapacityL)
    throw new RangeError("Initial storage cannot exceed tank capacity.");
  if (!Array.isArray(input.rainfallMm) || input.rainfallMm.length === 0) {
    throw new RangeError("Provide at least one daily rainfall value.");
  }
  // Array.from also exposes sparse-array holes for validation.
  Array.from(input.rainfallMm).forEach((rain, index) =>
    nonnegativeFinite(`Rainfall on day ${index + 1}`, rain),
  );
}

/** Assert conservation with a scale-relative tolerance for IEEE-754 arithmetic. */
function assertBalance(left: number, right: number): void {
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    throw new RangeError(
      "Scenario produces volumes outside the supported numeric range.",
    );
  }
  const tolerance = Math.max(1, Math.abs(left), Math.abs(right)) * 1e-10;
  if (Math.abs(left - right) > tolerance)
    throw new Error("Water-mass conservation failed.");
}

export function simulate(input: SimulationInput): SimulationResult {
  validateInput(input);
  let storage = input.initialStorageL;
  let rainfallMm = 0;
  let incomingL = 0;
  let overflowL = 0;
  let usedL = 0;
  let unmetDemandL = 0;

  const days = input.rainfallMm.map((rain, index): DailyResult => {
    const openingStorageL = storage;
    const incoming = rain * input.roofAreaM2 * input.collectionEfficiency;
    const available = storage + incoming;
    const overflow = Math.max(0, available - input.tankCapacityL);
    const retained = Math.min(input.tankCapacityL, available);
    const used = Math.min(input.dailyDemandL, retained);
    storage = retained - used;
    const unmet = input.dailyDemandL - used;

    assertBalance(available, overflow + used + storage);
    assertBalance(input.dailyDemandL, used + unmet);
    if (storage < 0 || storage > input.tankCapacityL)
      throw new Error("Storage bounds violated.");

    rainfallMm += rain;
    incomingL += incoming;
    overflowL += overflow;
    usedL += used;
    unmetDemandL += unmet;
    return {
      day: index + 1,
      rainfallMm: rain,
      openingStorageL,
      incomingL: incoming,
      overflowL: overflow,
      usedL: used,
      remainingStorageL: storage,
      unmetDemandL: unmet,
    };
  });

  const demandL = input.dailyDemandL * days.length;
  const totalSupply = input.initialStorageL + incomingL;
  const totalOutputs = overflowL + usedL + storage;
  assertBalance(totalSupply, totalOutputs);
  assertBalance(demandL, usedL + unmetDemandL);
  nonnegativeFinite("Total rainfall", rainfallMm);

  return {
    days,
    totals: {
      rainfallMm,
      incomingL,
      overflowL,
      usedL,
      unmetDemandL,
      demandL,
      finalStorageL: storage,
      demandCoverage: demandL > 0 ? usedL / demandL : null,
      massBalanceErrorL: totalSupply - totalOutputs,
    },
  };
}
