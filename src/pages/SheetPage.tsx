import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSystem } from "../state/useSystem";
import { useCharactersApi } from "../state/CharactersProvider";
import type { Character } from "../domain/character";
import { findClass, findRace } from "../rules/catalog";
import {
  getProficiency,
  getSpellAttackBonus,
  getSpellSaveDc,
  getSuggestedHp,
  getSuggestedMp,
  clampHp,
  clampMp,
  clampLevel,
} from "../rules/derived";
import { applyRest, initializeAbilityUses, validateOrFixUses } from "../rules/rest";
import { validateCharacterAgainstSystem } from "../domain/validation";
import { ResourceBar } from "../components/ResourceBar";
import { AttributeGrid } from "../components/AttributeGrid";
import { SkillsSection } from "../components/SkillsSection";
import { AbilitiesSection } from "../components/AbilitiesSection";
import { SpellsSection } from "../components/SpellsSection";
import { InventorySection } from "../components/InventorySection";
import { ConditionsSection } from "../components/ConditionsSection";
import { NotesSection } from "../components/NotesSection";
import { ConfirmDialog } from "../components/ConfirmDialog";

export function SheetPage() {
  const system = useSystem();
  const { id = "" } = useParams();
  const api = useCharactersApi();
  const navigate = useNavigate();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const stored = api.characters.find((c) => c.data.id === id);
  const loaded = api.loaded;
  const character = stored?.data;

  useEffect(() => {
    if (!character) return;
    const initialized = initializeAbilityUses(system, character);
    const fixed = validateOrFixUses(system, character);
    const merged: Record<string, { current: number }> = { ...initialized };
    for (const [key, value] of Object.entries(fixed)) {
      merged[key] = value;
    }
    if (JSON.stringify(merged) !== JSON.stringify(character.abilityUses)) {
      api.updateCharacter(character.id, (c) => ({ ...c, abilityUses: merged }));
    }
  }, [character?.id]);

  const refErrors = useMemo(() => {
    if (!stored) return [];
    return validateCharacterAgainstSystem(stored, system);
  }, [stored, system]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "+" && event.key !== "-") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      const delta = event.key === "+" ? 1 : -1;
      api.updateCharacter(id, (c) => ({
        ...c,
        hp: {
          ...c.hp,
          current: Math.max(0, Math.min(c.hp.max, c.hp.current + delta)),
        },
      }));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [api, id]);

  if (!loaded) {
    return (
      <div className="page">
        <p className="section-empty">Carregando ficha…</p>
      </div>
    );
  }

  if (!character || !stored) {
    return (
      <div className="page">
        <section className="panel empty-state">
          <h2>Ficha não encontrada</h2>
          <p>
            Esta ficha não existe neste navegador. Ela pode ter sido criada em outro
            navegador ou apagada — importe o arquivo JSON dela para recuperá-la aqui.
          </p>
          <div className="empty-state-actions">
            <Link to="/" className="btn btn-primary">
              Voltar para a lista
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (refErrors.length > 0) {
    return (
      <div className="page">
        <nav className="breadcrumb" aria-label="Navegação">
          <Link to="/">← Fichas</Link>
        </nav>
        <section className="panel empty-state">
          <h2>Ficha incompatível com o sistema</h2>
          <p>Não é possível exibir esta ficha com o sistema carregado ({system.name}):</p>
          <ul className="banner-list">
            {refErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
          <div className="empty-state-actions">
            <button
              type="button"
              className="btn"
              onClick={() => api.exportCharacter(character.id)}
            >
              Exportar ficha para recuperar os dados
            </button>
            <Link to="/" className="btn btn-primary">
              Voltar para a lista
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const race = findRace(system, character.raceId);
  const cls = findClass(system, character.classId);
  const update = (updater: (c: Character) => Character) => api.updateCharacter(character.id, updater);

  const proficiency = getProficiency(system, character);
  const spellDc = getSpellSaveDc(system, character);
  const spellAttack = getSpellAttackBonus(system, character);

  const levelOptions = cls
    ? Object.keys(cls.levels)
        .map(Number)
        .sort((a, b) => a - b)
    : [character.level];

  const handleLevelChange = (nextLevel: number) => {
    update((c) => {
      const next: Character = { ...c, level: clampLevel(nextLevel) };
      const oldHp = getSuggestedHp(system, c);
      const newHp = getSuggestedHp(system, next);
      if (oldHp !== undefined && newHp !== undefined && c.hp.max === oldHp) {
        next.hp = clampHp({ current: c.hp.current, max: newHp });
      }
      const oldMp = getSuggestedMp(system, c);
      const newMp = getSuggestedMp(system, next);
      if (next.mp && oldMp !== undefined && newMp !== undefined && next.mp.max === oldMp) {
        next.mp = clampMp({ current: next.mp.current, max: newMp });
      }
      return next;
    });
  };

  const handleDuplicate = () => {
    const newId = api.duplicateCharacter(character.id);
    if (newId) navigate(`/ficha/${newId}`);
  };

  const handleDelete = () => {
    api.deleteCharacter(character.id);
    navigate("/");
  };

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="Navegação">
        <Link to="/">← Fichas</Link>
      </nav>

      <header className="sheet-header panel">
        <div className="sheet-header-main">
          <label htmlFor="sheet-name" className="visually-hidden">
            Nome do personagem
          </label>
          <input
            id="sheet-name"
            className="sheet-name-input"
            type="text"
            value={character.name}
            onChange={(event) => update((c) => ({ ...c, name: event.target.value }))}
          />
          <div className="sheet-meta">
            <span className="sheet-meta-item">{race?.name ?? character.raceId}</span>
            <span className="sheet-meta-sep" aria-hidden="true">
              ·
            </span>
            <span className="sheet-meta-item">{cls?.name ?? character.classId}</span>
            <span className="sheet-meta-sep" aria-hidden="true">
              ·
            </span>
            <label htmlFor="sheet-level" className="visually-hidden">
              Nível
            </label>
            <select
              id="sheet-level"
              className="sheet-level-select"
              value={character.level}
              onChange={(event) => handleLevelChange(Number(event.target.value))}
            >
              {levelOptions.map((lv) => (
                <option key={lv} value={lv}>
                  Nível {lv}
                </option>
              ))}
            </select>
            <label htmlFor="sheet-ac" className="sheet-ac-label">
              CA
            </label>
            <input
              id="sheet-ac"
              className="sheet-ac-input"
              type="number"
              inputMode="numeric"
              min={0}
              value={character.ac ?? ""}
              placeholder="—"
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                update((c) => ({ ...c, ac: Number.isNaN(value) ? undefined : value }));
              }}
            />
            <label htmlFor="sheet-speed" className="sheet-ac-label">
              Deslocamento
            </label>
            <input
              id="sheet-speed"
              className="sheet-ac-input"
              type="number"
              inputMode="numeric"
              min={0}
              value={character.speed}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                if (!Number.isNaN(value) && value >= 0) {
                  update((c) => ({ ...c, speed: value }));
                }
              }}
            />
            <span className="sheet-unit">{system.movementUnit}</span>
          </div>
        </div>
        <div className="sheet-header-actions">
          <button type="button" className="btn" onClick={() => api.exportCharacter(character.id)}>
            Exportar
          </button>
          <button type="button" className="btn" onClick={handleDuplicate}>
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
      </header>

      {confirmingDelete && (
        <ConfirmDialog
          title="Excluir ficha"
          message={`Excluir definitivamente a ficha de '${character.name}'? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      <div className="sheet-grid">
        <section className="panel sheet-resources">
          <h2>Recursos</h2>
          <div className="resource-list">
            <ResourceBar
              label="PV"
              tone="hp"
              current={character.hp.current}
              max={character.hp.max}
              onCurrentChange={(value) =>
                update((c) => ({ ...c, hp: clampHp({ ...c.hp, current: value }) }))
              }
              onMaxChange={(value) =>
                update((c) => ({ ...c, hp: clampHp({ ...c.hp, max: value }) }))
              }
            />
            {character.mp && (
              <ResourceBar
                label="PM"
                tone="mp"
                current={character.mp.current}
                max={character.mp.max}
                onCurrentChange={(value) =>
                  update((c) => ({ ...c, mp: clampMp({ ...c.mp!, current: value }) }))
                }
                onMaxChange={(value) =>
                  update((c) => ({ ...c, mp: clampMp({ ...c.mp!, max: value }) }))
                }
              />
            )}
          </div>
          <div className="rest-buttons">
            <button
              type="button"
              className="btn btn-rest"
              onClick={() => update((c) => applyRest(system, c, "short"))}
            >
              Descanso curto
            </button>
            <button
              type="button"
              className="btn btn-rest"
              onClick={() => update((c) => applyRest(system, c, "long"))}
            >
              Descanso longo
            </button>
            <span className="hint hint-inline">
              Longo: restaura PV, PM e todos os usos. Curto: recupera metade do máximo de PV/PM e usos por descanso curto. Atalhos + / − ajustam PV.
            </span>
          </div>
        </section>

        <section className="panel">
          <h2>Atributos</h2>
          <AttributeGrid
            system={system}
            attributes={character.attributes}
            onChange={(attributeId, value) =>
              update((c) => ({
                ...c,
                attributes: { ...c.attributes, [attributeId]: value },
              }))
            }
          />
        </section>

        <section className="panel">
          <h2>Combate e magia</h2>
          <ul className="stat-list">
            <li className="stat-row">
              <span>Proficiência</span>
              <strong>+{proficiency}</strong>
            </li>
            {spellDc !== null && (
              <li className="stat-row">
                <span>CD de resistência de magia</span>
                <strong>{spellDc}</strong>
              </li>
            )}
            {spellAttack !== null && (
              <li className="stat-row">
                <span>Bônus de ataque de magia</span>
                <strong>+{spellAttack}</strong>
              </li>
            )}
          </ul>
          <h3>Testes de resistência</h3>
          <ul className="preview-tags">
            {(cls?.savingThrows ?? []).map((attrId) => {
              const attr = system.attributes.find((a) => a.id === attrId);
              const value = character.attributes[attrId] ?? 0;
              return (
                <li key={attrId} className="tag tag-acc">
                  {attr?.name ?? attrId} {value >= 0 ? `+${value}` : value}
                </li>
              );
            })}
            {!cls && <li className="tag">Classe não definida</li>}
          </ul>
        </section>

        <AbilitiesSection system={system} character={character} update={update} />
        <SpellsSection system={system} character={character} />
        <SkillsSection system={system} character={character} update={update} />
        <InventorySection character={character} update={update} />
        <ConditionsSection system={system} character={character} update={update} />
        <div className="sheet-grid-full">
          <NotesSection character={character} update={update} />
        </div>
      </div>
    </div>
  );
}