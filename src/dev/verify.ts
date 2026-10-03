import pseudoDndJson from "../systems/pseudo-dnd.json";
import {
  validateSystemDefinition,
  validateStoredCharacter,
  validateCharacterAgainstSystem,
} from "../domain/validation";
import {
  computeMaxHp,
  computeMaxMp,
  computeAc,
  computeSpeed,
  getSavingThrowBonus,
  getProficiency,
  getSpellSaveDc,
  getSpellAttackBonus,
} from "../rules/derived";
import { applyRest, normalizeCharacterState } from "../rules/rest";
import { getMaxDefinedLevel, getDefinedLevels } from "../rules/catalog";
import { clampLevel } from "../rules/derived";
import { importCharacterFromParsed, sameCharacterName } from "../services/importExport";
import { wrapCharacter, type StoredCharacter, type Character } from "../domain/character";
import { CUSTOM_CONDITION_PREFIX } from "../domain/character";
import type { SystemDefinition } from "../domain/system";

const failures: string[] = [];
function check(name: string, condition: boolean, detail = "") {
  if (!condition) failures.push(`${name}${detail ? ` → ${detail}` : ""}`);
}

const systemCheck = validateSystemDefinition(pseudoDndJson);
check("sistema embutido é válido", systemCheck.ok, systemCheck.ok ? "" : systemCheck.errors.join("; "));
const system = (pseudoDndJson as unknown) as SystemDefinition;

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: "test",
    name: "Teste",
    systemId: "pseudo-dnd",
    raceId: "tiefling",
    classId: "necromante",
    level: 1,
    attributes: { for: 1, des: -1, con: 0, int: 4, sab: 1, car: 3 },
    hp: { current: 0, max: 0 },
    skills: [],
    abilityUses: {},
    spellIds: [],
    inventory: [],
    conditions: [],
    notes: "",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const gael: Character = makeCharacter({
  id: "gael-test",
  name: "Gael Arisen",
  level: 2,
  hp: { current: 9, max: 9 },
  mp: { current: 3, max: 3 },
  skills: [
    { skillId: "enganacao", bonus: 2, expertise: false },
    { skillId: "furtividade", bonus: 2, expertise: false },
    { skillId: "religiao", bonus: 2, expertise: false },
    { skillId: "intimidacao", bonus: 2, expertise: false },
  ],
  abilityUses: { "toque-da-morte": { current: 2 } },
  spellIds: ["ilusao-menor", "toque-arrepiante", "infligir-ferimentos", "cegueira-surdez"],
  inventory: [{ id: "i1", name: "Adaga", damage: "1d4", quantity: 1 }],
  notes: "Braço direito tatuado",
});
const storedGael = wrapCharacter(gael);

check("ficha de Gael valida", validateStoredCharacter(storedGael).ok, "");
check(
  "ficha de Gael coerente com o sistema",
  validateCharacterAgainstSystem(storedGael, system).length === 0,
  validateCharacterAgainstSystem(storedGael, system).join("; ")
);

check("proficiência nível 2 = +2", getProficiency(system, gael) === 2, String(getProficiency(system, gael)));
check("CD de magia necromante = 14", getSpellSaveDc(system, gael) === 14, String(getSpellSaveDc(system, gael)));
check("ataque mágico necromante = +6", getSpellAttackBonus(system, gael) === 6, String(getSpellAttackBonus(system, gael)));

