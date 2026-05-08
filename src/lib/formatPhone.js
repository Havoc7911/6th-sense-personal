export function formatPhone(value) {
  if (!value) return value;
  const curr = value.replace(/[^\d]/g, '');
  if (curr.length < 4) return curr;
  if (curr.length < 7) return `(${curr.slice(0, 3)}) ${curr.slice(3)}`;
  return `(${curr.slice(0, 3)}) ${curr.slice(3, 6)}-${curr.slice(6, 10)}`;
}
