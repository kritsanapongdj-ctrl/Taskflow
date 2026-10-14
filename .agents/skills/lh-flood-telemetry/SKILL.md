---
name: lh-flood-telemetry
description: >-
  Provides procedures and technical references for hydrological telemetry monitoring, Doppler weather radar proxying, As-Built elevation benchmarking, and AI flood surveying for Land and Houses (LH) estates. Covers real-time water level and watergate telemetry ingestion from ThaiWater (Hydro-Informatics Institute and Royal Irrigation Department), BMA radar anti-hotlinking proxying, As-Built Mean Sea Level (MSL) benchmark calibration, and Gemini 2.5 Vision multimodal water depth inference from site photos. Use when diagnosing water level sensors, calibrating project elevation parameters, updating radar proxies, or analyzing estate flood resilience.
---

# LH Hydrological Telemetry & Flood Monitoring

This skill provides operational procedures for hydrological sensor integration, weather radar feeds, As-Built engineering benchmarks, and AI-assisted flood surveys.

## 1. Real-Time Telemetry Pipeline (ThaiWater & Basin Sensors)

Telemetry data is ingested from the National Hydroinformatics Data Center (`api-v3.thaiwater.net`):
- **Streams**: River water levels (`waterlevel_load`) and irrigation watergates (`watergate_load`).
- **Nearest Neighbor Matching**: Calculates Euclidean distance using the Haversine formula against each project's GPS coordinates (`lat`, `lon`).
- **Station Binding**: Projects can specify explicit priority sensor codes (e.g. `preferredStationCodes: ["ATG101", "BKK002"]`).
- **Freshness Audit**:
  - `🟢 LIVE`: Sensor reporting within 2.5 hours.
  - `🟡 DELAYED`: Sensor delayed 2.5 to 6 hours.
  - `🔴 STALE`: Signal lost > 6 hours.

---

## 2. As-Built Elevation Benchmark Engineering

Each LH estate includes physical engineering reference values defined in `projectsConfig.js` and overridable via Firestore:

| Benchmark Parameter | Unit | Engineering Meaning |
| :--- | :--- | :--- |
| `asBuiltElevationDiff` | Meters | Internal estate main road elevation relative to external public highway. E.g., `+0.15` m or `+0.80` m. |
| `entranceCrestDiff` | Meters | Security booth crest elevation relative to external highway. |
| `hasFloodwall` | Boolean | Presence of reinforced concrete flood protection perimeter wall. |
| `floodwallHeightDiff` | Meters | Crest height of perimeter floodwall relative to external road surface. |
| `asBuiltBenchmarkMSL` | String / MSL | Survey benchmark referenced to Mean Sea Level (ม.รทก.). |

### Calibrating As-Built Benchmarks
To view or update elevation parameters:
1. Access the web interface: `GET https://lh-taskflow.vercel.app/api/flood-report?mode=asbuilt`.
2. Authenticate using `ADMIN_PIN`.
3. Submit changes to persist to `artifacts/default-app-id/public/data/flood_settings/as_built_elevations`.

---

## 3. Weather Radar Reverse Proxy

The Doppler radar proxy endpoint (`/api/radar.js`) resolves anti-hotlinking restrictions by injecting official HTTP headers:
- `station=bma`: Bangkok Metropolitan Administration radar (`weather.bangkok.go.th`).
- `station=tmd` / `station=svp`: Thai Meteorological Dept Suvarnabhumi 120km radar.
- `station=wide`: Suvarnabhumi 240km wide-angle radar.
- `station=hii` / `station=thaiwater`: Hydro-Informatics Institute national composite radar.

---

## 4. Gemini 2.5 Vision Multimodal Assessment

When field staff send 5–10 photos through the LINE Bot:
1. `analyzeWaterLevelFromPhotos()` inspects road curb visibility, vehicle wheel submersion, and roadside drain water levels.
2. AI synthesizes field text notes with radar and telemetry into 3 categories:
   - **Road Water Level** (ระดับน้ำผิวจราจร)
   - **Pumps Running** (สถานะการสูบระบาย)
   - **Drainage Condition** (สภาพคลองและทางระบายน้ำ)
3. Outputs an official PDF report (`/api/flood-report?id=FLD-...`).