check(
  "cenário 1: necromante nível 1 CON +2 = 8 PV (6 + 2×1)",
  computeMaxHp(system, "necromante", 1, { con: 2 }) === 8,
  String(computeMaxHp(system, "necromante", 1, { con: 2 }))
);
check(
  "cenário 1: necromante nível 1 não possui PM",
  computeMaxMp(system, "necromante", 1) === undefined,
  String(computeMaxMp(system, "necromante", 1))
);
check(
  "cenário 2: necromante nível 2 CON +2 = 13 PV (6 + 3 + 2×2)",
  computeMaxHp(system, "necromante", 2, { con: 2 }) === 13,
  String(computeMaxHp(system, "necromante", 2, { con: 2 }))
);
check(
  "cenário 2: necromante nível 2 PM = 3 (base)",
  computeMaxMp(system, "necromante", 2) === 3,
  String(computeMaxMp(system, "necromante", 2))
);
check(
  "cenário 2b: necromante nível 2 CON +1 = 11 PV (6 + 3 + 1×2)",
  computeMaxHp(system, "necromante", 2, { con: 1 }) === 11,
  String(computeMaxHp(system, "necromante", 2, { con: 1 }))
);
check(
  "cenário 3: necromante nível 3 CON +2 = 18 PV (6 + 6 + 2×3)",
  computeMaxHp(system, "necromante", 3, { con: 2 }) === 18,
  String(computeMaxHp(system, "necromante", 3, { con: 2 }))
);
check(
  "cenário 3: necromante nível 3 PM = 5 (3 + 2)",
  computeMaxMp(system, "necromante", 3) === 5,
  String(computeMaxMp(system, "necromante", 3))
);
check(
  "cenário 3: necromante nível 4 PM = 7",
  computeMaxMp(system, "necromante", 4) === 7,
  String(computeMaxMp(system, "necromante", 4))
);
check(
  "cenário 4: mudar CON recalcula PV máximo (CON +3 no nível 2 = 15)",
  computeMaxHp(system, "necromante", 2, { con: 3 }) === 15,
  String(computeMaxHp(system, "necromante", 2, { con: 3 }))
);
check(
  "cenário 4: PV atual é preservado ao recalcular o máximo",
  normalizeCharacterState(system, makeCharacter({ level: 2, hp: { current: 4, max: 9 } })).hp.current === 4,
  JSON.stringify(normalizeCharacterState(system, makeCharacter({ level: 2, hp: { current: 4, max: 9 } })).hp)
);
check(
  "cenário 4: PV atual acima do novo máximo é limitado (CON -3 no nível 2 → máx 3)",
  normalizeCharacterState(system, makeCharacter({ level: 2, attributes: { con: -3 }, hp: { current: 9, max: 9 } })).hp.current === 3,
  ""
);

check(
  "cenário 2: subir de nível 1 → 2 inicializa PM nos dados",
  (() => {
    const leveledUp = normalizeCharacterState(system, makeCharacter({ level: 2, mp: undefined }));
    return leveledUp.mp?.current === 3 && leveledUp.mp.max === 3;
  })(),
  JSON.stringify(normalizeCharacterState(system, makeCharacter({ level: 2, mp: undefined })).mp)
);
check(
  "descer para nível 1 remove PM dos dados",
  normalizeCharacterState(system, makeCharacter({ level: 1, mp: { current: 3, max: 3 } })).mp === undefined,
  ""
);
check(
  "druida também recebe PM no nível de desbloqueio",
  computeMaxMp(system, "druida", 2) === 3 && computeMaxMp(system, "druida", 1) === undefined,
  ""
);
check(
  "PV do druida: base 8, nível 2 CON +2 = 16 (8 + 4 + 2×2)",
  computeMaxHp(system, "druida", 2, { con: 2 }) === 16,
  String(computeMaxHp(system, "druida", 2, { con: 2 }))
);
check(
  "PV do ladino: base 8, nível 1 = 8 + CON (8+2=10, ficha do Kerp)",
  computeMaxHp(system, "ladino", 1, { con: 2 }) === 10,
  String(computeMaxHp(system, "ladino", 1, { con: 2 }))
);
check("ladino sem PM em qualquer nível", computeMaxMp(system, "ladino", 3) === undefined, "");
check("CD de magia druida = 13", getSpellSaveDc(system, makeCharacter({ classId: "druida", attributes: { sab: 3 } })) === 13, "");
check("ataque mágico druida = +5", getSpellAttackBonus(system, makeCharacter({ classId: "druida", attributes: { sab: 3 } })) === 5, "");

