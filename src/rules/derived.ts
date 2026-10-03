import type { SystemDefinition } from "../domain/system";
import type { Character } from "../domain/character";
import { findClass } from "./catalog";

export function getProficiency(system: SystemDefinition, character: Character): number {
  const cls = findClass(system, character.classId);
  if (!cls) return 2;
  const level = cls.levels[String(character.level)];
  if (!level) return 2;
  return level.proficiency;
}

export function getSuggestedHp(system: SystemDefinition, character: Character): number | undefined {
  const cls = findClass(system, character.classId);
  const level = cls?.levels[String(character.level)];
  return level?.hp;
}

export function getSuggestedMp(system: SystemDefinition, character: Character): number | undefined {
  const cls = findClass(system, character.classId);
  const level = cls?.levels[String(character.level)];
  if (!cls?.spellcasting) return undefined;
  return level?.magicPoints ?? undefined;
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
  return { max, current: Math.min(max, Math.max(0, hp.current)) };
}

export function clampMp(mp: { current: number; max: number }): { current: number; max: number } {
  const max = Math.max(0, mp.max);
  return { max, current: Math.min(max, Math.max(0, mp.current)) };
}

export function clampLevel(level: number): number {
  return Math.max(1, Math.min(20, Math.floor(level)));
}