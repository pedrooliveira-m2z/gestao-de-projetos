import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer", "@prisma/client", "pdf-parse", "mammoth"],
  // pdfkit (usado pelo @react-pdf/renderer) carrega as fontes padrão via require()
  // dinâmico, então o file tracing da Vercel não detecta esses arquivos sozinho —
  // sem isso o PDF quebra em produção com "Cannot find module .../Helvetica.cjs".
  outputFileTracingIncludes: {
    "/projects/[projectId]/report": ["./node_modules/pdfkit/**/*"],
  },
  experimental: {
    serverActions: {
      // Contratos em PDF/DOCX podem ser maiores que o limite padrão de 1MB.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
