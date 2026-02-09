import { MeiliSearch } from "meilisearch";
import { defineSecret } from "firebase-functions/params";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { COLLECTION } from "../constants";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Secrets from Firebase Secret Manager
export const MEILISEARCH_URL = defineSecret("MEILISEARCH_URL");
export const MEILI_MASTER_KEY = defineSecret("MEILI_MASTER_KEY");

// Meilisearch client (lazy-initialized per invocation)
let client: MeiliSearch | null = null;

const getClient = (): MeiliSearch => {
  if (!client) {
    const host = process.env?.MEILISEARCH_URL || MEILISEARCH_URL.value();
    const apiKey = process.env?.MEILI_MASTER_KEY || MEILI_MASTER_KEY.value();

    if (!host || !apiKey) {
      throw new Error("MEILISEARCH_URL and MEILI_MASTER_KEY secrets are required");
    }

    client = new MeiliSearch({ host, apiKey });
  }
  return client;
};

// Index names
const INDEX = {
  COURSES: "Courses",
  BUNDLES: "Bundles",
  USERS: "Users",
  ASSIGNMENTS: "Assignments",
} as const;

// --- Index configuration ---

const configureIndexes = async () => {
  const meili = getClient();

  // Courses index
  const coursesIndex = meili.index(INDEX.COURSES);
  await coursesIndex.updateSettings({
    searchableAttributes: [
      "title",
      "description",
      "instructorName",
      "tags",
    ],
    filterableAttributes: [
      "status",
      "pricingModel",
      "categoryIds",
      "targetAudienceIds",
      "instructorId",
    ],
    sortableAttributes: [
      "title",
      "regularPrice",
      "salePrice",
      "createdAt",
    ],
    rankingRules: [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
    ],
  });

  // Bundles index
  const bundlesIndex = meili.index(INDEX.BUNDLES);
  await bundlesIndex.updateSettings({
    searchableAttributes: [
      "title",
      "description",
      "instructorName",
      "tags",
      "courseNames",
    ],
    filterableAttributes: [
      "status",
      "pricingModel",
      "categoryIds",
      "targetAudienceIds",
      "instructorId",
    ],
    sortableAttributes: [
      "title",
      "regularPrice",
      "salePrice",
      "createdAt",
    ],
    rankingRules: [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
    ],
  });

  // Users index
  const usersIndex = meili.index(INDEX.USERS);
  await usersIndex.updateSettings({
    searchableAttributes: [
      "firstName",
      "lastName",
      "email",
      "username",
    ],
    filterableAttributes: [
      "role",
      "status",
      "organizationId",
    ],
    sortableAttributes: [
      "firstName",
      "lastName",
      "createdAt",
    ],
    rankingRules: [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
    ],
  });

  // Assignments index
  const assignmentsIndex = meili.index(INDEX.ASSIGNMENTS);
  await assignmentsIndex.updateSettings({
    searchableAttributes: [
      "title",
      "content",
    ],
    filterableAttributes: [
      "courseId",
      "authorId",
    ],
    sortableAttributes: [
      "title",
      "deadline",
      "createdAt",
    ],
    rankingRules: [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
    ],
  });

  return { coursesIndex, bundlesIndex, usersIndex, assignmentsIndex };
};

// --- Document transformers ---

const toCourseDocument = (id: string, data: Record<string, any>) => ({
  id,
  title: data.title || "",
  slug: data.slug || "",
  description: data.description || "",
  thumbnail: data.thumbnail || "",
  regularPrice: data.regularPrice || 0,
  salePrice: data.salePrice || 0,
  pricingModel: data.pricingModel || "",
  categoryIds: data.categoryIds || [],
  targetAudienceIds: data.targetAudienceIds || [],
  tags: data.tags || [],
  instructorId: data.instructorId || "",
  instructorName: data.instructorName || "",
  status: data.status || "",
  createdAt: data.createdAt?.toMillis?.() || 0,
});

const toBundleDocument = (id: string, data: Record<string, any>) => ({
  id,
  title: data.title || "",
  slug: data.slug || "",
  description: data.description || "",
  thumbnail: data.thumbnail || "",
  regularPrice: data.regularPrice || 0,
  salePrice: data.salePrice || 0,
  pricingModel: data.pricingModel || "",
  categoryIds: data.categoryIds || [],
  targetAudienceIds: data.targetAudienceIds || [],
  tags: data.tags || [],
  instructorId: data.instructorId || "",
  instructorName: data.instructorName || "",
  courseNames: (data.courses || []).map((c: any) => c.title),
  status: data.status || "",
  createdAt: data.createdAt?.toMillis?.() || 0,
});

const toUserDocument = (id: string, data: Record<string, any>) => ({
  id,
  firstName: data.firstName || "",
  lastName: data.lastName || "",
  email: data.email || "",
  username: data.username || "",
  role: data.role || "",
  status: data.status || "",
  organizationId: data.organizationId || "",
  photoURL: data.photoURL || "",
  createdAt: data.createdAt?.toMillis?.() || 0,
});

