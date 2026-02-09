import { MeiliSearch } from "meilisearch";

const client = new MeiliSearch({
  host: import.meta.env.VITE_MEILISEARCH_URL,
  apiKey: import.meta.env.VITE_MEILISEARCH_SEARCH_KEY,
});

// Index names (must match functions/src/services/meilisearch.ts)
export const SEARCH_INDEX = {
  COURSES: "Courses",
  BUNDLES: "Bundles",
  USERS: "Users",
  ASSIGNMENTS: "Assignments",
} as const;

export interface SearchOptions {
  limit?: number;
  offset?: number;
  filter?: string;
  sort?: string[];
}

export interface SearchResult<T> {
  hits: T[];
  totalHits: number;
  limit: number;
  offset: number;
  processingTimeMs: number;
}

export const searchService = {
  async search<T extends Record<string, any>>(
    indexName: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult<T>> {
    const { limit = 20, offset = 0, filter, sort } = options;

    const result = await client.index(indexName).search<T>(query, {
      limit,
      offset,
      filter,
      sort,
      attributesToHighlight: ["title", "description"],
    });

    return {
      hits: result.hits,
      totalHits: result.estimatedTotalHits ?? result.hits.length,
      limit,
      offset,
      processingTimeMs: result.processingTimeMs,
    };
  },

  async searchCourses(query: string, options: SearchOptions = {}) {
    return searchService.search(SEARCH_INDEX.COURSES, query, options);
  },

  async searchBundles(query: string, options: SearchOptions = {}) {
    return searchService.search(SEARCH_INDEX.BUNDLES, query, options);
  },

  async searchUsers(query: string, options: SearchOptions = {}) {
    return searchService.search(SEARCH_INDEX.USERS, query, options);
  },

  async searchAssignments(query: string, options: SearchOptions = {}) {
    return searchService.search(SEARCH_INDEX.ASSIGNMENTS, query, options);
  },
};
