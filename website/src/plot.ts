export function pointPosition(
  index: number,
  count: number,
  value: number,
  maximum: number,
) {
  return {
    x: 10 + (index / Math.max(count - 1, 1)) * 980,
    y: 290 - (value / maximum) * 280,
  };
}
export function trendPath(
  values: readonly (number | null)[],
  maximum: number,
): string {
  let connected = false;
  return values
    .map((value, index) => {
      if (value === null) {
        connected = false;
        return "";
      }
      const { x, y } = pointPosition(index, values.length, value, maximum);
      const command = connected ? "L" : "M";
      connected = true;
      return `${command}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}
export function plotMaximum(values: readonly (number | null)[]): number {
  const largest = Math.max(1, ...values.map((value) => value ?? 0));
  const step = 10 ** Math.floor(Math.log10(largest / 4));
  return Math.ceil(largest / (4 * step)) * 4 * step;
}
