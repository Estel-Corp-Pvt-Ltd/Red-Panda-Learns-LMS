import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";

export const getAnnouncementsSchema = {
  scope: z.enum(["GLOBAL", "COURSE", "ORGANIZATION"]).optional().describe("Filter by scope"),
  courseId: z.string().optional().describe("Filter by course ID"),
  organizationId: z.string().optional().describe("Filter by organization ID"),
  status: z.enum(["PUBLISHED", "DRAFT"]).optional().describe("Filter by status"),
  limit: z.number().optional().default(50).describe("Maximum number of results (default 50)"),
};

export async function getAnnouncements(params: {
  scope?: string;
  courseId?: string;
  organizationId?: string;
  status?: string;
  limit?: number;
}) {
  let query: FirebaseFirestore.Query = db.collection(COLLECTION.ANNOUNCEMENTS);

  if (params.scope) {
    query = query.where("scope", "==", params.scope);
  }
  if (params.courseId) {
    query = query.where("courseId", "==", params.courseId);
  }
  if (params.organizationId) {
    query = query.where("organizationId", "==", params.organizationId);
  }
  if (params.status) {
    query = query.where("status", "==", params.status);
  }

  query = query.limit(params.limit ?? 50);

  const snapshot = await query.get();
  const announcements = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      body: data.body,
      scope: data.scope,
      courseId: data.courseId ?? null,
      organizationId: data.organizationId ?? null,
      status: data.status,
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
    };
  });

  return { announcements, count: announcements.length };
}
