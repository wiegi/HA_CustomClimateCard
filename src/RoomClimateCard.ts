import { LitElement, html, css, CSSResultGroup, TemplateResult } from "lit";

export interface HassEntity {
  state: string;
  attributes: Record<string, unknown>;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
}

export type RoomNamePosition = "top" | "bottom" | "left" | "right";
export type CardSizeOption = "compact" | "comfortable" | "expanded";

export interface RoomClimateCardLayoutConfig {
  room_name?: RoomNamePosition;
  size?: CardSizeOption;
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

export const CARD_SIZES: Record<
  CardSizeOption,
  { padding: number; gap: number; temp: string }
> = {
  compact: { padding: 12, gap: 8, temp: "2rem" },
  comfortable: { padding: 20, gap: 16, temp: "2.4rem" },
  expanded: { padding: 28, gap: 20, temp: "2.8rem" },
};

class RoomClimateCard extends LitElement {
  private _hass?: HomeAssistant;
  private _config?: RoomClimateCardConfig;

  public static get styles(): CSSResultGroup {
    return css`
      ha-card {
        position: relative;
        overflow: hidden;
        padding: var(--card-padding, 20px);
      }

      .card-grid {
        display: grid;
        position: relative;
        z-index: 1;
        gap: var(--card-gap, 16px);
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
        font-size: 1rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .temperature-block {
        display: flex;
        justify-content: flex-start;
        align-items: baseline;
        gap: 8px;
      }

      .temperature {
        font-weight: 700;
        line-height: 1;
        font-size: var(--temp-size, 2.4rem);
      }

      .metrics-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .metric-pair {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        width: 100%;
      }

      .metric {
        font-size: 1rem;
        color: var(--secondary-text-color);
      }

      ha-card.room-pos-top .card-grid {
        grid-template-columns: 1fr;
        grid-template-areas:
          "room"
          "temp"
          "metrics";
      }

      ha-card.room-pos-bottom .card-grid {
        grid-template-columns: 1fr;
        grid-template-areas:
          "temp"
          "metrics"
          "room";
      }

      ha-card.room-pos-left .card-grid {
        grid-template-columns: auto 1fr;
        grid-template-areas:
          "room temp"
          "room metrics";
        align-items: center;
      }

      ha-card.room-pos-right .card-grid {
        grid-template-columns: 1fr auto;
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
        width: 60%;
        height: 60%;
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        color: var(--battery-overlay-color, rgba(15, 23, 42, 0.8));
        z-index: 2;
        opacity: 0.12;
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
        size: "comfortable",
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
    return 3;
  }

  protected render(): TemplateResult {
    if (!this._config || !this._hass) {
      return html``;
    }

    const layout = this.getLayoutConfig();
    const sizeVars = this.getSizeVariables(layout.size);
    const temperature = this.getEntityState(this._config.entity);
    const humidity = this.getEntityState(this._config.humidity_entity);
    const dewPoint = this.getEntityState(this._config.dewpoint_entity);
    const battery = this.getEntityState(this._config.battery_entity);

    return html`
      <ha-card
        class=${`room-pos-${layout.room_name} size-${layout.size}`}
        style=${this.inlineSizeStyle(sizeVars)}
      >
        <div class="card-grid">
          <div class="room-name-block">
            <span class="room-name">${this.getRoomName()}</span>
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
    size: CardSizeOption;
  } {
    const requested = this._config?.layout?.room_name;
    const sizeCandidate = this._config?.layout?.size;
    const room_name =
      requested && ROOM_NAME_POSITIONS.includes(requested) ? requested : "top";
    const size: CardSizeOption =
      sizeCandidate && CARD_SIZES[sizeCandidate]
        ? sizeCandidate
        : "comfortable";

    return { room_name, size };
  }

  private getRoomName(): string {
    return this._config?.room_name ?? this._config?.name ?? "Room";
  }

  private getSizeVariables(size: CardSizeOption): {
    padding: number;
    gap: number;
    tempScale: string;
  } {
    const preset = CARD_SIZES[size] ?? CARD_SIZES.comfortable;
    return {
      padding: preset.padding,
      gap: preset.gap,
      tempScale: preset.temp,
    };
  }

  private inlineSizeStyle(vars: {
    padding: number;
    gap: number;
    tempScale: string;
  }): string {
    return `--card-padding:${vars.padding}px;--card-gap:${vars.gap}px;--temp-size:${vars.tempScale};`;
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

    return `${value}° dew`;
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
