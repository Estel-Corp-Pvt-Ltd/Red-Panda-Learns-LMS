#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// ── Existing tool imports ──────────────────────────────────
import { getUsers, getUsersSchema } from "./tools/get_users.js";
import { getCourses, getCoursesSchema } from "./tools/get_courses.js";
import { getEnrollments, getEnrollmentsSchema } from "./tools/get_enrollments.js";
import { getOrders, getOrdersSchema } from "./tools/get_orders.js";
import { searchUsers, searchUsersSchema } from "./tools/search_users.js";
import { searchCourses, searchCoursesSchema } from "./tools/search_courses.js";
import { createCourse, createCourseSchema } from "./tools/create_course.js";
import { updateCourse, updateCourseSchema } from "./tools/update_course.js";
import { publishCourse, publishCourseSchema } from "./tools/publish_course.js";
import { addTopicToCourse, addTopicToCourseSchema } from "./tools/add_topic_to_course.js";
import { createLesson, createLessonSchema } from "./tools/create_lesson.js";
import { updateLesson, updateLessonSchema } from "./tools/update_lesson.js";
import { deleteLesson, deleteLessonSchema } from "./tools/delete_lesson.js";
import { createAssignment, createAssignmentSchema } from "./tools/create_assignment.js";
import { createQuiz, createQuizSchema } from "./tools/create_quiz.js";
import { enrollStudent, enrollStudentSchema } from "./tools/enroll_student.js";
import { bulkEnrollStudents, bulkEnrollStudentsSchema } from "./tools/bulk_enroll_students.js";
import { getCourseCurriculum, getCourseCurriculumSchema } from "./tools/get_course_curriculum.js";
import { getSubmissions, getSubmissionsSchema } from "./tools/get_submissions.js";
import { gradeSubmission, gradeSubmissionSchema } from "./tools/grade_submission.js";
import { getQuizSubmissions, getQuizSubmissionsSchema } from "./tools/get_quiz_submissions.js";
import { scaffoldCourse, scaffoldCourseSchema } from "./tools/scaffold_course.js";
import { dropEnrollment, dropEnrollmentSchema } from "./tools/drop_enrollment.js";
import { duplicateCourse, duplicateCourseSchema } from "./tools/duplicate_course.js";
import { reorderTopics, reorderTopicsSchema } from "./tools/reorder_topics.js";
// ── New tool imports ───────────────────────────────────────
import { createUser, createUserSchema } from "./tools/create_user.js";
import { updateUser, updateUserSchema } from "./tools/update_user.js";
import { deleteUser, deleteUserSchema } from "./tools/delete_user.js";
import { createCoupon, createCouponSchema } from "./tools/create_coupon.js";
import { getCoupons, getCouponsSchema } from "./tools/get_coupons.js";
import { updateCoupon, updateCouponSchema } from "./tools/update_coupon.js";
import { deleteCoupon, deleteCouponSchema } from "./tools/delete_coupon.js";
import { createBundle, createBundleSchema } from "./tools/create_bundle.js";
import { getBundles, getBundlesSchema } from "./tools/get_bundles.js";
import { updateBundle, updateBundleSchema } from "./tools/update_bundle.js";
import { deleteBundle, deleteBundleSchema } from "./tools/delete_bundle.js";
import { createAnnouncement, createAnnouncementSchema } from "./tools/create_announcement.js";
import { getAnnouncements, getAnnouncementsSchema } from "./tools/get_announcements.js";
import { updateAnnouncement, updateAnnouncementSchema } from "./tools/update_announcement.js";
import { deleteAnnouncement, deleteAnnouncementSchema } from "./tools/delete_announcement.js";
import { createBanner, createBannerSchema } from "./tools/create_banner.js";
import { getBanners, getBannersSchema } from "./tools/get_banners.js";
import { updateBanner, updateBannerSchema } from "./tools/update_banner.js";
import { deleteBanner, deleteBannerSchema } from "./tools/delete_banner.js";
import { createForumChannel, createForumChannelSchema } from "./tools/create_forum_channel.js";
import { getForumChannels, getForumChannelsSchema } from "./tools/get_forum_channels.js";
import { createForumMessage, createForumMessageSchema } from "./tools/create_forum_message.js";
import { getForumMessages, getForumMessagesSchema } from "./tools/get_forum_messages.js";
import { getLearningProgress, getLearningProgressSchema } from "./tools/get_learning_progress.js";
import { getPlatformStats, getPlatformStatsSchema } from "./tools/get_platform_stats.js";
// ── State management ───────────────────────────────────────
import { refreshAllState, refreshCoursesState, refreshEnrollmentsState, refreshUsersState } from "./state/index.js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
const server = new McpServer({
    name: "vizuara-mcp",
    version: "2.0.0",
});
// ── Helper: standard tool wrapper ──────────────────────────
function registerTool(name, description, schema, handler, afterHook) {
    server.tool(name, description, schema, async (params) => {
        try {
            const result = await handler(params);
            afterHook?.();
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
        catch (error) {
            return { content: [{ type: "text", text: JSON.stringify({ error: error.message }) }], isError: true };
        }
    });
}
// ── Health Check ────────────────────────────────────────────
server.tool("ping", "Health check - returns pong", {}, async () => ({
    content: [{ type: "text", text: JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }) }],
}));
// ══════════════════════════════════════════════════════════════
// QUERY / READ TOOLS
// ══════════════════════════════════════════════════════════════
registerTool("get_users", "Get users from Firestore with optional filtering by role, status, or email", getUsersSchema, getUsers);
registerTool("get_courses", "Get courses from Firestore with optional filtering by status, instructor, or pricing model", getCoursesSchema, getCourses);
registerTool("get_enrollments", "Get enrollments from Firestore with optional filtering by userId, courseId, or status", getEnrollmentsSchema, getEnrollments);
registerTool("get_orders", "Get orders from Firestore with optional filtering by userId or status", getOrdersSchema, getOrders);
registerTool("search_users", "Search users by email, first name, or last name", searchUsersSchema, searchUsers);
registerTool("search_courses", "Search courses by title, description, or tags", searchCoursesSchema, searchCourses);
registerTool("get_course_curriculum", "Get full course curriculum structure with topics, lessons (with type, duration), and assignments (with points, deadlines).", getCourseCurriculumSchema, getCourseCurriculum);
registerTool("get_submissions", "Get assignment submissions with optional filtering by assignmentId, studentId, courseId, or ungraded only.", getSubmissionsSchema, getSubmissions);
registerTool("get_quiz_submissions", "Get quiz submissions for a quiz with scores, pass/fail status, and summary statistics.", getQuizSubmissionsSchema, getQuizSubmissions);
registerTool("get_coupons", "Get coupons from Firestore with optional filtering by status or code.", getCouponsSchema, getCoupons);
registerTool("get_bundles", "Get course bundles from Firestore with optional filtering by status or pricing model.", getBundlesSchema, getBundles);
registerTool("get_announcements", "Get announcements with optional filtering by scope, courseId, organizationId, or status.", getAnnouncementsSchema, getAnnouncements);
registerTool("get_banners", "Get banners with optional filtering by status.", getBannersSchema, getBanners);
registerTool("get_forum_channels", "Get forum channels for a course.", getForumChannelsSchema, getForumChannels);
registerTool("get_forum_messages", "Get messages from a forum channel with optional status filtering.", getForumMessagesSchema, getForumMessages);
registerTool("get_learning_progress", "Get student learning progress with optional filtering by userId or courseId.", getLearningProgressSchema, getLearningProgress);
registerTool("get_platform_stats", "Get comprehensive platform statistics including user, course, enrollment, and order counts with breakdowns.", getPlatformStatsSchema, getPlatformStats);
// ══════════════════════════════════════════════════════════════
// COURSE MANAGEMENT
// ══════════════════════════════════════════════════════════════
const refreshCourses = () => { refreshCoursesState().catch(() => { }); };
registerTool("create_course", "Create a new draft course in Firestore with title, description, pricing, and instructor info. Returns the generated courseId and slug.", createCourseSchema, createCourse, refreshCourses);
registerTool("update_course", "Update any course fields by courseId. Supports title, description, slug, prices, status, tags, mode, certificate settings, and all toggles.", updateCourseSchema, updateCourse, refreshCourses);
registerTool("publish_course", "Publish a draft course. Validates the course has at least 1 topic with 1 lesson before publishing.", publishCourseSchema, publishCourse, refreshCourses);
registerTool("add_topic_to_course", "Add a new topic (section) to a course's curriculum. Returns the generated topicId.", addTopicToCourseSchema, addTopicToCourse, refreshCourses);
registerTool("create_lesson", "Create a new lesson in a course topic. Creates the lesson document and adds it to the topic's items array.", createLessonSchema, createLesson, refreshCourses);
registerTool("update_lesson", "Update lesson fields by lessonId. Also syncs title changes to the course curriculum.", updateLessonSchema, updateLesson, refreshCourses);
registerTool("delete_lesson", "Delete a lesson and remove its reference from the course curriculum. Also deletes associated attachments.", deleteLessonSchema, deleteLesson, refreshCourses);
registerTool("create_assignment", "Create a new assignment in a course topic. Creates the assignment document and adds it to the topic's items array.", createAssignmentSchema, createAssignment, refreshCourses);
registerTool("create_quiz", "Create a new quiz for a course with scheduling, duration, and passing criteria. Questions can be added via the admin dashboard.", createQuizSchema, createQuiz);
registerTool("scaffold_course", "Create a complete course skeleton from a structured input with topics, lessons, and assignments in a single call.", scaffoldCourseSchema, scaffoldCourse, refreshCourses);
registerTool("duplicate_course", "Duplicate an existing course with a new ID, slug, and DRAFT status. Copies all content including topics, lessons, and assignments.", duplicateCourseSchema, duplicateCourse, refreshCourses);
registerTool("reorder_topics", "Reorder topics within a course and/or reorder items (lessons/assignments) within topics. Provide topicOrder and/or itemOrders.", reorderTopicsSchema, reorderTopics, refreshCourses);
registerTool("grade_submission", "Grade an assignment submission by submissionId. Sets marks and optional feedback. Validates marks against assignment maximum.", gradeSubmissionSchema, gradeSubmission);
// ══════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ══════════════════════════════════════════════════════════════
const refreshUsers = () => { refreshUsersState().catch(() => { }); };
registerTool("create_user", "Create a new user with Firebase Auth account and Firestore document. Supports role and organization assignment.", createUserSchema, createUser, refreshUsers);
registerTool("update_user", "Update user fields by userId. Supports name, role, status, and organization changes.", updateUserSchema, updateUser, refreshUsers);
registerTool("delete_user", "Delete a user from Firestore and optionally from Firebase Auth.", deleteUserSchema, deleteUser, refreshUsers);
// ══════════════════════════════════════════════════════════════
// ENROLLMENT MANAGEMENT
// ══════════════════════════════════════════════════════════════
const refreshEnrollments = () => { refreshEnrollmentsState().catch(() => { }); };
registerTool("enroll_student", "Enroll a student in a course by userId or email. Creates enrollment and learning progress documents. Rejects duplicate active enrollments.", enrollStudentSchema, enrollStudent, refreshEnrollments);
registerTool("bulk_enroll_students", "Enroll multiple students in a course by email. Returns success/failure counts and details for each email.", bulkEnrollStudentsSchema, bulkEnrollStudents, refreshEnrollments);
registerTool("drop_enrollment", "Drop a student's enrollment by changing status to DROPPED. Requires userId and courseId.", dropEnrollmentSchema, dropEnrollment, refreshEnrollments);
// ══════════════════════════════════════════════════════════════
// COUPON MANAGEMENT
// ══════════════════════════════════════════════════════════════
registerTool("create_coupon", "Create a new discount coupon with code, percentage, expiry, and optional course/bundle linking.", createCouponSchema, createCoupon);
registerTool("update_coupon", "Update coupon fields by couponId. Supports code, discount, expiry, usage limit, status, and linked items.", updateCouponSchema, updateCoupon);
registerTool("delete_coupon", "Delete a coupon by couponId.", deleteCouponSchema, deleteCoupon);
// ══════════════════════════════════════════════════════════════
// BUNDLE MANAGEMENT
// ══════════════════════════════════════════════════════════════
registerTool("create_bundle", "Create a new course bundle with auto-calculated pricing from included courses.", createBundleSchema, createBundle);
registerTool("update_bundle", "Update bundle fields by bundleId. Supports title, pricing, status, tags, and more.", updateBundleSchema, updateBundle);
registerTool("delete_bundle", "Delete a course bundle by bundleId.", deleteBundleSchema, deleteBundle);
// ══════════════════════════════════════════════════════════════
// ANNOUNCEMENT MANAGEMENT
// ══════════════════════════════════════════════════════════════
registerTool("create_announcement", "Create a new announcement with scope (GLOBAL, COURSE, or ORGANIZATION).", createAnnouncementSchema, createAnnouncement);
registerTool("update_announcement", "Update announcement fields by announcementId.", updateAnnouncementSchema, updateAnnouncement);
registerTool("delete_announcement", "Delete an announcement by announcementId.", deleteAnnouncementSchema, deleteAnnouncement);
// ══════════════════════════════════════════════════════════════
// BANNER MANAGEMENT
// ══════════════════════════════════════════════════════════════
registerTool("create_banner", "Create a new display banner with CTA, gradient colors, and course targeting.", createBannerSchema, createBanner);
registerTool("update_banner", "Update banner fields by bannerId. Supports title, CTA, image, status, and targeting.", updateBannerSchema, updateBanner);
registerTool("delete_banner", "Delete a banner by bannerId.", deleteBannerSchema, deleteBanner);
// ══════════════════════════════════════════════════════════════
// FORUM MANAGEMENT
// ══════════════════════════════════════════════════════════════
registerTool("create_forum_channel", "Create a new forum channel for a course with optional moderation.", createForumChannelSchema, createForumChannel);
registerTool("create_forum_message", "Post a message in a forum channel. Supports threaded replies and moderation.", createForumMessageSchema, createForumMessage);
// ══════════════════════════════════════════════════════════════
// SYSTEM TOOLS
// ══════════════════════════════════════════════════════════════
server.tool("refresh_state", "Regenerate all Central Brain state files (courses, users, enrollments, orders) from Firestore", {}, async () => {
    try {
        const result = await refreshAllState();
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        message: "State refreshed successfully",
                        counts: result.counts,
                        durationMs: result.durationMs,
                        lastRefresh: result.system.lastFullRefresh,
                    }, null, 2),
                }],
        };
    }
    catch (error) {
        return { content: [{ type: "text", text: JSON.stringify({ error: error.message }) }], isError: true };
    }
});
server.tool("get_system_status", "Get current system status including last refresh time, collection counts, and server uptime", {}, async () => {
    try {
        const systemPath = resolve(import.meta.dirname, "../state/system.json");
        let systemState = null;
        if (existsSync(systemPath)) {
            systemState = JSON.parse(readFileSync(systemPath, "utf-8"));
        }
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        server: "vizuara-mcp",
                        version: "2.0.0",
                        uptime: process.uptime(),
                        state: systemState
                            ? {
                                lastFullRefresh: systemState.lastFullRefresh,
                                collections: systemState.collections,
                            }
                            : { message: "No state files generated yet. Run refresh_state first." },
                    }, null, 2),
                }],
        };
    }
    catch (error) {
        return { content: [{ type: "text", text: JSON.stringify({ error: error.message }) }], isError: true };
    }
});
// ── Server Start ────────────────────────────────────────────
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Vizuara MCP server v2.0.0 running on stdio");
}
main().catch((error) => {
    console.error("Failed to start Vizuara MCP server:", error);
    process.exit(1);
});
export { server };
//# sourceMappingURL=index.js.map