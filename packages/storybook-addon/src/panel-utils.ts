/** Display helpers for the Pactwork Panel component. */

export function getStatusColor(status: number): string {
  if (status === 0) return '#f93e3e';
  if (status >= 500) return '#f93e3e';
  if (status >= 400) return '#fca130';
  return '#49cc90';
}

export function getMethodColor(method: string): string {
  switch (method) {
    case 'GET': return '#61affe';
    case 'POST': return '#49cc90';
    case 'PUT': return '#fca130';
    case 'DELETE': return '#f93e3e';
    default: return '#999';
  }
}

export function formatLatency(latency: number): string {
  return latency > 0 ? `${latency}ms` : 'None';
}

export function formatStatus(status: number): string | number {
  return status === 0 ? 'ERR' : status;
}

export function getRowBackground(status: number): string {
  if (status === 0) return 'rgba(255, 0, 0, 0.05)';
  if (status >= 400) return 'rgba(255, 165, 0, 0.05)';
  return 'transparent';
}
