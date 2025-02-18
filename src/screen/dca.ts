import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { BeforeEnterObserver, RouterLocation } from '@vaadin/router';

import { Account, accountCursor } from '../db';
import { DatabaseController } from '../db.ctrl';

import '../component/dca';
import { PoolType } from '@galacticcouncil/sdk';

@customElement('gc-dca-screen')
export class DcaScreen extends LitElement implements BeforeEnterObserver {
  private account = new DatabaseController<Account>(this, accountCursor);

  @state() assetIn: string = null;
  @state() assetOut: string = null;

  async onBeforeEnter(location: RouterLocation) {
    const queryParams = new URLSearchParams(location.search);
    this.assetIn = queryParams.get('assetIn');
    this.assetOut = queryParams.get('assetOut');
  }

  hdxTemplate() {
    return html`
      <gc-dca-app
        chart
        assetIn=${this.assetIn}
        assetOut=${this.assetOut}
        apiAddress="wss://rpc.hydradx.cloud"
        pools=${PoolType.Omni}
        stableCoinAssetId="2"
        accountAddress=${this.account.state?.address}
        accountProvider=${this.account.state?.provider}
        accountName=${this.account.state?.name}
        indexerUrl="https://hydradx-explorer.play.hydration.cloud/graphql"
        grafanaUrl="https://grafana-api.play.hydration.cloud/api/ds/query"
        grafanaDsn="10"
      ></gc-dca-app>
    `;
  }

  hdxTemplateRococo() {
    return html`
      <gc-dca-app
        chart
        assetIn=${this.assetIn}
        assetOut=${this.assetOut}
        apiAddress="wss://hydradx-rococo-rpc.play.hydration.cloud"
        pools=${PoolType.Omni}
        stableCoinAssetId="2"
        accountAddress=${this.account.state?.address}
        accountProvider=${this.account.state?.provider}
        accountName=${this.account.state?.name}
        indexerUrl="https://hydradx-rococo-explorer.play.hydration.cloud/graphql"
        grafanaUrl="https://grafana-api.play.hydration.cloud/api/ds/query"
        grafanaDsn="11"
      ></gc-dca-app>
    `;
  }

  render() {
    return this.hdxTemplateRococo();
  }
}
