import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useSystem } from "../state/useSystem";
import { useCharactersApi } from "../state/CharactersProvider";

export function Layout({ children }: { children: ReactNode }) {
  const system = useSystem();
  const { saveError, dismissSaveError, storageUnavailable } = useCharactersApi();

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="app-title">
            SheetTracker
          </Link>
          <span className="app-system-badge">{system.name}</span>
        </div>
      </header>
      <main className="app-main">{children}</main>
      {(saveError || storageUnavailable) && (
        <div
          className="banner banner-error"
          role="status"
        >
          <span>{saveError ?? "Armazenamento indisponível: as alterações não serão salvas."}</span>
          {saveError && (
            <button type="button" className="banner-close" onClick={dismissSaveError} aria-label="Fechar aviso">
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}