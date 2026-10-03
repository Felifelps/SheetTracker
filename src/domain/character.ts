export interface HpState {
  current: number;
  max: number;
}

export interface MpState {
  current: number;
  max: number;
}

export interface CharacterSkill {
  skillId: string;
  bonus: number;
  expertise: boolean;
}

export interface AbilityUseState {
  current: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  damage?: string;
  description?: string;
  quantity: number;
  acBonus?: number;
  equipped?: boolean;
}

export interface CharacterCondition {
  id: string;
  name: string;
}

export interface Character {
  id: string;
  name: string;
  systemId: string;
  raceId: string;
  classId: string;
  level: number;
  attributes: Record<string, number>;
  hp: HpState;
  mp?: MpState;
  speed: number;
  skills: CharacterSkill[];
  abilityUses: Record<string, AbilityUseState>;
  spellIds: string[];
  inventory: InventoryItem[];
  conditions: CharacterCondition[];
  notes: string;
  updatedAt: string;
}

export const CHARACTER_SCHEMA_VERSION = 1;
export const CUSTOM_CONDITION_PREFIX = "custom-";

export interface StoredCharacter {
  schemaVersion: number;
  type: "character";
  systemId: string;
  data: Character;
}

export function wrapCharacter(character: Character): StoredCharacter {
  return {
    schemaVersion: CHARACTER_SCHEMA_VERSION,
    type: "character",
    systemId: character.systemId,
    data: character,
  };
}