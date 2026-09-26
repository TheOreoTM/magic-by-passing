import {
  normalizeConnectionsText,
  validateConnectionsPuzzle,
} from "../domain/puzzle";
import type { ConnectionsPuzzle } from "../domain/types";
import type {
  ConnectionsCatalogCategory,
  ConnectionsGenerationCatalog,
  ConnectionsSpoilerBoundary,
  GeneratedConnectionsCandidate,
} from "./types";

export type ConnectionsGenerationValidationIssue = {
  path: string;
  message: string;
};

export type ConnectionsCategoryMatch = {
  categoryId: string;
  label: string;
  matchingTileIds: string[];
};

export type MaterializedConnectionsCandidate = {
  source: GeneratedConnectionsCandidate;
  puzzle: ConnectionsPuzzle;
  categories: ConnectionsCatalogCategory[];
  spoilerThrough: ConnectionsSpoilerBoundary;
  alternateGroups: ConnectionsCategoryMatch[];
  nearMatches: ConnectionsCategoryMatch[];
};

export type EvaluatedConnectionsCandidate = {
  candidate: GeneratedConnectionsCandidate;
  issues: ConnectionsGenerationValidationIssue[];
  materialized?: MaterializedConnectionsCandidate;
};

function boundaryValue(boundary: ConnectionsSpoilerBoundary): number {
  return boundary.season * 10_000 + boundary.episode;
}

export function isWithinSpoilerBoundary(
  candidate: ConnectionsSpoilerBoundary,
  maximum: ConnectionsSpoilerBoundary,
): boolean {
  return boundaryValue(candidate) <= boundaryValue(maximum);
}

export function eligibleConnectionsCategories(
  catalog: ConnectionsGenerationCatalog,
  maximum: ConnectionsSpoilerBoundary,
): ConnectionsCatalogCategory[] {
  return catalog.categories.filter((category) =>
    isWithinSpoilerBoundary(category.spoilerThrough, maximum),
  );
}

export function validateConnectionsGenerationCatalog(
  catalog: ConnectionsGenerationCatalog,
): ConnectionsGenerationValidationIssue[] {
  const issues: ConnectionsGenerationValidationIssue[] = [];
  const categoryIds = new Set<string>();
  const labels = new Set<string>();
  const knownTiles = new Map<
    string,
    { normalizedText: string; kind: string }
  >();

  if (!Number.isInteger(catalog.version) || catalog.version < 1) {
    issues.push({
      path: "version",
      message: "Catalogue version must be a positive integer.",
    });
  }

  if (catalog.categories.length < 4) {
    issues.push({
      path: "categories",
      message: "At least four categories are required to generate a board.",
    });
  }

  for (const [categoryIndex, category] of catalog.categories.entries()) {
    const path = `categories[${categoryIndex}]`;
    if (!category.id.trim()) {
      issues.push({ path: `${path}.id`, message: "Category ID is required." });
    } else if (categoryIds.has(category.id)) {
      issues.push({
        path: `${path}.id`,
        message: "Category IDs must be unique.",
      });
    }
    categoryIds.add(category.id);

    const normalizedLabel = normalizeConnectionsText(category.label);
    if (!normalizedLabel) {
      issues.push({
        path: `${path}.label`,
        message: "Category label is required.",
      });
    } else if (labels.has(normalizedLabel)) {
      issues.push({
        path: `${path}.label`,
        message: "Category labels must be unique.",
      });
    }
    labels.add(normalizedLabel);

    if (!category.explanation.trim()) {
      issues.push({
        path: `${path}.explanation`,
        message: "Category explanation is required.",
      });
    }
    if (!category.sourceNote.trim()) {
      issues.push({
        path: `${path}.sourceNote`,
        message: "A source note is required for human review.",
      });
    }
    if (
      !Number.isInteger(category.spoilerThrough.season) ||
      category.spoilerThrough.season < 1 ||
      !Number.isInteger(category.spoilerThrough.episode) ||
      category.spoilerThrough.episode < 1
    ) {
      issues.push({
        path: `${path}.spoilerThrough`,
        message:
          "Spoiler boundary must contain positive season and episode numbers.",
      });
    }

    if (category.tiles.length !== 4) {
      issues.push({
        path: `${path}.tiles`,
        message: "Each catalogue category must contain exactly four tiles.",
      });
    }

    const localIds = new Set<string>();
    const localTexts = new Set<string>();
    for (const [tileIndex, tile] of category.tiles.entries()) {
      const tilePath = `${path}.tiles[${tileIndex}]`;
      const normalizedText = normalizeConnectionsText(tile.text);
      if (!tile.id.trim()) {
        issues.push({
          path: `${tilePath}.id`,
          message: "Tile ID is required.",
        });
      } else if (localIds.has(tile.id)) {
        issues.push({
          path: `${tilePath}.id`,
          message: "Tile IDs must be unique within a category.",
        });
      }
      localIds.add(tile.id);

      if (!normalizedText) {
        issues.push({
          path: `${tilePath}.text`,
          message: "Tile text is required.",
        });
      } else if (localTexts.has(normalizedText)) {
        issues.push({
          path: `${tilePath}.text`,
          message: "Tile text must be unique within a category.",
        });
      }
      localTexts.add(normalizedText);

      const known = knownTiles.get(tile.id);
      if (
        known &&
        (known.normalizedText !== normalizedText || known.kind !== tile.kind)
      ) {
        issues.push({
          path: tilePath,
          message: `Tile ${tile.id} must use the same text and kind in every category.`,
        });
      } else {
        knownTiles.set(tile.id, { normalizedText, kind: tile.kind });
      }
    }
  }

  return issues;
}

