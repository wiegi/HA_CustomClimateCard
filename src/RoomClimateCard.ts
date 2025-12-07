import { LitElement, html, css, CSSResultGroup, TemplateResult } from "lit";

export interface HassEntity {
  state: string;
  attributes: Record<string, unknown>;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
}

export type RoomNamePosition = "top" | "bottom" | "left" | "right";

export interface RoomClimateCardLayoutConfig {
  room_name?: RoomNamePosition;
}

export interface RoomClimateCardConfig {
  type?: string;
  entity: string;
  humidity_entity?: string;
  dewpoint_entity?: string;
  battery_entity?: string;
  battery_icon?: string;
  room_name?: string;
  name?: string;
  layout?: RoomClimateCardLayoutConfig;
  battery_low_threshold?: number;
  battery_empty_threshold?: number;
}

export const ROOM_NAME_POSITIONS: RoomNamePosition[] = [
  "top",
  "bottom",
  "left",
  "right",
];

const ROOM_NAME_LIMITS: Record<RoomNamePosition, number> = {
  top: 14,
  bottom: 14,
  left: 10,
  right: 10,
};

class RoomClimateCard extends LitElement {
  private _hass?: HomeAssistant;
  private _config?: RoomClimateCardConfig;

  public static get styles(): CSSResultGroup {
    return css`
      ha-card {
        position: relative;
        overflow: hidden;
        padding: var(--card-padding, 12px);
      }

      .card-grid {
        display: grid;
        position: relative;
        z-index: 1;
        gap: var(--card-gap, 8px);
        grid-template-columns: minmax(0, 1fr);
        grid-auto-rows: minmax(20px, auto);
        min-height: 0;
      }

      .room-name-block,
      .temperature-block,
      .metrics-row {
        grid-column: 1 / -1;
      }

      .room-name-block {
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .room-name {
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
      }

      .temperature-block {
        display: flex;
        justify-content: flex-start;
        align-items: baseline;
        gap: 4px;
        grid-column: 1 / -1;
      }

      .temperature {
        font-weight: 600;
        line-height: 1;
        font-size: var(--room-climate-temp-size, 1.6rem);
      }

      .metrics-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        width: 100%;
        grid-column: 1 / -1;
      }

      .metric-pair {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        width: 100%;
        flex-wrap: wrap;
      }

      .metric {
        font-size: var(--room-climate-metric-size, 0.95rem);
        color: var(--primary-text-color);
        font-weight: 600;
        white-space: nowrap;
        flex: 1 1 45%;
      }

      ha-card.room-pos-top .card-grid {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas:
          "room"
          "temp"
          "metrics";
      }

      ha-card.room-pos-bottom .card-grid {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas:
          "temp"
          "metrics"
          "room";
      }

      ha-card.room-pos-left .card-grid {
        grid-template-columns: minmax(0, auto) minmax(0, 1fr);
        grid-template-areas:
          "room temp"
          "room metrics";
        align-items: center;
      }

      ha-card.room-pos-right .card-grid {
        grid-template-columns: minmax(0, 1fr) minmax(0, auto);
        grid-template-areas:
          "temp room"
          "metrics room";
        align-items: center;
      }

      .room-name-block {
        grid-area: room;
      }

      .temperature-block {
        grid-area: temp;
      }

      .metrics-row {
        grid-area: metrics;
      }

      ha-card.room-pos-left .room-name,
      ha-card.room-pos-right .room-name {
        display: inline-block;
      }

      ha-card.room-pos-left .room-name {
        transform: rotate(-90deg);
      }

      ha-card.room-pos-right .room-name {
        transform: rotate(90deg);
      }

      .battery-overlay {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 48%;
        height: 48%;
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        color: var(--battery-overlay-color, rgba(15, 23, 42, 0.7));
        z-index: 2;
        opacity: 0.1;
      }

      .battery-overlay ha-icon {
        width: 100%;
        height: 100%;
        --mdc-icon-size: 100%;
      }

      .battery-overlay.low {
        color: var(--battery-overlay-low-color, #f5a524);
        opacity: 0.32;
      }

      .battery-overlay.empty {
        color: var(--battery-overlay-empty-color, #e53935);
        opacity: 0.45;
      }

      .battery-overlay.normal {
        opacity: 0.18;
      }
    `;
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    await import("./RoomClimateCardEditor");
    return document.createElement("room-climate-card-editor");
  }

  public static getStubConfig(): RoomClimateCardConfig {
    return {
      type: "custom:room-climate-card",
      entity: "sensor.temperature",
      humidity_entity: "sensor.humidity",
      dewpoint_entity: "sensor.dewpoint",
      battery_entity: "sensor.battery",
      room_name: "Living Room",
      layout: {
        room_name: "top",
      },
    };
  }

  public set hass(hass: HomeAssistant) {
    this._hass = hass;
    this.requestUpdate();
  }

  public setConfig(config: RoomClimateCardConfig): void {
    if (!config?.entity) {
      throw new Error("You need to define an entity");
    }

    this._config = {
      ...config,
      type: "custom:room-climate-card",
    };
  }

