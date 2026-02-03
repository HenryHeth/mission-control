# Tesla Integration Research — Paul's Model S

**Date:** 2026-02-03
**Goal:** Real-time location tracking, geofencing for parking, mileage logging, battery monitoring

---

## 1. Home Assistant — Tesla Fleet Integration (ALREADY SET UP at 192.168.1.96:8123)

**Type:** Official HA integration using Tesla Fleet API
**Cost:** Free (Tesla provides $10/mo API credit — usually sufficient for personal use)
**URL:** https://www.home-assistant.io/integrations/tesla_fleet/

### What It Provides
- **`device_tracker.Location`** — GPS location of the car (enabled by default)
- **`device_tracker.Route`** — Active navigation route destination
- **`sensor.battery_level`** — Current battery %
- **`sensor.battery_range`** — Estimated range
- **`sensor.odometer`** — Mileage (disabled by default, enable it)
- **`sensor.charging`** — Charging state
- **`sensor.charge_energy_added`** — Energy added per session
- **`sensor.charger_power`** / `charger_voltage` / `charger_current`
- **`sensor.speed`** / `shift_state` / `inside_temp` / `outside_temp`
- **`binary_sensor.status`** — Online/asleep
- Full door/window/trunk/frunk status
- Climate controls, sentry mode, lock/unlock, flash/honk commands

### Location & Geofencing
- Device tracker entity works with HA zones natively
- **Set up HA zones** (Home, Work, common parking spots) → automatic geofence detection
- Proximity integration can trigger automations (e.g. garage door opens on approach)
- **Polling interval: every 10 minutes while car is awake** — not truly real-time
- Can customize polling interval but more frequent = more API calls = may exceed $10 credit

### Setup Requirements
- Tesla developer application at developer.tesla.com
- Public key hosted on a web domain (or use FleetKey.net / MyTeslamate.com hosting)
- OAuth2 authentication flow
- Vehicle virtual key installed via Tesla mobile app (for command signing)
- **Model S/X pre-2021:** Command signing key pairing not required

### Verdict
✅ **Already running — enable the disabled sensors (odometer, etc.)**
✅ Great for battery monitoring, basic location, automations
⚠️ 10-min polling is not real-time — fine for "where is the car parked?" but not live tracking
⚠️ Car must be awake for updates — sleeping car = stale data until next wake

---

## 2. TeslaMate (RECOMMENDED ADD-ON)

**Type:** Self-hosted data logger (Docker)
**Cost:** FREE — open source (MIT license)
**GitHub:** https://github.com/teslamate-org/teslamate (6k+ stars)
**Stack:** Elixir + PostgreSQL + Grafana + MQTT

### What It Provides
- **High-precision drive recording** — captures entire drive paths, not just snapshots
- **Geo-fencing** — custom locations (🏡 Home, 🛠️ Work, etc.) with named zones
- **Location via MQTT** — `teslamate/cars/1/location` (lat/lon/heading/speed/elevation)
- **Geofence sensor** — `teslamate/cars/1/geofence` tells which named zone car is in
- **Odometer tracking** with full mileage dashboards
- **Battery health** dashboard (degradation tracking over time)
- **Charge tracking** — energy added, cost tracking, charge curves
- **Drive stats** — distance, energy consumed, efficiency
- **Vampire drain** monitoring
- **Lifetime driving map** — everywhere the car has ever been
- **Timeline** — complete history of states (driving/charging/sleeping/online)

### Grafana Dashboards (Built-in)
- Battery Health, Charge Level, Charging Stats
- Drive Stats, Drive Details, Efficiency
- Mileage, Overview, Projected Range
- States, Timeline, Trip, Visited Map
- Vampire Drain, Updates History

### Home Assistant Integration
- Publishes ALL data via MQTT → HA picks it up as sensors
- Provides `device_tracker.tesla_location` for HA zone/proximity automations
- Parking brake sensor, geofence sensor, speed, heading, elevation
- Full battery/charge sensors: est_range, rated_range, usable_battery_level, charge_limit
- **Way more granular than the official HA integration**

### Sleep-Friendly
- Designed to let the car sleep ASAP → minimal vampire drain
- Suspends logging after 3 min of inactivity, waits 15 min before checking again
- Much better than TeslaFi or frequent polling approaches

### Setup
- Docker Compose: TeslaMate + PostgreSQL + Grafana + Mosquitto (MQTT)
- ~5 min setup with docker-compose
- Can run on the same machine as HA or separate
- Tesla API tokens needed (generated via auth apps)

### Verdict
✅ **Best overall for data logging, location history, and geofencing**
✅ Free, self-hosted, privacy-respecting
✅ Gorgeous Grafana dashboards
✅ MQTT → HA integration = automations based on location/geofence
✅ Battery degradation tracking over time
⚠️ Requires Docker host (could run on HA as add-on or separate server)
⚠️ Still polling-based, but very smart about sleep management

---

## 3. Tesla Fleet API (Direct)

**Type:** Official Tesla REST API
**Cost:** $10/mo free credit, then usage-based pricing
**URL:** https://developer.tesla.com

### What It Provides
- **Vehicle Data endpoint** — location, battery, charge state, vehicle state, climate, drive state
- **Vehicle Commands** — lock/unlock, climate, charging, etc.
- **Fleet Telemetry** — newer streaming-based data (for supported vehicles)
- **Location data:** latitude, longitude, heading, GPS timestamp