check(
  "cenário 5: CA sem equipamento = 10 + DES (10+2=12)",
  computeAc(makeCharacter({
    attributes: { des: 2 },
    inventory: [{ id: "s1", name: "Escudo", acBonus: 2, equipped: false, quantity: 1 }],
  })) === 12,
  ""
);
check(
  "cenário 5: equipar escudo +2 aplica o bônus (10+2+2=14)",
  computeAc(makeCharacter({
    attributes: { des: 2 },
    inventory: [{ id: "s1", name: "Escudo", acBonus: 2, equipped: true, quantity: 1 }],
  })) === 14,
  ""
);
check(
  "cenário 6: desequipar remove o bônus",
  computeAc(makeCharacter({
    attributes: { des: 2 },
    inventory: [
      { id: "s1", name: "Escudo", acBonus: 2, equipped: true, quantity: 1 },
      { id: "s2", name: "Escudo 2", acBonus: 1, equipped: false, quantity: 1 },
    ],
  })) === 14,
  ""
);
check(
  "CA do Kerp: couro equipado +1 e DES +3 = 14",
  computeAc(makeCharacter({
    classId: "ladino",
    attributes: { des: 3 },
    inventory: [{ id: "a1", name: "Armadura de Couro", acBonus: 1, equipped: true, quantity: 1 }],
  })) === 14,
  ""
);

check(
  "deslocamento racial: tiefling = 6 quadrados",
  computeSpeed(system, makeCharacter({ raceId: "tiefling" })) === 6,
  String(computeSpeed(system, makeCharacter({ raceId: "tiefling" })))
);
check(
  "deslocamento racial de todas as raças = 6",
  system.races.every((r) => (r.speed ?? 0) === 6),
  JSON.stringify(system.races.map((r) => [r.id, r.speed]))
);
check(
  "bônus de deslocamento de item equipado é somado (botas +2 = 8)",
  computeSpeed(system, makeCharacter({
    inventory: [{ id: "b1", name: "Botas", speedBonus: 2, equipped: true, quantity: 1 }],
  })) === 8,
  ""
);
check(
  "bônus de deslocamento de item NÃO equipado é ignorado",
  computeSpeed(system, makeCharacter({
    inventory: [{ id: "b1", name: "Botas", speedBonus: 2, equipped: false, quantity: 1 }],
  })) === 6,
  ""
);
check(
  "item sem bônus declarado conta como 0",
  computeSpeed(system, makeCharacter({
    inventory: [{ id: "b2", name: "Mochila", equipped: true, quantity: 1 }],
  })) === 6,
  ""
);

check(
  "cenário 7: teste de resistência com proficiência (CON +0 + prof +2 = +2)",
  getSavingThrowBonus(system, gael, "con") === 2,
  String(getSavingThrowBonus(system, gael, "con"))
);
check(
  "cenário 7: necromante proficiente em CON e CAR",
  getSavingThrowBonus(system, gael, "car") === 3 + 2,
  String(getSavingThrowBonus(system, gael, "car"))
);
check(
  "cenário 8: teste de resistência sem proficiência (FOR +1, sem prof = +1)",
  getSavingThrowBonus(system, gael, "for") === 1,
  String(getSavingThrowBonus(system, gael, "for"))
);
check(
  "cenário 8: ladino proficiente em DES e INT",
  (() => {
    const kerp = makeCharacter({ classId: "ladino", attributes: { des: 3, int: 1, con: 2 } });
    return (
      getSavingThrowBonus(system, kerp, "des") === 3 + 2 &&
      getSavingThrowBonus(system, kerp, "int") === 1 + 2 &&
      getSavingThrowBonus(system, kerp, "con") === 2
    );
  })(),
  ""
);

const shortRest = applyRest(system, makeCharacter({
  level: 2,
  hp: { current: 2, max: 9 },
  mp: { current: 0, max: 3 },
  abilityUses: {
    "toque-da-morte": { current: 0 },
    "forma-selvagem": { current: 0 },
    "magia-ancestral": { current: 0 },
  },
}), "short");
check(
  "descanso curto recupera metade do PV máximo (2+4=6)",
  shortRest.hp.current === 6,
  String(shortRest.hp.current)
);
check(
  "descanso curto recupera metade do PM máximo (0+1=1)",
  shortRest.mp?.current === 1,
  String(shortRest.mp?.current)
);
check("descanso curto recupera 1 uso da Forma Selvagem", shortRest.abilityUses["forma-selvagem"]?.current === 1, "");
check("descanso curto NÃO restaura descanso longo simples", shortRest.abilityUses["toque-da-morte"]?.current === 0, "");