function maximumBoundary(
  categories: ConnectionsCatalogCategory[],
): ConnectionsSpoilerBoundary {
  return categories.reduce(
    (latest, category) =>
      boundaryValue(category.spoilerThrough) > boundaryValue(latest)
        ? category.spoilerThrough
        : latest,
    { season: 1, episode: 1 },
  );
}

function categoryMatch(
  category: ConnectionsCatalogCategory,
  boardTileIds: Set<string>,
): ConnectionsCategoryMatch {
  return {
    categoryId: category.id,
    label: category.label,
    matchingTileIds: category.tiles
      .map((tile) => tile.id)
      .filter((tileId) => boardTileIds.has(tileId)),
  };
}

export function evaluateGeneratedConnectionsCandidate(
  candidate: GeneratedConnectionsCandidate,
  catalog: ConnectionsGenerationCatalog,
  maximumSpoiler: ConnectionsSpoilerBoundary,
): EvaluatedConnectionsCandidate {
  const issues: ConnectionsGenerationValidationIssue[] = [];
  const eligibleCategories = eligibleConnectionsCategories(
    catalog,
    maximumSpoiler,
  );
  const categoriesById = new Map(
    eligibleCategories.map((category) => [category.id, category]),
  );
  const uniqueCategoryIds = new Set(candidate.categoryIds);

  if (candidate.categoryIds.length !== 4) {
    issues.push({
      path: "categoryIds",
      message: "A generated candidate must select exactly four categories.",
    });
  }
  if (uniqueCategoryIds.size !== candidate.categoryIds.length) {
    issues.push({
      path: "categoryIds",
      message: "A generated candidate cannot repeat a category.",
    });
  }

  const categories = candidate.categoryIds.flatMap((categoryId, index) => {
    const category = categoriesById.get(categoryId);
    if (!category) {
      issues.push({
        path: `categoryIds[${index}]`,
        message: `Category ${categoryId} is missing or outside the spoiler boundary.`,
      });
      return [];
    }
    return [category];
  });

  if (issues.length > 0 || categories.length !== 4) {
    return { candidate, issues };
  }

  const puzzle: ConnectionsPuzzle = {
    id: `generated-${candidate.id}`,
    spoilerNote: `Season ${maximumBoundary(categories).season} through episode ${maximumBoundary(categories).episode}.`,
    groups: categories.map((category, index) => ({
      id: category.id,
      position: index + 1,
      label: category.label,
      explanation: category.explanation,
      tiles: category.tiles.map((tile) => ({ id: tile.id, text: tile.text })),
    })),
  };

  for (const issue of validateConnectionsPuzzle(puzzle)) {
    issues.push({ path: issue.path, message: issue.message });
  }

  const boardTileIds = new Set(
    puzzle.groups.flatMap((group) => group.tiles.map((tile) => tile.id)),
  );
  const selectedCategoryIds = new Set(
    categories.map((category) => category.id),
  );
  const unselectedMatches = eligibleCategories
    .filter((category) => !selectedCategoryIds.has(category.id))
    .map((category) => categoryMatch(category, boardTileIds));
  const alternateGroups = unselectedMatches.filter(
    (match) => match.matchingTileIds.length === 4,
  );
  const nearMatches = unselectedMatches.filter(
    (match) => match.matchingTileIds.length === 3,
  );

  for (const alternate of alternateGroups) {
    issues.push({
      path: "groups",
      message: `The board contains the unintended complete category “${alternate.label}”.`,
    });
  }

  const materialized: MaterializedConnectionsCandidate = {
    source: candidate,
    puzzle,
    categories,
    spoilerThrough: maximumBoundary(categories),
    alternateGroups,
    nearMatches,
  };

  return { candidate, issues, materialized };
}
