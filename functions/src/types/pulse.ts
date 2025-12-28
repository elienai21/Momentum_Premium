export type PulseDeltaDir = "up" | "down" | "flat";

export type PulseMetric = {
  id: "cash" | "rev" | "exp" | "runway" | string;
  label: string;
  value: string; // já formatado
  delta?: { value: string; direction: PulseDeltaDir };
  helper?: string;
};

export type PulseInsight = {
  title: string;     // “Boa notícia: …”
  detail?: string;   // “Sugestão: …”
  cta?: { label: string; action: "ver_detalhes" | "simular" | string };
};

export type PulseSummary = {
  greeting: string;      // “Bom dia, Elienai 👋”
  sub: string;           // “Seu caixa está estável…”
  periodLabel: string;   // “Últimos 7 dias”
  metrics: PulseMetric[];
  insight?: PulseInsight;
};
