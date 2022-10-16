import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { themeStyles } from './styles/theme.css';
import { baseStyles } from './styles/base.css';

const KNOWN_ASSETS = new Map(
  Object.entries({
    aUSD: 'Acala USD',
    BSX: 'Basilisk',
    KSM: 'Kusama',
    PHA: 'Phala',
    TNKR: 'Tinkernet',
  })
);

@customElement('ui-asset')
export class Asset extends LitElement {
  @property({ type: String }) asset = null;

  static styles = [
    baseStyles,
    themeStyles,
    css`
      :host {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 0 6px;
        gap: 6px;
        background-color: transparent;
        min-width: 120px;
        height: 52px;
        border-radius: 8px;
        cursor: pointer;
      }

      span.code {
        font-weight: 700;
        font-size: 16px;
        line-height: 100%;
        color: var(--hex-white);
      }

      span.desc {
        font-weight: 500;
        font-size: 12px;
        line-height: 14px;
        color: var(--hex-neutral-gray-400);
      }

      span.title {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        padding: 5px 0px;
      }
    `,
  ];

  render() {
    const assetDesc = KNOWN_ASSETS.get(this.asset) || '--';
    const assetLogo = KNOWN_ASSETS.get(this.asset)
      ? 'assets/img/logo/' + this.asset + '.svg'
      : 'assets/img/logo/unknown.svg';
    return html` <img width="34" height="34" src=${assetLogo} alt=${this.asset} />
      <span class="title">
        <span class="code">${this.asset}</span>
        <span class="desc">${assetDesc}</span>
      </span>
      <slot></slot>`;
  }
}
