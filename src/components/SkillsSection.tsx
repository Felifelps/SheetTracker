import { useState } from "react";
import type { Character, CharacterSkill } from "../domain/character";
import type { SystemDefinition } from "../domain/system";
import { findRace } from "../rules/catalog";

interface SkillsSectionProps {
  system: SystemDefinition;
  character: Character;
  update: (updater: (c: Character) => Character) => void;
}

function BonusInput({
  value,
  label,
  onCommit,
}: {
  value: number;
  label: string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = value > 0 ? `+${value}` : String(value);
  return (
    <input
      className="skill-bonus-input"
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={label}
      value={draft ?? display}
      onChange={(event) => {
        const raw = event.target.value.trim();
        setDraft(raw);
        const parsed = Number(raw.replace("+", "").replace(",", "."));
        if (raw !== "" && raw !== "-" && Number.isFinite(parsed)) {
          onCommit(Math.round(parsed));
        }
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

export function SkillsSection({ system, character, update }: SkillsSectionProps) {
  const race = findRace(system, character.raceId);
  const entries = new Map(character.skills.map((s) => [s.skillId, s]));

  function getEntry(skillId: string): CharacterSkill {
    return entries.get(skillId) ?? { skillId, bonus: 0, expertise: false };
  }

  function upsertSkill(skillId: string, patch: Partial<CharacterSkill>) {
    update((c) => {
      const exists = c.skills.some((s) => s.skillId === skillId);
      const skills = exists
        ? c.skills.map((s) => (s.skillId === skillId ? { ...s, ...patch } : s))
        : [...c.skills, { skillId, bonus: 0, expertise: false, ...patch }];
      return { ...c, skills };
    });
  }

  return (
    <section className="panel">
      <h2>Perícias</h2>
      <p className="hint">
        Todas as perícias do sistema. Ajuste o bônus livremente (treino, raça e outros ajustes).
        Marque Especialização quando a perícia dobrar o bônus de treino.
      </p>
      <ul className="skill-list">
        {system.skills.map((skillDef) => {
          const entry = getEntry(skillDef.id);
          const racial = race?.skillBonuses[skillDef.id] ?? 0;
          return (
            <li key={skillDef.id} className="skill-row">
              <span className="skill-name">
                {skillDef.name}
                {racial > 0 && <span className="badge badge-race">racial +{racial}</span>}
                {entry.expertise && <span className="badge badge-expert">especializada</span>}
              </span>
              <div className="skill-controls">
                <BonusInput
                  value={entry.bonus}
                  label={`Bônus de ${skillDef.name}`}
                  onCommit={(value) => upsertSkill(skillDef.id, { bonus: value })}
                />
                <label className="check-label check-label-small" title="Especialização: dobra o bônus de treino">
                  <input
                    type="checkbox"
                    checked={entry.expertise}
                    onChange={() => upsertSkill(skillDef.id, { expertise: !entry.expertise })}
                    aria-label={`Especialização em ${skillDef.name}`}
                  />
                  <span>Esp.</span>
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}