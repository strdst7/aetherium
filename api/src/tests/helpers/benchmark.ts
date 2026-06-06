/**
 * Benchmark utilities for performance testing.
 *
 * Provides latency measurement, percentile calculation, and a reusable
 * BenchmarkRunner that all performance tests can depend on.
 */

export interface LatencyMeasurement {
  durationMs: number;
  timestamp: number;
  label: string;
}

export class BenchmarkRunner {
  private label: string;
  private measurements: LatencyMeasurement[];

  constructor(label: string) {
    this.label = label;
    this.measurements = [];
  }

  async run<T>(fn: () => Promise<T>, runLabel?: string): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();

    this.measurements.push({
      durationMs: end - start,
      timestamp: Date.now(),
      label: runLabel || this.label,
    });

    return result;
  }

  getMeasurements(): LatencyMeasurement[] {
    return [...this.measurements];
  }

  getPercentile(p: number): number {
    if (!Number.isFinite(p) || p < 0 || p > 100) {
      throw new Error(`Percentile must be between 0 and 100, got ${p}`);
    }

    const durations = this.measurements.map((m) => m.durationMs);
    if (durations.length === 0) {
      return NaN;
    }

    return calculatePercentile(durations, p);
  }

  getP50(): number {
    return this.getPercentile(50);
  }

  getP95(): number {
    return this.getPercentile(95);
  }

  getP99(): number {
    return this.getPercentile(99);
  }

  getMin(): number {
    const durations = this.measurements.map((m) => m.durationMs);
    if (durations.length === 0) return NaN;
    return Math.min(...durations);
  }

  getMax(): number {
    const durations = this.measurements.map((m) => m.durationMs);
    if (durations.length === 0) return NaN;
    return Math.max(...durations);
  }

  getMean(): number {
    const durations = this.measurements.map((m) => m.durationMs);
    if (durations.length === 0) return NaN;
    const sum = durations.reduce((acc, val) => acc + val, 0);
    return sum / durations.length;
  }

  getStdDev(): number {
    const durations = this.measurements.map((m) => m.durationMs);
    if (durations.length === 0) return NaN;

    const mean = this.getMean();
    if (!Number.isFinite(mean)) return NaN;

    const variance =
      durations.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      durations.length;
    return Math.sqrt(variance);
  }

  reset(): void {
    this.measurements = [];
  }

  summary(): {
    label: string;
    count: number;
    min: number;
    mean: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
    stdDev: number;
  } {
    return {
      label: this.label,
      count: this.measurements.length,
      min: this.getMin(),
      mean: this.getMean(),
      p50: this.getP50(),
      p95: this.getP95(),
      p99: this.getP99(),
      max: this.getMax(),
      stdDev: this.getStdDev(),
    };
  }
}

export async function measureLatency<T>(
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return { result, durationMs: end - start };
}

export function calculatePercentiles(
  values: number[],
  percentiles: number[]
): Record<number, number> {
  if (values.length === 0) {
    const emptyResult: Record<number, number> = {};
    for (const p of percentiles) {
      emptyResult[p] = NaN;
    }
    return emptyResult;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const result: Record<number, number> = {};

  for (const p of percentiles) {
    if (!Number.isFinite(p) || p < 0 || p > 100) {
      throw new Error(`Percentile must be between 0 and 100, got ${p}`);
    }
    result[p] = calculatePercentile(sorted, p);
  }

  return result;
}

/**
 * Internal helper: calculate a single percentile using linear interpolation
 * between ranks (standard statistical method, Type 7 in R / NumPy).
 */
function calculatePercentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return NaN;

  // Use linear interpolation between ranks (method used by Excel, NumPy default)
  const n = sortedValues.length;
  const rank = (p / 100) * (n - 1);
  const lowerIdx = Math.floor(rank);
  const upperIdx = Math.ceil(rank);
  const fraction = rank - lowerIdx;

  if (upperIdx >= n) {
    return sortedValues[n - 1];
  }

  const lower = sortedValues[lowerIdx];
  const upper = sortedValues[upperIdx];

  if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
    return NaN;
  }

  return lower + fraction * (upper - lower);
}