### Key Details
- OAuth2 authentication with scopes (Vehicle Information, Vehicle Location, Vehicle Commands)
- Rate limits exist — the $10 credit covers typical personal use (~10 min polling)
- Must register developer application and host public key
- This is what HA Tesla Fleet integration and Tessie use under the hood

### Verdict
⚠️ **Not recommended to use directly** — it's the underlying API
⚠️ Better to use via HA integration or TeslaMate which handle auth/polling/sleep logic
ℹ️ Good to know it exists for custom scripts if needed

---

## 4. Tessie (Cloud SaaS)

**Type:** Cloud-hosted Tesla management platform
**Cost:** $6.99/mo basic, $12.99/mo Pro, $69.99/yr, $199.99 lifetime
**URL:** https://www.tessie.com

### What It Provides
- **Location tracking** with `GET /location` API endpoint
- **Drive & charge tracking** — all trips logged with paths
- **Battery tracking** — basic (standard) or detailed (Pro)
- **Map view** — live location map
- **Consumption tracking**
- **Weather at car location**
- **Customizable alerts**
- **API access** — full REST API for developers
- **Tesla Fleet Telemetry access** — streaming data support
- **Pro adds:** Sentry tracking, firmware alerts, automations, OBD profiler, software update tracking

### API Highlights
- `GET /location` — current car location
- `GET /battery` + `/battery-health` — battery data with degradation measurements
- `GET /drives` + `/driving-path` — drive history with full paths
- `GET /charges` — charge history
- `GET /historical-states` — complete state history
- Full vehicle command API (lock, climate, charging, etc.)

### Verdict
✅ Polished mobile/web app — easiest to use
✅ Good API for custom integrations
✅ Battery health tracking
⚠️ **Costs money** for what TeslaMate does free
⚠️ Cloud-based — data leaves your network
⚠️ Another subscription to manage

---

## 5. TeslaFi (Cloud SaaS)

**Type:** Cloud-hosted Tesla data logger
**Cost:** $7.99/mo or $79.99/yr (7-day free trial, no CC required)
**URL:** https://www.teslafi.com

### What It Provides
- Comprehensive data logging (811M+ miles logged across fleet)
- Drive tagging by category (business/personal)
- Calendar view of all activity
- Weather data for each drive
- Scheduling commands
- Charge tracking

### Key Stats (Fleet-wide)
- 811M+ miles logged
- 82M+ trips logged
- 27M+ charges logged

### Verdict
✅ Established platform, large community
✅ Drive tagging useful for expense reports / business mileage
⚠️ **$8/mo for what TeslaMate does free**
⚠️ Cloud-based — data on their servers
⚠️ Known to keep cars awake longer (vampire drain concerns)
⚠️ Uses older auth token approach

---

## Recommendation

### 🏆 Best Setup for Paul: HA Fleet Integration + TeslaMate

**Layer 1: Home Assistant Tesla Fleet (already running)**
- Enable disabled sensors: odometer, estimated range, tire pressures
- Set up HA zones for Home, Work, common parking spots
- Use for real-time automations (garage door, notifications)
- Use for quick "where's the car?" via HA dashboard/app

**Layer 2: TeslaMate (add this)**
- Run as Docker containers (could be on the HA host or another machine on the network)
- Provides the rich data logging HA doesn't do well:
  - Complete drive history with GPS paths
  - Battery degradation tracking over time
  - Named geofences with notifications
  - Beautiful Grafana dashboards
  - Mileage/efficiency trends
- Connects to HA via MQTT for additional sensor data

### Why This Combo?
| Feature | HA Fleet Only | + TeslaMate |
|---------|:---:|:---:|
| Current location | ✅ (10 min delay) | ✅ (smarter polling) |
| Geofencing | ✅ (HA zones) | ✅ (named zones + HA zones) |
| Battery level | ✅ | ✅ |
| Battery degradation | ❌ | ✅ (long-term tracking) |
| Drive history | ❌ | ✅ (full GPS paths) |
| Mileage logging | ✅ (odometer only) | ✅ (per-trip, dashboards) |
| Charge history | Basic | ✅ (cost tracking, curves) |
| Efficiency trends | ❌ | ✅ |
| Vampire drain tracking | ❌ | ✅ |
| Grafana dashboards | ❌ | ✅ (15+ built-in) |
| Sleep-friendly | OK | ✅ (optimized) |
| HA automations | ✅ | ✅ (even more sensors) |
| Cost | Free ($10 Tesla credit) | Free |

### Skip These (For Now)
- **Tessie** — nice app but costs money for what the free combo does
- **TeslaFi** — similar, costs money, vampire drain concerns
- **Direct Fleet API** — unnecessary complexity, use via integrations

### Next Steps
1. ✅ Enable disabled HA sensors (odometer, tire pressure, etc.)
2. ✅ Create HA zones for frequent locations
3. 🔲 Deploy TeslaMate via Docker on the network
4. 🔲 Connect TeslaMate MQTT to HA's MQTT broker
5. 🔲 Configure TeslaMate geofences (Home, Work, etc.)
6. 🔲 Set up Grafana dashboards access
7. 🔲 Create HA automations for parking notifications

---

*Research by Henry, 2026-02-03*
