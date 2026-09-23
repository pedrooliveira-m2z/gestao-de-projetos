import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0e14] px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-neutral-400">
            CATALISTI HOLDING
          </p>
          <h1 className="mt-1 text-xl font-bold text-neutral-900">Gestão de Projetos</h1>
        </div>
        <LoginForm callbackUrl={callbackUrl ?? "/dashboard"} />
      </div>
    </main>
  );
}
