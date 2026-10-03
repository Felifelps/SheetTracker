import type {
  SystemDefinition,
  Validated,
} from "./system";
import type {
  Character,
  StoredCharacter,
} from "./character";
import { CUSTOM_CONDITION_PREFIX } from "./character";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export class ErrorCollector {
  readonly errors: string[] = [];

  add(message: string): void {
    this.errors.push(message);
  }

  check(condition: boolean, message: string): void {
    if (!condition) {
      this.add(message);
    }
  }

  get hasErrors(): boolean {
    return this.errors.length > 0;
  }
}

export function validateSystemDefinition(raw: unknown): Validated<SystemDefinition> {
  const e = new ErrorCollector();

  if (!isRecord(raw)) {
    return { ok: false, errors: ["O sistema deve ser um objeto JSON."] };
  }

  e.check(isString(raw.id) && raw.id.length > 0, "Sistema: campo 'id' ausente ou inválido.");
  e.check(isString(raw.name) && raw.name.length > 0, "Sistema: campo 'name' ausente ou inválido.");
  e.check(isNumber(raw.schemaVersion), "Sistema: campo 'schemaVersion' deve ser um número.");
  e.check(
    raw.defaultSpeed === undefined || isNumber(raw.defaultSpeed),
    "Sistema: campo 'defaultSpeed' deve ser um número."
  );

  const attrIds = new Set<string>();
  if (!Array.isArray(raw.attributes) || raw.attributes.length === 0) {
    e.add("Sistema: 'attributes' deve ser uma lista não vazia.");
  } else {
    for (const a of raw.attributes) {
      if (!isRecord(a) || !isString(a.id) || !isString(a.name) || !isString(a.abbr)) {
        e.add("Sistema: atributo inválido em 'attributes'.");
        continue;
      }
      attrIds.add(a.id);
    }
  }

  const skillIds = new Set<string>();
  if (Array.isArray(raw.skills)) {
    for (const s of raw.skills) {
      if (!isRecord(s) || !isString(s.id) || !isString(s.name)) {
        e.add("Sistema: perícia inválida em 'skills'.");
        continue;
      }
      skillIds.add(s.id);
    }
  } else {
    e.add("Sistema: campo 'skills' deve ser uma lista.");
  }

  const conditionIds = new Set<string>();
  if (Array.isArray(raw.conditions)) {
    for (const c of raw.conditions) {
      if (!isRecord(c) || !isString(c.id) || !isString(c.name)) {
        e.add("Sistema: condição inválida em 'conditions'.");
        continue;
      }
      conditionIds.add(c.id);
    }
  } else {
    e.add("Sistema: campo 'conditions' deve ser uma lista.");
  }

  const raceIds = new Set<string>();
  const traitIds = new Set<string>();
  if (Array.isArray(raw.races) && raw.races.length > 0) {
    for (const r of raw.races) {
      if (!isRecord(r) || !isString(r.id) || !isString(r.name)) {
        e.add("Sistema: raça inválida em 'races'.");
        continue;
      }
      raceIds.add(r.id);
      e.check(
        r.speed === undefined || isNumber(r.speed),
        `Sistema: 'speed' da raça '${r.id}' deve ser um número.`
      );
      if (Array.isArray(r.traits)) {
        for (const t of r.traits) {
          if (isRecord(t) && isString(t.id)) {
            traitIds.add(t.id);
          }
        }
      }
    }
  } else {
    e.add("Sistema: campo 'races' deve ser uma lista não vazia.");
  }

  const classIds = new Set<string>();
  const abilityIds = new Set<string>();
  if (Array.isArray(raw.abilities)) {
    for (const a of raw.abilities) {
      if (!isRecord(a) || !isString(a.id) || !isString(a.name)) {
        e.add("Sistema: habilidade inválida em 'abilities'.");
        continue;
      }
      abilityIds.add(a.id);
    }
  } else {
    e.add("Sistema: campo 'abilities' deve ser uma lista.");
  }

  const spellIds = new Set<string>();
  if (Array.isArray(raw.spells)) {
    for (const s of raw.spells) {
      if (!isRecord(s) || !isString(s.id) || !isString(s.name)) {
        e.add("Sistema: magia inválida em 'spells'.");
        continue;
      }
      spellIds.add(s.id);
    }
  } else {
    e.add("Sistema: campo 'spells' deve ser uma lista.");
  }

  if (Array.isArray(raw.classes) && raw.classes.length > 0) {
    for (const c of raw.classes) {
      if (!isRecord(c) || !isString(c.id) || !isString(c.name)) {
        e.add("Sistema: classe inválida em 'classes'.");
        continue;
      }
      classIds.add(c.id);
      e.check(
        isNumber(c.hpBase) && c.hpBase > 0,
        `Sistema: classe '${c.id}' sem 'hpBase' numérico positivo.`
      );
      if (c.spellcasting !== undefined) {
        if (!isRecord(c.spellcasting) || !isString(c.spellcasting.abilityId)) {
          e.add(`Sistema: 'spellcasting' da classe '${c.id}' inválido.`);
        } else if (c.spellcasting.magicPoints !== undefined) {
          const mp = c.spellcasting.magicPoints;
          e.check(
            isRecord(mp) && isNumber(mp.base) && isNumber(mp.unlockLevel) && mp.unlockLevel >= 1,
            `Sistema: 'magicPoints' da classe '${c.id}' inválido (precisa de 'base' e 'unlockLevel' numéricos).`
          );
        }
      }
      if (!isRecord(c.levels)) {
        e.add(`Sistema: classe '${c.id}' sem 'levels'.`);
        continue;
      }
      for (const [level, lv] of Object.entries(c.levels)) {
        const lvRec = isRecord(lv) ? lv : {};
        if (!isRecord(lv) || !isNumber(lv.proficiency)) {
          e.add(`Sistema: nível ${level} da classe '${c.id}' inválido (precisa de 'proficiency' numérico).`);
        }
        const abilityRefs = isStringArray(lvRec.abilities) ? lvRec.abilities : [];
        for (const id of abilityRefs) {
          e.check(abilityIds.has(id), `Sistema: classe '${c.id}' referencia habilidade inexistente '${id}'.`);
        }
        const spellRefs = isStringArray(lvRec.spells) ? lvRec.spells : [];
        for (const id of spellRefs) {
          e.check(spellIds.has(id), `Sistema: classe '${c.id}' referencia magia inexistente '${id}'.`);
        }
      }
    }
  } else {
    e.add("Sistema: campo 'classes' deve ser uma lista não vazia.");
  }

  for (const r of Array.isArray(raw.races) ? raw.races : []) {
    if (!isRecord(r)) continue;
    const grants = r.grantsSpells;
    if (isStringArray(grants)) {
      for (const id of grants) {
        e.check(spellIds.has(id), `Sistema: raça '${r.id}' concede magia inexistente '${id}'.`);
      }
    }
    for (const t of Array.isArray(r.traits) ? r.traits : []) {
      if (!isRecord(t) || !isRecord(t.uses)) continue;
      const u = t.uses;
      e.check(
        isNumber(u.max) && isString(u.recharge),
        `Sistema: usos do traço '${t.id}' da raça '${r.id}' inválidos.`
      );
    }
  }

  if (e.hasErrors) {
    return { ok: false, errors: e.errors };
  }

  return {
    ok: true,
    value: raw as unknown as SystemDefinition,
  };
}

