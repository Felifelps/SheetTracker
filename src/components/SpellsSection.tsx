import { useMemo } from "react";
import type { Character } from "../domain/character";
import type { SpellDefinition, SystemDefinition } from "../domain/system";
import { findClass, findRace, findSpell, getLevelSpells } from "../rules/catalog";

interface SpellsSectionProps {
  system: SystemDefinition;
  character: Character;
}

export function SpellsSection({ system, character }: SpellsSectionProps) {
  const cls = findClass(system, character.classId);
  const race = findRace(system, character.raceId);

  const spells = useMemo(() => {
    const ids = new Set<string>();
    for (const id of race?.grantsSpells ?? []) ids.add(id);
    if (cls) {
      for (const spell of getLevelSpells(system, cls, character.level)) {
        ids.add(spell.id);
      }
    }
    return [...ids]
      .map((id) => findSpell(system, id))
      .filter((s): s is SpellDefinition => s !== undefined);
  }, [system, cls, race, character.level]);

  return (
    <section className="panel">
      <h2>Magias</h2>
      <p className="hint">
        Magias definidas pela classe e raça no sistema ({cls?.name ?? character.classId}
        {race ? ` · ${race.name}` : ""}), nível {character.level}.
      </p>
      {spells.length === 0 && <p className="section-empty">Nenhuma magia concedida neste nível.</p>}
      <ul className="spell-list">
        {spells.map((spell) => (
          <li key={spell.id} className="spell-row">
            <div className="spell-head">
              <span className="spell-name">{spell.name}</span>
              <span className={`badge ${spell.pmCost ? "badge-mp" : "badge-neutral"}`}>
                {spell.pmCost ? `${spell.pmCost} PM` : "sem custo"}
              </span>
            </div>
            <p className="spell-desc">{spell.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}