import type {
  ConnectionsCatalogCategory,
  ConnectionsCatalogTile,
  ConnectionsCatalogTileKind,
  ConnectionsGenerationCatalog,
} from "./types";

function tile(
  id: string,
  text: string,
  kind: ConnectionsCatalogTileKind,
): ConnectionsCatalogTile {
  return { id, text, kind };
}

function category(
  id: string,
  label: string,
  explanation: string,
  spoilerEpisode: number,
  sourceNote: string,
  tags: string[],
  tiles: ConnectionsCatalogTile[],
): ConnectionsCatalogCategory {
  return {
    id,
    label,
    explanation,
    spoilerThrough: { season: 1, episode: spoilerEpisode },
    sourceNote,
    tags,
    tiles,
  };
}

/**
 * A deliberately small, reviewed starting catalogue. Categories are exact
 * four-tile facts so generated boards cannot invent lore. Human canon and
 * localization review is still required before a generated draft is approved.
 */
export const connectionsGenerationCatalog: ConnectionsGenerationCatalog = {
  version: 1,
  categories: [
    category(
      "hero-party",
      "The Hero Party",
      "The four adventurers who defeated the Demon King.",
      1,
      "Season 1, episode 1 introduces the returning Hero Party.",
      ["characters", "party", "history"],
      [
        tile("frieren", "Frieren", "CHARACTER"),
        tile("himmel", "Himmel", "CHARACTER"),
        tile("heiter", "Heiter", "CHARACTER"),
        tile("eisen", "Eisen", "CHARACTER"),
      ],
    ),
    category(
      "aura-forces",
      "Aura's forces in Graf Granat's Domain",
      "The demons involved in the conflict around Graf Granat's Domain.",
      10,
      "Season 1, episodes 8–10 cover Aura and her three envoys.",
      ["characters", "demons", "conflict"],
      [
        tile("aura", "Aura", "CHARACTER"),
        tile("lugner", "Lügner", "CHARACTER"),
        tile("linie", "Linie", "CHARACTER"),
        tile("draht", "Draht", "CHARACTER"),
      ],
    ),
    category(
      "exam-final-passers",
      "Pass Serie's final test",
      "Four candidates who become first-class mages after Serie's interviews.",
      28,
      "Season 1, episodes 27–28 reveal the final-test results.",
      ["characters", "mages", "exam"],
      [
        tile("fern", "Fern", "CHARACTER"),
        tile("denken", "Denken", "CHARACTER"),
        tile("wirbel", "Wirbel", "CHARACTER"),
        tile("ubel", "Übel", "CHARACTER"),
      ],
    ),
    category(
      "exam-officials",
      "Association mages involved in running the exam",
      "The first-test proctor, second-test proctor, final examiner, and a senior observer.",
      28,
      "Season 1, episodes 18–28 show the exam administration.",
      ["characters", "mages", "exam"],
      [
        tile("genau", "Genau", "CHARACTER"),
        tile("sense", "Sense", "CHARACTER"),
        tile("serie", "Serie", "CHARACTER"),
        tile("lernen", "Lernen", "CHARACTER"),
      ],
    ),
    category(
      "german-verbs",
      "Character names that are German infinitive verbs",
      "Their names can mean “to freeze,” “to think,” “to learn,” and “to run.”",
      18,
      "Language category; requires native-speaker and localization review.",
      ["characters", "german", "wordplay"],
      [
        tile("frieren", "Frieren", "CHARACTER"),
        tile("denken", "Denken", "CHARACTER"),
        tile("lernen", "Lernen", "CHARACTER"),
        tile("laufen", "Laufen", "CHARACTER"),
      ],
    ),
    category(
      "german-adjectives",
      "Character names used as German adjectives or adverbs",
      "Their names can mean roughly “distant,” “strong,” “exact,” and “bad/ill.”",
      18,
      "Language category; requires native-speaker and localization review.",
      ["characters", "german", "wordplay"],
      [
        tile("fern", "Fern", "CHARACTER"),
        tile("stark", "Stark", "CHARACTER"),
        tile("genau", "Genau", "CHARACTER"),
        tile("ubel", "Übel", "CHARACTER"),
      ],
    ),
    category(
      "german-nature-material-nouns",
      "Character names that are German nature or material nouns",
      "Their names can mean “sky/heaven,” “flame,” “avalanche,” and “iron.”",
      18,
      "Language category; requires native-speaker and localization review.",
      ["characters", "german", "wordplay"],
      [
        tile("himmel", "Himmel", "CHARACTER"),
        tile("flamme", "Flamme", "CHARACTER"),
        tile("lawine", "Lawine", "CHARACTER"),
        tile("eisen", "Eisen", "CHARACTER"),
      ],
    ),
    category(
      "german-common-nouns",
      "Character names that are common German nouns",
      "Their names can mean “jug,” “land/country,” “line,” and “wire.”",
      18,
      "Language category; requires native-speaker and localization review.",
      ["characters", "german", "wordplay"],
      [
        tile("kanne", "Kanne", "CHARACTER"),
        tile("land", "Land", "CHARACTER"),
        tile("linie", "Linie", "CHARACTER"),
        tile("draht", "Draht", "CHARACTER"),
      ],
    ),
    category(
      "folk-magic-effects",
      "Small folk-magic effects",
      "Mundane magic of the sort Frieren enjoys collecting.",
      11,
      "Season 1 shows or mentions these folk-magic effects by episode 11.",
      ["magic", "folk-magic", "daily-life"],
      [
        tile("magic-warm-tea", "Warm tea", "MAGIC"),
        tile("magic-sour-grapes", "Sour grapes", "MAGIC"),
        tile("magic-shaved-ice", "Shaved ice", "MAGIC"),
        tile("magic-bronze-derusting", "Bronze de-rusting", "MAGIC"),
      ],
    ),
    category(
      "exam-signature-magic",
      "Signature magic seen during the first-class exam",
      "Magic associated with Kanne, Lawine, Richter, and Scharf.",
      22,
      "Season 1, episodes 18–22 establish these candidates' signature magic.",
      ["magic", "mages", "exam"],
      [
        tile("magic-water", "Water manipulation", "MAGIC"),
        tile("magic-ice", "Ice manipulation", "MAGIC"),
        tile("magic-earth", "Earth manipulation", "MAGIC"),
        tile("magic-steel-petals", "Steel flower petals", "MAGIC"),
      ],
    ),
    category(
      "demon-magic",
      "Magic introduced through demons",
      "Magic associated with Qual, Lügner, Linie, and Aura.",
      10,
      "Season 1, episodes 3 and 8–10 introduce these forms of magic.",
      ["magic", "demons", "combat"],
      [
        tile("magic-zoltraak", "Zoltraak", "MAGIC"),
        tile("magic-blood", "Blood manipulation", "MAGIC"),
        tile("magic-wire", "Magic wire", "MAGIC"),
        tile("magic-auserlese", "Auserlese", "MAGIC"),
      ],
    ),
    category(
      "second-exam-dungeon",
      "Elements of the second exam dungeon",
      "The source of the replicas and threats or safeguards found in the King's Tomb.",
      25,
      "Season 1, episodes 23–25 cover the second exam dungeon.",
      ["exam", "dungeon", "creatures"],
      [
        tile("spiegel", "Spiegel", "CREATURE"),
        tile("replicas", "Replicas", "CREATURE"),
        tile("emergency-golems", "Emergency golems", "CREATURE"),
        tile("gargoyles", "Gargoyles", "CREATURE"),
      ],
    ),
    category(
      "important-objects",
      "Important carried or sought objects",
      "Objects that drive a journey, promise, or memory.",
      14,
      "Season 1 introduces all four objects by episode 14.",
      ["objects", "journey", "memories"],
      [
        tile("flamme-grimoire", "Flamme's grimoire", "OBJECT"),
        tile("hero-sword", "Hero's Sword", "OBJECT"),
        tile("shadow-dragon-horn", "Shadow Dragon Horn", "OBJECT"),
        tile("mirrored-lotus-ring", "Mirrored Lotus ring", "OBJECT"),
      ],
    ),
    category(
      "notable-creatures",
      "Creatures encountered by the party or exam candidates",
      "A bird, dungeon monster, phantom monster, and dragon.",
      19,
      "Season 1 introduces all four creatures by episode 19.",
      ["creatures", "journey", "exam"],
      [
        tile("stille", "Stille", "CREATURE"),
        tile("mimic", "Mimic", "CREATURE"),
        tile("einsam", "Einsam", "CREATURE"),
        tile("solar-dragon", "Solar dragon", "CREATURE"),
      ],
    ),
    category(
      "northern-destinations",
      "Northern destinations or sites",
      "Places tied to the journey north or the first-class exam.",
      23,
      "Season 1 introduces all four destinations by episode 23.",
      ["places", "journey", "exam"],
      [
        tile("aureole", "Aureole", "PLACE"),
        tile("ende", "Ende", "PLACE"),
        tile("ausserst", "Äußerst", "PLACE"),
        tile("kings-tomb", "Ruins of the King's Tomb", "PLACE"),
      ],
    ),
    category(
      "food-and-drink",
      "Food and drink",
      "Memorable things eaten, drunk, or discussed during the journey.",
      12,
      "Season 1 shows or discusses these foods by episode 12.",
      ["food", "daily-life", "journey"],
      [
        tile("tea", "Tea", "FOOD"),
        tile("sour-grapes", "Sour grapes", "FOOD"),
        tile("hamburg-steak", "Hamburg steak", "FOOD"),
        tile("jumbo-berry-special", "Jumbo berry special", "FOOD"),
      ],
    ),
  ],
};
