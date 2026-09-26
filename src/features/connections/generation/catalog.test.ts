import { describe, expect, it } from "vitest";

import { connectionsGenerationCatalog } from "./catalog";
import { validateConnectionsGenerationCatalog } from "./validation";

describe("Connections generation catalogue", () => {
  it("contains only structurally valid curated categories", () => {
    expect(
      validateConnectionsGenerationCatalog(connectionsGenerationCatalog),
    ).toEqual([]);
  });
});
