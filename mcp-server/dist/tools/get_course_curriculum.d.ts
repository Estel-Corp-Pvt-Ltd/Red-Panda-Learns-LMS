import { z } from "zod";
export declare const getCourseCurriculumSchema: {
    courseId: z.ZodString;
};
export declare function getCourseCurriculum(params: {
    courseId: string;
}): Promise<{
    courseId: string;
    courseTitle: any;
    status: any;
    totalTopics: any;
    totalLessons: number;
    totalAssignments: number;
    totalDuration: {
        hours: number;
        minutes: number;
    };
    curriculum: any;
}>;
//# sourceMappingURL=get_course_curriculum.d.ts.map