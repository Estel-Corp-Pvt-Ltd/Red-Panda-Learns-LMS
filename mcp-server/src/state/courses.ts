import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import type { CourseSnapshot, CoursesState } from "./types.js";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

const STATE_PATH = resolve(import.meta.dirname, "../../state/courses.json");

function toISOString(ts: any): string {
  if (!ts) return "";
  if (ts.toDate) return ts.toDate().toISOString();
  if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
  return String(ts);
}

export async function generateCoursesState(): Promise<CoursesState> {
  const snapshot = await db.collection(COLLECTION.COURSES).get();

  const courses: CourseSnapshot[] = snapshot.docs.map((doc) => {
    const d = doc.data();
    const topics = d.topics ?? [];
    const itemCount = topics.reduce(
      (sum: number, t: any) => sum + (t.items?.length ?? 0),
      0
    );

    return {
      id: doc.id,
      title: d.title ?? "",
      slug: d.slug ?? "",
      description: d.description ?? "",
      duration: d.duration ?? { hours: 0, minutes: 0 },
      thumbnail: d.thumbnail,
      regularPrice: d.regularPrice ?? 0,
      salePrice: d.salePrice ?? 0,
      pricingModel: d.pricingModel ?? "",
      categoryIds: d.categoryIds ?? [],
      targetAudienceIds: d.targetAudienceIds ?? [],
      tags: d.tags ?? [],
      instructorId: d.instructorId ?? "",
      instructorName: d.instructorName ?? "",
      status: d.status ?? "",
      mode: d.mode ?? "",
      liveAt: d.liveAt ? toISOString(d.liveAt) : null,
      isEnrollmentPaused: d.isEnrollmentPaused ?? false,
      isCertificateEnabled: d.isCertificateEnabled ?? false,
      isCourseCompletionEnabled: d.isCourseCompletionEnabled ?? false,
      isForumEnabled: d.isForumEnabled ?? false,
      topicCount: topics.length,
      itemCount,
      createdAt: toISOString(d.createdAt),
      updatedAt: toISOString(d.updatedAt),
    };
  });

  const byStatus: Record<string, number> = {};
  const byPricingModel: Record<string, number> = {};
  for (const c of courses) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    byPricingModel[c.pricingModel] = (byPricingModel[c.pricingModel] ?? 0) + 1;
  }

  const state: CoursesState = {
    courses,
    totalCount: courses.length,
    byStatus,
    byPricingModel,
    generatedAt: new Date().toISOString(),
  };

  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  return state;
}
