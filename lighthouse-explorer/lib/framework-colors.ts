const FRAMEWORK_PALETTE = [
  '#22d3ee', '#2dd4bf', '#38bdf8', '#60a5fa',
  '#f59e0b', '#f472b6', '#a78bfa', '#34d399',
];

const VERSION_VARIANTS = [-0.32, -0.2, -0.08, 0.06, 0.18, 0.3, 0.42];

function hashStr(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function clampColor(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseHexColor(hex: string) {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return { r: 128, g: 128, b: 128 };
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
  };
}

function toHexColor(r: number, g: number, b: number) {
  return `#${clampColor(r).toString(16).padStart(2, '0')}${clampColor(g).toString(16).padStart(2, '0')}${clampColor(b).toString(16).padStart(2, '0')}`;
}

function shiftHexColor(hex: string, factor: number) {
  const { r, g, b } = parseHexColor(hex);
  if (factor >= 0) {
    return toHexColor(
      r + (255 - r) * factor,
      g + (255 - g) * factor,
      b + (255 - b) * factor,
    );
  }

  const amount = Math.abs(factor);
  return toHexColor(
    r * (1 - amount),
    g * (1 - amount),
    b * (1 - amount),
  );
}

function frameworkFamilyFromKey(frameworkVersionKey: string) {
  const separatorIndex = String(frameworkVersionKey).lastIndexOf('-');
  return separatorIndex > 0 ? String(frameworkVersionKey).slice(0, separatorIndex) : String(frameworkVersionKey);
}

function frameworkVersionFromKey(frameworkVersionKey: string) {
  const separatorIndex = String(frameworkVersionKey).lastIndexOf('-');
  return separatorIndex > 0 ? String(frameworkVersionKey).slice(separatorIndex + 1) : '';
}

export function frameworkFamilyColor(frameworkFamily: string) {
  return FRAMEWORK_PALETTE[hashStr(String(frameworkFamily).toLowerCase()) % FRAMEWORK_PALETTE.length];
}

export function frameworkVersionColor(frameworkVersionKey: string) {
  const family = frameworkFamilyFromKey(frameworkVersionKey);
  const version = frameworkVersionFromKey(frameworkVersionKey);
  const base = frameworkFamilyColor(family);
  if (!version) return base;
  const bucket = hashStr(version.toLowerCase()) % VERSION_VARIANTS.length;
  return shiftHexColor(base, VERSION_VARIANTS[bucket]);
}