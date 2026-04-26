export function hoursUntil(iso: string, now: Date = new Date()): number {
  const target = new Date(iso).getTime();
  const diff = target - now.getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / (60 * 60 * 1000));
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
