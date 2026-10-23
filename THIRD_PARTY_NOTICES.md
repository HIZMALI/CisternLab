# Third-party data and software

The MIT license in `LICENSE` applies to original CisternLab code and documentation. It does not assign ownership of third-party material to CisternLab.

## Weather and location data

Weather data by [Open-Meteo](https://open-meteo.com/), using [ERA5 / Copernicus Climate Change Service (C3S)](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels). Location search uses [GeoNames](https://www.geonames.org/).

Open-Meteo API data is provided under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); retain attribution, the license link and notice of transformations. See the provider's [licensing information](https://open-meteo.com/en/licence), [historical API documentation](https://open-meteo.com/en/docs/historical-weather-api) and [service terms](https://open-meteo.com/en/terms). Free public API use is non-commercial; the code's MIT license does not grant commercial access to that service.

The archived Edirne JSON preserves the original downloaded daily rainfall and its provenance. CisternLab transforms rainfall into estimated daily tank balances, capacity comparisons and conditional freshwater displacement. These outputs are not measured site savings, station observations, or provider-endorsed results. The archived SHA-256 and complete original requests remain in the application, exports and build reports.

## Bundled software and fonts

- React and React DOM: MIT.
- Recharts: MIT (with its own dependency notices).
- Lucide icons: ISC.
- DM Sans and Space Grotesk, bundled through Fontsource: SIL Open Font License 1.1. Their original copyright and license texts are preserved in [DM Sans OFL](public/licenses/DM-Sans-OFL.txt) and [Space Grotesk OFL](public/licenses/Space-Grotesk-OFL.txt) and ship in the deployed `licenses/` directory.
- Build and test dependencies retain their respective package licenses. `package-lock.json` records exact package versions and published license identifiers; installed package license files provide the full texts.

No third-party logo, stock image or claim of affiliation is introduced.
