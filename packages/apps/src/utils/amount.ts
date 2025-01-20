import {
  Amount,
  Asset,
  BigNumber,
  SYSTEM_ASSET_ID,
  bnum,
  scale,
} from '@galacticcouncil/sdk';

export const MIN_NATIVE_AMOUNT = '1000000000000000';

export function toBn(amount: string | number, decimals: number): BigNumber {
  const result = scale(bnum(amount), decimals);
  return result.decimalPlaces(0, 1);
}

export function formatAmount(amount: BigNumber, decimals: number): string {
  return amount.shiftedBy(-1 * decimals).toString();
}

export function humanizeAmount(
  amount: string | number,
  signDigits?: number,
): string {
  const amountNo = Number(amount);

  if (!Number.isFinite(amountNo)) {
    return null;
  }

  let maxSignDigits: number = signDigits || 4;
  if (amountNo > 1) {
    const intPartLen = Math.ceil(Math.log10(amountNo + 1));
    maxSignDigits = maxSignDigits + intPartLen;
  }
  const formattedNo = new Intl.NumberFormat('en-US', {
    maximumSignificantDigits: maxSignDigits,
  }).format(amountNo);
  return formattedNo.replaceAll(',', ' ');
}

export function exchange(
  exchangeRates: Map<string, Amount>,
  asset: Asset,
  amount: string | number,
): string {
  const rate = exchangeRates.get(asset?.id);
  if (!rate) {
    return null;
  }

  const result = rate.amount.multipliedBy(amount);
  return formatAmount(result, rate.decimals);
}

export function exchangeNative(
  exchangeRate: Amount,
  asset: Asset,
  amountNative: string | number,
): BigNumber {
  if (SYSTEM_ASSET_ID === asset.id) {
    return toBn(amountNative, 0);
  }

  const result = bnum(amountNative).div(exchangeRate.amount);
  return scale(result, asset.decimals).decimalPlaces(0, 1);
}
