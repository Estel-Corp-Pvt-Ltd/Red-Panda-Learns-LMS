/**
 * CLI script to configure and reindex Meilisearch indexes.
 *
 * Usage:
 *   cd functions
 *   npm run build
 *   node lib/cli/meilisearch-reindex.js [options]
 *
 * Options:
 *   --all                Reindex all indexes (default if no flags)
 *   --courses            Reindex courses only
 *   --bundles            Reindex bundles only
 *   --users              Reindex users only
 *   --assignments        Reindex assignments only
 *   --configure-only     Only configure index settings, skip reindexing
 *
 * Environment variables (required):
 *   MEILISEARCH_URL      Meilisearch host URL (e.g. http://localhost:7700)
 *   MEILI_MASTER_KEY     Meilisearch master key
 *   GOOGLE_APPLICATION_CREDENTIALS  Path to Firebase service account JSON
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin before importing meilisearch service
if (!admin.apps.length) {
  admin.initializeApp();
}

import { meilisearchService } from "../services/meilisearch";

const args = process.argv.slice(2);

const flag = (name: string) => args.includes(`--${name}`);

const shouldCourses = flag("courses") || flag("all");
const shouldBundles = flag("bundles") || flag("all");
const shouldUsers = flag("users") || flag("all");
const shouldAssignments = flag("assignments") || flag("all");
const configureOnly = flag("configure-only");
const noFlagsProvided = !shouldCourses && !shouldBundles && !shouldUsers && !shouldAssignments && !configureOnly;

// If no flags at all, reindex everything
const reindexAll = noFlagsProvided;

async function main() {
  console.log("Meilisearch Reindex CLI");
  console.log("======================\n");

  // Validate env
  if (!process.env.MEILISEARCH_URL || !process.env.MEILI_MASTER_KEY) {
    console.error("Error: MEILISEARCH_URL and MEILI_MASTER_KEY environment variables are required.");
    console.error("\nExample:");
    console.error("  MEILISEARCH_URL=http://localhost:7700 MEILI_MASTER_KEY=your-key node lib/cli/meilisearch-reindex.js");
    process.exit(1);
  }

  // Step 1: Configure indexes
  console.log("Configuring index settings...");
  await meilisearchService.configureIndexes();
  console.log("Index settings configured.\n");

  if (configureOnly) {
    console.log("Done (configure-only mode).");
    process.exit(0);
  }

  // Step 2: Reindex
  const results: Record<string, number> = {};

  if (reindexAll || shouldCourses) {
    process.stdout.write("Reindexing courses... ");
    results.courses = await meilisearchService.reindexAllCourses();
    console.log(`${results.courses} documents`);
  }

  if (reindexAll || shouldBundles) {
    process.stdout.write("Reindexing bundles... ");
    results.bundles = await meilisearchService.reindexAllBundles();
    console.log(`${results.bundles} documents`);
  }

  if (reindexAll || shouldUsers) {
    process.stdout.write("Reindexing users... ");
    results.users = await meilisearchService.reindexAllUsers();
    console.log(`${results.users} documents`);
  }

  if (reindexAll || shouldAssignments) {
    process.stdout.write("Reindexing assignments... ");
    results.assignments = await meilisearchService.reindexAllAssignments();
    console.log(`${results.assignments} documents`);
  }

  console.log("\nDone!");
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error("Reindex failed:", err);
  process.exit(1);
});
