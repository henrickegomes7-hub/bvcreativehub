import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, calculateProductivityMetrics } from './workflow';
import { CreativeRequest } from '../types';

test('designer can move from in_progress to review without uploading files', () => {
  const result = canTransition('in_progress', 'review', 'designer');
  assert.equal(result.allowed, true);
});

test('admin can move requests without uploading files', () => {
  const result = canTransition('backlog', 'in_progress', 'admin');
  assert.equal(result.allowed, true);
});

test('requester is forbidden from moving backlog to in_progress directly', () => {
  const result = canTransition('backlog', 'in_progress', 'requester');
  assert.equal(result.allowed, false);
});

test('productivity metrics calculates approval rate and department count accurately', () => {
  const mockRequests: Partial<CreativeRequest>[] = [
    {
      id: '1',
      status: 'approved',
      current_version: 1,
      department_id: 'dept-1',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-05T00:00:00Z',
      completed_at: '2026-11-02T00:00:00Z',
      deadline: '2026-11-03T00:00:00Z',
    },
    {
      id: '2',
      status: 'approved',
      current_version: 2,
      department_id: 'dept-1',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-03T00:00:00Z',
      completed_at: '2026-11-03T00:00:00Z',
      deadline: '2026-11-02T00:00:00Z', // Late
    },
    {
      id: '3',
      status: 'in_progress',
      current_version: 0,
      department_id: 'dept-2',
      created_at: '2026-11-04T00:00:00Z',
      updated_at: '2026-11-04T00:00:00Z',
      deadline: '2026-11-06T00:00:00Z',
    }
  ];

  const departments = [
    { id: 'dept-1', name: 'Cartões BV', color: '#083181' },
    { id: 'dept-2', name: 'Veículos', color: '#c56a2d' }
  ];

  const metrics = calculateProductivityMetrics(mockRequests as CreativeRequest[], departments);
  assert.equal(metrics.totalRequests, 3);
  assert.equal(metrics.completedRequests, 2);
  assert.equal(metrics.avgTurnaroundHours, 36);
  // 1 out of 2 completed on time = 50%
  assert.equal(metrics.onTimeDeliveryRate, 50);
  // 1 out of 2 first-time approved = 50%
  assert.equal(metrics.firstTimeApprovalRate, 50);
  assert.equal(metrics.requestsByDepartment[0].count, 2);
  assert.equal(metrics.requestsByDepartment[1].count, 1);
});

test('empty and undated deliveries produce no measurements', () => {
  for (const requests of [[], [{ status: 'approved', current_version: 0, updated_at: '2026-11-01' }]]) {
    const metrics = calculateProductivityMetrics(requests as CreativeRequest[], []);
    assert.equal(metrics.avgTurnaroundHours, null);
    assert.equal(metrics.onTimeDeliveryRate, null);
    assert.equal(metrics.firstTimeApprovalRate, null);
    assert.ok(metrics.weeklyThroughput.every(day => day.criadas === 0 && day.concluidas === 0));
  }
});

test('weekly counts use local calendar days and recorded completions across a year boundary', () => {
  const requests = [
    { created_at: '2025-12-27T23:59:59', completed_at: '2026-01-01T12:00:00', status: 'approved' },
    { created_at: '2025-12-28T00:00:00', status: 'review' },
    { created_at: '2026-01-03T08:00:00', completed_at: '2026-01-03T08:00:00', status: 'approved' },
  ] as CreativeRequest[];
  const metrics = calculateProductivityMetrics(requests, [], new Date('2026-01-03T12:00:00'));
  assert.deepEqual(metrics.weeklyThroughput.map(d => [d.day, d.criadas, d.concluidas]), [
    ['Dom', 1, 0], ['Seg', 0, 0], ['Ter', 0, 0], ['Qua', 0, 0],
    ['Qui', 0, 1], ['Sex', 0, 0], ['Sáb', 1, 1],
  ]);
  assert.equal(calculateProductivityMetrics([requests[2]], []).avgTurnaroundHours, 0);
});

test('formal reviews count rework even when no version number was recorded', () => {
  const requests = [
    { status: 'approved', current_version: 0, approvals: [{ decision: 'approved' }] },
    { status: 'approved', current_version: 0, approvals: [{ decision: 'changes_requested' }, { decision: 'approved' }] },
    { status: 'approved', current_version: 0, approvals: [] },
  ] as CreativeRequest[];
  assert.equal(calculateProductivityMetrics(requests, []).firstTimeApprovalRate, 50);
});
