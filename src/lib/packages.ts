export type CreditPackageId = 'starter' | 'standard' | 'value';

const PACKAGE_BY_CREDITS: Record<number, CreditPackageId> = {
  100: 'starter',
  300: 'standard',
  1000: 'value',
};

/** Maps a displayed credit amount to the server-side package id. Prices are owned by the server. */
export function packageIdForCredits(credits: number): CreditPackageId {
  const id = PACKAGE_BY_CREDITS[credits];
  if (!id) throw new Error(`Unknown credit package: ${credits} credits`);
  return id;
}
