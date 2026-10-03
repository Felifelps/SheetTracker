import type { StoredCharacter } from "../domain/character";
import { stripIgnoredCharacterFields } from "../domain/character";
import { validateStoredCharacter } from "../domain/validation";

const CHARACTERS_KEY = "sheettracker.characters";

export interface LoadResult {
  characters: StoredCharacter[];
  warnings: string[];
  unavailable: boolean;
}

function readRaw(key: string): unknown | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return undefined;
    return JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Os dados salvos em '${key}' estão corrompidos (JSON inválido). Não foi possível lê-los automaticamente.`
      );
    }
    return undefined;
  }
}

export function loadCharacters(): LoadResult {
  const result: LoadResult = { characters: [], warnings: [], unavailable: false };

  let storageAvailable = true;
  try {
    window.localStorage.setItem("sheettracker.probe", "1");
    window.localStorage.removeItem("sheettracker.probe");
  } catch {
    storageAvailable = false;
  }

  if (!storageAvailable) {
    result.unavailable = true;
    result.warnings.push(
      "O armazenamento local (localStorage) está indisponível. As fichas não serão salvas neste navegador — verifique se o modo privado está desativado."
    );
    return result;
  }

  let raw: unknown;
  try {
    raw = readRaw(CHARACTERS_KEY);
  } catch (error) {
    result.warnings.push(error instanceof Error ? error.message : "Erro ao ler os dados salvos.");
    return result;
  }

  if (raw === undefined) return result;

  if (!Array.isArray(raw)) {
    result.warnings.push(
      "Os dados de personagens salvos não são uma lista válida e foram ignorados. Exporte manualmente se precisar recuperá-los."
    );
    return result;
  }

  for (const [index, item] of raw.entries()) {
    const checked = validateStoredCharacter(item);
    if (checked.ok) {
      result.characters.push({
        ...checked.value,
        data: stripIgnoredCharacterFields(checked.value.data),
      });
    } else {
      result.warnings.push(
        `Ficha na posição ${index + 1} foi ignorada por estar inválida: ${checked.errors[0]}`
      );
    }
  }

  return result;
}

export function saveCharacters(characters: StoredCharacter[]): { ok: true } | { ok: false; message: string } {
  try {
    window.localStorage.setItem(CHARACTERS_KEY, JSON.stringify(characters));
    return { ok: true };
  } catch {
    return {
      ok: false,
      message:
        "Não foi possível salvar as fichas (armazenamento cheio ou indisponível). Faça backup exportando as fichas antes de fechar a página.",
    };
  }
}