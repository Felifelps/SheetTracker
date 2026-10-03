import { createContext, useContext, useMemo, type ReactNode } from "react";
import pseudoDndJson from "../systems/pseudo-dnd.json";
import { validateSystemDefinition } from "../domain/validation";
import type { SystemDefinition } from "../domain/system";

const systemCheck = validateSystemDefinition(pseudoDndJson);

const SystemContext = createContext<SystemDefinition | null>(null);

const SYSTEM_LOAD_ERRORS: string[] = systemCheck.ok ? [] : systemCheck.errors;

export function SystemProvider({ children }: { children: ReactNode }) {
  const system = useMemo(() => {
    if (!systemCheck.ok) return null;
    return systemCheck.value;
  }, []);

  if (!system) {
    return (
      <main style={{ padding: "var(--space-6)", maxWidth: 640, margin: "0 auto" }}>
        <h1>Erro ao carregar o sistema</h1>
        <p>
          A definição do sistema embutida no aplicativo é inválida. Isso é um problema de
          versão, não algo que você possa corrigir na interface. Recarregue a página; se o
          erro persistir, reporte com as mensagens abaixo:
        </p>
        <ul>
          {SYSTEM_LOAD_ERRORS.map((error, i) => (
            <li key={i}>{error}</li>
          ))}
        </ul>
      </main>
    );
  }

  return <SystemContext.Provider value={system}>{children}</SystemContext.Provider>;
}

export function useSystem(): SystemDefinition {
  const system = useContext(SystemContext);
  if (!system) {
    throw new Error("useSystem deve ser usado dentro de SystemProvider.");
  }
  return system;
}