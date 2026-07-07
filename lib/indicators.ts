import type { OHLCV } from "./types";

export interface TimeValue {
  time: string | number;
  value: number;
}

export function calculateSMA(data: OHLCV[], period: number): TimeValue[] {
  const out: TimeValue[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;
    if (i >= period) sum -= data[i - period].close;
    if (i >= period - 1) {
      out.push({ time: data[i].time, value: sum / period });
    }
  }
  return out;
}

export function calculateEMA(data: OHLCV[], period: number): TimeValue[] {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  const out: TimeValue[] = [];
  let ema =
    data.slice(0, period).reduce((acc, d) => acc + d.close, 0) / period;
  out.push({ time: data[period - 1].time, value: ema });
  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    out.push({ time: data[i].time, value: ema });
  }
  return out;
}

export function calculateRSI(data: OHLCV[], period = 14): TimeValue[] {
  if (data.length <= period) return [];
  const out: TimeValue[] = [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    out.push({ time: data[i].time, value: 100 - 100 / (1 + rs) });
  }
  return out;
}

export interface MACDResult {
  macd: TimeValue[];
  signal: TimeValue[];
  histogram: TimeValue[];
}

export function calculateMACD(
  data: OHLCV[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): MACDResult {
  const emaFast = calculateEMA(data, fast);
  const emaSlow = calculateEMA(data, slow);
  const offset = emaFast.length - emaSlow.length;
  const macd: TimeValue[] = emaSlow.map((s, i) => ({
    time: s.time,
    value: emaFast[i + offset].value - s.value,
  }));
  if (macd.length < signalPeriod) return { macd, signal: [], histogram: [] };
  const k = 2 / (signalPeriod + 1);
  let sig =
    macd.slice(0, signalPeriod).reduce((acc, d) => acc + d.value, 0) /
    signalPeriod;
  const signal: TimeValue[] = [{ time: macd[signalPeriod - 1].time, value: sig }];
  for (let i = signalPeriod; i < macd.length; i++) {
    sig = macd[i].value * k + sig * (1 - k);
    signal.push({ time: macd[i].time, value: sig });
  }
  const histOffset = macd.length - signal.length;
  const histogram: TimeValue[] = signal.map((s, i) => ({
    time: s.time,
    value: macd[i + histOffset].value - s.value,
  }));
  return { macd, signal, histogram };
}

export interface BollingerResult {
  upper: TimeValue[];
  middle: TimeValue[];
  lower: TimeValue[];
}

export function calculateBollingerBands(
  data: OHLCV[],
  period = 20,
  mult = 2
): BollingerResult {
  const upper: TimeValue[] = [];
  const middle: TimeValue[] = [];
  const lower: TimeValue[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((acc, d) => acc + d.close, 0) / period;
    const variance =
      slice.reduce((acc, d) => acc + (d.close - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    middle.push({ time: data[i].time, value: mean });
    upper.push({ time: data[i].time, value: mean + mult * sd });
    lower.push({ time: data[i].time, value: mean - mult * sd });
  }
  return { upper, middle, lower };
}

export function calculateHeikinAshi(data: OHLCV[]): OHLCV[] {
  const out: OHLCV[] = [];
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const close = (d.open + d.high + d.low + d.close) / 4;
    const open =
      i === 0
        ? (d.open + d.close) / 2
        : (out[i - 1].open + out[i - 1].close) / 2;
    out.push({
      time: d.time,
      open,
      close,
      high: Math.max(d.high, open, close),
      low: Math.min(d.low, open, close),
      volume: d.volume,
    });
  }
  return out;
}

export function calculateVWAP(data: OHLCV[]): TimeValue[] {
  const out: TimeValue[] = [];
  let cumPV = 0;
  let cumV = 0;
  for (const d of data) {
    const typical = (d.high + d.low + d.close) / 3;
    cumPV += typical * d.volume;
    cumV += d.volume;
    out.push({ time: d.time, value: cumV === 0 ? typical : cumPV / cumV });
  }
  return out;
}
