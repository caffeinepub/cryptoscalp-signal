import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Signal {
    rsi: number;
    tp1: number;
    tp2: number;
    ema9: number;
    macd: number;
    ema21: number;
    ema50: number;
    entry: number;
    volumeRatio: number;
    stopLoss: number;
    hasSignal: boolean;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface OHLCV {
    low: number;
    high: number;
    close: number;
    open: number;
    volume: number;
    timestamp: bigint;
}
export interface BacktestResult {
    profitableSignals: bigint;
    averageReturn: number;
    winRate: number;
    totalSignals: bigint;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface CoinSignalData {
    id: string;
    signal: Signal;
}
export interface CryptoCoin {
    id: string;
    currentPrice: number;
    name: string;
    priceChange24h: number;
    marketCapRank: bigint;
    symbol: string;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface backendInterface {
    getAllSignals(): Promise<Array<CoinSignalData>>;
    getBacktestResults(coinId: string): Promise<BacktestResult>;
    getCoinOHLCV(coinId: string): Promise<Array<OHLCV>>;
    getCoinSignal(coinId: string): Promise<Signal>;
    getTopCoins(): Promise<Array<CryptoCoin>>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
}
