import { html, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import * as i18n from 'i18next';

import { BaseElement } from 'element/BaseElement';
import { baseStyles } from 'styles';

import { Notification, NotificationType } from './types';

import styles from './NotificationCenter.css';

@customElement('gc-notification-center')
export class NotificationCenter extends BaseElement {
  @state() toasts: TemplateResult[] = [];
  @state() notifications: Map<string, Notification> = new Map([]);

  private _handleNotification = (e: CustomEvent<Notification>) =>
    this.appendNewNotification(e.detail);

  static styles = [baseStyles, styles];

  openDrawer() {
    const drawer = this.shadowRoot.querySelector('uigc-drawer');
    drawer.setAttribute('open', '');
  }

  appendNewNotification(n: Notification) {
    if (n.toast) {
      const toast = this.toastTemplate(n);
      this.toasts = [...this.toasts, toast];
    }
    this.notifications.set(n.id, n);
  }

  notificationMessage(message: string | TemplateResult) {
    if (typeof message === 'string') {
      return html`
        <span class="message">${message}</span>
      `;
    }
    return html`
      <span class="message">${message}</span>
    `;
  }

  notificationTemplate(n: Notification) {
    return html`
      <uigc-alert class="notification" variant=${n.type} drawer>
        <span class="message">${n.message}</span>
        <span class="secondary">
          <span>
            ${this._humanizer.humanize(Date.now() - n.timestamp, {
              round: true,
            })}
            ago
          </span>
        </span>
      </uigc-alert>
    `;
  }

  toastTemplate(n: Notification) {
    return html`
      <uigc-toast
        open
        id=${n.id}
        timeout=${n.type === NotificationType.success ? 5000 : 0}
        @click=${() => this.openDrawer()}>
        <uigc-alert variant=${n.type}>
          <span class="message">${n.message}</span>
          <span class="secondary">
            <span>
              ${this._humanizer.humanize(Date.now() - n.timestamp, {
                round: true,
              })}
              ago
            </span>
            <span class="grow"></span>
            <span class="count"></span>
          </span>
        </uigc-alert>
      </uigc-toast>
    `;
  }

  removeToastFromDom(id: string): void {
    const allToasts = this.shadowRoot.querySelectorAll('uigc-toast');
    allToasts.forEach((t: Element) => {
      const value = t.getAttribute('id');
      if (id === value) {
        t.removeAttribute('open');
        t.remove();
      }
    });
  }

  closeToast(id: string): void {
    this.removeToastFromDom(id);
    this.requestUpdate();
  }

  getToastCount(): number {
    const toasts = new Set<string>([]);
    const allToasts = this.shadowRoot.querySelectorAll('uigc-toast');
    allToasts.forEach((t: Element) => {
      const value = t.getAttribute('id');
      toasts.add(value);
    });
    return toasts.size;
  }

  async updated() {
    const allToasts = this.shadowRoot.querySelectorAll('.count');
    const toastNo = this.getToastCount();
    if (toastNo > 1) {
      allToasts.forEach((t: Element) => {
        t.innerHTML = '1 of ' + toastNo.toString();
      });
    } else {
      allToasts.forEach((t: Element) => {
        t.innerHTML = null;
      });
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('gc:notification:new', this._handleNotification);
  }

  override disconnectedCallback() {
    this.removeEventListener('gc:notification:new', this._handleNotification);
    super.disconnectedCallback();
  }

  render() {
    return html`
      <div
        @closeable-close=${(e: CustomEvent) => this.closeToast(e.detail.id)}
        @toast-close=${(e: CustomEvent) => this.closeToast(e.detail.id)}>
        ${this.toasts}
      </div>
      <uigc-drawer>
        <span slot="title">${i18n.t('notify.recent')}</span>
        ${[...this.notifications.values()]
          .filter((n: Notification) => n.type == NotificationType.progress)
          .sort((t1, t2) => t2.timestamp - t1.timestamp)
          .map((n: Notification) => this.notificationTemplate(n))}
        ${[...this.notifications.values()]
          .filter((n: Notification) => n.type != NotificationType.progress)
          .sort((t1, t2) => t2.timestamp - t1.timestamp)
          .map((n: Notification) => this.notificationTemplate(n))}
      </uigc-drawer>
      <slot></slot>
    `;
  }
}
