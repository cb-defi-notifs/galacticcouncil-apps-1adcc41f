import { html, LitElement, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { AnyEvmChain, Parachain } from '@galacticcouncil/xcm-core';
import { chainsMap } from '@galacticcouncil/xcm-cfg';
import '@galacticcouncil/ui';

import type { ISubmittableResult } from '@polkadot/types/types';
import type { DispatchError } from '@polkadot/types/interfaces';

import * as i18n from 'i18next';
import short from 'short-uuid';

import { Chain, ChainCursor, DatabaseController } from 'db';
import { txRecord } from 'utils/event';
import { WalletProvider, EVM_PROVIDERS } from 'utils/wallet';

import { signAndSend, signAndSendEvm } from './utils';
import {
  Notification,
  NotificationType,
  TxInfo,
  TxNotification,
} from './types';

import styles from './TransactionCenter.css';

@customElement('gc-transaction-center')
export class TransactionCenter extends LitElement {
  protected chain = new DatabaseController<Chain>(this, ChainCursor);

  private txBroadcasted: Set<string> = new Set([]);

  @state() message: TemplateResult = null;
  @state() currentTx: string = null;

  private _handleOnChainTx = (e: CustomEvent<TxInfo>) =>
    this.processTx(short.generate(), e.detail);
  private _handleCrossChainTx = (e: CustomEvent<TxInfo>) =>
    this.processXcm(short.generate(), e.detail);

  static styles = styles;

  private blockMeta(
    result: ISubmittableResult,
    blockHash: string,
  ): Record<string, string> {
    const meta: Record<string, string> = {};
    meta['blockHash'] = blockHash;
    meta['txIndex'] = result.txIndex.toString();
    return meta;
  }

  private logInBlockMessage(txId: string, hash: string) {
    console.log(`[${txId}] Completed at block hash #${hash}`);
  }

  private async logDispatchError(
    chain: Parachain,
    dispatchError: DispatchError,
  ): Promise<void> {
    const api = await chain.api;
    const decoded = api.registry.findMetaError(dispatchError.asModule);
    console.error(
      `${decoded.section}.${decoded.method}: ${decoded.docs.join(' ')}`,
    );
  }

  private signWithEvm(chain: AnyEvmChain, txId: string, txInfo: TxInfo) {
    signAndSendEvm(
      chain,
      txInfo,
      (_hash) => {
        this.handleBroadcasted(txId, txInfo.notification);
      },
      async ({ blockNumber, status }) => {
        if (chain instanceof Parachain) {
          const api = await chain.api;
          const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
          this.logInBlockMessage(txId, blockHash.toString());
        }
        const txError = 'success' !== status;
        this.handleInBlock(txId, txInfo.notification, txError, {});
      },
      (_error) => {
        this.handleError(txId, txInfo.notification);
      },
    );
  }

  private signWithSubstrate(chain: Parachain, txId: string, txInfo: TxInfo) {
    signAndSend(
      chain,
      txInfo,
      (res) => {
        const { events, status, dispatchError } = res;
        const type = status.type.toLowerCase();
        switch (type) {
          case 'broadcast':
            this.handleBroadcasted(txId, txInfo.notification);
            break;
          case 'inblock':
            const blockHash = status.asInBlock.toString();
            const meta = this.blockMeta(res, blockHash);
            this.logInBlockMessage(txId, blockHash);
            const txEvent = txRecord(events).event;
            const txError = 'ExtrinsicFailed' === txEvent.method;
            this.handleInBlock(txId, txInfo.notification, txError, meta);
            break;
          case 'finalized':
            if (dispatchError) {
              this.logDispatchError(chain, dispatchError);
              this.handleError(txId, txInfo.notification);
            }
            break;
        }
      },
      () => this.handleError(txId, txInfo.notification),
    );
  }

  private async processTx(txId: string, txInfo: TxInfo) {
    const { provider } = txInfo.account;
    const chain = chainsMap.get('hydration');
    const walletProvider: WalletProvider = WalletProvider[provider];
    const isEvmProvider = EVM_PROVIDERS.includes(walletProvider);
    if (isEvmProvider) {
      this.signWithEvm(chain as AnyEvmChain, txId, txInfo);
    } else {
      this.signWithSubstrate(chain as Parachain, txId, txInfo);
    }
  }

  private async processXcm(txId: string, txInfo: TxInfo) {
    const { srcChain } = txInfo.meta;
    const { provider } = txInfo.account;
    const chain = chainsMap.get(srcChain);
    const walletProvider: WalletProvider = WalletProvider[provider];
    const isEvmProvider = EVM_PROVIDERS.includes(walletProvider);
    if (isEvmProvider) {
      this.signWithEvm(chain as AnyEvmChain, txId, txInfo);
    } else {
      this.signWithSubstrate(chain as Parachain, txId, txInfo);
    }
  }

  private handleBroadcasted(id: string, { processing }: TxNotification) {
    const isBroadcasted = this.txBroadcasted.has(id);
    if (isBroadcasted) {
      return;
    } else {
      this.txBroadcasted.add(id);
    }
    this.currentTx = id;
    this.message = this.broadcastTemplate(id, processing.message);
    this.sendNotification(
      id,
      NotificationType.progress,
      processing.message,
      false,
    );
  }

  private handleError(id: string, { failure }: TxNotification) {
    this.message = this.errorTemplate(id);
    this.sendNotification(id, NotificationType.error, failure.message, false);
  }

  private handleInBlock(
    id: string,
    { success, failure }: TxNotification,
    error: boolean,
    meta?: Record<string, string>,
  ) {
    if (id == this.currentTx) {
      this.closeDialog(id);
    }

    if (error) {
      this.sendNotification(
        id,
        NotificationType.error,
        failure.message,
        true,
        meta,
      );
    } else {
      this.sendNotification(
        id,
        NotificationType.success,
        success.message,
        true,
        meta,
      );
    }
  }

  sendNotification(
    id: string,
    type: NotificationType,
    message: string | TemplateResult,
    toast: boolean,
    meta?: Record<string, string>,
  ) {
    const options = {
      bubbles: true,
      composed: true,
      detail: {
        id: id,
        timestamp: Date.now(),
        type: type,
        message: message,
        toast: toast,
        meta: meta,
      } as Notification,
    };
    const notificationEvent = new CustomEvent<Notification>(
      'gc:notification:new',
      options,
    );
    this.dispatchEvent(notificationEvent);
  }

  closeDialogGracefully(id: string): void {
    const dialog = this.shadowRoot.getElementById(id);
    dialog.removeAttribute('open');
    dialog.remove();
  }

  closeDialog(id: string) {
    this.closeDialogGracefully(id);
    this.message = null;
    this.currentTx = null;
  }

  closeBroadcastDialog(id: string, message: string | TemplateResult) {
    this.closeDialog(id);
    this.sendNotification(id, NotificationType.progress, message, true);
  }

  broadcastTemplate(id: string, message: string | TemplateResult) {
    return html`
      <uigc-dialog
        open
        id=${id}
        timeout="3000"
        @closeable-close=${(e: CustomEvent) =>
          this.closeBroadcastDialog(id, message)}>
        <uigc-circular-progress class="icon"></uigc-circular-progress>
        <uigc-typography variant="title">
          ${i18n.t('tx.submitted')}
        </uigc-typography>
        <span>${i18n.t('tx.submittedText')}</span>
        <uigc-button
          variant="secondary"
          @click=${() => this.closeBroadcastDialog(id, message)}>
          ${i18n.t('tx.close')}
        </uigc-button>
      </uigc-dialog>
    `;
  }

  errorTemplate(id: string) {
    return html`
      <uigc-dialog open id=${id}>
        <uigc-icon-error-alt fit class="icon"></uigc-icon-error-alt>
        <uigc-typography variant="title" error>
          ${i18n.t('tx.failed')}
        </uigc-typography>
        <span>${i18n.t('tx.failedText')}</span>
        <uigc-button variant="secondary" @click=${() => this.closeDialog(id)}>
          ${i18n.t('tx.close')}
        </uigc-button>
      </uigc-dialog>
    `;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('gc:tx:new', this._handleOnChainTx);
    this.addEventListener('gc:tx:scheduleDca', this._handleOnChainTx);
    this.addEventListener('gc:tx:terminateDca', this._handleOnChainTx);
    this.addEventListener('gc:xcm:new', this._handleCrossChainTx);
  }

  override disconnectedCallback() {
    this.removeEventListener('gc:tx:new', this._handleOnChainTx);
    this.removeEventListener('gc:tx:scheduleDca', this._handleOnChainTx);
    this.removeEventListener('gc:tx:terminateDca', this._handleOnChainTx);
    this.removeEventListener('gc:xcm:new', this._handleCrossChainTx);
    super.disconnectedCallback();
  }

  render() {
    return html`
      <div>${this.message}</div>
      <slot></slot>
    `;
  }
}
