import { useCallback, useEffect, useRef, useState } from "react";
import type { Character, StoredCharacter } from "../domain/character";
import { wrapCharacter } from "../domain/character";
import { loadCharacters, saveCharacters } from "../services/storage";
import { exportCharacterFile } from "../services/importExport";
import type { LoadResult } from "../services/storage";
import { generateId } from "../utils/id";

const SAVE_DEBOUNCE_MS = 300;

export interface CharactersApi {
  characters: StoredCharacter[];
  loaded: boolean;
  loadWarnings: string[];
  storageUnavailable: boolean;
  saveError: string | null;
  dismissSaveError: () => void;
  addCharacter: (character: StoredCharacter) => { replaced: boolean };
  updateCharacter: (id: string, updater: (data: Character) => Character) => void;
  deleteCharacter: (id: string) => void;
  duplicateCharacter: (id: string) => string | null;
  exportCharacter: (id: string) => void;
}

export function useCharacters(): CharactersApi {
  const [characters, setCharacters] = useState<StoredCharacter[]>([]);
  const [loadState, setLoadState] = useState<LoadResult>({
    characters: [],
    warnings: [],
    unavailable: false,
  });
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    const result = loadCharacters();
    setLoadState(result);
    setCharacters(result.characters);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(() => {
      const outcome = saveCharacters(characters);
      if (!outcome.ok) {
        setSaveError(outcome.message);
      } else {
        setSaveError((current) => (current !== null ? null : current));
      }
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    };
  }, [characters, loaded]);

  const addCharacter = useCallback(
    (stored: StoredCharacter) => {
      const replaced = characters.some((c) => c.data.id === stored.data.id);
      setCharacters((current) => {
        const exists = current.some((c) => c.data.id === stored.data.id);
        if (exists) {
          return current.map((c) => (c.data.id === stored.data.id ? stored : c));
        }
        return [...current, stored];
      });
      return { replaced };
    },
    [characters]
  );

  const updateCharacter = useCallback((id: string, updater: (data: Character) => Character) => {
    setCharacters((current) =>
      current.map((stored) => {
        if (stored.data.id !== id) return stored;
        const next = updater(stored.data);
        return { ...stored, data: { ...next, updatedAt: new Date().toISOString() } };
      })
    );
  }, []);

  const deleteCharacter = useCallback((id: string) => {
    setCharacters((current) => current.filter((c) => c.data.id !== id));
  }, []);

  const duplicateCharacter = useCallback(
    (id: string): string | null => {
      const source = characters.find((c) => c.data.id === id);
      if (!source) return null;
      const newId = generateId();
      const copy: StoredCharacter = {
        ...source,
        data: {
          ...source.data,
          id: newId,
          name: `${source.data.name} (cópia)`,
          updatedAt: new Date().toISOString(),
        },
      };
      setCharacters((current) => [...current, copy]);
      return newId;
    },
    [characters]
  );

  const exportCharacter = useCallback(
    (id: string) => {
      const source = characters.find((c) => c.data.id === id);
      if (source) {
        exportCharacterFile(wrapCharacter(source.data));
      }
    },
    [characters]
  );

  const dismissSaveError = useCallback(() => setSaveError(null), []);

  return {
    characters,
    loaded,
    loadWarnings: loadState.warnings,
    storageUnavailable: loadState.unavailable,
    saveError,
    dismissSaveError,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    duplicateCharacter,
    exportCharacter,
  };
}