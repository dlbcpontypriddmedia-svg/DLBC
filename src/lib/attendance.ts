export function formatFamilyName(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return '';

  return /family$/i.test(trimmed) ? trimmed : `${trimmed} Family`;
}

export function parseCountInput(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return 0;

  return Math.min(50, Number(digits));
}
