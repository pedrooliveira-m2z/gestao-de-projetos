import type { DeliverableStatus } from "./sla";

export const BRAND = {
  ink: "#0b0e14",
  paper: "#ffffff",
  muted: "#6b7280",
  border: "#e5e7eb",
};

export const STATUS_STYLE: Record<
  DeliverableStatus,
  { bg: string; fg: string; dot: string }
> = {
  CONCLUIDO: { bg: "#e8f0ff", fg: "#1d4ed8", dot: "#1d4ed8" },
  EM_DIA: { bg: "#e7f7ee", fg: "#15803d", dot: "#16a34a" },
  ATRASO_OPERACIONAL: { bg: "#fdecec", fg: "#b91c1c", dot: "#dc2626" },
  ATRASO_CONTRATUAL: { bg: "#fdecec", fg: "#991b1b", dot: "#991b1b" },
  A_FAZER: { bg: "#f1f2f4", fg: "#4b5563", dot: "#9ca3af" },
};

export const FRONT_PALETTE = [
  "#2563eb", // azul - Web
  "#0d9488", // teal - Social
  "#ea580c", // laranja - Performance
  "#7c3aed", // roxo - Motin / Content
  "#0891b2",
  "#be185d",
];
