const appVersionMetaName = 'app-version';

export function assetUrl(path: string): string {
  const version = appVersion();

  if (!version || version === 'dev') {
    return path;
  }

  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}v=${encodeURIComponent(version)}`;
}

function appVersion(): string {
  if (typeof document === 'undefined') {
    return '';
  }

  return document
    .querySelector<HTMLMetaElement>(`meta[name="${appVersionMetaName}"]`)
    ?.content
    .trim() || '';
}
