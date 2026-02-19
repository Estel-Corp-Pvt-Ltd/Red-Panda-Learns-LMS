export declare const getPlatformStatsSchema: {};
export declare function getPlatformStats(): Promise<{
    totals: {
        users: number;
        courses: number;
        enrollments: number;
        orders: number;
        bundles: number;
        quizzes: number;
        coupons: number;
        announcements: number;
    };
    users: {
        students: number;
        teachers: number;
        instructors: number;
        admins: number;
    };
    courses: {
        published: number;
        draft: number;
        archived: number;
    };
    enrollments: {
        active: number;
        completed: number;
        dropped: number;
    };
    orders: {
        completed: number;
        pending: number;
    };
    generatedAt: string;
}>;
//# sourceMappingURL=get_platform_stats.d.ts.map