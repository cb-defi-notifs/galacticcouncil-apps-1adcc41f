import { html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { choose } from 'lit/directives/choose.js';
import { when } from 'lit/directives/when.js';
import { classMap } from 'lit/directives/class-map.js';

import * as i18n from 'i18next';

import { BaseElement } from '../base/BaseElement';
import { baseStyles } from '../styles/base.css';
import { formStyles } from '../styles/form.css';

import { Account, Chain, accountCursor, chainCursor } from '../../db';
import { DatabaseController } from '../../db.ctrl';
import { TradeApi, TradeTwap, TradeTwapError } from '../../api/trade';
import { humanizeAmount } from '../../utils/amount';

import {
  PoolAsset,
  TradeType,
  bnum,
  calculateDiffToRef,
} from '@galacticcouncil/sdk';

import { TransactionFee } from './types';

@customElement('gc-trade-form')
export class TradeForm extends BaseElement {
  private account = new DatabaseController<Account>(this, accountCursor);
  private chain = new DatabaseController<Chain>(this, chainCursor);

  @state() twapEnabled: boolean = false;

  @property({ attribute: false }) assets: Map<string, PoolAsset> = new Map([]);
  @property({ attribute: false }) pairs: Map<string, PoolAsset[]> = new Map([]);
  @property({ attribute: false }) locations: Map<string, number> = new Map([]);
  @property({ attribute: false }) tradeType: TradeType = TradeType.Buy;
  @property({ type: Boolean }) inProgress = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) switchAllowed = true;
  @property({ attribute: false }) twap: TradeTwap = null;
  @property({ type: Boolean }) twapAllowed = false;
  @property({ type: Boolean }) twapProgress = false;
  @property({ type: Object }) assetIn: PoolAsset = null;
  @property({ type: Object }) assetOut: PoolAsset = null;
  @property({ type: String }) amountIn = null;
  @property({ type: String }) amountInUsd = null;
  @property({ type: String }) amountOut = null;
  @property({ type: String }) amountOutUsd = null;
  @property({ type: String }) balanceIn = null;
  @property({ type: String }) balanceOut = null;
  @property({ type: String }) spotPrice = null;
  @property({ type: String }) afterSlippage = '0';
  @property({ type: String }) afterSlippageUsd = '0';
  @property({ type: String }) priceImpactPct = '0';
  @property({ type: String }) tradeFee = '0';
  @property({ type: String }) tradeFeePct = '0';
  @property({ attribute: false }) tradeFeeRange = null;
  @property({ attribute: false }) transactionFee: TransactionFee = null;
  @property({ attribute: false }) error = {};
  @property({ attribute: false }) swaps: [] = [];

  static styles = [
    baseStyles,
    formStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .transfer {
        display: flex;
        position: relative;
        flex-direction: column;
        padding: 0 14px;
        gap: 14px;
        box-sizing: border-box;
      }

      @media (max-width: 480px) {
        .transfer {
          padding: 0;
        }
      }

      @media (min-width: 768px) {
        .transfer {
          padding: 0 28px;
        }
      }

      .transfer .divider {
        background: var(--uigc-divider-background);
        height: 1px;
        width: 100%;
        left: 0;
        position: absolute;
      }

      .transfer .switch {
        align-items: center;
        display: flex;
        height: 43px;
        justify-content: space-between;
        width: 100%;
      }

      .transfer uigc-asset-switch {
        background: var(--uigc-asset-switch-background);
      }

      .transfer .switch-button {
        position: absolute;
        left: 14px;
        border-radius: 50%;
      }

      @media (min-width: 768px) {
        .transfer .switch-button {
          left: 28px;
        }
      }

      .transfer .switch-button > img {
        height: 100%;
      }

      .transfer .spot-price {
        position: absolute;
        right: 14px;
        background: #23282b;
        border-radius: 7px;
        display: none;
      }

      @media (min-width: 768px) {
        .transfer .spot-price {
          right: 28px;
        }
      }

      .transfer .spot-price.show {
        display: block;
      }

      .info .route-label {
        background: var(--uigc-app-font-color__gradient);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-weight: 500;
        font-size: 12px;
        line-height: 100%;
        text-align: center;
      }

      .info .route-icon {
        margin-left: 12px;
      }

      .info uigc-icon-chevron-right {
        width: 22px;
        height: 22px;
      }

      .info uigc-icon-route {
        margin-left: 12px;
      }

      .indicator {
        display: flex;
        padding: 1px 2px;
        align-items: flex-start;
        gap: 1px;
      }

      .indicator > span {
        width: 16px;
        height: 6px;
        background: rgba(135, 139, 163, 0.2);
      }

      .indicator.low > span:nth-of-type(1) {
        background: #30ffb1;
      }

      .indicator.medium span:nth-of-type(2) {
        background: #f7bf06;
      }

      .indicator.high span:nth-of-type(3) {
        background: #ff931e;
      }

      .cta {
        overflow: hidden;
        width: 100%;
        height: 50px;
        margin: -16px;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
      }

      .cta > span {
        position: absolute;
        transition: top 0.3s;
        -moz-transition: top 0.3s;
        -webkit-transition: top 0.3s;
        -o-transition: top 0.3s;
        -ms-transition: top 0.3s;
      }

      .cta > span.swap {
        top: 16px;
      }

      .cta > span.twap {
        top: 56px;
      }

      .cta__twap > span.swap {
        top: -56px;
      }

      .cta__twap > span.twap {
        top: 16px;
      }

      .hidden {
        display: none;
      }

      .options {
        transition: max-height 0.2s ease-in-out 0s;
        max-height: 0;
        overflow: hidden;
        gap: 0;
      }

      @media (max-width: 480px) {
        .options {
          padding: 0px 14px;
        }
      }

      .options.show {
        max-height: 500px;
      }

      .options > .label {
        color: #999ba7;
        font-family: 'ChakraPetch';
        font-size: 14px;
        font-style: normal;
        font-weight: 500;
        line-height: 100%;
        display: flex;
        flex-direction: row;
        align-items: center;
      }

      .options > div {
        margin-top: 14px;
      }

      .options .highlight {
        margin-left: 3px;
        font-size: 11px;
      }

      .info .positive,
      .options .positive {
        color: #30ffb1;
      }

      .info .negative,
      .options .negative {
        color: var(--uigc-field__error-color);
      }

      .tooltip {
        position: relative;
      }

      .tooltip uigc-icon-info {
        margin-left: 5px;
      }

      .tooltip > .text {
        display: grid;
        visibility: hidden;
        text-align: center;
        position: absolute;
        width: 230px;
        z-index: 1;
        top: 150%;
        left: 50%;
        margin-left: -10px;
        padding: 11px 16px;
        border-radius: 4px;
        background: #333750;
        color: #fff;
        font-family: 'ChakraPetch';
        font-size: 11px;
        font-style: normal;
        font-weight: 500;
        line-height: 140%;
        text-align: left;
      }

      .tooltip > .text::after {
        content: ' ';
        position: absolute;
        bottom: 100%;
        left: 0;
        margin-left: 8px;
        border-width: 5px;
        border-style: solid;
        border-color: transparent transparent #333750 transparent;
      }

      .tooltip:hover > .text {
        visibility: visible;
      }

      .form-option.skeleton {
        align-items: center;
      }

      .form-option .price {
        color: #fff;
        font-family: 'ChakraPetch';
        font-style: normal;
        font-weight: 600;
        line-height: 130%;
        font-size: 16px;
        font-size: 4cqw;
      }

      .form-option .usd {
        font-size: 10px;
        line-height: 14px;
        color: var(--hex-neutral-gray-400);
        font-weight: 600;
        text-align: right;
        max-width: 150px;
      }

      .form-option .usd > span {
        display: inline-block;
      }
    `,
  ];

  private isTwapError(): boolean {
    return this.twap && !!this.twap?.tradeError;
  }

  private isSellTwap(): boolean {
    return this.twapEnabled && this.tradeType === TradeType.Sell;
  }

  private isBuyTwap(): boolean {
    return this.twapEnabled && this.tradeType === TradeType.Buy;
  }

  private hasGeneralError(): boolean {
    const generalErrors = Object.assign({}, this.error);
    delete generalErrors['balance'];
    return Object.keys(generalErrors).length > 0;
  }

  private hasTradeError(): boolean {
    return Object.keys(this.error).length > 0;
  }

  private hasTwapError(): boolean {
    const generalErrors = Object.assign({}, this.error);
    delete generalErrors['trade'];
    const hasError = Object.keys(generalErrors).length > 0;
    const hasTwapError = this.twapEnabled && !!this.twap?.tradeError;
    return hasError || hasTwapError;
  }

  private isDisabled(): boolean {
    if (this.twapEnabled) {
      return this.disabled || this.hasTwapError();
    }
    return this.disabled || this.hasTradeError();
  }

  private isSignificantPriceImpact(impact: string): boolean {
    return Number(impact) <= -1;
  }

  private enableTwap() {
    if (!this.isTwapError()) {
      this.twapEnabled = true;
      this.requestUpdate();
    }
  }

  private disableTwap() {
    this.twapEnabled = false;
    this.requestUpdate();
  }

  private calculateTwapPctDiff(twapPrice: number) {
    const swapPrice = Number(this.afterSlippage);
    const swapPriceBN = bnum(swapPrice);
    const twapPriceBN = bnum(twapPrice);
    if (this.tradeType === TradeType.Sell) {
      return calculateDiffToRef(twapPriceBN, swapPriceBN).toNumber();
    } else {
      return calculateDiffToRef(swapPriceBN, twapPriceBN).toNumber();
    }
  }

  private calculateTwapPriceDiff(twapPrice: number) {
    const swapPrice =
      this.tradeType === TradeType.Sell ? this.amountOutUsd : this.amountInUsd;
    const swapPriceBN = bnum(swapPrice);
    const twapPriceBN = bnum(twapPrice);
    if (this.tradeType === TradeType.Sell) {
      return twapPriceBN.minus(swapPriceBN).toNumber();
    } else {
      return swapPriceBN.minus(twapPriceBN).toNumber();
    }
  }

  onSettingsClick(e: any) {
    const options = {
      bubbles: true,
      composed: true,
    };
    this.dispatchEvent(new CustomEvent('settings-clicked', options));
  }

  onCtaClick(e: any) {
    const options = {
      bubbles: true,
      composed: true,
    };

    if (this.twapEnabled) {
      this.dispatchEvent(new CustomEvent('twap-clicked', options));
    } else {
      this.dispatchEvent(new CustomEvent('swap-clicked', options));
    }
  }

  onSetupClick(e: any) {
    const options = {
      bubbles: true,
      composed: true,
    };
    this.dispatchEvent(new CustomEvent('setup-clicked', options));
  }

  maxClickHandler(id: string, asset: PoolAsset) {
    return function (_e: Event) {
      const options = {
        bubbles: true,
        composed: true,
        detail: { id: id, asset: asset },
      };
      this.dispatchEvent(new CustomEvent('asset-max-clicked', options));
    };
  }

  infoSlippageTemplate(assetSymbol: string) {
    let amount: string = this.afterSlippage;
    let temp: TemplateResult = null;

    if (this.twapEnabled) {
      amount = this.twap.orderSlippage.toString();
      temp = this.infoTwapSlippagePctTemplate();
    }

    return html` ${choose(this.tradeType, [
        [
          TradeType.Sell,
          () => html` <span class="label">Minimum received:</span>`,
        ],
        [TradeType.Buy, () => html` <span class="label">Maximum sent:</span>`],
      ])}
      <span class="grow"></span>
      ${when(
        this.inProgress,
        () =>
          html`<uigc-skeleton
            progress
            rectangle
            width="150px"
            height="12px"
          ></uigc-skeleton>`,
        () =>
          html`<span class="value"
            >${amount ? humanizeAmount(amount) : '0'} ${assetSymbol}
            ${temp}</span
          >`,
      )}`;
  }

  infoPriceImpactTemplate() {
    let priceImpact: string = this.priceImpactPct;
    if (this.twapEnabled) {
      priceImpact = this.twap.trade.toHuman().priceImpactPct;
    }

    const priceImpactClasses = {
      value: true,
      text_error: this.isSignificantPriceImpact(priceImpact),
    };
    return html` <span class="label">${i18n.t('trade.priceImpact')}</span>
      <span class="grow"></span>
      ${when(
        this.inProgress,
        () =>
          html`<uigc-skeleton
            progress
            rectangle
            width="80px"
            height="12px"
          ></uigc-skeleton>`,
        () =>
          html`<span class=${classMap(priceImpactClasses)}
            >${priceImpact}%</span
          >`,
      )}`;
  }

  infoTradeFeeDetail(assetSymbol: string) {
    if (this.inProgress) {
      return html`<uigc-skeleton
        progress
        rectangle
        width="80px"
        height="12px"
      ></uigc-skeleton>`;
    }

    let tradeFee: string = this.tradeFee;
    let tradeFeePct: string = this.tradeFeePct;

    if (this.twapEnabled) {
      const { tradeReps, trade } = this.twap;
      const tradeHuman = trade.toHuman();
      const tradeFeeNo = Number(tradeHuman.tradeFee) * tradeReps;
      tradeFee = tradeFeeNo.toString();
      tradeFeePct = tradeHuman.tradeFeePct;
    }

    if (this.tradeFeeRange) {
      const max = this.tradeFeeRange[1];
      const min = this.tradeFeeRange[0];
      const fraction = (max - min) / 3;
      const mediumLow = min + fraction;
      const mediumHigh = max - fraction;
      const fee = Number(this.tradeFeePct);
      const indicatorClasses = {
        indicator: true,
        low: fee < mediumLow,
        medium: fee >= mediumLow && fee <= mediumHigh,
        high: fee > mediumHigh,
      };
      return html` <span class="value"
          >${humanizeAmount(tradeFee)} ${assetSymbol}</span
        >
        <span class="value highlight"> (${tradeFeePct}%) </span>
        <span class=${classMap(indicatorClasses)}>
          <span></span>
          <span></span>
          <span></span>
        </span>`;
    }

    return html`<span class="value"
        >${humanizeAmount(tradeFee)} ${assetSymbol}</span
      >
      <span class="value highlight"> (${tradeFeePct}%) </span> `;
  }

  infoTradeFeeTemplate(assetSymbol: string) {
    return html`
      <span class="label">${i18n.t('trade.tradeFee')}</span>
      <span class="grow"></span>
      ${this.infoTradeFeeDetail(assetSymbol)}
    `;
  }

  infoTransactionFeeTemplate() {
    let amount: string = this.transactionFee?.amount;
    if (this.twapEnabled && this.transactionFee) {
      const amountNo = Number(amount);
      amount = TradeApi.getTwapTxFee(this.twap.tradeReps, amountNo).toString();
    }

    return html`
      <span class="label">${i18n.t('trade.txFee')}</span>
      <span class="grow"></span>
      ${when(
        this.inProgress,
        () =>
          html`<uigc-skeleton
            progress
            rectangle
            width="80px"
            height="12px"
          ></uigc-skeleton>`,
        () =>
          html`<span class="value"
            >${this.transactionFee
              ? humanizeAmount(amount) + ' ' + this.transactionFee.asset
              : '-'}</span
          >`,
      )}
    `;
  }

  bestRouteTemplate() {
    const bestRoute = this.swaps.map(
      (swap: any) => this.assets.get(swap.assetOut).symbol,
    );
    this.tradeType == TradeType.Buy && bestRoute.reverse();
    return html`
      <span class="value">${this.assetIn.symbol}</span>
      ${bestRoute.map(
        (poolAsset: string) =>
          html`
            <uigc-icon-chevron-right></uigc-icon-chevron-right>
            <span class="value">${poolAsset}</span>
          `,
      )}
      <uigc-icon-route></uigc-icon-route>
    `;
  }

  infoBestRouteTemplate() {
    return html`
      <span class="route-label">${i18n.t('trade.bestRoute')}</span>
      <span class="grow"></span>
      ${when(
        this.inProgress,
        () =>
          html`<uigc-skeleton
            progress
            width="130px"
            height="14px"
          ></uigc-skeleton>`,
        () => this.bestRouteTemplate(),
      )}
    `;
  }

  infoTwapSlippageTemplate() {
    const { amountInUsd, amountOutUsd } = this.twap;
    const twapPrice =
      this.tradeType === TradeType.Sell ? amountOutUsd : amountInUsd;
    const twapPriceeNo = Number(twapPrice);
    const twapDiff = this.calculateTwapPriceDiff(twapPriceeNo);
    const twapDiffAbs = Math.abs(twapDiff);
    const twapSellSymbol = twapDiff >= 0 ? '+$' : '-$';
    const twapBuySymbol = twapDiff > 0 ? '-$' : '+$';
    const twapSymbol =
      this.tradeType === TradeType.Sell ? twapSellSymbol : twapBuySymbol;
    const twapClasses = {
      value: true,
      highlight: true,
      positive: twapDiff > 0,
      negative: twapDiff < 0,
    };
    return html`
      <span class=${classMap(twapClasses)}
        >(${twapSymbol}${humanizeAmount(twapDiffAbs.toString())})</span
      >
    `;
  }

  infoTwapSlippagePctTemplate() {
    const { orderSlippage } = this.twap;
    const twapDiff = this.calculateTwapPctDiff(orderSlippage);
    const twapDiffAbs = Math.abs(twapDiff);
    const twapSellSymbol = twapDiff >= 0 ? '+' : '-';
    const twapBuySymbol = twapDiff > 0 ? '-' : '+';
    const twapSymbol =
      this.tradeType === TradeType.Sell ? twapSellSymbol : twapBuySymbol;
    const twapClasses = {
      value: true,
      highlight: true,
      positive: twapDiff > 0,
      negative: twapDiff < 0,
    };
    return html`
      <span class=${classMap(twapClasses)}>(${twapSymbol}${twapDiffAbs}%)</span>
    `;
  }

  formAssetInTemplate() {
    let amountIn: string = this.amountIn;
    let amountInUsd: string = this.amountInUsd;

    if (this.isBuyTwap()) {
      amountIn = this.twap.amountIn.toString();
      amountInUsd = this.twap.amountInUsd.toString();
    }

    const amountUsdHuman = amountInUsd ? humanizeAmount(amountInUsd) : null;
    const error = this.error['balance'];
    return html` <uigc-asset-transfer
      id="assetIn"
      title="${i18n.t('trade.payWith')}"
      ?error=${error}
      .error=${error}
      .asset=${this.assetIn?.symbol}
      .amount=${amountIn}
      .amountUsd=${amountUsdHuman}
      @asset-input-changed=${() => {
        this.twapEnabled = false;
      }}
    >
      <gc-asset-id
        slot="asset"
        .asset=${this.assetIn}
        .locations=${this.locations}
      ></gc-asset-id>
      <uigc-asset-balance
        slot="balance"
        .balance=${this.balanceIn}
        .formatter=${humanizeAmount}
        .onMaxClick=${this.maxClickHandler('assetIn', this.assetIn)}
        @asset-max-clicked=${() => {
          this.twapEnabled = false;
        }}
      ></uigc-asset-balance>
    </uigc-asset-transfer>`;
  }

  formAssetOutTemplate() {
    let amountOut: string = this.amountOut;
    let amountOutUsd: string = this.amountOutUsd;

    if (this.isSellTwap()) {
      amountOut = this.twap.amountOut.toString();
      amountOutUsd = this.twap.amountOutUsd.toString();
    }

    const amountUsdHuman = amountOutUsd ? humanizeAmount(amountOutUsd) : null;
    return html` <uigc-asset-transfer
      id="assetOut"
      title="${i18n.t('trade.youGet')}"
      .asset=${this.assetOut?.symbol}
      .amount=${amountOut}
      .amountUsd=${amountUsdHuman}
      @asset-input-changed=${() => {
        this.twapEnabled = false;
      }}
    >
      <gc-asset-id
        slot="asset"
        .asset=${this.assetOut}
        .locations=${this.locations}
      ></gc-asset-id>
      <uigc-asset-balance
        slot="balance"
        .balance=${this.balanceOut}
        .formatter=${humanizeAmount}
        .onMaxClick=${this.maxClickHandler('assetOut', this.assetOut)}
        @asset-max-clicked=${() => {
          this.twapEnabled = false;
        }}
      ></uigc-asset-balance>
    </uigc-asset-transfer>`;
  }

  formSwitch() {
    const spotPriceClasses = {
      'spot-price': true,
      show: this.spotPrice || this.inProgress,
    };
    return html`
      <div class="switch">
        <div class="divider"></div>
        <uigc-asset-switch
          class="switch-button"
          ?disabled=${!this.switchAllowed}
          @asset-switch-clicked=${() => {
            this.twapEnabled = false;
          }}
        >
        </uigc-asset-switch>
        <uigc-asset-price
          class=${classMap(spotPriceClasses)}
          .inputAsset=${this.tradeType == TradeType.Sell
            ? this.assetIn?.symbol
            : this.assetOut?.symbol}
          .outputAsset=${this.tradeType == TradeType.Sell
            ? this.assetOut?.symbol
            : this.assetIn?.symbol}
          .outputBalance=${this.spotPrice}
          .loading=${this.inProgress}
        >
        </uigc-asset-price>
      </div>
    `;
  }

  formTradeOptionLabel() {
    return html`
      <div class="label">
        <span>${i18n.t('twap.title')}</span>
        <span class="tooltip">
          <uigc-icon-info> </uigc-icon-info>
          <span class="text">
            <span><b>${i18n.t('twap.single')}</b></span>
            <span>${i18n.t('trade.desc')}</span>
            <br />
            <span><b>${i18n.t('twap.split')}</b></span>
            <span>${i18n.t('twap.desc')}</span>
          </span>
        </span>
      </div>
    `;
  }

  formTradeOptionSkeleton(title: string, desc: string) {
    return html`
      <div class="form-option skeleton">
        <div class="left">
          <span class="title">${title}</span>
          <span class="desc">${desc}</span>
        </div>
        <div class="right">
          <span class="price">
            <uigc-skeleton
              progress
              rectangle
              width="130px"
              height="20px"
            ></uigc-skeleton>
          </span>
          <span class="usd">
            <uigc-skeleton
              progress
              rectangle
              width="70px"
              height="14px"
            ></uigc-skeleton>
          </span>
        </div>
      </div>
    `;
  }

  formTradeOption(assetSymbol: string) {
    if (this.inProgress) {
      return this.formTradeOptionSkeleton(
        i18n.t('twap.single'),
        'Instant execution',
      );
    }

    const price =
      this.tradeType === TradeType.Sell ? this.amountOut : this.amountIn;
    const priceUsd =
      this.tradeType === TradeType.Sell ? this.amountOutUsd : this.amountInUsd;
    const swapClasses = {
      'form-option': true,
      active: !this.twapEnabled,
      hidden: !(this.swaps.length > 0 && this.twapAllowed),
    };
    return html`
      <div
        class=${classMap(swapClasses)}
        @click=${() => this.transactionFee && this.disableTwap()}
      >
        <div class="left">
          <span class="title">${i18n.t('twap.single')}</span>
          <span class="desc">Instant execution</span>
        </div>
        <div class="right">
          <span class="price">${humanizeAmount(price)} ${assetSymbol}</span>
          <span class="usd">≈ ${humanizeAmount(priceUsd)} USD</span>
        </div>
      </div>
    `;
  }

  formTwapOption(assetSymbol: string) {
    if (this.twapProgress || !this.twap) {
      return this.formTradeOptionSkeleton(
        i18n.t('twap.split'),
        i18n.t('twap.splitDescr', {
          timeframe: 'N/A',
          interpolation: { escapeValue: false },
        }),
      );
    }

    if (this.twap && this.twap.tradeError === TradeTwapError.OrderTooBig) {
      return this.formTwapOptionError(assetSymbol);
    }

    const { tradeTime, amountIn, amountInUsd, amountOut, amountOutUsd } =
      this.twap;
    const price = this.tradeType === TradeType.Sell ? amountOut : amountIn;
    const priceUsd =
      this.tradeType === TradeType.Sell ? amountOutUsd : amountInUsd;
    const timeframe = this._humanizer.humanize(tradeTime, {
      round: true,
      largest: 2,
      units: ['h', 'm'],
    });

    const twapClasses = {
      'form-option': true,
      active: this.twapEnabled,
      hidden: !(this.swaps.length > 0 && this.twapAllowed),
      disabled: this.isTwapError(),
    };

    return html`
      <div
        class=${classMap(twapClasses)}
        @click=${() => this.transactionFee && this.enableTwap()}
      >
        <div class="left">
          <span class="title">${i18n.t('twap.split')}</span>
          <span class="desc">${i18n.t('twap.splitDescr', { timeframe })}</span>
        </div>
        <div class="right">
          <span class="price"
            >${humanizeAmount(price.toString())} ${assetSymbol}</span
          >
          <span class="usd">
            <span>≈ ${humanizeAmount(priceUsd)} USD</span>
            ${this.infoTwapSlippageTemplate()}
          </span>
        </div>
      </div>
    `;
  }

  formTwapOptionError(assetSymbol: string) {
    return html`
      <div class="form-option disabled">
        <div class="left">
          <span class="title">${i18n.t('twap.split')}</span>
          <span class="desc"
            >${i18n.t('twap.splitDescr', {
              timeframe: 'N/A',
              interpolation: { escapeValue: false },
            })}</span
          >
        </div>
        <div class="right">
          <span class="price">0 ${assetSymbol}</span>
          <span class="usd">≈ 0 USD</span>
        </div>
      </div>
    `;
  }

  render() {
    const assetSymbol =
      this.tradeType == TradeType.Sell
        ? this.assetOut?.symbol
        : this.assetIn?.symbol;
    const ctaClasses = {
      cta: true,
      cta__twap: this.twapEnabled,
    };
    const optionsClasses = {
      options: true,
      transfer: true,
      show: this.swaps.length > 0 && this.twapAllowed,
    };
    const infoClasses = {
      info: true,
      show: this.swaps.length > 0,
    };
    const errorClasses = {
      error: true,
      show:
        this.swaps.length > 0 && !this.twapEnabled && this.hasGeneralError(),
    };
    return html`
      <slot name="header"></slot>
      <div class="transfer">
        ${this.formAssetInTemplate()} ${this.formSwitch()}
        ${this.formAssetOutTemplate()}
      </div>
      <div class=${classMap(optionsClasses)}>
        ${this.formTradeOptionLabel()} ${this.formTradeOption(assetSymbol)}
        ${this.formTwapOption(assetSymbol)}
      </div>
      <div class=${classMap(infoClasses)}>
        <div class="row">${this.infoSlippageTemplate(assetSymbol)}</div>
        <div class="row">${this.infoPriceImpactTemplate()}</div>
        <div class="row">${this.infoTradeFeeTemplate(assetSymbol)}</div>
        <div class="row">${this.infoTransactionFeeTemplate()}</div>
        ${when(
          this.swaps.length > 1,
          () =>
            html` <div class="row route">${this.infoBestRouteTemplate()}</div>`,
        )}
      </div>
      <div class=${classMap(errorClasses)}>
        <uigc-icon-error></uigc-icon-error>
        <span> ${this.error['pool'] || this.error['trade']} </span>
      </div>
      <uigc-button
        ?disabled=${this.isDisabled()}
        class="confirm"
        variant="primary"
        fullWidth
        @click=${this.onCtaClick}
      >
        <div class=${classMap(ctaClasses)}>
          <span class="swap"
            >${this.account.state
              ? i18n.t('trade.swap')
              : i18n.t('trade.connect')}</span
          >
          <span class="twap"
            >${this.account.state
              ? i18n.t('trade.twap')
              : i18n.t('trade.connect')}</span
          >
        </div>
      </uigc-button>
    `;
  }
}
