// utils/currency.ts
export const USD_TO_NAIRA = Number(process.env.USD_TO_NAIRA) || 1300;

export function usdToNaira(usd: number): number {
  return Math.round(usd * USD_TO_NAIRA);
}