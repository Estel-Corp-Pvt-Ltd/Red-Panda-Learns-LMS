import { createCourse } from "./create_course.js";
import { addTopicToCourse } from "./add_topic_to_course.js";
import { createLesson } from "./create_lesson.js";
import { createAssignment } from "./create_assignment.js";
import { z } from "zod";

const lessonInputSchema = z.object({
  title: z.string(),
  type: z.string().optional().default("VIDEO LECTURE"),
  duration: z.object({
    hours: z.number().optional().default(0),
    minutes: z.number().optional().default(0),
  }).optional(),
  embedUrl: z.string().optional(),
  description: z.string().optional(),
});

const assignmentInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  totalPoints: z.number().optional().default(100),
  deadline: z.string().optional().describe("ISO date string for deadline"),
});

const topicInputSchema = z.object({
  title: z.string(),
  lessons: z.array(lessonInputSchema).optional().default([]),
  assignments: z.array(assignmentInputSchema).optional().default([]),
});

export const scaffoldCourseSchema = {
  title: z.string().describe("Course title"),
  description: z.string().optional().describe("Course description"),
  instructorName: z.string().describe("Instructor full name"),
  instructorId: z.string().describe("Instructor user ID"),
  pricingModel: z.enum(["FREE", "PAID"]).optional().default("FREE"),
  regularPrice: z.number().optional(),
  salePrice: z.number().optional(),
  topics: z.array(topicInputSchema).describe("Array of topics with lessons and assignments"),
};

export async function scaffoldCourse(params: {
  title: string;
  description?: string;
  instructorName: string;
  instructorId: string;
  pricingModel?: "FREE" | "PAID";
  regularPrice?: number;
  salePrice?: number;
  topics: Array<{
    title: string;
    lessons?: Array<{
      title: string;
      type?: string;
      duration?: { hours?: number; minutes?: number };
      embedUrl?: string;
      description?: string;
    }>;
    assignments?: Array<{
      title: string;
      description?: string;
      totalPoints?: number;
      deadline?: string;
    }>;
  }>;
}) {
  const createdItems: {
    courseId: string;
    courseSlug: string;
    topics: Array<{
      topicId: string;
      topicTitle: string;
      lessons: Array<{ lessonId: string; title: string }>;
      assignments: Array<{ assignmentId: string; title: string }>;
    }>;
  } = {
    courseId: "",
    courseSlug: "",
    topics: [],
  };

  // 1. Create the course
  const courseResult = await createCourse({
    title: params.title,
    description: params.description || "",
    instructorName: params.instructorName,
    instructorId: params.instructorId,
    pricingModel: params.pricingModel || "FREE",
    regularPrice: params.regularPrice,
    salePrice: params.salePrice,
  });

  createdItems.courseId = courseResult.courseId;
  createdItems.courseSlug = courseResult.slug;

  // 2. Create topics and their content
  for (const topicInput of params.topics) {
    const topicResult = await addTopicToCourse({
      courseId: createdItems.courseId,
      title: topicInput.title,
    });

    const topicEntry: (typeof createdItems.topics)[number] = {
      topicId: topicResult.topicId,
      topicTitle: topicInput.title,
      lessons: [],
      assignments: [],
    };

    // Create lessons for this topic
    for (const lessonInput of topicInput.lessons || []) {
      const lessonResult = await createLesson({
        courseId: createdItems.courseId,
        topicId: topicResult.topicId,
        title: lessonInput.title,
        type: lessonInput.type || "VIDEO LECTURE",
        durationHours: lessonInput.duration?.hours,
        durationMinutes: lessonInput.duration?.minutes,
        embedUrl: lessonInput.embedUrl,
        description: lessonInput.description,
      });

      topicEntry.lessons.push({
        lessonId: lessonResult.lessonId,
        title: lessonInput.title,
      });
    }

    // Create assignments for this topic
    for (const assignmentInput of topicInput.assignments || []) {
      const assignmentResult = await createAssignment({
        courseId: createdItems.courseId,
        topicId: topicResult.topicId,
        title: assignmentInput.title,
        content: assignmentInput.description,
        totalPoints: assignmentInput.totalPoints,
        deadline: assignmentInput.deadline,
      });

      topicEntry.assignments.push({
        assignmentId: assignmentResult.assignmentId,
        title: assignmentInput.title,
      });
    }

    createdItems.topics.push(topicEntry);
  }

  // Calculate totals
  const totalLessons = createdItems.topics.reduce((sum, t) => sum + t.lessons.length, 0);
  const totalAssignments = createdItems.topics.reduce((sum, t) => sum + t.assignments.length, 0);

  return {
    ...createdItems,
    summary: {
      totalTopics: createdItems.topics.length,
      totalLessons,
      totalAssignments,
    },
    message: `Course "${params.title}" scaffolded with ${createdItems.topics.length} topics, ${totalLessons} lessons, and ${totalAssignments} assignments. Status: DRAFT`,
  };
}
