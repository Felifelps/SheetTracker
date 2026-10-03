import type { Character, StoredCharacter } from "../domain/character";
import { stripIgnoredCharacterFields } from "../domain/character";
import type { SystemDefinition } from "../domain/system";
import { normalizeCharacterState } from "../rules/rest";
import {
  validateCharacterAgainstSystem,
  validateStoredCharacter,
} from "../domain/validation";

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40) || "ficha";
}

export function exportCharacterFile(character: StoredCharacter): void {
  const fileName = `${slugify(character.data.name)}-ficha.json`;
  downloadJson(character, fileName);
}

export function downloadJson(value: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function sameCharacterName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase("pt-BR") === b.trim().toLocaleLowerCase("pt-BR");
}

export async function readFileAsJson(file: File): Promise<unknown> {
  const text = await file.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `O arquivo '${file.name}' não é um JSON válido. Verifique se selecionou o arquivo correto.`
    );
  }
}

export type ImportOutcome =
  | { ok: true; character: StoredCharacter; replaced: boolean }
  | { ok: false; errors: string[] };

function sanitizeImportedData(data: Character): Character {
  const sanitized = stripIgnoredCharacterFields(data);
  return {
    ...sanitized,
    hp: { current: sanitized.hp.current, max: 0 },
    mp: sanitized.mp ? { current: sanitized.mp.current, max: 0 } : undefined,
  };
}

export function importCharacterFromParsed(
  parsed: unknown,
  system: SystemDefinition
): ImportOutcome {
  const checked = validateStoredCharacter(parsed);
  if (!checked.ok) {
    return { ok: false, errors: checked.errors };
  }

  const stored = checked.value;
  const refErrors = validateCharacterAgainstSystem(stored, system);
  if (refErrors.length > 0) {
    return { ok: false, errors: refErrors };
  }

  return {
    ok: true,
    character: {
      ...stored,
      data: normalizeCharacterState(system, sanitizeImportedData(stored.data)),
    },
    replaced: false,
  };
}