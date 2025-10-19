import {
    collection,
    getDocs,
    query,
    where,
} from "firebase/firestore";

import { COLLECTION, USER_ROLE } from "@/constants";
import { db } from "@/firebaseConfig";
import { User } from "@/types/user";
import { logError } from "@/utils/logger";
import { fail, ok, Result } from "@/utils/response";

class InstructorService {

    /**
    * Fetches all users with instructor-level privileges from Firestore.
    *
    * @returns A promise resolving to an array of User objects representing
    *          all users authorized to perform instructor-level actions.
    */
    async getAllInstructors(): Promise<Result<User[]>> {
        try {
            const q = query(
                collection(db, COLLECTION.USERS),
                where("role", "in", this.INSTRUCTOR_PRIVILEGED_ROLES)
            );

            const querySnapshot = await getDocs(q);

            const users = querySnapshot.docs.map(
                (doc) =>
                ({
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate?.(),
                    updatedAt: doc.data().updatedAt?.toDate?.(),
                } as User)
            );

            return ok(users);
        } catch (error: any) {
            logError("InstructorService.getAllInstructors", error);
            return fail("Failed to fetch all instructors");
        }
    }

    private INSTRUCTOR_PRIVILEGED_ROLES = [
        USER_ROLE.ADMIN,
        USER_ROLE.INSTRUCTOR
    ];
}

export const instructorService = new InstructorService();
