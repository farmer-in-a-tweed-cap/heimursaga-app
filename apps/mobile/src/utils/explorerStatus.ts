export type ExplorerStatus = 'EXPLORING' | 'EXPLORING_OFF_GRID' | 'PLANNING' | 'RESTING';

export const explorerStatusConfig: Record<ExplorerStatus, { label: string; color: string }> = {
  EXPLORING:          { label: 'EXPLORING',  color: '#ac6d46' },  // copper
  EXPLORING_OFF_GRID: { label: 'OFF-GRID',   color: '#6b5c4e' },  // dark brown
  PLANNING:           { label: 'PLANNING',   color: '#4676ac' },  // blue
  RESTING:            { label: 'RESTING',    color: '#616161' },  // dark gray
};

export function getExplorerStatus(
  expeditions: Array<{ status: string }>,
  activeExpeditionOffGrid?: boolean,
): ExplorerStatus {
  const hasActive = expeditions.some(e => e.status === 'active');
  const hasPlanned = expeditions.some(e => e.status === 'planned');

  if (activeExpeditionOffGrid) return 'EXPLORING_OFF_GRID';
  if (hasActive) return 'EXPLORING';
  if (hasPlanned) return 'PLANNING';
  return 'RESTING';
}
