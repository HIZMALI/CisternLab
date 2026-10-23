import { lazy, Suspense, useId, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CloudRain,
  Droplet,
  FlaskConical,
  House,
  Info,
  Leaf,
  Menu,
  RotateCcw,
  School,
  ShieldCheck,
  SlidersHorizontal,
  Warehouse,
  Waves,
  X,
} from "lucide-react";
import { DEMO_DATASETS, DEFAULT_SCENARIO } from "./data/demo";
import { simulate } from "./engine/simulation";
import type { SimulationInput } from "./engine/simulation";
import { resultsToCsv } from "./engine/csv";
import RainfallSource from "./components/RainfallSource";
import { syntheticDataset } from "./data/rainfall";
import type { HistoricalDataset, SourceMode } from "./data/rainfall";

const HistoricalVariabilityLab = lazy(
  () => import("./components/HistoricalVariabilityLab"),
);

const TankSizingLab = lazy(() => import("./components/TankSizingLab"));

const WaterChart = lazy(() => import("./components/WaterChart"));

const format = (value: number, decimals = 0) =>
  new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: decimals,
  }).format(value);

type Scenario = Omit<SimulationInput, "rainfallMm">;
type Place = "Home" | "School" | "Small facility";

const PLACE_PRESETS: Record<Place, Scenario> = {
  Home: { ...DEFAULT_SCENARIO },
  School: {
    roofAreaM2: 600,
    collectionEfficiency: 0.8,
    tankCapacityL: 10000,
    dailyDemandL: 1200,
    initialStorageL: 0,
  },
  "Small facility": {
    roofAreaM2: 300,
    collectionEfficiency: 0.8,
    tankCapacityL: 5000,
    dailyDemandL: 600,
    initialStorageL: 0,
  },
};

