// Extracts text from an uploaded contract (PDF/DOCX) and asks an LLM (via Vercel AI Gateway) to
// suggest delivery-deadline rules for a Front, in the same shape the admin would type manually.

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import type { DayType, TriggerType } from "@prisma/client";

export interface ContractSuggestion {
  name: string;
  ruleLabel: string;
  triggerType: TriggerType;
  slaDays: number | null;
  slaDayType: DayType;
  isEstimated: boolean;
  hasApprovalWindow: boolean;
  approvalDays: number | null;
  notes: string | null;
}

const MAX_CHARS = 60000; // keep the prompt reasonably sized/cheap

export async function extractContractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  const lower = fileName.toLowerCase();
  if (mimeType.includes("pdf") || lower.endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  if (
    mimeType.includes("word") ||
    mimeType.includes("officedocument") ||
    lower.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  throw new Error("Formato de arquivo não suportado. Envie um PDF ou DOCX.");
}

const TRIGGER_TYPES: TriggerType[] = [
  "BRIEFING",
  "KICKOFF",
  "CONDICOES_INICIO",
  "MARCO_CICLO",
  "MANUAL",
  "CLICKUP_ONLY",
];
const DAY_TYPES: DayType[] = ["UTEIS", "CORRIDOS"];

function sanitizeSuggestion(raw: unknown): ContractSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (!name) return null;

  const triggerType = TRIGGER_TYPES.includes(r.triggerType as TriggerType)
    ? (r.triggerType as TriggerType)
    : "MANUAL";
  const slaDayType = DAY_TYPES.includes(r.slaDayType as DayType)
    ? (r.slaDayType as DayType)
    : "UTEIS";
  const slaDays =
    typeof r.slaDays === "number" && Number.isFinite(r.slaDays) && r.slaDays > 0
      ? Math.round(r.slaDays)
      : null;
  const approvalDays =
    typeof r.approvalDays === "number" && Number.isFinite(r.approvalDays) && r.approvalDays > 0
      ? Math.round(r.approvalDays)
      : null;

  return {
    name,
    ruleLabel: typeof r.ruleLabel === "string" ? r.ruleLabel.trim() : "",
    triggerType,
    slaDays,
    slaDayType,
    isEstimated: Boolean(r.isEstimated),
    hasApprovalWindow: Boolean(r.hasApprovalWindow),
    approvalDays,
    notes: typeof r.notes === "string" && r.notes.trim() ? r.notes.trim() : null,
  };
}

const PROMPT_INSTRUCTIONS = `Você analisa contratos de prestação de serviço da Catalisti (agência) para extrair as
regras de PRAZO DE ENTREGA de cada entrega/etapa prevista, no formato usado pelo sistema interno
de gestão de projetos.

Para cada entrega ou etapa com prazo definido no contrato, gere um item com estes campos:
- "name": nome curto da entrega (ex: "Landing Page 1", "Site institucional").
- "ruleLabel": a regra de prazo em texto, do jeito que aparece/é inferida do contrato (ex: "Até 20
  dias úteis do briefing").
- "triggerType": um destes valores exatos: "BRIEFING" (prazo conta do briefing/assinatura do
  contrato), "KICKOFF" (conta do kickoff), "CONDICOES_INICIO" (conta de condições de início
  específicas, ex: acesso liberado, pagamento confirmado), "MARCO_CICLO" (conta de um marco de
  ciclo/produção recorrente), ou "MANUAL" (não dá pra automatizar o cálculo — prazo fixo ou
  condição não determinística).
- "slaDays": número de dias do prazo (inteiro), ou null se não houver prazo numérico claro.
- "slaDayType": "UTEIS" ou "CORRIDOS".
- "isEstimated": true se o gatilho ou o prazo não está 100% claro no texto (é uma inferência sua).
- "hasApprovalWindow": true se o contrato prevê uma janela de aprovação do cliente separada para
  essa entrega.
- "approvalDays": número de dias da janela de aprovação, ou null.
- "notes": qualquer ressalva importante em 1 frase, ou null.

Responda APENAS com um array JSON válido desses objetos, sem nenhum texto antes ou depois, sem
markdown. Se não encontrar nenhuma regra de prazo no texto, responda com "[]".`;

export async function analyzeContractText(text: string): Promise<ContractSuggestion[]> {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI_GATEWAY_API_KEY não configurado. Peça para configurar a chave da AI Gateway na Vercel."
    );
  }

  const truncated = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;
  if (!truncated.trim()) {
    throw new Error("Não foi possível extrair texto do arquivo enviado.");
  }

  const res = await fetch("https://ai-gateway.vercel.sh/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-5",
      input: [
        {
          type: "message",
          role: "user",
          content: `${PROMPT_INSTRUCTIONS}\n\n--- TEXTO DO CONTRATO ---\n${truncated}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Falha ao chamar a IA (AI Gateway ${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const rawText: string = data?.output?.[0]?.content?.[0]?.text ?? "";
  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("A IA não retornou uma lista reconhecível de sugestões.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("A IA retornou um JSON inválido.");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Formato de resposta inesperado da IA.");
  }

  return parsed.map(sanitizeSuggestion).filter((s): s is ContractSuggestion => s !== null);
}