function validateCharacterData(raw: unknown): Validated<Character> {
  const e = new ErrorCollector();

  if (!isRecord(raw)) {
    return { ok: false, errors: ["A ficha deve ser um objeto JSON."] };
  }

  e.check(isString(raw.id) && raw.id.length > 0, "Ficha: campo 'id' ausente ou inválido.");
  e.check(isString(raw.name) && raw.name.length > 0, "Ficha: campo 'name' ausente ou inválido.");
  e.check(isString(raw.systemId) && raw.systemId.length > 0, "Ficha: campo 'systemId' ausente ou inválido.");
  e.check(isString(raw.raceId) && raw.raceId.length > 0, "Ficha: campo 'raceId' ausente ou inválido.");
  e.check(isString(raw.classId) && raw.classId.length > 0, "Ficha: campo 'classId' ausente ou inválido.");
  e.check(isNumber(raw.level) && raw.level >= 1, "Ficha: campo 'level' deve ser um número ≥ 1.");
  e.check(isString(raw.updatedAt), "Ficha: campo 'updatedAt' ausente.");

  if (!isRecord(raw.attributes)) {
    e.add("Ficha: campo 'attributes' ausente ou inválido.");
  } else {
    for (const [key, value] of Object.entries(raw.attributes)) {
      e.check(isNumber(value), `Ficha: atributo '${key}' deve ser um número.`);
    }
  }

  if (isRecord(raw.hp) && isNumber(raw.hp.current) && isNumber(raw.hp.max)) {
    e.check(raw.hp.current >= 0, "Ficha: PV atual não pode ser negativo.");
    e.check(raw.hp.max > 0, "Ficha: PV máximo deve ser maior que zero.");
  } else {
    e.add("Ficha: campo 'hp' ausente ou inválido (precisa de 'current' e 'max' numéricos).");
  }

  if (raw.mp !== undefined) {
    if (isRecord(raw.mp) && isNumber(raw.mp.current) && isNumber(raw.mp.max)) {
      e.check(raw.mp.current >= 0, "Ficha: PM atual não pode ser negativo.");
      e.check(raw.mp.max >= 0, "Ficha: PM máximo não pode ser negativo.");
    } else {
      e.add("Ficha: campo 'mp' inválido (precisa de 'current' e 'max' numéricos).");
    }
  }

  e.check(raw.ac === undefined || isNumber(raw.ac), "Ficha: campo 'ac' deve ser um número.");

  if (Array.isArray(raw.skills)) {
    for (const s of raw.skills) {
      e.check(
        isRecord(s) && isString(s.skillId) && isNumber(s.bonus),
        "Ficha: perícia inválida na lista 'skills'."
      );
      if (isRecord(s) && s.expertise !== undefined) {
        e.check(isBoolean(s.expertise), "Ficha: 'expertise' de perícia deve ser booleano.");
      }
    }
  } else {
    e.add("Ficha: campo 'skills' deve ser uma lista.");
  }

  if (raw.abilityUses !== undefined) {
    if (!isRecord(raw.abilityUses)) {
      e.add("Ficha: campo 'abilityUses' deve ser um objeto.");
    } else {
      for (const [key, value] of Object.entries(raw.abilityUses)) {
        e.check(
          isRecord(value) && isNumber(value.current),
          `Ficha: usos de '${key}' em 'abilityUses' inválidos.`
        );
      }
    }
  }

  e.check(raw.spellIds === undefined || isStringArray(raw.spellIds), "Ficha: campo 'spellIds' deve ser uma lista de IDs.");

  if (Array.isArray(raw.inventory)) {
    for (const it of raw.inventory) {
      e.check(
        isRecord(it) && isString(it.id) && isString(it.name),
        "Ficha: item inválido no inventário."
      );
      if (isRecord(it) && it.quantity !== undefined) {
        e.check(isNumber(it.quantity) && it.quantity >= 0, `Ficha: quantidade do item '${isString(it.name) ? it.name : ""}' deve ser um número ≥ 0.`);
      }
      if (isRecord(it) && it.acBonus !== undefined) {
        e.check(isNumber(it.acBonus), "Ficha: bônus de CA do item deve ser um número.");
      }
      if (isRecord(it) && it.speedBonus !== undefined) {
        e.check(isNumber(it.speedBonus), "Ficha: bônus de deslocamento do item deve ser um número.");
      }
      if (isRecord(it) && it.equipped !== undefined) {
        e.check(isBoolean(it.equipped), "Ficha: campo 'equipped' do item deve ser booleano.");
      }
    }
  } else {
    e.add("Ficha: campo 'inventory' deve ser uma lista.");
  }

  e.check(raw.conditionIds === undefined, "Ficha: campo 'conditionIds' não é mais suportado; use 'conditions' com objetos {id, name}.");
  if (Array.isArray(raw.conditions)) {
    for (const cond of raw.conditions) {
      e.check(
        isRecord(cond) && isString(cond.id) && isString(cond.name),
        "Ficha: condição inválida na lista 'conditions'."
      );
    }
  } else {
    e.add("Ficha: campo 'conditions' deve ser uma lista.");
  }
  e.check(raw.notes === undefined || isString(raw.notes), "Ficha: campo 'notes' deve ser um texto.");

  if (e.hasErrors) {
    return { ok: false, errors: e.errors };
  }

  return { ok: true, value: raw as unknown as Character };
}

