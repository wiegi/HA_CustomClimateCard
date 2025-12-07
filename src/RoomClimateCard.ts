import { LitElement, html, css, CSSResultGroup, TemplateResult } from "lit";

interface HassEntity {
  state: string;
  attributes: Record<string, unknown>;
}

interface HomeAssistant {
  states: Record<string, HassEntity>;
}

interface RoomClimateCardConfig {
  type?: string;
  entity: string;
  humidity_entity?: string;
  dewpoint_entity?: string;
  battery_entity?: string;
  room_name?: string;
  name?: string;
}

class RoomClimateCard extends LitElement {
  private _hass?: HomeAssistant;
  private _config?: RoomClimateCardConfig;

  public static get styles(): CSSResultGroup {
    return css`
      ha-card {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .primary-line {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
      }

      .room-name {
        font-size: 1rem;
        font-weight: 600;
        transform: rotate(-90deg);
      }

      .temperature {
        font-size: 2rem;
        font-weight: 700;
      }

      .metadata {
        display: flex;
        gap: 12px;
        font-size: 0.9rem;
        color: var(--secondary-text-color);
      }

      .battery {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
    `;
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

    const temperature = this.getEntityState(this._config.entity);
    const humidity = this.getEntityState(this._config.humidity_entity);
    const dewPoint = this.getEntityState(this._config.dewpoint_entity);
    const battery = this.getEntityState(this._config.battery_entity);

    return html`
      <ha-card>
        <div class="primary-line">
          <span class="room-name">${this.getRoomName()}</span>
          <span class="temperature"
            >${this.formatTemperature(temperature?.state)}</span
          >
        </div>
        <div class="metadata">
          ${humidity
            ? html`<span>${this.formatHumidity(humidity.state)}</span>`
            : ""}
          ${dewPoint
            ? html`<span>${this.formatDewPoint(dewPoint.state)}</span>`
            : ""}
          ${this.renderBatteryIndicator(battery)}
        </div>
      </ha-card>
    `;
  }

  private getRoomName(): string {
    return this._config?.room_name ?? this._config?.name ?? "Room";
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

  private getBatteryLevel(entity?: HassEntity): number | undefined {
    if (!entity) {
      return undefined;
    }

    const numeric = Number(entity.state);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  private getBatteryIcon(level?: number): string {
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

  private renderBatteryIndicator(entity?: HassEntity): TemplateResult | "" {
    const level = this.getBatteryLevel(entity);
    if (level === undefined) {
      return "";
    }

    return html`
      <span class="battery">
        <ha-icon .icon=${this.getBatteryIcon(level)}></ha-icon>
        ${level}%
      </span>
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
