import { Course } from '@/types/course';

export const getCourseStructureCounts = (course: Course) => {
    let cohortCount = 0;
    let topicCount = 0;
    let lessonCount = 0;

    if (course.cohorts && course.cohorts.length > 0) {
        // Course is organized into cohorts
        cohortCount = course.cohorts.length;
        topicCount = course.cohorts.reduce((acc, cohort) => acc + (cohort.topics?.length || 0), 0);
        lessonCount = course.cohorts.reduce(
            (acc, cohort) =>
                acc +
                cohort.topics.reduce(
                    (topicAcc, topic) => topicAcc + (topic.items?.length || 0),
                    0
                ),
            0
        );
    } else if (course.topics && course.topics.length > 0) {
        // Course is organized directly into topics
        topicCount = course.topics.length;
        lessonCount = course.topics.reduce(
            (acc, topic) => acc + (topic.items?.length || 0),
            0
        );
    }

    return { cohortCount, topicCount, lessonCount };
};
