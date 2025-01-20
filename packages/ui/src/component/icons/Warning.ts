import { html } from 'lit';
import { customElement } from 'lit/decorators.js';

import { BaseIcon } from './BaseIcon';

import styles from './Warning.css';

@customElement('uigc-icon-warning')
export class WarningIcon extends BaseIcon {
  static styles = [BaseIcon.styles, styles];

  render() {
    return html`
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M9.96 3.338a2.358 2.358 0 0 1 4.084 0l8.64 14.965a2.358 2.358 0 0 1-2.042 3.538H3.36a2.358 2.358 0 0 1-2.043-3.54Zm.847 13.378a1.198 1.198 0 1 1 2.396 0 1.198 1.198 0 0 1-2.396 0zm2.396-7.264a1.198 1.198 0 0 0-2.396 0v3.193a1.198 1.198 0 0 0 2.396 0z"
          fill="url(#paint0_linear_3_2)"></path>
        <defs>
          <linearGradient
            id="paint0_linear_3_2"
            x1="11.638"
            x2="11.638"
            y1="10.524"
            y2="15.469"
            gradientTransform="matrix(1.7969 0 0 1.7969 -8.912 -5.955)"
            gradientUnits="userSpaceOnUse">
            <stop
              style="offset: var(--stop-first-offset); stop-color: var(--stop-first-color); " />
            <stop offset="1" style="stop-color: var(--stop-second-color); " />
          </linearGradient>
        </defs>
      </svg>
    `;
  }
}
