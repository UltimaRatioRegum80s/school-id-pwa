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
