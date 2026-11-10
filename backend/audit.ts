export type AuthEvent =
  | 'register'
  | 'register_failed'
  | 'login'
  | 'login_failed'
  | 'bootstrap_admin'
  | 'bootstrap_admin_failed'
  | 'password_reset_requested'
  | 'password_reset_verified'
  | 'password_reset_completed'
  | 'password_reset_failed'
  | 'logout'
  | 'session_expired'
  | 'admin_denied';

export type AuthAuditStatus = 'success' | 'failure' | 'warning';

export function redactEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const [localPart, domain] = value.split('@');
  if (!domain) return value;
  const visibleLocal = localPart.length <= 2 ? localPart : `${localPart.slice(0, 2)}***`;
  return `${visibleLocal}@${domain}`;
}

export function buildAuthAuditEntry(
  event: AuthEvent,
  status: AuthAuditStatus,
  details: Record<string, string | number | boolean | undefined> = {},
  email?: string,
) {
  return {
    timestamp: new Date().toISOString(),
    event,
    status,
    email: email ? redactEmail(email) : undefined,
    details,
  };
}

export function logAuthEvent(
  event: AuthEvent,
  status: AuthAuditStatus,
  details: Record<string, string | number | boolean | undefined> = {},
  email?: string,
): void {
  const entry = buildAuthAuditEntry(event, status, details, email);
  if (status === 'failure' || status === 'warning') {
    console.warn(JSON.stringify(entry));
    return;
  }
  console.info(JSON.stringify(entry));
}