function NumberControl({
  label,
  value,
  min = 0,
  max,
  step = 1,
  unit,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max: number;
  step?: number;
  unit: string;
  hint?: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const number = Number(draft);
  const valid =
    draft.trim() !== "" &&
    Number.isFinite(number) &&
    number >= min &&
    number <= max;
  function update(raw: string) {
    setDraft(raw);
    const parsed = Number(raw);
    if (
      raw.trim() !== "" &&
      Number.isFinite(parsed) &&
      parsed >= min &&
      parsed <= max
    )
      onChange(parsed);
  }
  return (
    <div className="number-control">
      <div className="control-heading">
        <label htmlFor={id}>{label}</label>
        <div className={`number-wrap ${valid ? "" : "invalid"}`}>
          <input
            id={id}
            type="number"
            min={min}
            max={max}
            step="any"
            value={draft}
            aria-invalid={!valid}
            aria-describedby={`${id}-hint`}
            onChange={(e) => update(e.target.value)}
          />
          <span>{unit}</span>
        </div>
      </div>
      <input
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={`${label} slider`}
        style={
          {
            "--fill": `${max > min ? ((value - min) / (max - min)) * 100 : 0}%`,
          } as React.CSSProperties
        }
        onChange={(e) => update(e.target.value)}
      />
      <div
        id={`${id}-hint`}
        className={`control-hint ${valid ? "" : "input-error"}`}
      >
        {valid
          ? hint
          : `Enter a number from ${min} to ${format(max)}. Results use the last valid value.`}
      </div>
    </div>
  );
}

function RoofIllustration({
  roof,
  capacity,
  efficiency,
}: {
  roof: number;
  capacity: number;
  efficiency: number;
}) {
  return (
    <div
      className="diagram-wrap"
      aria-label="Rain falls onto a roof, travels through a gutter, and fills a rainwater tank"
      role="img"
    >
      <svg className="roof-diagram" viewBox="0 0 550 300" aria-hidden="true">
        <defs>
          <pattern
            id="diagram-grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="0.7" fill="#bbcab7" />
          </pattern>
          <linearGradient id="water-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#77ab98" />
            <stop offset="1" stopColor="#4f8673" />
          </linearGradient>
        </defs>
        <rect
          width="550"
          height="300"
          fill="url(#diagram-grid)"
          opacity=".55"
        />
        <ellipse
          cx="296"
          cy="258"
          rx="202"
          ry="20"
          fill="#c9d6c0"
          opacity=".35"
        />
        <g
          className="rain-lines"
          stroke="#8eaaa0"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="m162 44-5 10m37-28-5 10m37 4-5 10m39-24-5 10m37 4-5 10m37-24-5 10m37 4-5 10m-177 6-5 10m65-8-5 10m69-8-5 10m65-8-5 10" />
        </g>
        <path
          d="M153 143v96l130 19V153Z"
          fill="#e6e9d9"
          stroke="#80917b"
          strokeWidth="1.4"
        />
        <path
          d="m283 153 96-55v117l-96 43Z"
          fill="#d2dcc7"
          stroke="#80917b"
          strokeWidth="1.4"
        />
        <path
          d="m126 143 96-77 89 15-28 82Z"
          fill="#8b9d83"
          stroke="#647d65"
          strokeWidth="1.5"
        />
        <path
          d="m222 66 117-20 60 57-116 60Z"
          fill="#b1bfa2"
          stroke="#647d65"
          strokeWidth="1.5"
        />
        <g stroke="#7f9477" strokeWidth="1" opacity=".65">
          <path d="m241 63 60 91m-39-95 59 85m-38-89 58 75m-35-79 56 66" />
          <path d="m243 87 118-20m-102 43 116-27m-101 50 116-35" />
        </g>
        <path
          d="m126 143 157 24 118-61"
          fill="none"
          stroke="#4d6855"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <path
          d="M399 107v48q0 10 11 10h22v22"
          fill="none"
          stroke="#7b9378"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          d="M399 108v47q0 10 11 10h22v20"
          fill="none"
          stroke="#dceab4"
          strokeWidth="2"
          strokeDasharray="5 5"
          className="flow-line"
        />
        <path d="m181 185 34 5v44l-34-5Z" fill="#a9bca1" stroke="#80917b" />
        <path d="m237 194 22 4v22l-22-4Z" fill="#bdd4c4" stroke="#80917b" />
        <path
          d="M406 188v54c0 17 74 17 74 0v-54Z"
          fill="#dce3d1"
          stroke="#66856e"
          strokeWidth="1.5"
        />
        <path d="M407 208v34c0 15 72 15 72 0v-34Z" fill="url(#water-fill)" />
        <ellipse cx="443" cy="208" rx="36" ry="10" fill="#94c0aa" />
        <ellipse
          cx="443"
          cy="188"
          rx="37"
          ry="12"
          fill="#e8eddc"
          stroke="#66856e"
          strokeWidth="1.5"
        />
        <ellipse cx="443" cy="185" rx="12" ry="4" fill="#9aaf91" />
        <path d="M480 234h12v11" fill="none" stroke="#66856e" strokeWidth="4" />
        <path d="m101 239 8-10 7 12m-2-5 10-14 10 18" fill="#93aa83" />
        <path d="m347 249 8-12 6 9m-1 0 8-16 8 12" fill="#93aa83" />
        <path
          d="M88 102h56l18 14M465 93h-56l-15 38M495 271h-50v-12"
          fill="none"
          stroke="#90a28b"
          strokeWidth="1"
        />
        <g fill="#455c49" fontFamily="DM Sans, sans-serif" fontSize="11">
          <text x="53" y="91">
            ROOFTOP
          </text>
          <text x="419" y="82">
            COLLECTION
          </text>
          <text x="465" y="288">
            STORAGE
          </text>
        </g>
      </svg>
      <div className="diagram-stat roof-stat">
        <span>{format(roof)} m²</span>
        <small>catchment area</small>
      </div>
      <div className="diagram-stat efficiency-stat">
        <span>{format(efficiency * 100)}%</span>
        <small>efficiency</small>
      </div>
      <div className="diagram-bottom">
        <span>
          <i /> Roof to tank. Drop by drop.
        </span>
        <span>{format(capacity)} L capacity</span>
      </div>
    </div>
  );
}

export default function App() {
  const [scenario, setScenario] = useState<Scenario>({ ...DEFAULT_SCENARIO });
  const [place, setPlace] = useState<Place>("Home");
  const [datasetIndex, setDatasetIndex] = useState(0);
  const [sourceMode, setSourceMode] = useState<SourceMode>("synthetic");
  const [historical, setHistorical] = useState<HistoricalDataset | null>(null);
  const [revision, setRevision] = useState(0);
  const [chartMode, setChartMode] = useState<"storage" | "balance">("storage");
  const [showAllDays, setShowAllDays] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exported, setExported] = useState(false);
  const demo = DEMO_DATASETS[datasetIndex];
  const synthetic = useMemo(
    () => syntheticDataset(datasetIndex),
    [datasetIndex],
  );
  const dataset = historical ?? synthetic;
  const dayCount = dataset.rainfallMm.length;
  const balanceVolume = (value: number) =>
    historical && value >= 10000
      ? new Intl.NumberFormat("en-GB", {
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(value)
      : format(value, 1);
  const metricVolume = (value: number) =>
    value >= 1000000
      ? new Intl.NumberFormat("en-GB", {
          notation: "compact",
          maximumFractionDigits: 2,
        }).format(value)
      : format(value);
  const input = useMemo(
    () => ({ ...scenario, rainfallMm: dataset.rainfallMm }),
    [scenario, dataset],
  );
  const result = useMemo(() => simulate(input), [input]);
  const { totals } = result;
  const coverage =
    totals.demandCoverage === null ? null : totals.demandCoverage * 100;
  const daysFullyServed = result.days.filter(
    (day) => day.unmetDemandL === 0,
  ).length;

  function setParameter(key: keyof Scenario, value: number) {
    setScenario((current) => ({
      ...current,
      [key]: value,
      ...(key === "tankCapacityL"
        ? { initialStorageL: Math.min(current.initialStorageL, value) }
        : {}),
    }));
    setExported(false);
  }
  function selectPlace(next: Place) {
    setPlace(next);
    setScenario({ ...PLACE_PRESETS[next] });
    setRevision((current) => current + 1);
    setExported(false);
  }
  function reset() {
    selectPlace("Home");
    setDatasetIndex(0);
    setSourceMode("synthetic");
    setHistorical(null);
    setShowAllDays(false);
    setChartMode("storage");
  }
  function exportResults() {
    const blob = new Blob([resultsToCsv(input, result, dataset)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      dataset.kind === "synthetic"
        ? `cisternlab-${dataset.id}-demo.csv`
        : `cisternlab-era5-${dataset.location.id}-${dataset.year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExported(true);
  }

  return (
    <>
      <a className="skip-link" href="#simulator">
        Skip to simulator
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <a href="#overview" className="brand">
            <span className="brand-icon">
              <Droplet size={21} strokeWidth={1.7} />
            </span>
            Cistern<span className="brand-light">Lab</span>
            <span className="build-badge">BUILD 04</span>
          </a>
          <nav
            className={menuOpen ? "nav open" : "nav"}
            aria-label="Main navigation"
          >
            <a href="#overview" onClick={() => setMenuOpen(false)}>
              Overview
            </a>
            <a
              href="#simulator"
              className="active"
              onClick={() => setMenuOpen(false)}
            >
              Simulator
            </a>
            <a href="#tank-sizing" onClick={() => setMenuOpen(false)}>
              Tank Sizing
            </a>
            <a
              href="#historical-variability"
              onClick={() => setMenuOpen(false)}
            >
              Historical Variability Lab
            </a>
            <a href="#methodology" onClick={() => setMenuOpen(false)}>
              Methodology <ArrowUpRight size={13} />
            </a>
          </nav>
          <span className="hackathon-label">
            <span /> Green Shift Hacks 2026
          </span>
          <button
            className="menu-button icon-button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <main className="container">
        <section id="overview" className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="tiny-line" /> THE RAINWATER PLANNING LAB
            </div>
            <h1>
              Every drop has
              <br /> a <span>second life.</span>
            </h1>
            <p>
              Your roof can do more. Explore how collecting rainwater could meet
              everyday needs, one transparent simulation at a time.
            </p>
            <a className="hero-cta" href="#simulator">
              Find your water potential <ArrowDown size={15} />
            </a>
            <div className="hero-trust">
              <ShieldCheck size={14} />
              <span>Open assumptions. No black boxes.</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-badge">
              <CloudRain size={13} /> A LITTLE RAIN. A LOT OF POSSIBILITY.
            </div>
            <RoofIllustration
              roof={scenario.roofAreaM2}
              capacity={scenario.tankCapacityL}
              efficiency={scenario.collectionEfficiency}
            />
          </div>
        </section>

        <div className="demo-notice">
          <span className="demo-label">
            <FlaskConical size={13} />{" "}
            {historical ? "HISTORICAL REANALYSIS — ERA5" : "DEMO DATA"}
          </span>
          <p>
            {historical
              ? "Rainfall is historical ERA5 reanalysis, not station measurements. Simulation results remain estimates."
              : "This is an exploration space. Rainfall is synthetic, and every result is an estimate."}
          </p>
          <a href="#methodology">
            How it works <ArrowUpRight size={13} />
          </a>
        </div>

        <section id="simulator" className="simulator-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow section-eyebrow">
                YOUR ROOF. YOUR SCENARIO.
              </div>
              <h2>Make room for the rain.</h2>
              <p>Adjust the inputs. See the balance change.</p>
            </div>
            <button
              className="secondary-button export-button"
              onClick={exportResults}
            >
              {exported ? <Check size={15} /> : <ArrowDownToLine size={15} />}{" "}
              {exported ? "CSV downloaded" : "Export results"}
            </button>
          </div>

          <RainfallSource
            mode={sourceMode}
            dataset={dataset}
            onModeChange={(mode) => {
              setSourceMode(mode);
              if (mode === "synthetic") setHistorical(null);
              setShowAllDays(false);
              setExported(false);
            }}
            onLoad={(data) => {
              setHistorical(data);
              setShowAllDays(false);
              setExported(false);
            }}
          />

          <div className="workspace-grid">
            <aside
              className="config-panel panel"
              aria-labelledby="scenario-heading"
            >
              <div className="panel-heading">
                <h3 id="scenario-heading">
                  <SlidersHorizontal size={16} /> Configure scenario
                </h3>
                <button
                  className="reset-button icon-button"
                  onClick={reset}
                  aria-label="Reset scenario to defaults"
                  title="Reset to defaults"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
              <div className="config-body">
                <span className="field-label">Start with a space</span>
                <div
                  className="place-options"
                  role="group"
                  aria-label="Starting scenario"
                >
                  {(
                    [
                      { name: "Home", icon: House },
                      { name: "School", icon: School },
                      { name: "Small facility", icon: Warehouse },
                    ] as const
                  ).map(({ name, icon: Icon }) => (
                    <button
                      key={name}
                      className={
                        place === name
                          ? "place-button selected"
                          : "place-button"
                      }
                      aria-pressed={place === name}
                      onClick={() => selectPlace(name)}
                    >
                      <Icon size={16} />
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
                <p className="preset-note">
                  Illustrative starting values. Make them your own.
                </p>
                <div className="control-group" key={revision}>
                  <NumberControl
                    label="Roof area"
                    value={scenario.roofAreaM2}
                    max={2000}
                    step={10}
                    unit="m²"
                    hint="Horizontal roof catchment area"
                    onChange={(v) => setParameter("roofAreaM2", v)}
                  />
                  <NumberControl
                    label="Tank capacity"
                    value={scenario.tankCapacityL}
                    max={20000}
                    step={100}
                    unit="L"
                    hint="Maximum water the tank can hold"
                    onChange={(v) => setParameter("tankCapacityL", v)}
                  />
                  <NumberControl
                    label="Daily demand"
                    value={scenario.dailyDemandL}
                    max={3000}
                    step={10}
                    unit="L/day"
                    hint="For non-potable uses only"
                    onChange={(v) => setParameter("dailyDemandL", v)}
                  />
                  <NumberControl
                    label="Collection efficiency"
                    value={scenario.collectionEfficiency * 100}
                    max={100}
                    unit="%"
                    hint="Accounts for collection losses"
                    onChange={(v) =>
                      setParameter("collectionEfficiency", v / 100)
                    }
                  />
                  <NumberControl
                    key={`initial-${scenario.tankCapacityL}`}
                    label="Initial storage"
                    value={scenario.initialStorageL}
                    max={scenario.tankCapacityL}
                    step={10}
                    unit="L"
                    hint="Water in the tank before day 1"
                    onChange={(v) => setParameter("initialStorageL", v)}
                  />
                </div>
                {!historical ? (
                  <div className="rainfall-field">
                    <label className="field-label" htmlFor="rainfall-pattern">
                      Rainfall pattern{" "}
                      <span className="tiny-tag">SYNTHETIC</span>
                    </label>
                    <div className="select-wrap">
                      <CloudRain size={16} />
                      <select
                        id="rainfall-pattern"
                        value={datasetIndex}
                        onChange={(e) => {
                          setDatasetIndex(Number(e.target.value));
                          setExported(false);
                        }}
                      >
                        {DEMO_DATASETS.map((item, i) => (
                          <option key={item.id} value={i}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} />
                    </div>
                    <p>{demo.description}</p>
                    <div className="rainfall-spark" aria-hidden="true">
                      {demo.rainfallMm.map((rain, i) => (
                        <span
                          key={i}
                          style={{
                            height: `${Math.max(3, (rain / 42) * 35)}px`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="spark-labels">
                      <span>Day 1</span>
                      <span>30 simulated days</span>
                      <span>Day 30</span>
                    </div>
                  </div>
                ) : (
                  <div className="rainfall-field active-rainfall-note">
                    <CloudRain size={17} />
                    <p>
                      <strong>
                        {historical.year} · {historical.location.name}
                      </strong>
                      <br />
                      {dayCount} validated daily ERA5 values. Change the source
                      above; scenario controls reuse this series.
                    </p>
                  </div>
                )}
              </div>
              <div className="config-footer">
                <span className="live-dot" /> Recalculates as you explore
              </div>
            </aside>

            <div className="results-column">
              <div className="results-heading">
                <span>
                  <span className="live-dot" /> Your {dayCount}-day outlook
                </span>
                <span className="estimate-label">ESTIMATED RESULT</span>
              </div>
              <div
                className="metrics-grid"
                aria-live="polite"
                aria-atomic="true"
              >
                <article className="metric-card metric-primary">
                  <div className="metric-label">
                    Rainwater put to use <Droplet size={17} />
                  </div>
                  <p className="metric-number" data-testid="water-used">
                    {metricVolume(totals.usedL)} <span>L</span>
                  </p>
                  <p className="metric-caption">
                    Potential freshwater displaced
                  </p>
                  <div className="metric-decoration" aria-hidden="true">
                    <Waves size={85} strokeWidth={0.6} />
                  </div>
                </article>
                <article className="metric-card">
                  <div className="metric-label">
                    Demand covered <Leaf size={17} />
                  </div>
                  <p className="metric-number" data-testid="coverage">
                    {coverage === null ? "—" : format(coverage, 1)}
                    <span>{coverage === null ? "" : "%"}</span>
                  </p>
                  <p className="metric-caption">
                    {coverage === null
                      ? "No demand configured"
                      : `${daysFullyServed} of ${dayCount} days fully supplied`}
                  </p>
                  <div className="coverage-track" aria-hidden="true">
                    <span style={{ width: `${coverage ?? 0}%` }} />
                  </div>
                </article>
                <article className="metric-card">
                  <div className="metric-label">
                    Tank overflow <Waves size={17} />
                  </div>
                  <p className="metric-number" data-testid="overflow">
                    {metricVolume(totals.overflowL)} <span>L</span>
                  </p>
                  <p className="metric-caption">Water beyond tank capacity</p>
                  <span className="metric-footnote">
                    Try a different tank size <ArrowUpRight size={12} />
                  </span>
                </article>
              </div>

              <section
                className="chart-panel panel"
                aria-labelledby="balance-heading"
              >
                <div className="chart-heading">
                  <div>
                    <h3 id="balance-heading">A daily water story</h3>
                    <p>Follow what comes in, stays, and gets used.</p>
                  </div>
                  <div
                    className="chart-tabs"
                    role="group"
                    aria-label="Chart view"
                  >
                    <button
                      aria-pressed={chartMode === "storage"}
                      className={chartMode === "storage" ? "selected" : ""}
                      onClick={() => setChartMode("storage")}
                    >
                      Tank storage
                    </button>
                    <button
                      aria-pressed={chartMode === "balance"}
                      className={chartMode === "balance" ? "selected" : ""}
                      onClick={() => setChartMode("balance")}
                    >
                      Daily balance
                    </button>
                  </div>
                </div>
                <div className="chart-unit">VOLUME (LITERS)</div>
                <div
                  className="chart-container"
                  role="img"
                  aria-label={
                    chartMode === "storage"
                      ? "Daily end-of-day storage and rainwater use in liters. Exact values are in the daily results table below."
                      : "Daily incoming, used, overflow, and unmet demand in liters. Exact values are in the daily results table below."
                  }
                >
                  <Suspense
                    fallback={
                      <div className="chart-loading" role="status">
                        Loading water balance chart…
                      </div>
                    }
                  >
                    <WaterChart
                      days={result.days}
                      capacity={scenario.tankCapacityL}
                      mode={chartMode}
                      dates={dataset.dates}
                    />
                  </Suspense>
                </div>
                <div className="chart-footer">
                  <span>
                    <CloudRain size={14} />
                    <strong>{format(totals.rainfallMm, 1)} mm</strong>{" "}
                    {historical ? (
                      <a
                        href="https://open-meteo.com/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        ERA5 rain via Open-Meteo
                      </a>
                    ) : (
                      "synthetic rainfall"
                    )}
                  </span>
                  <span>
                    <span className="dashed-line" />{" "}
                    {chartMode === "storage"
                      ? "Tank capacity"
                      : "Daily volumes"}
                  </span>
                </div>
              </section>

              <section
                className="balance-strip"
                aria-label="Water-mass balance"
              >
                <div className="balance-strip-heading">
                  <ShieldCheck size={15} />
                  <span>Every liter accounted for</span>
                  <span className="balanced-badge">
                    <Check size={11} /> BALANCED
                  </span>
                </div>
                <div className="balance-equation">
                  <div>
                    <span>Initial + collected</span>
                    <strong>
                      {balanceVolume(
                        scenario.initialStorageL + totals.incomingL,
                      )}{" "}
                      <small>L</small>
                    </strong>
                  </div>
                  <b>=</b>
                  <div>
                    <span>Used</span>
                    <strong>
                      {balanceVolume(totals.usedL)} <small>L</small>
                    </strong>
                  </div>
                  <b>+</b>
                  <div>
                    <span>Overflow</span>
                    <strong>
                      {balanceVolume(totals.overflowL)} <small>L</small>
                    </strong>
                  </div>
                  <b>+</b>
                  <div>
                    <span>Still stored</span>
                    <strong data-testid="final-storage">
                      {balanceVolume(totals.finalStorageL)} <small>L</small>
                    </strong>
                  </div>
                </div>
                <p>
                  Calculated at full precision. Displayed volumes are rounded.
                </p>
              </section>
            </div>
          </div>
        </section>

        <section className="impact-section" aria-labelledby="impact-heading">
          <div className="impact-intro">
            <span className="impact-icon">
              <Leaf size={22} strokeWidth={1.5} />
            </span>
            <div className="eyebrow">SMALL SYSTEMS. REAL POTENTIAL.</div>
            <h2 id="impact-heading">
              A lighter demand
              <br /> on freshwater.
            </h2>
            <p>
              Collected rain can take on everyday, non-drinking tasks. Here’s
              what this scenario suggests.
            </p>
            <span className="estimate-label">ESTIMATED RESULT</span>
          </div>
          <div className="impact-details">
            <div className="impact-row">
              <div className="impact-row-icon">
                <Droplet size={19} />
              </div>
              <div>
                <h3>
                  {format(totals.usedL / 1000, 2)} m³ of potential freshwater
                  displacement
                </h3>
                <p>
                  Assumes every liter served replaces one liter of freshwater.
                </p>
              </div>
              <ArrowUpRight size={17} />
            </div>
            <div className="impact-row">
              <div className="impact-row-icon muted">
                <Waves size={19} />
              </div>
              <div>
                <h3>
                  {format(totals.unmetDemandL)} L still needed from another
                  source
                </h3>
                <p>
                  Unmet non-potable demand across {dayCount} simulated days.
                </p>
              </div>
            </div>
            <div className="impact-caveat">
              <Info size={16} />
              <p>
                Planning estimates, not measured savings. No carbon, cost, or
                real-site environmental claims are made. Initial storage, if
                set, is assumed to be harvested rainwater.
              </p>
            </div>
          </div>
        </section>

        <section className="daily-panel panel" aria-labelledby="daily-heading">
          <div className="daily-heading">
            <div>
              <h3 id="daily-heading">The day-by-day details</h3>
              <p>One row. One day. A complete water balance.</p>
            </div>
            <span className="table-period">
              {dayCount} DAYS <span>·</span> LITERS UNLESS NOTED
            </span>
          </div>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Scrollable daily simulation results"
          >
            <table>
              <caption className="sr-only">
                {historical
                  ? "ERA5-based estimated daily results"
                  : "Deterministic synthetic daily results"}
                , rain before demand. All water volumes in liters; rainfall in
                millimeters.
              </caption>
              <thead>
                <tr>
                  <th scope="col">{historical ? "Date" : "Day"}</th>
                  <th scope="col">
                    Rain <span>(mm)</span>
                  </th>
                  <th scope="col">
                    Opening <span>(L)</span>
                  </th>
                  <th scope="col">
                    Incoming <span>(L)</span>
                  </th>
                  <th scope="col">
                    Used <span>(L)</span>
                  </th>
                  <th scope="col">
                    Overflow <span>(L)</span>
                  </th>
                  <th scope="col">
                    Remaining <span>(L)</span>
                  </th>
                  <th scope="col">
                    Unmet <span>(L)</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.days.slice(0, showAllDays ? dayCount : 7).map((day) => (
                  <tr key={day.day}>
                    <th scope="row">
                      {historical
                        ? historical.dates[day.day - 1]
                        : String(day.day).padStart(2, "0")}
                    </th>
                    <td>
                      <span
                        className={
                          day.rainfallMm > 0 ? "rain-cell wet" : "rain-cell"
                        }
                      >
                        {day.rainfallMm > 0 && <CloudRain size={12} />}{" "}
                        {format(day.rainfallMm, 2)}
                      </span>
                    </td>
                    <td>{format(day.openingStorageL, 2)}</td>
                    <td>{format(day.incomingL, 2)}</td>
                    <td className="used-cell">{format(day.usedL, 2)}</td>
                    <td className={day.overflowL > 0 ? "overflow-cell" : ""}>
                      {format(day.overflowL, 2)}
                    </td>
                    <td>{format(day.remainingStorageL, 2)}</td>
                    <td>{format(day.unmetDemandL, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="show-days"
            aria-expanded={showAllDays}
            onClick={() => setShowAllDays(!showAllDays)}
          >
            {showAllDays ? "Show first 7 days" : `Explore all ${dayCount} days`}
            <ChevronDown
              size={14}
              style={{ transform: showAllDays ? "rotate(180deg)" : undefined }}
            />
          </button>
        </section>

        <Suspense
          fallback={
            <div id="tank-sizing" className="chart-loading" role="status">
              Loading Tank Sizing Lab…
            </div>
          }
        >
          <TankSizingLab dataset={dataset} scenario={scenario} />
        </Suspense>

        <Suspense
          fallback={
            <p className="chart-loading">Loading historical variability lab…</p>
          }
        >
          <HistoricalVariabilityLab
            dataset={dataset}
            scenario={scenario}
            onChooseHistorical={() => {
              setSourceMode("historical");
              document.getElementById("simulator")?.scrollIntoView();
              requestAnimationFrame(() =>
                document.getElementById("location-search")?.focus(),
              );
            }}
          />
        </Suspense>

        <section
          id="methodology"
          className="methodology-section"
          aria-labelledby="methodology-heading"
        >
          <div className="methodology-title">
            <div className="eyebrow">BUILT ON CLARITY</div>
            <h2 id="methodology-heading">
              Simple model.
              <br /> Visible assumptions.
            </h2>
            <p>
              A daily planning model you can follow,
              <br className="desktop-break" /> from the first drop to the last
              liter.
            </p>
          </div>
          <div className="methodology-content">
            <div className="model-steps">
              <article>
                <span>01</span>
                <h3>Collect the rain</h3>
                <p>
                  Roof area × rainfall × efficiency.
                  <br /> 1 mm on 1 m² equals 1 liter.
                </p>
              </article>
              <ArrowRight size={15} className="step-arrow" />
              <article>
                <span>02</span>
                <h3>Fill the tank</h3>
                <p>
                  Add rain to opening storage.
                  <br /> Anything over capacity overflows.
                </p>
              </article>
              <ArrowRight size={15} className="step-arrow" />
              <article>
                <span>03</span>
                <h3>Meet the demand</h3>
                <p>
                  Use available water, then carry
                  <br /> the rest into the next day.
                </p>
              </article>
            </div>
            <div className="model-note">
              <Info size={16} />
              <p>
                <strong>Rain before demand, one day at a time.</strong> All
                daily rainfall enters before that day's demand is served. This
                model does not represent sub-daily timing, water quality,
                first-flush events, evaporation, or plumbing design. Rainfall is
                {historical
                  ? "ERA5 gridded reanalysis, not station-measured or live observations. See the source panel for provenance and daily aggregation limits."
                  : "an authored synthetic sequence, not historical or live data."}
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <a href="#overview" className="brand footer-brand">
            <Droplet size={19} /> Cistern
            <span className="brand-light">Lab</span>
          </a>
          <p>Thoughtful water planning starts with a little curiosity.</p>
          <span>
            GREEN SHIFT HACKS 2026 <span className="footer-dot">·</span> BUILD
            03
          </span>
        </div>
      </footer>
      <div className="sr-only" role="status">
        {exported ? "Simulation results downloaded as CSV." : ""}
      </div>
    </>
  );
}
