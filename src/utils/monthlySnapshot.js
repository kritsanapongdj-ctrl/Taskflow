import { aggregateMonthTelemetry, snapshotId } from './archetypeEngine.js';

export const SNAPSHOT_SCHEMA_VERSION = 1;

/** A month can be closed only after it has ended (YYYY-MM strings compare chronologically). */
export const canCloseMonth = (month, currentMonth) => /^\d{4}-\d{2}$/.test(String(month)) && String(month) < String(currentMonth);

export const isMonthClosed = (snapshots, month) => Object.keys(snapshots || {}).some(id => id.startsWith(`${month}_`));

/**
 * Builds the immutable monthly snapshot docs (one per operational staff member) from the live telemetry.
 * `pending` lists staff who still have discrepancies waiting for a supervisor ruling: the month must not be
 * closed while any exist, otherwise the frozen score would be wrong.
 */
export const buildMonthlySnapshots = (staffList, tasks, sets, month, closedBy, now = new Date()) => {
  const docs = [];
  const pending = [];
  (staffList || []).forEach(staff => {
    if (!staff || !staff.name) return;
    const tel = aggregateMonthTelemetry(staff, tasks, sets, month);
    if (tel.isExempt || tel.roleType === 'unknown') return;

    const waiting = (tel.discrepancyTasks || []).filter(i => !i.attribution?.isExplicit).length;
    if (waiting > 0) pending.push({ staffName: staff.name, count: waiting });

    docs.push({
      id: snapshotId(month, staff.id),
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      month,
      staffId: String(staff.id),
      staffName: staff.name,
      roleType: tel.roleType,
      closedAt: now.toISOString(),
      closedBy: closedBy || '',
      metrics: {
        totalTasks: tel.totalTasks,
        completedTasks: tel.completedTasks,
        lateFinishedTasks: tel.lateFinishedTasks,
        onTimeFinishedTasks: tel.onTimeFinishedTasks,
        slaRate: tel.slaRate,
        discrepancyCount: (tel.discrepancyTasks || []).length
      },
      penalties: (tel.penalties || []).map(p => ({ axis: p.axis, points: p.points, reason: p.reason })),
      penaltyTotal: Math.round((tel.penalties || []).reduce((a, p) => a + p.points, 0) * 10) / 10
    });
  });
  return { docs, pending };
};
