import { ReactiveController, ReactiveControllerHost } from 'lit';

import { chainCursor, xChainCursor } from './db';

export class ThemeController implements ReactiveController {
  private readonly host: ReactiveControllerHost;
  private observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName == 'theme') {
        const mutationTarget = <HTMLElement>mutation.target;
        const newTheme = mutationTarget.attributes.getNamedItem(mutation.attributeName).value;
        this.state = newTheme;
        this.host.requestUpdate();
        chainCursor.deref()?.api?.disconnect();
        chainCursor.reset(null);
        xChainCursor.reset(null);
      }
    });
  });

  state: string = null;

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  hostConnected() {
    const html = document.querySelector('html');
    this.state = html.getAttribute('theme');
    this.observer.observe(html, {
      attributes: true,
    });
  }

  hostDisconnected() {
    this.observer.disconnect();
  }
}
