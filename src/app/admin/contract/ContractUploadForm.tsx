"use client";

import { useActionState } from "react";
import { uploadContractAction } from "./actions";

export function ContractUploadForm({
  frontId,
  projectId,
  hasContract,
}: {
  frontId: string;
  projectId: string;
  hasContract: boolean;
}) {
  const boundAction = uploadContractAction.bind(null, frontId, projectId);
  const [state, formAction, pending] = useActionState(boundAction, {
    error: null,
    success: null,
  });

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-600">
          {hasContract ? "Substituir contrato (PDF/DOCX)" : "Anexar contrato (PDF/DOCX)"}
        </label>
        <input
          type="file"
          name="contractFile"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          required
          className="text-xs"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold hover:border-neutral-500 disabled:opacity-60"
      >
        {pending ? "Analisando com IA..." : "Enviar e analisar"}
      </button>
      {state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="w-full text-xs text-emerald-700">{state.success}</p>}
    </form>
  );
}
