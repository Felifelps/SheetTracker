import type { SystemDefinition } from "../domain/system";
import type { Character, MpState } from "../domain/character";
import { findAbility, findClass, findRace } from "./catalog";
import { clampHp, clampMp, normalizeResources } from "./derived";

export type RestKind = "short" | "long";

function recoverResource(
  resource: { current: number; max: number },
  kind: RestKind
): { current: number; max: number } {
  if (kind === "long") {
    return { current: resource.max, max: resource.max };
  }
  const recovery = Math.floor(resource.max / 2);
  return {
    current: Math.min(resource.max, resource.current + recovery),
    max: resource.max,
  };
}

export function applyRest(system: SystemDefinition, character: Character, kind: RestKind): Character {
  const abilityUses: Record<string, { current: number }> = {};

  for (const [id, state] of Object.entries(character.abilityUses)) {
    const def = findAbility(system, id);
    if (!def?.uses) {
      abilityUses[id] = state;
      continue;
    }
    const { max, recharge, shortRestRecovery } = def.uses;
    let current = state.current;

    if (kind === "long") {
      current = max;
    } else if (recharge === "short-rest" || recharge === "encounter") {
      current = max;
    } else if (shortRestRecovery !== undefined && shortRestRecovery > 0) {
      current = Math.min(max, current + shortRestRecovery);
    }

    abilityUses[id] = { current: Math.max(0, Math.min(max, current)) };
  }

  const hp = clampHp(recoverResource(character.hp, kind));
  const mp: MpState | undefined = character.mp
    ? clampMp(recoverResource(character.mp, kind))
    : undefined;

  return { ...character, abilityUses, hp, mp, updatedAt: new Date().toISOString() };
}

export function initializeAbilityUses(system: SystemDefinition, character: Character): Record<string, { current: number }> {
  const race = findRace(system, character.raceId);
  const cls = findClass(system, character.classId);
  const uses: Record<string, { current: number }> = {};

  const raceIds = race?.traits.map((t) => t.id) ?? [];
  const classIds: string[] = [];
  if (cls) {
    for (const [levelKey, lv] of Object.entries(cls.levels)) {
      if (Number(levelKey) <= character.level) {
        classIds.push(...(lv.abilities ?? []));
      }
    }
  }

  for (const id of [...raceIds, ...classIds]) {
    const def = findAbility(system, id);
    if (def?.uses) {
      uses[id] = { current: def.uses.max };
    }
  }

  return uses;
}

export function validateOrFixUses(system: SystemDefinition, character: Character): Record<string, { current: number }> {
  const result: Record<string, { current: number }> = {};
  for (const [id, state] of Object.entries(character.abilityUses)) {
    const def = findAbility(system, id);
    if (!def?.uses) {
      result[id] = state;
      continue;
    }
    result[id] = {
      current: Math.max(0, Math.min(def.uses.max, state.current)),
    };
  }
  return result;
}

export function normalizeCharacterState(system: SystemDefinition, character: Character): Character {
  const initialized = initializeAbilityUses(system, character);
  const fixed = validateOrFixUses(system, character);
  const abilityUses: Record<string, { current: number }> = { ...initialized };
  for (const [id, state] of Object.entries(fixed)) {
    abilityUses[id] = state;
  }
  return normalizeResources(system, { ...character, abilityUses });
}