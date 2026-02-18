import type { SystemState } from "./types.js";
export interface RefreshResult {
    system: SystemState;
    counts: {
        courses: number;
        users: number;
        enrollments: number;
        orders: number;
    };
    durationMs: number;
}
export declare function refreshAllState(): Promise<RefreshResult>;
/**
 * Targeted state refreshers for use after write operations.
 * These run asynchronously and do not block the tool response.
 */
export declare function refreshCoursesState(): Promise<void>;
export declare function refreshEnrollmentsState(): Promise<void>;
export declare function refreshOrdersState(): Promise<void>;
export declare function refreshUsersState(): Promise<void>;
export type { CoursesState, UsersState, EnrollmentsState, OrdersState, SystemState, CourseSnapshot, UserSnapshot, EnrollmentSnapshot, OrderSnapshot, } from "./types.js";
//# sourceMappingURL=index.d.ts.map