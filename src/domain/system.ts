export const RECHARGE_LONG_REST = "long-rest";
export const RECHARGE_SHORT_REST = "short-rest";
export const RECHARGE_ENCOUNTER = "encounter";

export type Recharge =
  | typeof RECHARGE_LONG_REST
  | typeof RECHARGE_SHORT_REST
  | typeof RECHARGE_ENCOUNTER;

export interface UsesDefinition {
  max: number;
  recharge: Recharge;
  shortRestRecovery?: number;
}

export interface AbilityBase {
  id: string;
  name: string;
  description: string;
  uses?: UsesDefinition;
}

export interface AttributeDefinition {
  id: string;
  name: string;
  abbr: string;
}

export interface SkillDefinition {
  id: string;
  name: string;
}

export type ConditionSeverity = "low" | "medium" | "high";

export interface ConditionDefinition {
  id: string;
  name: string;
  severity: ConditionSeverity;
}

export interface RaceDefinition {
  id: string;
  name: string;
  description: string;
  attributeBonuses: Record<string, number>;
  skillBonuses: Record<string, number>;
  traits: AbilityBase[];
  grantsSpells?: string[];
  speed?: number;
}

export interface MagicPointsProgression {
  base: number;
  unlockLevel: number;
}

export interface ClassLevelDefinition {
  proficiency: number;
  abilities?: string[];
  spells?: string[];
}

export interface ClassDefinition {
  id: string;
  name: string;
  description: string;
  hpBase: number;
  savingThrows: string[];
  spellcasting?: {
    abilityId: string;
    magicPoints?: MagicPointsProgression;
  };
  levels: Record<string, ClassLevelDefinition>;
}

export interface SpellDefinition {
  id: string;
  name: string;
  description: string;
  pmCost?: number;
}

export interface SystemDefinition {
  schemaVersion: number;
  id: string;
  name: string;
  description: string;
  attributes: AttributeDefinition[];
  movementUnit: string;
  defaultSpeed?: number;
  skills: SkillDefinition[];
  conditions: ConditionDefinition[];
  races: RaceDefinition[];
  classes: ClassDefinition[];
  abilities: AbilityBase[];
  spells: SpellDefinition[];
  notes?: string;
}

export type Validated<T> = { ok: true; value: T } | { ok: false; errors: string[] };