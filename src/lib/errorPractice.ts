export type ErrorSchedule = { resolved: boolean; next_review_at?: string | null };
export function errorDue(row: ErrorSchedule, now = new Date()): boolean {
  return !row.resolved && (!row.next_review_at || new Date(row.next_review_at).getTime() <= now.getTime());
}
