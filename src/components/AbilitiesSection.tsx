import type { Character } from "../domain/character";
import type { AbilityBase, SystemDefinition } from "../domain/system";
import { findClass, findRace, getLevelAbilities } from "../rules/catalog";

interface AbilitiesSectionProps {
  system: SystemDefinition;
  character: Character;
  update: (updater: (c: Character) => Character) => void;
}

function rechargeLabel(ability: AbilityBase): string | null {
  if (!ability.uses) return null;
  const parts: string[] = [];
  if (ability.uses.recharge === "long-rest") {
    parts.push("recupera por descanso longo");
  } else if (ability.uses.recharge === "short-rest") {
    parts.push("recupera por descanso curto");
  } else {
    parts.push("recupera por encontro");
  }
  if (ability.uses.shortRestRecovery && ability.uses.shortRestRecovery > 0 && ability.uses.recharge === "long-rest") {
    parts.push(`+${ability.uses.shortRestRecovery} por descanso curto`);
  }
  return parts.join(", ");
}

export function AbilitiesSection({ system, character, update }: AbilitiesSectionProps) {
  const race = findRace(system, character.raceId);
  const cls = findClass(system, character.classId);
  const classAbilities = cls ? getLevelAbilities(system, cls, character.level) : [];

  const entries: Array<{ ability: AbilityBase; source: string }> = [
    ...(race?.traits ?? []).map((t) => ({ ability: t, source: race!.name })),
    ...classAbilities.map((a) => ({ ability: a, source: cls!.name })),
  ];

  function currentUses(ability: AbilityBase): number {
    return character.abilityUses[ability.id]?.current ?? ability.uses?.max ?? 0;
  }

  function changeUses(ability: AbilityBase, delta: number) {
    const max = ability.uses?.max ?? 0;
    update((c) => ({
      ...c,
      abilityUses: {
        ...c.abilityUses,
        [ability.id]: {
          current: Math.max(0, Math.min(max, currentUses(ability) + delta)),
        },
      },
    }));
  }

  return (
    <section className="panel">
      <h2>Habilidades</h2>
      {entries.length === 0 && (
        <p className="section-empty">Nenhuma habilidade concedida neste nível.</p>
      )}
      <ul className="ability-list">
        {entries.map(({ ability, source }) => (
          <li key={ability.id} className="ability-row">
            <div className="ability-head">
              <span className="ability-name">{ability.name}</span>
              <span className="badge badge-source">{source}</span>
              {ability.uses && (
                <div className="stepper stepper-inline">
                  <button
                    type="button"
                    className="stepper-btn"
                    aria-label={`Gastar 1 uso de ${ability.name}`}
                    onClick={() => changeUses(ability, -1)}
                  >
                    −
                  </button>
                  <span className="use-value">
                    {currentUses(ability)}/{ability.uses.max}
                  </span>
                  <button
                    type="button"
                    className="stepper-btn"
                    aria-label={`Recuperar 1 uso de ${ability.name}`}
                    onClick={() => changeUses(ability, +1)}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
            <p className="ability-desc">{ability.description}</p>
            {ability.uses && (
              <p className="ability-recharge">{rechargeLabel(ability)}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}