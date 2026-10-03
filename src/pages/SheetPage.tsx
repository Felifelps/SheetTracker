import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSystem } from "../state/useSystem";
import { useCharactersApi } from "../state/CharactersProvider";
import type { Character } from "../domain/character";
import { findClass, findRace, getDefinedLevels, getMaxDefinedLevel } from "../rules/catalog";
import {
  computeAc,
  computeSpeed,
  getProficiency,
  getSavingThrowBonus,
  getSpellAttackBonus,
  getSpellSaveDc,
  clampLevel,
} from "../rules/derived";
import { applyRest, normalizeCharacterState } from "../rules/rest";
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

  const refErrors = useMemo(() => {
    if (!stored) return [];
    return validateCharacterAgainstSystem(stored, system);
  }, [stored, system]);

  useEffect(() => {
    if (!character || refErrors.length > 0) return;
    const normalized = normalizeCharacterState(system, character);
    if (JSON.stringify(normalized) !== JSON.stringify(character)) {
      api.updateCharacter(character.id, () => normalized);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id, refErrors.length]);

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
  const update = (updater: (c: Character) => Character) =>
    api.updateCharacter(character.id, (c) => normalizeCharacterState(system, updater(c)));

  const proficiency = getProficiency(system, character);
  const spellDc = getSpellSaveDc(system, character);
  const spellAttack = getSpellAttackBonus(system, character);
  const armorClass = computeAc(character);
  const speed = computeSpeed(system, character);

  const levelOptions = cls ? getDefinedLevels(system, character.classId) : [character.level];

  const handleLevelChange = (nextLevel: number) => {
    update((c) => ({
      ...c,
      level: clampLevel(nextLevel, getMaxDefinedLevel(system, c.classId)),
    }));
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
            <span className="sheet-ac-label">CA</span>
            <span className="sheet-ac-value" title="10 + Destreza + bônus de CA dos equipamentos equipados">
              {armorClass}
            </span>
            <span className="sheet-ac-label">Deslocamento</span>
            <span
              className="sheet-ac-value"
              title="Deslocamento da raça + bônus de deslocamento dos equipamentos equipados"
            >
              {speed}
            </span>
            <span className="sheet-unit">{system.movementUnit}</span>
          </div>
        </div>
        <div className="sheet-header-actions">
          <button type="button" className="btn" onClick={() => api.exportCharacter(character.id)}>
            Exportar
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
                update((c) => ({ ...c, hp: { ...c.hp, current: value } }))
              }
            />
            {character.mp && (
              <ResourceBar
                label="PM"
                tone="mp"
                current={character.mp.current}
                max={character.mp.max}
                onCurrentChange={(value) =>
                  update((c) => ({ ...c, mp: { ...c.mp!, current: value } }))
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

        <div className="sheet-col">
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
            <h2>Combate</h2>
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
            <p className="hint">Atributo + proficiência (destaque = proficiente na classe).</p>
            <ul className="preview-tags">
              {system.attributes.map((attr) => {
                const bonus = getSavingThrowBonus(system, character, attr.id);
                const proficient = (cls?.savingThrows ?? []).includes(attr.id);
                return (
                  <li
                    key={attr.id}
                    className={`tag ${proficient ? "tag-prof" : ""}`}
                    title={proficient ? "Proficiente nesta resistência" : "Sem proficiência"}
                  >
                    {attr.abbr} {bonus >= 0 ? `+${bonus}` : bonus}
                  </li>
                );
              })}
            </ul>
          </section>

          <SpellsSection system={system} character={character} />

          <AbilitiesSection system={system} character={character} update={update} />
          <SkillsSection system={system} character={character} update={update} />
        </div>

        <div className="sheet-col">
          <ConditionsSection system={system} character={character} update={update} />
          <InventorySection character={character} update={update} />
          <NotesSection character={character} update={update} />
        </div>
      </div>
    </div>
  );
}