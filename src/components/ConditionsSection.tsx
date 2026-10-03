import { useState } from "react";
import type { Character } from "../domain/character";
import { CUSTOM_CONDITION_PREFIX } from "../domain/character";
import type { SystemDefinition } from "../domain/system";
import { findCondition } from "../rules/catalog";
import { generateId } from "../utils/id";
import { slugify } from "../services/importExport";

interface ConditionsSectionProps {
  system: SystemDefinition;
  character: Character;
  update: (updater: (c: Character) => Character) => void;
}

export function ConditionsSection({ system, character, update }: ConditionsSectionProps) {
  const [toAdd, setToAdd] = useState("");
  const [customName, setCustomName] = useState("");

  const activeIds = new Set(
    character.conditions
      .filter((c) => !c.id.startsWith(CUSTOM_CONDITION_PREFIX))
      .map((c) => c.id)
  );
  const available = system.conditions.filter((c) => !activeIds.has(c.id));

  function removeCondition(id: string) {
    update((c) => ({
      ...c,
      conditions: c.conditions.filter((cond) => cond.id !== id),
    }));
  }

  function addCatalogCondition(id: string) {
    if (!id || activeIds.has(id)) return;
    const def = findCondition(system, id);
    if (!def) return;
    update((c) => ({
      ...c,
      conditions: [...c.conditions, { id: def.id, name: def.name }],
    }));
    setToAdd("");
  }

  function addCustomCondition() {
    const name = customName.trim();
    if (!name) return;
    update((c) => ({
      ...c,
      conditions: [
        ...c.conditions,
        { id: `${CUSTOM_CONDITION_PREFIX}${slugify(name)}-${generateId().slice(0, 6)}`, name },
      ],
    }));
    setCustomName("");
  }

  return (
    <section className="panel">
      <h2>Condições</h2>
      <p className="hint">Condições ativas. Clique no × para remover quando o efeito acabar.</p>
      {character.conditions.length === 0 && (
        <p className="section-empty">Nenhuma condição ativa.</p>
      )}
      {character.conditions.length > 0 && (
        <ul className="condition-list" aria-label="Condições ativas">
          {character.conditions.map((cond) => {
            const def = findCondition(system, cond.id);
            const severity = def?.severity ?? "medium";
            return (
              <li key={cond.id} className={`condition-chip condition-${severity}`}>
                <span>{cond.name}</span>
                <button
                  type="button"
                  className="chip-remove"
                  aria-label={`Remover condição ${cond.name}`}
                  onClick={() => removeCondition(cond.id)}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="add-row">
        <label htmlFor="add-condition" className="visually-hidden">
          Adicionar condição
        </label>
        <select
          id="add-condition"
          value={toAdd}
          onChange={(event) => setToAdd(event.target.value)}
        >
          <option value="">Adicionar condição…</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn" disabled={!toAdd} onClick={() => addCatalogCondition(toAdd)}>
          Adicionar
        </button>
      </div>
      <div className="add-row add-row-form">
        <label htmlFor="custom-condition" className="visually-hidden">
          Nova condição personalizada
        </label>
        <input
          id="custom-condition"
          type="text"
          placeholder="Condição personalizada (ex.: Em Chamas)"
          value={customName}
          onChange={(event) => setCustomName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addCustomCondition();
          }}
        />
        <button type="button" className="btn" disabled={!customName.trim()} onClick={addCustomCondition}>
          Criar
        </button>
      </div>
    </section>
  );
}