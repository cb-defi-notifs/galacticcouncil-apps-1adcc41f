import type { PoolAsset, Transaction } from '@galacticcouncil/sdk';
import { getTradeMaxAmountIn, getTradeMinAmountOut } from './slippage';
import { chainCursor, tradeSettingsCursor } from '../db';
import { formatAmount } from '../utils/amount';

export type TradeInfo = {
  trade: any;
  transaction: Transaction;
  slippage: string;
};

export async function getBestSell(assetIn: PoolAsset, assetOut: PoolAsset, amountIn: string): Promise<TradeInfo> {
  const router = chainCursor.deref().router;
  const bestSell = await router.getBestSell(assetIn.id, assetOut.id, amountIn);
  const bestSellHuman = bestSell.toHuman();
  const slippage = tradeSettingsCursor.deref().slippage;
  const minAmountOut = getTradeMinAmountOut(bestSell, slippage);
  const minAmountOutHuman = formatAmount(minAmountOut.amount, minAmountOut.decimals);
  const transaction = bestSell.toTx(minAmountOut.amount);

  return {
    trade: bestSellHuman,
    transaction: transaction,
    slippage: minAmountOutHuman,
  } as TradeInfo;
}

export async function getBestBuy(assetIn: PoolAsset, assetOut: PoolAsset, amountOut: string): Promise<TradeInfo> {
  const router = chainCursor.deref().router;
  const bestBuy = await router.getBestBuy(assetIn.id, assetOut.id, amountOut);
  const bestBuyHuman = bestBuy.toHuman();
  const slippage = tradeSettingsCursor.deref().slippage;
  const maxAmountIn = getTradeMaxAmountIn(bestBuy, slippage);
  const maxAmountInHuman = formatAmount(maxAmountIn.amount, maxAmountIn.decimals);
  const transaction = bestBuy.toTx(maxAmountIn.amount);

  return {
    trade: bestBuyHuman,
    transaction: transaction,
    slippage: maxAmountInHuman,
  } as TradeInfo;
}