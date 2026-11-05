import test from 'node:test';
import assert from 'node:assert/strict';
import { getSlaStatus, calculateTurnaroundHours } from './sla';

test('SLA calculates delivered status correctly', () => {
  const info = getSlaStatus('2026-11-06T12:00:00Z', true);
  assert.equal(info.status, 'delivered');
  assert.equal(info.isOverdue, false);
});

test('SLA identifies overdue deadlines', () => {
  const baseNow = new Date('2026-11-05T12:00:00Z');
  const pastDeadline = '2026-11-04T12:00:00Z'; // 24 hours ago
  const info = getSlaStatus(pastDeadline, false, baseNow);
  assert.equal(info.status, 'overdue');
  assert.equal(info.isOverdue, true);
  assert.equal(info.hoursRemaining, -24);
});

test('SLA identifies critical deadlines (<= 12 hours)', () => {
  const baseNow = new Date('2026-11-05T00:00:00Z');
  const deadline = '2026-11-05T08:00:00Z'; // 8 hours away
  const info = getSlaStatus(deadline, false, baseNow);
  assert.equal(info.status, 'critical');
  assert.equal(info.isOverdue, false);
  assert.equal(info.hoursRemaining, 8);
});

test('SLA calculates normal lead time (> 36 hours)', () => {
  const baseNow = new Date('2026-11-05T00:00:00Z');
  const deadline = '2026-11-08T00:00:00Z'; // 72 hours away
  const info = getSlaStatus(deadline, false, baseNow);
  assert.equal(info.status, 'normal');
  assert.equal(info.hoursRemaining, 72);
});

test('calculateTurnaroundHours computes correct hours difference', () => {
  const created = '2026-11-01T08:00:00Z';
  const finished = '2026-11-02T14:00:00Z'; // 30 hours
  const hours = calculateTurnaroundHours(created, finished);
  assert.equal(hours, 30);
});
