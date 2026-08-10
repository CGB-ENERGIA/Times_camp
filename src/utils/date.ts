export function hojeStr(): string {
  return new Date().toLocaleDateString('en-CA');
}

export function agoraStr(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
