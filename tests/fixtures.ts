/** Synthetic transport fixtures ONLY: shaped like API responses, not real ERA5 records. */
export const edirne = {
  id: 747712,
  name: "Edirne",
  latitude: 41.67719,
  longitude: 26.55597,
  admin1: "Edirne",
  country: "Republic of Türkiye",
  country_code: "TR",
  timezone: "Europe/Istanbul",
};
export const namesakes = {
  results: [
    {
      id: 1,
      name: "Springfield",
      latitude: 39.8,
      longitude: -89.6,
      admin1: "Illinois",
      country: "United States",
      country_code: "US",
      timezone: "America/Chicago",
    },
    {
      id: 2,
      name: "Springfield",
      latitude: 42.1,
      longitude: -72.6,
      admin1: "Massachusetts",
      country: "United States",
      country_code: "US",
      timezone: "America/New_York",
    },
  ],
};
export function archiveFixture(year: number = 2025) {
  // Independent UTC timestamp construction, not the adapter's calendar-date generator.
  const count = year === 2024 ? 366 : 365;
  return {
    latitude: 41.75,
    longitude: 26.5,
    timezone: "Europe/Istanbul",
    timezone_abbreviation: "GMT+3",
    utc_offset_seconds: 10800,
    daily_units: { time: "iso8601", rain_sum: "mm" },
    daily: {
      time: Array.from({ length: count }, (_, i) =>
        new Date(Date.UTC(year, 0, 1) + i * 86400000)
          .toISOString()
          .slice(0, 10),
      ),
      rain_sum: Array.from({ length: count }, (_, i) =>
        i % 11 === 0 ? 14.7 : i % 5 === 0 ? 2.4 : 0,
      ),
    },
  };
}
