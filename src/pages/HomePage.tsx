import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSystem } from "../state/useSystem";
import { useCharactersApi } from "../state/CharactersProvider";
import { CharacterCard } from "../components/CharacterCard";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { StoredCharacter } from "../domain/character";
import {
  importCharacterFromParsed,
  readFileAsJson,
  sameCharacterName,
} from "../services/importExport";

interface Feedback {
  kind: "ok" | "error";
  text: string;
}

interface PendingOverwrite {
  imported: StoredCharacter;
  existingId: string;
  existingName: string;
}

export function HomePage() {
  const system = useSystem();
  const api = useCharactersApi();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pendingOverwrite, setPendingOverwrite] = useState<PendingOverwrite | null>(null);
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
      const imported = outcome.character;
      const sameId = api.characters.find((c) => c.data.id === imported.data.id);
      if (sameId) {
        api.addCharacter(imported);
        setFeedback({
          kind: "ok",
          text: `Ficha '${imported.data.name}' atualizada (reimportada pelo mesmo ID).`,
        });
        return;
      }
      const byName = api.characters.find((c) => sameCharacterName(c.data.name, imported.data.name));
      if (byName) {
        setPendingOverwrite({
          imported,
          existingId: byName.data.id,
          existingName: byName.data.name,
        });
        return;
      }
      api.addCharacter(imported);
      setFeedback({
        kind: "ok",
        text: `Ficha '${imported.data.name}' importada com sucesso.`,
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

  function confirmOverwrite() {
    if (!pendingOverwrite) return;
    const { imported, existingId, existingName } = pendingOverwrite;
    api.addCharacter({
      ...imported,
      data: { ...imported.data, id: existingId },
    });
    setPendingOverwrite(null);
    setFeedback({
      kind: "ok",
      text: `Ficha de '${existingName}' sobrescrita com os dados importados.`,
    });
  }

  function cancelOverwrite() {
    const name = pendingOverwrite?.imported.data.name;
    setPendingOverwrite(null);
    setFeedback({
      kind: "ok",
      text: `Importação cancelada. A ficha de '${name ?? ""}' foi mantida como estava.`,
    });
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
              onDelete={() => api.deleteCharacter(stored.data.id)}
              onExport={() => api.exportCharacter(stored.data.id)}
            />
          ))}
        </div>
      )}

      {pendingOverwrite && (
        <ConfirmDialog
          title="Personagem já existe"
          message={`Já existe uma ficha chamada '${pendingOverwrite.existingName}'. Sobrescrever os dados dela com o conteúdo do arquivo importado? A ficha atual será substituída.`}
          confirmLabel="Sobrescrever"
          destructive
          onConfirm={confirmOverwrite}
          onCancel={cancelOverwrite}
        />
      )}
    </div>
  );
}