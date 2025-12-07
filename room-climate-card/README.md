# Room Climate Card

A reusable Home Assistant Lovelace card built with LitElement that surfaces temperature, humidity, dew point, and battery status for any room sensor setup.

## Features

- Minimal layout optimized for quick climate checks
- Optional humidity, dew point, and battery indicators
- Designed for bundling and distribution through HACS

## Installation

### Manual

1. Download the latest release and copy the `dist/room-climate-card.js` file into your Home Assistant `config/www/` directory.
2. Add the resource to your Lovelace resources (Configuration → Dashboards → Resources) with:
   - URL: `/local/room-climate-card.js`
   - Resource type: `JavaScript Module`
3. Restart Home Assistant or reload resources.

### HACS (Custom Repository)

1. In HACS, open the **Frontend** section and select the menu in the top-right corner.
2. Choose **Custom repositories**, add your repository URL, and set the category to `Lovelace`.
3. Install **Room Climate Card** from the HACS list and reload resources when prompted.

## Lovelace Usage

```yaml
type: custom:room-climate-card
entity: sensor.temp
humidity_entity: sensor.humidity
dewpoint_entity: sensor.dewpoint
battery_entity: sensor.battery
room_name: Wohnzimmer
```

## Development

```bash
npm install
npm run build
```

The bundled file will be emitted to `dist/room-climate-card.js`.
