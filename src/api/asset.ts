import { Amount, AssetClient, AssetDetail, PoolAsset, BalanceClient, AssetMetadata } from '@galacticcouncil/sdk';

import { chainCursor } from '../db';
import { pairs2Map } from '../utils/mapper';

export async function getAssetsMeta(assets: PoolAsset[]) {
  const api = chainCursor.deref().api;
  const assetClient = new AssetClient(api);
  const details: [string, AssetMetadata][] = await Promise.all(
    assets.map(async (asset: PoolAsset) => [asset.id, await assetClient.getAssetMetadata(asset.id)])
  );
  return pairs2Map(details);
}

export async function getAssetsDetail(assets: PoolAsset[]) {
  const api = chainCursor.deref().api;
  const assetClient = new AssetClient(api);
  const details: [string, AssetDetail][] = await Promise.all(
    assets.map(async (asset: PoolAsset) => [asset.id, await assetClient.getAssetDetail(asset.id)])
  );
  return pairs2Map(details);
}

export async function getAssetsBalance(address: string, assets: PoolAsset[]) {
  const api = chainCursor.deref().api;
  const balanceClient = new BalanceClient(api);
  const balances: [string, Amount][] = await Promise.all(
    assets.map(async (asset: PoolAsset) => [asset.id, await balanceClient.getAccountBalance(address, asset.id)])
  );
  return pairs2Map(balances);
}

export async function getAssetsPrice(assets: PoolAsset[], stableCoinAssetId: string) {
  const router = chainCursor.deref().router;
  const prices: [string, Amount][] = await Promise.all(
    assets.map(async (asset: PoolAsset) => [asset.id, await router.getBestSpotPrice(asset.id, stableCoinAssetId)])
  );
  return pairs2Map(prices);
}

export async function getAssetsPairs(assets: PoolAsset[]) {
  const router = chainCursor.deref().router;
  const pairs: [string, PoolAsset[]][] = await Promise.all(
    assets.map(async (asset: PoolAsset) => [asset.id, await router.getAssetPairs(asset.id)])
  );
  return pairs2Map(pairs);
}