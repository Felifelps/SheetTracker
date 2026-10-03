import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSystem } from "../state/useSystem";
import { useCharactersApi } from "../state/CharactersProvider";
import { CharacterCard } from "../components/CharacterCard";
import { importCharacterFromParsed, readFileAsJson } from "../services/importExport";

interface Feedback {
  kind: "ok" | "error";
  text: string;
}

export function HomePage() {
  const system = useSystem();
  const api = useCharactersApi();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sorted = [...api.characters].sort((a, b) =>
    a.data.name.localeCompare(b.data.name, "pt-BR")
  );

  async function handleImportFile(file: File) {
    try {
      const parsed = await readFileAsJson(file);
      const outcome = importCharacterFromParsed(parsed, system);
      if (!outcome.ok) {
        setFeedback({
          kind: "error",
          text: `Não foi possível importar '${file.name}': ${outcome.errors.join(" ")}`,
        });
        return;
      }
      const { replaced } = api.addCharacter(outcome.character);
      setFeedback({
        kind: "ok",
        text: replaced
          ? `Ficha '${outcome.character.data.name}' atualizada (já existia uma com o mesmo ID).`
          : `Ficha '${outcome.character.data.name}' importada com sucesso.`,
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Erro inesperado ao importar o arquivo.",
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Fichas</h1>
          <p className="page-sub">
            {api.characters.length === 0
              ? "Nenhuma ficha salva neste navegador."
              : `${api.characters.length} ficha(s) salva(s) neste navegador.`}
          </p>
        </div>
        <div className="page-head-actions">
          <button
            type="button"
            className="btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Importar ficha
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            aria-label="Selecionar arquivo JSON de ficha para importar"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImportFile(file);
            }}
          />
          <Link to="/novo" className="btn btn-primary">
            Nova ficha
          </Link>
        </div>
      </div>

      {api.loadWarnings.length > 0 && (
        <div className="banner banner-warn" role="status">
          <div>
            <strong>Problemas ao carregar os dados salvos:</strong>
            <ul className="banner-list">
              {api.loadWarnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`banner ${feedback.kind === "ok" ? "banner-ok" : "banner-error"}`}
          role="status"
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            className="banner-close"
            aria-label="Fechar aviso"
            onClick={() => setFeedback(null)}
          >
            ×
          </button>
        </div>
      )}

      {api.loaded && sorted.length === 0 ? (
        <section className="panel empty-state">
          <h2>Comece sua primeira ficha</h2>
          <p>
            Crie uma ficha nova ou importe um arquivo JSON de ficha exportado anteriormente
            neste ou em outro navegador.
          </p>
          <div className="empty-state-actions">
            <Link to="/novo" className="btn btn-primary">
              Criar ficha
            </Link>
            <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
              Importar ficha
            </button>
          </div>
        </section>
      ) : (
        <div className="card-grid">
          {sorted.map((stored) => (
            <CharacterCard
              key={stored.data.id}
              stored={stored}
              system={system}
              onDuplicate={() => api.duplicateCharacter(stored.data.id)}
              onDelete={() => api.deleteCharacter(stored.data.id)}
              onExport={() => api.exportCharacter(stored.data.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}