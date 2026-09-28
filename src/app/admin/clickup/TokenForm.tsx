"use client";

import { useActionState } from "react";
import { saveClickupTokenAction } from "./actions";

export function TokenForm() {
  const [state, formAction, pending] = useActionState(saveClickupTokenAction, {
    error: null,
    success: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="token" className="text-xs font-medium text-neutral-600">
          Token pessoal do ClickUp
        </label>
        <input
          id="token"
          name="token"
          type="password"
          placeholder="pk_xxxxxxxx"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[#0b0e14] px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
      >
        {pending ? "Conectando..." : "Conectar"}
      </button>
      {state.error && <p className="text-sm text-red-600 sm:ml-2">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700 sm:ml-2">{state.success}</p>}
    </form>
  );
}