const longRest = applyRest(system, makeCharacter({
  level: 2,
  hp: { current: 2, max: 9 },
  mp: { current: 0, max: 3 },
  abilityUses: { "toque-da-morte": { current: 0 } },
}), "long");
check("descanso longo recupera PV completamente", longRest.hp.current === longRest.hp.max, "");
check("descanso longo recupera PM completamente", longRest.mp?.current === 3, "");
check("descanso longo restaura usos", longRest.abilityUses["toque-da-morte"]?.current === 2, "");

const wrongSystem = importCharacterFromParsed(storedGael, { ...system, id: "outro-sistema" });
check("import com sistema errado falha", !wrongSystem.ok, "");
if (!wrongSystem.ok) {
  check("mensagem cita sistema", wrongSystem.errors[0].includes("outro-sistema"), wrongSystem.errors[0]);
}

const broken = importCharacterFromParsed({ foo: 1 }, system);
check("import de JSON estranho falha", !broken.ok, "");
if (!broken.ok) {
  check("erro menciona schemaVersion", broken.errors.some((e) => e.includes("schemaVersion")), broken.errors.join("; "));
}

const tampered: StoredCharacter = {
  ...storedGael,
  data: { ...storedGael.data, classId: "classe-fantasma" },
};
const ghost = validateCharacterAgainstSystem(tampered, system);
check("classe inexistente é detectada", ghost.length === 1 && ghost[0].includes("classe-fantasma"), ghost.join("; "));

const negativeHp = validateStoredCharacter({
  ...storedGael,
  data: { ...storedGael.data, hp: { current: -1, max: 10 } },
});
check("PV negativo é rejeitado", !negativeHp.ok, "");

check(
  "cenário 10: importação normaliza ficha antiga (necromante nível 2 sem PM recebe PM 3/3 e PV máximo recalculado)",
  (() => {
    const legacy = wrapCharacter(makeCharacter({ id: "legacy", level: 2, hp: { current: 6, max: 6 } }));
    const result = importCharacterFromParsed(JSON.parse(JSON.stringify(legacy)), system);
    if (!result.ok) return false;
    return (
      result.character.data.mp?.current === 3 &&
      result.character.data.mp.max === 3 &&
      result.character.data.hp.max === 9 &&
      result.character.data.hp.current === 6
    );
  })(),
  ""
);

check(
  "cenário 10: importação ignora PV/PM máximos arbitrários e os campos ac/speed antigos",
  (() => {
    const hacked = wrapCharacter(
      makeCharacter({
        id: "hacked",
        level: 2,
        hp: { current: 2, max: 999 },
        mp: { current: 1, max: 999 },
      })
    );
    const withLegacyFields = {
      ...hacked,
      data: { ...hacked.data, ac: 25, speed: 99 } as typeof hacked.data & Record<string, unknown>,
    };
    const result = importCharacterFromParsed(JSON.parse(JSON.stringify(withLegacyFields)), system);
    if (!result.ok) return false;
    const data = result.character.data as Character & Record<string, unknown>;
    return (
      data.hp.max === 9 &&
      data.hp.current === 2 &&
      data.mp?.max === 3 &&
      data.mp.current === 1 &&
      data.ac === undefined &&
      data.speed === undefined
    );
  })(),
  ""
);

check(
  "cenário 10: PV atual acima do máximo recalculado é limitado na importação",
  (() => {
    const overflow = wrapCharacter(makeCharacter({ id: "overflow", level: 1, hp: { current: 50, max: 50 } }));
    const result = importCharacterFromParsed(JSON.parse(JSON.stringify(overflow)), system);
    return result.ok && result.character.data.hp.current === 6 && result.character.data.hp.max === 6;
  })(),
  ""
);

check(
  "seletor de nível: apenas níveis definidos no JSON (necromante → [1, 2], máximo 2)",
  (() => {
    const levels = getDefinedLevels(system, "necromante");
    return (
      levels.length === 2 &&
      levels[0] === 1 &&
      levels[1] === 2 &&
      getMaxDefinedLevel(system, "necromante") === 2
    );
  })(),
  ""
);
check("clampLevel respeita o máximo definido pela classe", clampLevel(5, 2) === 2 && clampLevel(0, 2) === 1, "");