export function validateStoredCharacter(raw: unknown): Validated<StoredCharacter> {
  if (!isRecord(raw)) {
    return { ok: false, errors: ["O arquivo JSON deve conter um objeto."] };
  }

  const e = new ErrorCollector();

  e.check(isNumber(raw.schemaVersion), "Ficha: campo 'schemaVersion' ausente. O arquivo não parece ser uma ficha exportada pelo SheetTracker.");
  e.check(raw.type === "character", "Ficha: campo 'type' deve ser \"character\". O arquivo não parece ser uma ficha exportada pelo SheetTracker.");
  e.check(isString(raw.systemId), "Ficha: campo 'systemId' ausente ou inválido.");

  const dataCheck = validateCharacterData(raw.data);
  if (!dataCheck.ok) {
    return { ok: false, errors: e.errors.concat(dataCheck.errors) };
  }

  const character = dataCheck.value;
  e.check(character.systemId === raw.systemId, "Ficha: 'systemId' do envelope difere do 'systemId' da ficha.");

  if (e.hasErrors) {
    return { ok: false, errors: e.errors };
  }

  return { ok: true, value: raw as unknown as StoredCharacter };
}

export function validateCharacterAgainstSystem(
  stored: StoredCharacter,
  system: SystemDefinition
): string[] {
  const e = new ErrorCollector();
  const c = stored.data;

  if (stored.systemId !== system.id) {
    e.add(
      `Esta ficha pertence ao sistema '${stored.systemId}', mas o sistema carregado é '${system.id}'. Importe um sistema compatível ou exporte a ficha para este sistema.`
    );
    return e.errors;
  }

  e.check(
    system.races.some((r) => r.id === c.raceId),
    `A raça '${c.raceId}' não existe no sistema '${system.name}'.`
  );
  e.check(
    system.classes.some((cl) => cl.id === c.classId),
    `A classe '${c.classId}' não existe no sistema '${system.name}'.`
  );

  for (const key of Object.keys(c.attributes)) {
    e.check(
      system.attributes.some((a) => a.id === key),
      `O atributo '${key}' não existe no sistema '${system.name}'.`
    );
  }

  for (const s of c.skills) {
    e.check(
      system.skills.some((sk) => sk.id === s.skillId),
      `A perícia '${s.skillId}' não existe no sistema '${system.name}'.`
    );
  }

  const knownAbilityIds = new Set<string>();
  for (const a of system.abilities) knownAbilityIds.add(a.id);
  for (const r of system.races) {
    for (const t of r.traits) knownAbilityIds.add(t.id);
  }
  for (const key of Object.keys(c.abilityUses)) {
    e.check(
      knownAbilityIds.has(key),
      `A habilidade '${key}' não existe no sistema '${system.name}'.`
    );
  }

  for (const id of c.spellIds) {
    e.check(
      system.spells.some((sp) => sp.id === id),
      `A magia '${id}' não existe no sistema '${system.name}'.`
    );
  }

  for (const cond of c.conditions) {
    if (cond.id.startsWith(CUSTOM_CONDITION_PREFIX)) continue;
    e.check(
      system.conditions.some((sysCond) => sysCond.id === cond.id),
      `A condição '${cond.name}' não existe no sistema '${system.name}'.`
    );
  }

  return e.errors;
}