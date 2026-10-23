import { readArchivedBytes } from "./archivedEvidence";
import type { ArchivedEvidence } from "./archivedEvidence";

// Vite serves a separate, hashed asset. It is never imported as precomputed UI results.
export const ARCHIVE_ASSET_URL = new URL(
  "../assets/archived-edirne.snapshot.json",
  import.meta.url,
).href;
let prepared: Promise<ArchivedEvidence> | null = null;

/** Deferred local-asset warmup enables offline use later in this open page, with no weather API. */
export function prepareArchivedEvidence(): Promise<ArchivedEvidence> {
  if (prepared) return prepared;
  prepared = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(ARCHIVE_ASSET_URL, {
        signal: controller.signal,
        credentials: "omit",
      });
      if (!response.ok)
        throw new Error(
          `Local archived evidence could not be loaded (HTTP ${response.status}).`,
        );
      return await readArchivedBytes(
        new Uint8Array(await response.arrayBuffer()),
      );
    } catch (error) {
      prepared = null;
      throw new Error(
        `Archived example unavailable: ${error instanceof Error ? error.message : "local asset could not be read"} Restore access to local application assets and retry manually.`,
        { cause: error },
      );
    } finally {
      clearTimeout(timer);
    }
  })();
  return prepared;
}
