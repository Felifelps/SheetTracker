import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSystem } from "../state/useSystem";
import { useCharactersApi } from "../state/CharactersProvider";
import { wrapCharacter } from "../domain/character";
import { findClass, findRace, getLevelAbilities, getLevelSpells } from "../rules/catalog";
import { initializeAbilityUses } from "../rules/rest";
import { generateId } from "../utils/id";

export function NewCharacterPage() {
  const system = useSystem();
  const { addCharacter } = useCharactersApi();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [raceId, setRaceId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [level, setLevel] = useState(1);
  const [attributeValues, setAttributeValues] = useState<Record<string, number>>({});
  const [trainedSkills, setTrainedSkills] = useState<Set<string>>(new Set());
  const [expertiseSkills, setExpertiseSkills] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<string[]>([]);

  const race = raceId ? findRace(system, raceId) : undefined;
  const cls = classId ? findClass(system, classId) : undefined;

  const levelOptions = useMemo(() => {
    if (!cls) return [];
    return Object.keys(cls.levels)
      .map(Number)
      .sort((a, b) => a - b);
  }, [cls]);

  const levelDef = cls?.levels[String(level)];

  const proficiency = levelDef?.proficiency ?? 2;
  const suggestedHp = levelDef?.hp;
  const suggestedMp = cls?.spellcasting ? levelDef?.magicPoints : undefined;

  const hasExpertiseClass = useMemo(() => {
    if (!cls) return false;
    for (const [levelKey, lv] of Object.entries(cls.levels)) {
      if (Number(levelKey) > level) continue;
      if ((lv.abilities ?? []).includes("especializacao")) return true;
    }
    return false;
  }, [cls, level]);

  const grantedAbilities = useMemo(() => {
    if (!cls) return [];
    return [...race?.traits ?? [], ...getLevelAbilities(system, cls, level)];
  }, [cls, race, system, level]);

  const grantedSpells = useMemo(() => {
    if (!cls) return [];
    const ids = new Set<string>();
    for (const id of race?.grantsSpells ?? []) ids.add(id);
    for (const s of getLevelSpells(system, cls, level)) ids.add(s.id);
    return [...ids].map((id) => system.spells.find((s) => s.id === id)!).filter(Boolean);
  }, [cls, race, system, level]);

  function handleRaceChange(nextRaceId: string) {
    setRaceId(nextRaceId);
    const nextRace = findRace(system, nextRaceId);
    const nextAttributes: Record<string, number> = {};
    for (const attr of system.attributes) {
      nextAttributes[attr.id] = nextRace?.attributeBonuses[attr.id] ?? 0;
    }
    setAttributeValues(nextAttributes);
    setTrainedSkills(new Set());
    setExpertiseSkills(new Set());
  }

  function handleClassChange(nextClassId: string) {
    setClassId(nextClassId);
    const nextClass = findClass(system, nextClassId);
    const available = Object.keys(nextClass?.levels ?? {})
      .map(Number)
      .sort((a, b) => a - b);
    if (!nextClass?.levels[String(level)] && available.length > 0) {
      setLevel(available[0]);
    }
    setExpertiseSkills(new Set());
  }

  function skillBonus(skillId: string): number {
    const racial = race?.skillBonuses[skillId] ?? 0;
    const trained = trainedSkills.has(skillId);
    const expert = expertiseSkills.has(skillId);
    return racial + (trained ? proficiency * (expert ? 2 : 1) : 0);
  }

  function toggleTrained(skillId: string) {
    setTrainedSkills((current) => {
      const next = new Set(current);
      if (next.has(skillId)) {
        next.delete(skillId);
        setExpertiseSkills((exp) => {
          const nextExp = new Set(exp);
          nextExp.delete(skillId);
          return nextExp;
        });
      } else {
        next.add(skillId);
      }
      return next;
    });
  }

  function toggleExpertise(skillId: string) {
    setExpertiseSkills((current) => {
      const next = new Set(current);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
        setTrainedSkills((tr) => {
          const nextTr = new Set(tr);
          nextTr.add(skillId);
          return nextTr;
        });
      }
      return next;
    });
  }

  function handleCreate() {
    const problems: string[] = [];
    if (!name.trim()) problems.push("Dê um nome ao personagem.");
    if (!raceId) problems.push("Selecione uma raça.");
    if (!classId) problems.push("Selecione uma classe.");
    setErrors(problems);
    if (problems.length > 0 || !raceId || !classId) return;

    const selectedClass = findClass(system, classId)!;

    const spellIds: string[] = [...(race?.grantsSpells ?? [])];
    for (const [levelKey, lv] of Object.entries(selectedClass.levels)) {
      if (Number(levelKey) <= level) {
        for (const id of lv.spells ?? []) {
          if (!spellIds.includes(id)) spellIds.push(id);
        }
      }
    }

    const attributes: Record<string, number> = {};
    for (const attr of system.attributes) {
      attributes[attr.id] = attributeValues[attr.id] ?? 0;
    }

    const draft = wrapCharacter({
      id: "",
      name: name.trim(),
      systemId: system.id,
      raceId,
      classId,
      level,
      attributes,
      hp: { current: 1, max: 1 },
      speed: system.defaultSpeed ?? 6,
      skills: [...trainedSkills, ...(race ? Object.keys(race.skillBonuses) : [])]
        .filter((id, i, arr) => arr.indexOf(id) === i)
        .sort((a, b) =>
          (system.skills.find((s) => s.id === a)?.name ?? "").localeCompare(
            system.skills.find((s) => s.id === b)?.name ?? "",
            "pt-BR"
          )
        )
        .map((skillId) => ({
          skillId,
          bonus: skillBonus(skillId),
          expertise: expertiseSkills.has(skillId),
        })),
      abilityUses: {},
      spellIds,
      inventory: [],
      conditions: [],
      notes: "",
      updatedAt: new Date().toISOString(),
    }).data;

    const abilityUses = initializeAbilityUses(system, draft);
    const hp = { current: suggestedHp ?? 1, max: suggestedHp ?? 1 };
    const mp =
      suggestedMp !== undefined ? { current: suggestedMp, max: suggestedMp } : undefined;

    const stored = wrapCharacter({
      ...draft,
      id: generateId(),
      hp,
      mp,
      abilityUses,
    });

    addCharacter(stored);
    navigate(`/ficha/${stored.data.id}`);
  }

  return (
    <div className="page page-narrow">
      <nav className="breadcrumb" aria-label="Navegação">
        <Link to="/">← Fichas</Link>
      </nav>
      <div className="page-head">
        <div>
          <h1>Nova ficha</h1>
          <p className="page-sub">
            Sistema: {system.name}. Atributos iniciam com os bônus raciais aplicados.
          </p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="banner banner-error" role="alert">
          <ul className="banner-list">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="wizard">
        <section className="panel">
          <h2>Identidade</h2>
          <div className="field">
            <label htmlFor="char-name">Nome</label>
            <input
              id="char-name"
              type="text"
              value={name}
              placeholder="Ex.: Gael Arisen"
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <fieldset className="choice-group">
            <legend>Raça</legend>
            <div className="choice-grid">
              {system.races.map((r) => (
                <label
                  key={r.id}
                  className={`choice-card ${raceId === r.id ? "choice-card-active" : ""}`}
                >
                  <input
                    type="radio"
                    name="race"
                    value={r.id}
                    checked={raceId === r.id}
                    onChange={() => handleRaceChange(r.id)}
                  />
                  <span className="choice-title">{r.name}</span>
                  <span className="choice-desc">{r.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="choice-group">
            <legend>Classe</legend>
            <div className="choice-grid">
              {system.classes.map((c) => (
                <label
                  key={c.id}
                  className={`choice-card ${classId === c.id ? "choice-card-active" : ""}`}
                >
                  <input
                    type="radio"
                    name="class"
                    value={c.id}
                    checked={classId === c.id}
                    onChange={() => handleClassChange(c.id)}
                  />
                  <span className="choice-title">{c.name}</span>
                  <span className="choice-desc">{c.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {cls && (
            <div className="field field-compact">
              <label htmlFor="char-level">Nível</label>
              <select
                id="char-level"
                value={level}
                onChange={(event) => setLevel(Number(event.target.value))}
              >
                {levelOptions.map((lv) => (
                  <option key={lv} value={lv}>
                    Nível {lv}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        {race && (
          <section className="panel">
            <h2>Atributos</h2>
            <p className="hint">
              Modificadores finais (bônus de {race.name} já aplicados). Ajuste conforme a criação do
              seu personagem.
            </p>
            <div className="attribute-grid">
              {system.attributes.map((attr) => (
                <div key={attr.id} className="attribute-cell">
                  <span className="attribute-abbr">{attr.abbr}</span>
                  <div className="stepper">
                    <button
                      type="button"
                      className="stepper-btn"
                      aria-label={`Diminuir ${attr.name}`}
                      onClick={() =>
                        setAttributeValues((current) => ({
                          ...current,
                          [attr.id]: (current[attr.id] ?? 0) - 1,
                        }))
                      }
                    >
                      −
                    </button>
                    <span
                      className={`attribute-value ${
                        (attributeValues[attr.id] ?? 0) < 0 ? "attribute-negative" : ""
                      }`}
                    >
                      {(attributeValues[attr.id] ?? 0) > 0 ? "+" : ""}
                      {attributeValues[attr.id] ?? 0}
                    </span>
                    <button
                      type="button"
                      className="stepper-btn"
                      aria-label={`Aumentar ${attr.name}`}
                      onClick={() =>
                        setAttributeValues((current) => ({
                          ...current,
                          [attr.id]: (current[attr.id] ?? 0) + 1,
                        }))
                      }
                    >
                      +
                    </button>
                  </div>
                  {race.attributeBonuses[attr.id] ? (
                    <span className="attribute-bonus">+{race.attributeBonuses[attr.id]} racial</span>
                  ) : (
                    <span className="attribute-bonus" />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="panel">
          <h2>Perícias</h2>
          <p className="hint">
            Marque as perícias treinadas (bônus de treino +{proficiency}). Bônus raciais aparecem
            marcados e já entram no total.{hasExpertiseClass ? " Especialização dobra o bônus de treino." : ""}
          </p>
          <ul className="skill-picker">
            {system.skills.map((skill) => {
              const racial = race?.skillBonuses[skill.id] ?? 0;
              const trained = trainedSkills.has(skill.id);
              const expert = expertiseSkills.has(skill.id);
              const total = skillBonus(skill.id);
              return (
                <li key={skill.id} className="skill-picker-row">
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={trained}
                      onChange={() => toggleTrained(skill.id)}
                    />
                    <span>{skill.name}</span>
                  </label>
                  {racial > 0 && <span className="badge badge-race">racial +{racial}</span>}
                  {hasExpertiseClass && trained && (
                    <label className="check-label check-label-small">
                      <input
                        type="checkbox"
                        checked={expert}
                        onChange={() => toggleExpertise(skill.id)}
                      />
                      <span>Especialização</span>
                    </label>
                  )}
                  <span className="skill-total">{total > 0 ? `+${total}` : total}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {cls && (
          <section className="panel preview-panel">
            <h2>Prévia da ficha</h2>
            <ul className="preview-list">
              <li>
                <span>PV inicial sugerido</span>
                <strong>{suggestedHp ?? "—"}</strong>
              </li>
              {suggestedMp !== undefined && (
                <li>
                  <span>Pontos de Magia</span>
                  <strong>{suggestedMp}</strong>
                </li>
              )}
              <li>
                <span>Proficiência</span>
                <strong>+{proficiency}</strong>
              </li>
              <li>
                <span>Testes de resistência</span>
                <strong>
                  {cls.savingThrows
                    .map((id) => system.attributes.find((a) => a.id === id)?.abbr ?? id)
                    .join(" e ")}
                </strong>
              </li>
              {cls.spellcasting && (
                <li>
                  <span>CD de magia / Ataque mágico</span>
                  <strong>
                    {10 + (attributeValues[cls.spellcasting.abilityId] ?? 0)} /{" "}
                    {proficiency + (attributeValues[cls.spellcasting.abilityId] ?? 0)}
                  </strong>
                </li>
              )}
            </ul>
            <h3>Habilidades concedidas</h3>
            <ul className="preview-tags">
              {grantedAbilities.map((a) => (
                <li key={a.id} className="tag">
                  {a.name}
                </li>
              ))}
            </ul>
            {grantedSpells.length > 0 && (
              <>
                <h3>Magias conhecidas</h3>
                <ul className="preview-tags">
                  {grantedSpells.map((s) => (
                    <li key={s.id} className="tag">
                      {s.name}
                      {s.pmCost ? ` (${s.pmCost} PM)` : ""}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        <div className="wizard-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={handleCreate}>
            Criar ficha
          </button>
        </div>
      </div>
    </div>
  );
}