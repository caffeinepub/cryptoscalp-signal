import Map "mo:core/Map";
import Time "mo:core/Time";
import Blob "mo:core/Blob";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import OutCall "http-outcalls/outcall";

actor {
  type CryptoCoin = {
    id: Text;
    symbol: Text;
    name: Text;
    currentPrice: Float;
    priceChange24h: Float;
    marketCapRank: Nat;
  };

  type OHLCV = {
    timestamp: Int;
    open: Float;
    high: Float;
    low: Float;
    close: Float;
    volume: Float;
  };

  type Signal = {
    hasSignal: Bool;
    entry: Float;
    tp1: Float;
    tp2: Float;
    stopLoss: Float;
    rsi: Float;
    ema9: Float;
    ema21: Float;
    ema50: Float;
    volumeRatio: Float;
    macd: Float;
  };

  type BacktestResult = {
    winRate: Float;
    totalSignals: Nat;
    profitableSignals: Nat;
    averageReturn: Float;
  };

  type CachedMarketData = {
    coins: [CryptoCoin];
    timestamp: Int;
  };

  type CoinSignalData = {
    id: Text;
    signal: Signal;
  };

  module CoinSignalData {
    public func compare(data1 : CoinSignalData, data2 : CoinSignalData) : Order.Order {
      Text.compare(data1.id, data2.id);
    };
  };

  let marketDataCache = Map.empty<Text, CachedMarketData>();

  public query func transform(input: OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public shared ({ caller }) func getTopCoins() : async [CryptoCoin] {
    let cacheKey = "top200";
    let currentTime = Time.now();

    switch(marketDataCache.get(cacheKey)) {
      case (?cached) {
        if (currentTime - cached.timestamp < 300_000_000_000) {
          return cached.coins;
        };
      };
      case (null) {};
    };

    let url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=200&page=1&sparkline=false";
    let response = await OutCall.httpGetRequest(url, [], transform);

    let cachedData : CachedMarketData = {
      coins = [];
      timestamp = currentTime;
    };

    marketDataCache.add(cacheKey, cachedData);
    cachedData.coins;
  };

  public query ({ caller }) func getCoinSignal(coinId: Text) : async Signal {
    Runtime.trap("Not implemented");
  };

  public query ({ caller }) func getCoinOHLCV(coinId: Text) : async [OHLCV] {
    Runtime.trap("Not implemented");
  };

  public query ({ caller }) func getBacktestResults(coinId: Text) : async BacktestResult {
    Runtime.trap("Not implemented");
  };

  public shared ({ caller }) func getAllSignals() : async [CoinSignalData] {
    [];
  };
};
