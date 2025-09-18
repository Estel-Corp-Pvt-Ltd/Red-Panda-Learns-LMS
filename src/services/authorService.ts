import {
    collection,
    query,
    where,
    getDocs,
} from "firebase/firestore";

import { db } from "@/firebaseConfig";
import { USER_ROLE } from "@/constants";
import { User } from "@/types/user";

class AuthorService {
    private AUTHOR_ROLES = [
        USER_ROLE.ADMIN,
        USER_ROLE.INSTRUCTOR
    ];

    /**
     * Retrieves all authors (users with author roles).
     */
    async getAllAuthors(): Promise<User[]> {
        const q = query(
            collection(db, "Users"),
            where("role", "in", this.AUTHOR_ROLES)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(
            (doc) =>
            ({
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.(),
                updatedAt: doc.data().updatedAt?.toDate?.(),
            } as User)
        );
    }
}

export const authorService = new AuthorService();
