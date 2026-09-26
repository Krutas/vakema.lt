export function visibleCards(width: number): number {
  return width <= 720 ? 1 : width <= 1000 ? 2 : 3;
}
export function clampIndex(index: number, total: number, visible: number): number {
  return Math.max(0, Math.min(index, Math.max(0, total - visible)));
}