  public getCardSize(): number {
    return 1;
  }

  protected render(): TemplateResult {
    if (!this._config || !this._hass) {
      return html``;
    }

    const layout = this.getLayoutConfig();
    const temperature = this.getEntityState(this._config.entity);
    const humidity = this.getEntityState(this._config.humidity_entity);
    const dewPoint = this.getEntityState(this._config.dewpoint_entity);
    const battery = this.getEntityState(this._config.battery_entity);
    const roomName = this.getRoomName();
    const roomLabel = this.truncateRoomName(roomName, layout.room_name);

    return html`
      <ha-card class=${`room-pos-${layout.room_name}`}>
        <div class="card-grid">
          <div class="room-name-block">
            <span class="room-name" title=${roomName}>${roomLabel}</span>
          </div>
          <div class="temperature-block">
            <span class="temperature"
              >${this.formatTemperature(temperature?.state)}</span
            >
          </div>
          <div class="metrics-row">
            <div class="metric-pair">
              <span class="metric humidity"
                >${humidity ? this.formatHumidity(humidity.state) : ""}</span
              >
              <span class="metric dew-point"
                >${dewPoint ? this.formatDewPoint(dewPoint.state) : ""}</span
              >
            </div>
          </div>
        </div>
        ${this.renderBatteryOverlay(battery)}
      </ha-card>
    `;
  }

  private getLayoutConfig(): {
    room_name: RoomNamePosition;
  } {
    const requested = this._config?.layout?.room_name;
    const room_name =
      requested && ROOM_NAME_POSITIONS.includes(requested) ? requested : "top";
    return { room_name };
  }

  private getRoomName(): string {
    return this._config?.room_name ?? this._config?.name ?? "Room";
  }

  private truncateRoomName(name: string, position: RoomNamePosition): string {
    const limit = this.getRoomNameLimit(position);
    if (name.length <= limit) {
      return name;
    }

    const slicePoint = Math.max(1, limit - 2);
    return `${name.slice(0, slicePoint)}..`;
  }

  private getRoomNameLimit(position: RoomNamePosition): number {
    return ROOM_NAME_LIMITS[position] ?? 12;
  }

  private getEntityState(entityId?: string): HassEntity | undefined {
    if (!entityId || !this._hass) {
      return undefined;
    }

    return this._hass.states[entityId];
  }

  private formatTemperature(value?: string): string {
    if (value === undefined) {
      return "--";
    }

    return `${value}°`;
  }

  private formatHumidity(value?: string): string {
    if (value === undefined) {
      return "";
    }

    return `${value}%`;
  }

  private formatDewPoint(value?: string): string {
    if (value === undefined) {
      return "";
    }
    const numeric = Number(value);
    const limited = Number.isFinite(numeric)
      ? Math.round(numeric * 100) / 100
      : value;
    return `${limited}° dew`;
  }

  private getBatteryThresholds(): { low: number; empty: number } {
    const lowCandidate = Number(this._config?.battery_low_threshold);
    const emptyCandidate = Number(this._config?.battery_empty_threshold);
    const empty = Number.isFinite(emptyCandidate) ? emptyCandidate : 10;
    const low = Number.isFinite(lowCandidate) ? lowCandidate : 30;
    return {
      empty,
      low: Math.max(low, empty),
    };
  }

  private getBatteryLevel(entity?: HassEntity): number | undefined {
    if (!entity) {
      return undefined;
    }

    const numeric = Number(entity.state);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  private getBatteryStatus(level: number): "normal" | "low" | "empty" {
    const { low, empty } = this.getBatteryThresholds();
    if (level <= empty) {
      return "empty";
    }

    if (level <= low) {
      return "low";
    }

    return "normal";
  }

  private getBatteryIcon(level?: number): string {
    if (this._config?.battery_icon) {
      return this._config.battery_icon;
    }

    if (level === undefined) {
      return "mdi:battery-unknown";
    }

    if (level > 80) {
      return "mdi:battery";
    }

    if (level > 40) {
      return "mdi:battery-60";
    }

    if (level > 20) {
      return "mdi:battery-30";
    }

    return "mdi:battery-alert";
  }

  private renderBatteryOverlay(entity?: HassEntity): TemplateResult | "" {
    const level = this.getBatteryLevel(entity);
    if (level === undefined) {
      return "";
    }

    const status = this.getBatteryStatus(level);

    return html`
      <div class="battery-overlay ${status}">
        <ha-icon .icon=${this.getBatteryIcon(level)}></ha-icon>
      </div>
    `;
  }
}

if (!customElements.get("room-climate-card")) {
  customElements.define("room-climate-card", RoomClimateCard);
}

declare global {
  interface Window {
    customCards: Array<{ type: string; name: string; description: string }>;
  }

  interface HTMLElementTagNameMap {
    "room-climate-card": RoomClimateCard;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "room-climate-card",
  name: "Room Climate Card",
  description:
    "Display temperature, humidity, dew point, and battery level for a room.",
});
