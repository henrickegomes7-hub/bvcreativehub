import test from 'node:test';
import assert from 'node:assert/strict';
import { getRequestSla, getSlaStatus, calculateTurnaroundHours } from './sla';
import type { CreativeRequest } from '../types';

test('delivery SLA uses the recorded deadline and treats undated legacy deliveries as unknown', () => {
  const request = {
    status: 'approved', deadline: '2026-11-01T12:00:00Z', completion_deadline: '2026-11-06T12:00:00Z',
    updated_at: '2026-11-10T12:00:00Z',
  } as CreativeRequest;
  assert.equal(getRequestSla(request).status, 'unknown');
  const onTime = getRequestSla({ ...request, completed_at: request.completion_deadline });
  assert.equal(onTime.status, 'delivered');
  assert.equal(onTime.isOverdue, false);
  const late = getRequestSla({ ...request, completed_at: '2026-11-06T12:00:01Z' });
  assert.equal(late.isOverdue, true);
  assert.equal(late.label, 'Entregue com atraso');
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
