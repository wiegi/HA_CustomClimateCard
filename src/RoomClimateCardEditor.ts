import { LitElement, html, css, TemplateResult } from "lit";
import type {
  HomeAssistant,
  RoomClimateCardConfig,
  RoomClimateCardLayoutConfig,
  RoomNamePosition,
} from "./RoomClimateCard";

interface EditorTarget extends EventTarget {
  configValue?: string;
  value?: string;
  checked?: boolean;
}

class RoomClimateCardEditor extends LitElement {
  public hass?: HomeAssistant;
  private _config?: RoomClimateCardConfig;

  public static get properties() {
    return {
      hass: {},
      _config: {},
    };
  }

  public setConfig(config: RoomClimateCardConfig): void {
    this._config = {
      ...config,
      layout: {
        room_name: config.layout?.room_name ?? "top",
      },
    };
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    const config = this._config;

    return html`
      <div class="editor">
        <div class="section">
          <h3>Entities</h3>
          ${this.renderEntityPicker(
            "entity",
            "Primary entity",
            config.entity,
            true
          )}
          ${this.renderEntityPicker(
            "humidity_entity",
            "Humidity entity",
            config.humidity_entity
          )}
          ${this.renderEntityPicker(
            "dewpoint_entity",
            "Dew point entity",
            config.dewpoint_entity
          )}
          ${this.renderEntityPicker(
            "battery_entity",
            "Battery entity",
            config.battery_entity
          )}
        </div>

        <div class="section">
          <h3>Display</h3>
          <ha-textfield
            label="Room name"
            .value=${config.room_name ?? ""}
            .configValue=${"room_name"}
            @input=${this._handleInput}
          ></ha-textfield>
          <ha-textfield
            label="Battery icon"
            .value=${config.battery_icon ?? ""}
            .configValue=${"battery_icon"}
            @input=${this._handleInput}
          ></ha-textfield>
          <label class="field-label">Room name position</label>
          <select
            class="form-select"
            .value=${config.layout?.room_name ?? "top"}
            data-config-value="layout.room_name"
            @change=${this._handleSelect}
          >
            ${this.renderSelectOption("top", "Top")}
            ${this.renderSelectOption("bottom", "Bottom")}
            ${this.renderSelectOption("left", "Left")}
            ${this.renderSelectOption("right", "Right")}
          </select>
        </div>

        <div class="section">
          <h3>Battery thresholds</h3>
          <ha-textfield
            label="Low threshold"
            type="number"
            min="0"
            max="100"
            .value=${config.battery_low_threshold === undefined
              ? ""
              : String(config.battery_low_threshold)}
            .configValue=${"battery_low_threshold"}
            @input=${this._handleNumberInput}
          ></ha-textfield>
          <ha-textfield
            label="Empty threshold"
            type="number"
            min="0"
            max="100"
            .value=${config.battery_empty_threshold === undefined
              ? ""
              : String(config.battery_empty_threshold)}
            .configValue=${"battery_empty_threshold"}
            @input=${this._handleNumberInput}
          ></ha-textfield>
        </div>
      </div>
    `;
  }

  private renderEntityPicker(
    configValue: keyof RoomClimateCardConfig,
    label: string,
    value?: string,
    required?: boolean
  ): TemplateResult {
    return html`
      <ha-entity-picker
        .hass=${this.hass}
        .label=${label}
        .value=${value ?? ""}
        .configValue=${configValue}
        .required=${required ?? false}
        allow-custom-entity
        @value-changed=${this._handleValueChange}
      ></ha-entity-picker>
    `;
  }

  private renderSelectOption(value: string, label: string): TemplateResult {
    return html`<option value=${value}>${label}</option>`;
  }

  private _handleValueChange(ev: CustomEvent): void {
    const target = ev.target as EditorTarget;
    const configValue = target.configValue as string | undefined;
    if (!configValue || !this._config) {
      return;
    }

    const newValue = ev.detail?.value ?? "";
    this._applyConfigValue(configValue, newValue || undefined);
  }

  private _handleInput(ev: Event): void {
    const target = ev.target as HTMLInputElement & EditorTarget;
    const configValue = target.configValue as string | undefined;
    if (!configValue || !this._config) {
      return;
    }

    this._applyConfigValue(configValue, target.value || undefined);
  }

  private _handleNumberInput(ev: Event): void {
    const target = ev.target as HTMLInputElement & EditorTarget;
    const configValue = target.configValue as string | undefined;
    if (!configValue || !this._config) {
      return;
    }

    const value = target.value === "" ? undefined : Number(target.value);
    this._applyConfigValue(configValue, value);
  }

  private _handleSelect(ev: Event): void {
    const target = ev.target as HTMLSelectElement;
    const configValue = target.dataset.configValue;
    if (!configValue || !this._config) {
      return;
    }

    this._applyConfigValue(configValue, target.value);
  }

  private _applyConfigValue(
    path: string,
    value: string | number | undefined
  ): void {
    if (!this._config) {
      return;
    }

    const updated: RoomClimateCardConfig = { ...this._config };

    if (path.startsWith("layout.")) {
      const key = path.split(".")[1] as keyof RoomClimateCardLayoutConfig;
      if (key === "room_name") {
        const nextValue =
          typeof value === "string" && value
            ? (value as RoomNamePosition)
            : undefined;
        updated.layout = {
          ...updated.layout,
          room_name: nextValue,
        };
      }
      if (updated.layout?.room_name === undefined) {
        delete updated.layout;
      }
    } else if (value === undefined || value === "") {
      delete (updated as unknown as Record<string, unknown>)[path];
    } else {
      (updated as unknown as Record<string, unknown>)[path] = value;
    }

    this._config = updated;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: updated },
        bubbles: true,
        composed: true,
      })
    );
  }

  public static get styles() {
    return css`
      .editor {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .section h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .form-select {
        width: 100%;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid var(--divider-color);
        font: inherit;
        background: var(--card-background-color);
      }

      .field-label {
        font-size: 0.85rem;
        font-weight: 600;
      }
    `;
  }
}

if (!customElements.get("room-climate-card-editor")) {
  customElements.define("room-climate-card-editor", RoomClimateCardEditor);
}

declare global {
  interface HTMLElementTagNameMap {
    "room-climate-card-editor": RoomClimateCardEditor;
  }
}
