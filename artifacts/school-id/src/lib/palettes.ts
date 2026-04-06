export interface Palette {
  name: string;
  label: string;
  primary: string;
  primaryDark: string;
  accent: string;
  surface: string;
  textOnPrimary: string;
}

export const PALETTES: Record<string, Palette> = {
  "navy-gold": {
    name: "navy-gold",
    label: "Navy & Gold",
    primary: "221 83% 40%",
    primaryDark: "221 83% 30%",
    accent: "43 96% 56%",
    surface: "221 83% 95%",
    textOnPrimary: "0 0% 100%",
  },
  "forest-green-white": {
    name: "forest-green-white",
    label: "Forest Green & White",
    primary: "140 60% 28%",
    primaryDark: "140 60% 20%",
    accent: "140 60% 44%",
    surface: "140 60% 94%",
    textOnPrimary: "0 0% 100%",
  },
  "deep-red-silver": {
    name: "deep-red-silver",
    label: "Deep Red & Silver",
    primary: "0 75% 38%",
    primaryDark: "0 75% 28%",
    accent: "0 0% 60%",
    surface: "0 75% 95%",
    textOnPrimary: "0 0% 100%",
  },
  "royal-purple-gold": {
    name: "royal-purple-gold",
    label: "Royal Purple & Gold",
    primary: "270 60% 38%",
    primaryDark: "270 60% 28%",
    accent: "43 96% 56%",
    surface: "270 60% 95%",
    textOnPrimary: "0 0% 100%",
  },
  "teal-white": {
    name: "teal-white",
    label: "Teal & White",
    primary: "181 60% 32%",
    primaryDark: "181 60% 22%",
    accent: "181 60% 50%",
    surface: "181 60% 94%",
    textOnPrimary: "0 0% 100%",
  },
  "charcoal-orange": {
    name: "charcoal-orange",
    label: "Charcoal & Orange",
    primary: "220 13% 28%",
    primaryDark: "220 13% 18%",
    accent: "25 95% 53%",
    surface: "220 13% 92%",
    textOnPrimary: "0 0% 100%",
  },
};

export function applyPalette(paletteName: string): void {
  const palette = PALETTES[paletteName] ?? PALETTES["navy-gold"];
  const root = document.documentElement;
  root.style.setProperty("--primary", palette.primary);
  root.style.setProperty("--primary-dark", palette.primaryDark);
  root.style.setProperty("--accent", palette.accent);
  root.style.setProperty("--primary-surface", palette.surface);
  root.style.setProperty("--primary-foreground", palette.textOnPrimary);
  root.style.setProperty("--ring", palette.primary);
  root.style.setProperty("--sidebar-primary", palette.primary);
  root.style.setProperty("--sidebar-primary-foreground", palette.textOnPrimary);
}

export function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function buildCustomPalette(primaryHex: string, accentHex: string): Omit<Palette, "name" | "label"> {
  const primaryHsl = hexToHsl(primaryHex);
  const accentHsl = hexToHsl(accentHex);

  const [hStr, sStr, lStr] = primaryHsl.split(" ");
  const h = hStr;
  const s = sStr;
  const l = parseInt(lStr ?? "40");

  const darkL = Math.max(l - 10, 5);
  const surfaceL = Math.min(l + 55, 97);

  const primaryDark = `${h} ${s} ${darkL}%`;
  const surface = `${h} ${s} ${surfaceL}%`;

  return {
    primary: primaryHsl,
    primaryDark,
    accent: accentHsl,
    surface,
    textOnPrimary: "0 0% 100%",
  };
}

export function applyCustomPalette(primaryHex: string, accentHex: string): void {
  const { primary, primaryDark, accent, surface, textOnPrimary } = buildCustomPalette(primaryHex, accentHex);
  const root = document.documentElement;
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-dark", primaryDark);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--primary-surface", surface);
  root.style.setProperty("--primary-foreground", textOnPrimary);
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--sidebar-primary", primary);
  root.style.setProperty("--sidebar-primary-foreground", textOnPrimary);
}
