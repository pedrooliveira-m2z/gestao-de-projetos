import type { ContractSuggestion } from "@/lib/contract-analysis";
import { applyContractSuggestionsAction, discardContractSuggestionsAction } from "./actions";

const TRIGGER_LABEL: Record<ContractSuggestion["triggerType"], string> = {
  BRIEFING: "Briefing do projeto",
  KICKOFF: "Kickoff (data manual)",
  CONDICOES_INICIO: "Condições de início (data manual)",
  MARCO_CICLO: "Marco de ciclo (data manual)",
  MANUAL: "Manual (sem cálculo de SLA)",
  CLICKUP_ONLY: "Só ClickUp",
};

export function SuggestionsReview({
  projectId,
  frontId,
  suggestions,
}: {
  projectId: string;
  frontId: string;
  suggestions: ContractSuggestion[];
}) {
  const applySuggestions = applyContractSuggestionsAction.bind(null, projectId, frontId);
  const discardSuggestions = discardContractSuggestionsAction.bind(null, projectId, frontId);

  return (
    <div className="border-t border-amber-200 bg-amber-50 p-4">
      <p className="text-xs font-bold text-amber-800 uppercase">
        Sugestões de prazo da IA (revise antes de aplicar)
      </p>
      <form action={applySuggestions} className="mt-2 space-y-2">
        {suggestions.map((s, index) => (
          <label
            key={index}
            className="flex items-start gap-2 rounded-md border border-amber-200 bg-white p-2 text-xs"
          >
            <input type="checkbox" name="selected" value={index} defaultChecked className="mt-0.5" />
            <span>
              <span className="font-semibold text-neutral-800">{s.name}</span>
              {s.isEstimated && <span className="ml-1 text-amber-600">(estimado*)</span>}
              <br />
              <span className="text-neutral-600">{s.ruleLabel || "Sem regra de prazo clara"}</span>
              <br />
              <span className="text-neutral-400">
                Gatilho: {TRIGGER_LABEL[s.triggerType]}
                {s.slaDays != null &&
                  ` · ${s.slaDays} dia(s) ${s.slaDayType === "UTEIS" ? "úteis" : "corridos"}`}
                {s.hasApprovalWindow && ` · aprovação: ${s.approvalDays ?? 5} dia(s)`}
              </span>
              {s.notes && <span className="block text-neutral-400 italic">{s.notes}</span>}
            </span>
          </label>
        ))}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black"
          >
            Aplicar selecionadas
          </button>
        </div>
      </form>
      <form action={discardSuggestions} className="mt-2">
        <button type="submit" className="text-xs text-neutral-500 underline hover:text-neutral-700">
          Descartar sugestões
        </button>
      </form>
    </div>
  );
}
