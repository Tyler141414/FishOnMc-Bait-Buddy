export function slugify(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
}

export function fileSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function tokensOf(value: unknown): string[] {
  return value?.toString().toLowerCase().match(/\w+/g) || [];
}

export function cssModifier(value?: string): string {
  return (value || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
}
