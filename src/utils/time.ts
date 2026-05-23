/**
 * Calculates and formats data freshness based on a unix millisecond timestamp.
 * Returns human-friendly text like "방금 전", "5분 전", "2시간 전", etc.
 */
export const formatFreshness = (timestamp?: number): string => {
  if (!timestamp) return '방금 전';
  
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  
  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}일 전`;
};