check(
  "comparação de nomes para sobrescrita ignora caixa e espaços",
  sameCharacterName("Gael Arisen", "  gael arisen ") &&
    !sameCharacterName("Gael Arisen", "Kaelest T'nebris"),
  ""
);

check(
  "ficha antiga com 'speed' persistido ainda carrega (compatibilidade)",
  validateStoredCharacter(JSON.parse(JSON.stringify({ ...storedGael, data: { ...storedGael.data, speed: 6, ac: 12 } }))).ok,
  ""
);

function testExportRoundTrip(name: string, original: StoredCharacter) {
  const exportedJson: unknown = JSON.parse(JSON.stringify(original));
  const revalidated = validateStoredCharacter(exportedJson);
  check(`export ${name}: JSON revalida`, revalidated.ok, revalidated.ok ? "" : revalidated.errors.join("; "));
  check(
    `export ${name}: dados preservados integralmente`,
    revalidated.ok && JSON.stringify(revalidated.value.data) === JSON.stringify(original.data),
    ""
  );
  const reimported = importCharacterFromParsed(exportedJson, system);
  check(
    `export ${name}: reimportação aceita e consistente`,
    reimported.ok && JSON.stringify(reimported.character.data) === JSON.stringify(original.data),
    reimported.ok ? "" : reimported.errors.join("; ")
  );
  check(
    `export ${name}: envelope tem schemaVersion/type/systemId`,
    typeof exportedJson === "object" &&
      exportedJson !== null &&
      "schemaVersion" in exportedJson &&
      "type" in exportedJson &&
      "systemId" in exportedJson &&
      (exportedJson as Record<string, unknown>).type === "character",
    ""
  );
}

const complete = normalizeCharacterState(system, makeCharacter({
  id: "completo-test",
  level: 2,
  hp: { current: 5, max: 0 },
  mp: { current: 1, max: 0 },
  skills: [
    { skillId: "prestidigitacao", bonus: 4, expertise: true },
    { skillId: "percepcao", bonus: 2, expertise: false },
  ],
  inventory: [
    { id: "i1", name: "Adaga", damage: "1d4", quantity: 2 },
    { id: "i2", name: "Armadura de Couro", description: "CA +1", acBonus: 1, equipped: true, quantity: 1 },
  ],
  conditions: [
    { id: "cego", name: "Cego" },
    { id: `${CUSTOM_CONDITION_PREFIX}em-chamas-a1b2c3`, name: "Em Chamas" },
  ],
  notes: "Perna esquerda tatuada.",
}));
const storedComplete = wrapCharacter(complete);

testExportRoundTrip("Gael", storedGael);
testExportRoundTrip("ficha completa normalizada", storedComplete);

const corruptedExport = validateStoredCharacter(
  JSON.parse(JSON.stringify({ ...storedComplete, data: { ...storedComplete.data, attributes: { for: "alto" } } }))
);
check("export corrompido (atributo não numérico) é rejeitado", !corruptedExport.ok, "");

check(
  "cenário 9: ficha normalizada sobrevive a serialização (persistência)",
  (() => {
    const serialized = JSON.stringify(storedComplete);
    const parsed = JSON.parse(serialized) as unknown;
    const validated = validateStoredCharacter(parsed);
    if (!validated.ok) return false;
    const renormalized = normalizeCharacterState(system, validated.value.data);
    return (
      renormalized.hp.max === storedComplete.data.hp.max &&
      renormalized.mp?.max === storedComplete.data.mp?.max
    );
  })(),
  ""
);

check(
  "cenário 9: recarregar e renormalizar não altera PV atual",
  (() => {
    const parsed = JSON.parse(JSON.stringify(storedComplete)) as { data: Character };
    const renormalized = normalizeCharacterState(system, parsed.data);
    return renormalized.hp.current === storedComplete.data.hp.current;
  })(),
  ""
);

if (failures.length > 0) {
  throw new Error(`FALHOU (${failures.length}):\n- ${failures.join("\n- ")}`);
}
console.log("Todas as verificações de domínio passaram.");