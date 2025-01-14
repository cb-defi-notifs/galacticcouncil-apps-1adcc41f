import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';

import { AssetDetail, PoolAsset } from '@galacticcouncil/sdk';

import { Ecosystem } from '../../db';
import { getChainKey } from '../../utils/chain';

@customElement('gc-asset-id')
export class AssetId extends LitElement {
  @property({ attribute: false }) asset: PoolAsset = null;
  @property({ attribute: false }) detail: AssetDetail = null;
  @property({ attribute: false }) locations: Map<string, number> = new Map([]);
  @property({ attribute: false }) ecosystem: Ecosystem = Ecosystem.Polkadot;

  static styles = [
    css`
      :host([size='small']) uigc-asset {
        width: 24px;
        height: 24px;
      }

      :host([size='small']) uigc-asset-id {
        width: 24px;
        height: 24px;
      }
    `,
  ];

  iconTemplate(icon: string, origin: string) {
    if (origin) {
      return html`
        <uigc-asset-id
          slot="icon"
          symbol=${icon}
          chain=${origin}
        ></uigc-asset-id>
      `;
    }
    return html` <uigc-asset-id slot="icon" symbol=${icon}></uigc-asset-id> `;
  }

  render() {
    const { id, icon, symbol, meta } = this.asset || {};
    const desc = this.detail?.name;

    if (meta) {
      const icons = Object.entries(meta);
      return html`
        <uigc-asset ?icon=${!symbol} symbol=${symbol} desc=${desc}>
          ${map(icons, ([key, value]) => {
            const originLocation = this.locations.get(key);
            const originChain = getChainKey(originLocation, this.ecosystem);
            return this.iconTemplate(value, originChain);
          })}
        </uigc-asset>
      `;
    }

    const originLocation = this.locations.get(id);
    const originChain = getChainKey(originLocation, this.ecosystem);
    return html`
      <uigc-asset ?icon=${!symbol} symbol=${symbol} desc=${desc}>
        ${this.iconTemplate(icon, originChain)}
      </uigc-asset>
    `;
  }
}
