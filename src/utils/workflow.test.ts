import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, calculateProductivityMetrics } from './workflow';
import { CreativeRequest } from '../types';

test('cannot transition to review without an uploaded asset version', () => {
  const result = canTransition('in_progress', 'review', false, 'designer');
  assert.equal(result.allowed, false);
  assert.ok(result.reason?.includes('necessário anexar'));
});

test('designer can move from in_progress to review once asset is attached', () => {
  const result = canTransition('in_progress', 'review', true, 'designer');
  assert.equal(result.allowed, true);
});

test('admin can bypass transitions even without version', () => {
  const result = canTransition('backlog', 'in_progress', false, 'admin');
  assert.equal(result.allowed, true);
});

test('requester is forbidden from moving backlog to in_progress directly', () => {
  const result = canTransition('backlog', 'in_progress', false, 'requester');
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
      updated_at: '2026-11-02T00:00:00Z',
      deadline: '2026-11-03T00:00:00Z',
    },
    {
      id: '2',
      status: 'approved',
      current_version: 2,
      department_id: 'dept-1',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-03T00:00:00Z',
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
  // 1 out of 2 completed on time = 50%
  assert.equal(metrics.onTimeDeliveryRate, 50);
  // 1 out of 2 first-time approved = 50%
  assert.equal(metrics.firstTimeApprovalRate, 50);
  assert.equal(metrics.requestsByDepartment[0].count, 2);
  assert.equal(metrics.requestsByDepartment[1].count, 1);
});
