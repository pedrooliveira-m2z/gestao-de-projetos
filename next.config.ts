import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer", "@prisma/client", "pdf-parse", "mammoth"],
  experimental: {
    serverActions: {
      // Contratos em PDF/DOCX podem ser maiores que o limite padrão de 1MB.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
