import type {
  AbilityBase,
  ClassDefinition,
  RaceDefinition,
  SkillDefinition,
  ConditionDefinition,
  SpellDefinition,
  SystemDefinition,
} from "../domain/system";

export function findRace(system: SystemDefinition, raceId: string): RaceDefinition | undefined {
  return system.races.find((r) => r.id === raceId);
}

export function findClass(system: SystemDefinition, classId: string): ClassDefinition | undefined {
  return system.classes.find((c) => c.id === classId);
}

export function findSkill(system: SystemDefinition, skillId: string): SkillDefinition | undefined {
  return system.skills.find((s) => s.id === skillId);
}

export function findCondition(system: SystemDefinition, conditionId: string): ConditionDefinition | undefined {
  return system.conditions.find((c) => c.id === conditionId);
}

export function findSpell(system: SystemDefinition, spellId: string): SpellDefinition | undefined {
  return system.spells.find((s) => s.id === spellId);
}

export function findAbility(system: SystemDefinition, abilityId: string): AbilityBase | undefined {
  for (const a of system.abilities) {
    if (a.id === abilityId) return a;
  }
  for (const r of system.races) {
    const trait = r.traits.find((t) => t.id === abilityId);
    if (trait) return trait;
  }
  return undefined;
}

export function getLevelAbilities(system: SystemDefinition, cls: ClassDefinition, level: number): AbilityBase[] {
  const ids = new Set<string>();
  for (const [levelKey, lv] of Object.entries(cls.levels)) {
    if (Number(levelKey) <= level) {
      for (const id of lv.abilities ?? []) ids.add(id);
    }
  }
  return [...ids]
    .map((id) => findAbility(system, id))
    .filter((a): a is AbilityBase => a !== undefined);
}

export function getLevelSpells(system: SystemDefinition, cls: ClassDefinition, level: number): SpellDefinition[] {
  const ids = new Set<string>();
  for (const [levelKey, lv] of Object.entries(cls.levels)) {
    if (Number(levelKey) <= level) {
      for (const id of lv.spells ?? []) ids.add(id);
    }
  }
  return [...ids]
    .map((id) => findSpell(system, id))
    .filter((s): s is SpellDefinition => s !== undefined);
}