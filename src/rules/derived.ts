import type { SystemDefinition } from "../domain/system";
import type { Character, MpState } from "../domain/character";
import { findClass } from "./catalog";

export const AC_BASE = 10;

export function getProficiency(system: SystemDefinition, character: Character): number {
  const cls = findClass(system, character.classId);
  if (!cls) return 2;
  const level = cls.levels[String(character.level)];
  if (!level) return 2;
  return level.proficiency;
}

export function computeMaxHp(
  system: SystemDefinition,
  classId: string,
  level: number,
  attributes: Record<string, number>,
  fallback = 1
): number {
  const cls = findClass(system, classId);
  if (!cls) return fallback;
  const gain = Math.ceil(cls.hpBase / 2);
  const conModifier = attributes["con"] ?? 0;
  return Math.max(1, cls.hpBase + (level - 1) * gain + conModifier * level);
}

export function computeMaxMp(
  system: SystemDefinition,
  classId: string,
  level: number
): number | undefined {
  const cls = findClass(system, classId);
  const progression = cls?.spellcasting?.magicPoints;
  if (!progression || level < progression.unlockLevel) return undefined;
  const gain = Math.ceil(progression.base / 2);
  return Math.max(1, progression.base + (level - progression.unlockLevel) * gain);
}

export function computeAc(character: Character): number {
  const dexModifier = character.attributes["des"] ?? 0;
  const equippedBonus = character.inventory
    .filter((item) => item.equipped)
    .reduce((total, item) => total + (item.acBonus ?? 0), 0);
  return AC_BASE + dexModifier + equippedBonus;
}

export function isProficientInSavingThrow(
  system: SystemDefinition,
  classId: string,
  attributeId: string
): boolean {
  const cls = findClass(system, classId);
  return cls?.savingThrows.includes(attributeId) ?? false;
}

export function getSavingThrowBonus(
  system: SystemDefinition,
  character: Character,
  attributeId: string
): number {
  const attributeModifier = character.attributes[attributeId] ?? 0;
  const proficient = isProficientInSavingThrow(system, character.classId, attributeId);
  return attributeModifier + (proficient ? getProficiency(system, character) : 0);
}

export function getSpellSaveDc(system: SystemDefinition, character: Character): number | null {
  const cls = findClass(system, character.classId);
  if (!cls?.spellcasting) return null;
  const attr = character.attributes[cls.spellcasting.abilityId] ?? 0;
  return 10 + attr;
}

export function getSpellAttackBonus(system: SystemDefinition, character: Character): number | null {
  const cls = findClass(system, character.classId);
  if (!cls?.spellcasting) return null;
  const attr = character.attributes[cls.spellcasting.abilityId] ?? 0;
  return getProficiency(system, character) + attr;
}

export function clampHp(hp: { current: number; max: number }): { current: number; max: number } {
  const max = Math.max(1, hp.max);
  return { current: Math.min(max, Math.max(0, hp.current)), max };
}

export function clampMp(mp: { current: number; max: number }): { current: number; max: number } {
  const max = Math.max(0, mp.max);
  return { current: Math.min(max, Math.max(0, mp.current)), max };
}

export function clampLevel(level: number, maxLevel: number): number {
  return Math.max(1, Math.min(maxLevel, Math.floor(level)));
}

export function normalizeResources(system: SystemDefinition, character: Character): Character {
  const maxHp = computeMaxHp(
    system,
    character.classId,
    character.level,
    character.attributes,
    character.hp.max
  );
  const hp = clampHp({ current: character.hp.current, max: maxHp });

  const maxMp = computeMaxMp(system, character.classId, character.level);
  let mp: MpState | undefined;
  if (maxMp === undefined) {
    mp = undefined;
  } else if (character.mp) {
    mp = clampMp({ current: character.mp.current, max: maxMp });
  } else {
    mp = { current: maxMp, max: maxMp };
  }

  return { ...character, hp, mp };
}