const toAssignmentDocument = (id: string, data: Record<string, any>) => ({
  id,
  title: data.title || "",
  content: data.content || "",
  courseId: data.courseId || "",
  authorId: data.authorId || "",
  totalPoints: data.totalPoints || 0,
  minimumPassPoint: data.minimumPassPoint || 0,
  deadline: data.deadline?.toMillis?.() || 0,
  createdAt: data.createdAt?.toMillis?.() || 0,
});

// --- Sync functions (for Firestore triggers) ---

const syncCourse = async (courseId: string, data: Record<string, any> | undefined) => {
  const meili = getClient();
  const index = meili.index(INDEX.COURSES);

  if (!data) {
    await index.deleteDocument(courseId);
    functions.logger.info(`Meilisearch: deleted course ${courseId}`);
    return;
  }

  await index.addDocuments([toCourseDocument(courseId, data)], { primaryKey: "id" });
  functions.logger.info(`Meilisearch: synced course ${courseId}`);
};

const syncBundle = async (bundleId: string, data: Record<string, any> | undefined) => {
  const meili = getClient();
  const index = meili.index(INDEX.BUNDLES);

  if (!data) {
    await index.deleteDocument(bundleId);
    functions.logger.info(`Meilisearch: deleted bundle ${bundleId}`);
    return;
  }

  await index.addDocuments([toBundleDocument(bundleId, data)], { primaryKey: "id" });
  functions.logger.info(`Meilisearch: synced bundle ${bundleId}`);
};

const syncUser = async (userId: string, data: Record<string, any> | undefined) => {
  const meili = getClient();
  const index = meili.index(INDEX.USERS);

  if (!data) {
    await index.deleteDocument(userId);
    functions.logger.info(`Meilisearch: deleted user ${userId}`);
    return;
  }

  await index.addDocuments([toUserDocument(userId, data)], { primaryKey: "id" });
  functions.logger.info(`Meilisearch: synced user ${userId}`);
};

const syncAssignment = async (assignmentId: string, data: Record<string, any> | undefined) => {
  const meili = getClient();
  const index = meili.index(INDEX.ASSIGNMENTS);

  if (!data) {
    await index.deleteDocument(assignmentId);
    functions.logger.info(`Meilisearch: deleted assignment ${assignmentId}`);
    return;
  }

  await index.addDocuments([toAssignmentDocument(assignmentId, data)], { primaryKey: "id" });
  functions.logger.info(`Meilisearch: synced assignment ${assignmentId}`);
};

// --- Full reindex (one-time / manual) ---

const reindexAllCourses = async () => {
  const meili = getClient();
  const index = meili.index(INDEX.COURSES);

  const snapshot = await db.collection(COLLECTION.COURSES).get();
  const documents = snapshot.docs.map((doc) => toCourseDocument(doc.id, doc.data()));

  await index.addDocuments(documents, { primaryKey: "id" });
  functions.logger.info(`Meilisearch: reindexed ${documents.length} courses`);
  return documents.length;
};

const reindexAllBundles = async () => {
  const meili = getClient();
  const index = meili.index(INDEX.BUNDLES);

  const snapshot = await db.collection(COLLECTION.BUNDLES).get();
  const documents = snapshot.docs.map((doc) => toBundleDocument(doc.id, doc.data()));

  await index.addDocuments(documents, { primaryKey: "id" });
  functions.logger.info(`Meilisearch: reindexed ${documents.length} bundles`);
  return documents.length;
};

const reindexAllUsers = async () => {
  const meili = getClient();
  const index = meili.index(INDEX.USERS);

  const snapshot = await db.collection(COLLECTION.USERS).get();
  const documents = snapshot.docs.map((doc) => toUserDocument(doc.id, doc.data()));

  await index.addDocuments(documents, { primaryKey: "id" });
  functions.logger.info(`Meilisearch: reindexed ${documents.length} users`);
  return documents.length;
};

const reindexAllAssignments = async () => {
  const meili = getClient();
  const index = meili.index(INDEX.ASSIGNMENTS);

  const snapshot = await db.collection(COLLECTION.ASSIGNMENTS).get();
  const documents = snapshot.docs.map((doc) => toAssignmentDocument(doc.id, doc.data()));

  await index.addDocuments(documents, { primaryKey: "id" });
  functions.logger.info(`Meilisearch: reindexed ${documents.length} assignments`);
  return documents.length;
};

export const meilisearchService = {
  getClient,
  configureIndexes,
  syncCourse,
  syncBundle,
  syncUser,
  syncAssignment,
  reindexAllCourses,
  reindexAllBundles,
  reindexAllUsers,
  reindexAllAssignments,
  INDEX,
};
