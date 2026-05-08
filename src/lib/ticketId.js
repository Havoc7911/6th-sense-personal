export function formatTicketId(uuid) {
  if (!uuid || typeof uuid !== 'string') return 'REQ-????';
  const hex = uuid.replace(/-/g, '');
  if (hex.length < 8) return 'REQ-????';
  return `REQ-${hex.slice(0, 8).toUpperCase()}`;
}
