import pseudoDndJson from "../systems/pseudo-dnd.json";
import {
  validateSystemDefinition,
  validateStoredCharacter,
  validateCharacterAgainstSystem,
} from "../domain/validation";
import {
  getSpellSaveDc,
  getSpellAttackBonus,
  getProficiency,
  getSuggestedHp,
  getSuggestedMp,
  clampHp,
  clampMp,
} from "../rules/derived";
import { applyRest, initializeAbilityUses } from "../rules/rest";
import { importCharacterFromParsed } from "../services/importExport";
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

const gael: Character = {
  id: "gael-test",
  name: "Gael Arisen",
  systemId: "pseudo-dnd",
  raceId: "tiefling",
  classId: "necromante",
  level: 2,
  attributes: { for: 1, des: -1, con: 0, int: 4, sab: 1, car: 3 },
  hp: { current: 10, max: 10 },
  mp: { current: 3, max: 3 },
  speed: 6,
  skills: [
    { skillId: "enganacao", bonus: 2, expertise: false },
    { skillId: "furtividade", bonus: 2, expertise: false },
    { skillId: "religiao", bonus: 2, expertise: false },
    { skillId: "intimidacao", bonus: 2, expertise: false },
  ],
  abilityUses: { "toque-da-morte": { current: 2 } },
  spellIds: ["ilusao-menor", "toque-arrepiante", "infligir-ferimentos", "cegueira-surdez"],
  inventory: [{ id: "i1", name: "Adaga", damage: "1d4", quantity: 1 }],
  conditions: [],
  notes: "Braço direito tatuado",
  updatedAt: new Date().toISOString(),
};
const storedGael = wrapCharacter(gael);

check("ficha de Gael valida", validateStoredCharacter(storedGael).ok, "");
check(
  "ficha de Gael coerente com o sistema",
  validateCharacterAgainstSystem(storedGael, system).length === 0,
  validateCharacterAgainstSystem(storedGael, system).join("; ")
);

check("CD de magia necromante = 14", getSpellSaveDc(system, gael) === 14, String(getSpellSaveDc(system, gael)));
check("ataque mágico necromante = +6", getSpellAttackBonus(system, gael) === 6, String(getSpellAttackBonus(system, gael)));
check("proficiência nível 2 = +2", getProficiency(system, gael) === 2, String(getProficiency(system, gael)));
check("PV sugerido necromante nv2 = 10", getSuggestedHp(system, gael) === 10, String(getSuggestedHp(system, gael)));
check("PM sugerido necromante nv2 = 3", getSuggestedMp(system, gael) === 3, String(getSuggestedMp(system, gael)));

const kaelest: Character = {
  ...gael,
  id: "kaelest-test",
  raceId: "drow",
  classId: "druida",
  attributes: { for: 1, des: 1, con: 2, int: 1, sab: 3, car: 0 },
  mp: undefined,
  spellIds: [],
};
check("CD de magia druida = 13", getSpellSaveDc(system, kaelest) === 13, String(getSpellSaveDc(system, kaelest)));
check("ataque mágico druida = +5", getSpellAttackBonus(system, kaelest) === 5, String(getSpellAttackBonus(system, kaelest)));

const ladino: Character = { ...gael, classId: "ladino", mp: undefined, level: 2 };
check("ladino sem PM", getSuggestedMp(system, ladino) === undefined, "");
check("ladino sem CD de magia", getSpellSaveDc(system, ladino) === null, "");
check("PV sugerido ladino nv2 = 13", getSuggestedHp(system, ladino) === 13, String(getSuggestedHp(system, ladino)));

check("clampHp limita current em max", clampHp({ current: 15, max: 10 }).current === 10, "");
check("clampHp impede negativo", clampHp({ current: -3, max: 10 }).current === 0, "");
check("clampMp limita", clampMp({ current: 9, max: 3 }).current === 3, "");

const uses = initializeAbilityUses(system, gael);
check("toque da morte inicia 2/2", uses["toque-da-morte"]?.current === 2, JSON.stringify(uses));

const spent: Character = {
  ...gael,
  hp: { current: 2, max: 10 },
  abilityUses: {
    "toque-da-morte": { current: 0 },
    "forma-selvagem": { current: 0 },
    "magia-ancestral": { current: 0 },
  },
  mp: { current: 0, max: 3 },
};
const shortRest = applyRest(system, spent, "short");
check(
  "descanso curto recupera 1 uso da Forma Selvagem",
  shortRest.abilityUses["forma-selvagem"]?.current === 1,
  JSON.stringify(shortRest.abilityUses)
);
check(
  "descanso curto restaura habilidade por encontro",
  shortRest.abilityUses["magia-ancestral"]?.current === 1,
  JSON.stringify(shortRest.abilityUses)
);
check(
  "descanso curto NÃO restaura descanso longo simples",
  shortRest.abilityUses["toque-da-morte"]?.current === 0,
  JSON.stringify(shortRest.abilityUses)
);
check(
  "descanso curto recupera metade do máximo de PM",
  shortRest.mp?.current === 1,
  String(shortRest.mp?.current)
);
check(
  "descanso curto recupera metade do máximo de PV",
  shortRest.hp.current === 7,
  String(shortRest.hp.current)
);
check(
  "descanso curto não ultrapassa o máximo de PV",
  shortRest.hp.current <= shortRest.hp.max,
  ""
);

const longRest = applyRest(system, spent, "long");
check("descanso longo restaura usos", longRest.abilityUses["toque-da-morte"]?.current === 2, JSON.stringify(longRest.abilityUses));
check("descanso longo recupera PM completamente", longRest.mp?.current === 3, String(longRest.mp?.current));
check("descanso longo recupera PV completamente", longRest.hp.current === longRest.hp.max, String(longRest.hp.current));

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

const complete: Character = {
  ...gael,
  id: "completo-test",
  ac: 14,
  notes: "Perna esquerda tatuada; tem um anel do artífice.",
  skills: [
    ...gael.skills,
    { skillId: "prestidigitacao", bonus: 4, expertise: true },
    { skillId: "percepcao", bonus: 2, expertise: false },
  ],
  inventory: [
    { id: "i1", name: "Adaga", damage: "1d4", quantity: 2 },
    { id: "i2", name: "Armadura de Couro", description: "CA 12 + DES", quantity: 1 },
  ],
  conditions: [
    { id: "cego", name: "Cego" },
    { id: `${CUSTOM_CONDITION_PREFIX}em-chamas-a1b2c3`, name: "Em Chamas" },
  ],
};
const storedComplete = wrapCharacter(complete);

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
    `export ${name}: reimportação aceita e equivalente`,
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

testExportRoundTrip("Gael", storedGael);
testExportRoundTrip("ficha completa", storedComplete);

const corruptedExport = validateStoredCharacter(
  JSON.parse(JSON.stringify({ ...storedComplete, data: { ...storedComplete.data, attributes: { for: "alto" } } }))
);
check("export corrompido (atributo não numérico) é rejeitado", !corruptedExport.ok, "");

if (failures.length > 0) {
  throw new Error(`FALHOU (${failures.length}):\n- ${failures.join("\n- ")}`);
}
console.log("Todas as verificações de domínio passaram.");