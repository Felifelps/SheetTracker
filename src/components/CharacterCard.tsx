import { Link } from "react-router-dom";
import { useState } from "react";
import type { StoredCharacter } from "../domain/character";
import type { SystemDefinition } from "../domain/system";
import { findClass, findRace } from "../rules/catalog";
import { ConfirmDialog } from "./ConfirmDialog";

interface CharacterCardProps {
  stored: StoredCharacter;
  system: SystemDefinition;
  onDuplicate: () => void;
  onDelete: () => void;
  onExport: () => void;
}

export function CharacterCard({ stored, system, onDuplicate, onDelete, onExport }: CharacterCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const c = stored.data;
  const race = findRace(system, c.raceId);
  const cls = findClass(system, c.classId);

  return (
    <article className="character-card panel">
      <div className="character-card-head">
        <Link to={`/ficha/${c.id}`} className="character-card-name">
          {c.name}
        </Link>
        <span className="character-card-level">Nível {c.level}</span>
      </div>
      <p className="character-card-sub">
        {race?.name ?? c.raceId} · {cls?.name ?? c.classId}
      </p>
      <div className="character-card-resources">
        <div className="mini-bar" role="img" aria-label={`PV ${c.hp.current} de ${c.hp.max}`}>
          <span className="mini-bar-label">PV</span>
          <div className="mini-bar-track">
            <div
              className="mini-bar-fill mini-bar-hp"
              style={{ width: `${Math.round((c.hp.current / Math.max(1, c.hp.max)) * 100)}%` }}
            />
          </div>
          <span className="mini-bar-value">
            {c.hp.current}/{c.hp.max}
          </span>
        </div>
        {c.mp && (
          <div className="mini-bar" role="img" aria-label={`PM ${c.mp.current} de ${c.mp.max}`}>
            <span className="mini-bar-label">PM</span>
            <div className="mini-bar-track">
              <div
                className="mini-bar-fill mini-bar-mp"
                style={{ width: `${Math.round((c.mp.current / Math.max(1, c.mp.max)) * 100)}%` }}
              />
            </div>
            <span className="mini-bar-value">
              {c.mp.current}/{c.mp.max}
            </span>
          </div>
        )}
      </div>
      <div className="character-card-actions">
        <Link to={`/ficha/${c.id}`} className="btn btn-primary">
          Abrir
        </Link>
        <button type="button" className="btn" onClick={onExport}>
          Exportar
        </button>
        <button type="button" className="btn" onClick={onDuplicate}>
          Duplicar
        </button>
        <button
          type="button"
          className="btn btn-danger-ghost"
          onClick={() => setConfirmingDelete(true)}
        >
          Excluir
        </button>
      </div>
      {confirmingDelete && (
        <ConfirmDialog
          title="Excluir ficha"
          message={`Excluir definitivamente a ficha de '${c.name}'? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          destructive
          onConfirm={() => {
            setConfirmingDelete(false);
            onDelete();
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </article>
  );
}