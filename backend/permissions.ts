import type { AuthenticatedRequest } from './auth.js';
import { canAccessAdmin } from './auth.js';
import type { CreativeRequest } from '../src/types/index.js';

export function scope(req: AuthenticatedRequest): [boolean, string, string] {
  return [canAccessAdmin(req), req.user!.id, req.user!.role];
}
export const ACCESS_SQL = `($1::boolean OR requester_id=$2::uuid
 OR ($3='designer' AND data->>'assignee_id'=($2::uuid)::text)
 OR ($3='art_director' AND data->>'approver_id'=($2::uuid)::text))`;
export function mayReview(req: AuthenticatedRequest, data: CreativeRequest) {
  return canAccessAdmin(req) || (req.user?.role === 'art_director' && data.approver_id === req.user.id);
}
export function mayProduce(req: AuthenticatedRequest, data: CreativeRequest) {
  return canAccessAdmin(req) || (req.user?.role === 'designer' && data.assignee_id === req.user.id);
}
