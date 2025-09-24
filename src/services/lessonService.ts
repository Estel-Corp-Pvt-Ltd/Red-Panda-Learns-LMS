import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    getDocs,
    deleteDoc,
    runTransaction,
    query,
    where
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';
import { Lesson } from '@/types/lesson';
import { LESSON_SCOPE } from '@/constants';

class LessonService {
    /**
     * Generates a new lesson ID in the format `lesson_<number>`, starting from 30000000.
     * Uses a random gap between 10 and 50 to avoid easy guessing.
     */
    private async generateLessonId(): Promise<string> {
        const counterRef = doc(db, 'counters', 'lessonCounter');

        const newId = await runTransaction(db, async (transaction) => {
            const gap = Math.floor(Math.random() * (50 - 10 + 1)) + 10; // 10–50 gap
            const counterDoc = await transaction.get(counterRef);

            let lastNumber = 30000000;
            if (counterDoc.exists()) {
                lastNumber = counterDoc.data().lastNumber;
            }

            const nextNumber = lastNumber + gap;
            transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });

            return nextNumber;
        });

        return `lesson_${newId}`;
    }

    /**
 * Creates a new lesson in the `lessons` collection in Firestore.
 * 
 * This method:
 * - Generates a unique `lessonId` using the internal `generateLessonId()` method.
 * - Constructs a `Lesson` object using the provided data and default values for optional fields.
 * - Automatically sets `createdAt` and `updatedAt` to the current date/time.
 * - Persists the lesson to Firestore under the generated `lessonId`.
 * - Logs a success message when the lesson is successfully created.
 * 
 * Error Handling:
 * - If an error occurs while creating the lesson, it logs the error and throws a new `Error` with the message `"Failed to create lesson"`.
 * 
 * @param data - The lesson details excluding `id`, `createdAt`, and `updatedAt`.  
 *               Fields include:
 *   - `title` (string) — The title of the lesson.
 *   - `type` (string) — The type/category of the lesson.
 *   - `description` (optional string) — A textual description of the lesson.
 *   - `embedUrl` (optional string) — A URL to embed content (e.g., video).
 *   - `assignmentID` (optional string) — The ID of the related assignment.
 *   - `quizID` (optional string) — The ID of the related quiz.
 *   - `durationSeconds` (optional number) — Estimated lesson duration in seconds.
 * 
 * @returns A promise that resolves to the newly created lesson's unique `lessonId`.
 * 
 * @throws Error if lesson creation fails.
 */

    async createLesson(data: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        try {
            const lessonId = await this.generateLessonId();

            const lesson: Lesson = {
                id: lessonId,
                title: data.title,
                type: data.type,
                description: data.description || '',
                embedUrl: data.embedUrl || '',
                scope: data.scope,
                durationSeconds: data.durationSeconds ?? 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await setDoc(doc(db, 'Lessons', lessonId), lesson);
            console.log('LessonService - Lesson created successfully:', lessonId);

            return lessonId;
        } catch (error) {
            console.error('LessonService - Error creating lesson:', error);
            throw new Error('Failed to create lesson');
        }
    }

    /**
  * Updates an existing lesson in the Firestore database.
  *
  * This method first checks if the lesson exists. If it does, it applies the provided
  * updates along with a refreshed `updatedAt` timestamp. Only the fields present
  * in the `updates` object will be modified.
  *
  * @param {string} lessonId - The unique identifier of the lesson to update.
  * @param {Partial<Lesson>} updates - An object containing the lesson fields to update.
  *                                    All fields are optional.
  *                                    Supported fields: title, type, description, embedUrl,
  *                                    assignmentID, quizID, durationSeconds.
  * @returns {Promise<void>} A promise that resolves when the update is successful.
  *
  * @throws {Error} Throws an error if the lesson is not found or the update fails.
  *
  * @example
  * await lessonService.updateLesson('lesson123', {
  *   title: 'Updated Lesson Title',
  *   description: 'New description text'
  * });
  */

    async updateLesson(lessonId: string, updates: Partial<Lesson>): Promise<void> {
        try {
            const lessonRef = doc(db, "Lessons", lessonId);
            const lessonDoc = await getDoc(lessonRef);

            if (!lessonDoc.exists()) {
                throw new Error("Lesson not found");
            }

            const lessonData = lessonDoc.data() as Lesson;

            const updateData: Partial<Lesson> = {
                updatedAt: new Date(),
            };

            if (updates.title) updateData.title = updates.title;
            if (updates.type) updateData.type = updates.type;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.embedUrl !== undefined) updateData.embedUrl = updates.embedUrl;
            if (updates.durationSeconds !== undefined) updateData.durationSeconds = updates.durationSeconds;

            await updateDoc(lessonRef, updateData);
            console.log("LessonService - Lesson updated successfully:", lessonId);

            // 🔹 If scope is APP, update all courses where this lesson exists
            if (lessonData.scope === LESSON_SCOPE.APP && updates.title) {
                const coursesSnapshot = await getDocs(collection(db, "Courses"));

                const updatePromises: Promise<void>[] = [];

                coursesSnapshot.forEach((courseDoc) => {
                    const courseData = courseDoc.data() as any;

                    let hasLesson = false;

                    // loop through topics and lessonRefs
                    courseData.topics = courseData.topics.map((topic: any) => {
                        topic.lessons = topic.lessons.map((lesson: any) => {
                            if (lesson.id === lessonId) {
                                hasLesson = true;
                                return { ...lesson, title: updates.title }; // update title
                            }
                            return lesson;
                        });
                        return topic;
                    });

                    if (hasLesson) {
                        updatePromises.push(updateDoc(courseDoc.ref, { topics: courseData.topics }));
                    }
                });

                await Promise.all(updatePromises);
                console.log("Updated lesson title in all relevant courses");
            }
        } catch (error) {
            console.error("LessonService - Error updating lesson:", error);
            throw new Error("Failed to update lesson");
        }
    }

    /**
 * Fetches all lessons from the "lessons" collection in Firestore.
 *
 * This method retrieves every document stored in the "lessons" collection,
 * converts each document snapshot into a `Lesson` object, and ensures that 
 * any Firestore Timestamp fields for `createdAt` and `updatedAt` are 
 * converted to JavaScript `Date` objects.
 *
 * Logs the number of lessons fetched for easier debugging.
 * In case of an error during the read operation, logs the error and 
 * returns an empty array (instead of throwing), so calling code can handle gracefully.
 *
 * @async
 * @function getAllLessons
 * @returns {Promise<Lesson[]>} - A promise that resolves to an array of Lesson objects.
 *
 * @example
 * const lessons = await lessonService.getAllLessons();
 * console.log(lessons); // Logs an array of all lessons in the database
 */
    async getAllLessons(): Promise<Lesson[]> {
        try {
            const querySnapshot = await getDocs(collection(db, 'Lessons'));

            const lessons = querySnapshot.docs.map(doc => ({
                ...doc.data(),
                createdAt: doc.data().createdAt.toDate(),
                updatedAt: doc.data().updatedAt.toDate(),
            })) as Lesson[];
    
            console.log('LessonService - Fetched lessons:', lessons.length);
            return lessons;
        } catch (error) {
            console.error('LessonService - Error fetching lessons:', error);
            return [];
        }
    }

    /**
 * Fetches all lessons from the "lessons" collection in Firestore that match the given lesson IDs.
 *
 * This method queries Firestore to retrieve only the lessons whose `id` is included
 * in the provided array of lesson IDs. Each document snapshot is converted into
 * a `Lesson` object, and any Firestore Timestamp fields (`createdAt` and `updatedAt`)
 * are converted to JavaScript `Date` objects.
 *
 * Logs the number of lessons fetched for easier debugging. If an error occurs during
 * the read operation, it logs the error and returns an empty array.
 *
 * @async
 * @function getLessonsByIds
 * @param {string[]} lessonIds - An array of lesson IDs to fetch from Firestore.
 * @returns {Promise<Lesson[]>} - A promise that resolves to an array of Lesson objects matching the IDs.
 *
 * @example
 * const lessonIds = ['lesson1', 'lesson3', 'lesson7'];
 * const lessons = await lessonService.getLessonsByIds(lessonIds);
 * console.log(lessons); // Logs only the lessons with IDs in lessonIds
 */
    async getLessonsByIds(lessonIds: string[]): Promise<Lesson[]> {
        if (lessonIds.length === 0) return [];

        try {
            // Firestore can query with 'in' for up to 10 items at a time
            const batches: Lesson[][] = [];
            const chunkSize = 10;
            for (let i = 0; i < lessonIds.length; i += chunkSize) {
                const chunk = lessonIds.slice(i, i + chunkSize);
                const q = query(collection(db, 'Lessons'), where('id', 'in', chunk));
                const querySnapshot = await getDocs(q);

                const lessons = querySnapshot.docs.map(doc => ({
                    ...doc.data(),
                    createdAt: doc.data().createdAt.toDate(),
                    updatedAt: doc.data().updatedAt.toDate(),
                })) as Lesson[];

                batches.push(lessons);
            }

            const allLessons = batches.flat();
            console.log('LessonService - Fetched lessons by IDs:', allLessons.length);
            return allLessons;
        } catch (error) {
            console.error('LessonService - Error fetching lessons by IDs:', error);
            return [];
        }
    }

    /**
 * Retrieves a single lesson document from the Firestore `lessons` collection using its unique ID.
 * 
 * ### Purpose
 * This method is used when you need to fetch the details of a specific lesson by its identifier,
 * for example, when displaying a lesson detail page, editing an existing lesson, or pre-filling
 * a form with the lesson's current data.
 * 
 * ### Behavior
 * - Sends a `getDoc` request to Firestore for the lesson with the given `lessonId`.
 * - Checks if the document exists:
 *   - If it **does not exist**, logs a warning and returns `null`.
 *   - If it **exists**, returns the lesson's data, converting `createdAt` and `updatedAt`
 *     from Firestore Timestamps to JavaScript `Date` objects.
 * - Any errors that occur are caught, logged, and the method returns `null`.
 * 
 * ### Parameters
 * @param lessonId - The unique string ID of the lesson to retrieve from Firestore.
 * 
 * ### Returns
 * - A `Promise` that resolves to:
 *   - A `Lesson` object if the lesson exists.
 *   - `null` if the lesson was not found or an error occurred.
 * 
 * ### Usage Example
 * ```ts
 * const lesson = await lessonService.getLessonById('lesson123');
 * if (lesson) {
 *   console.log('Lesson title:', lesson.title);
 * } else {
 *   console.log('Lesson not found.');
 * }
 * ```
 */
    async getLessonById(lessonId: string): Promise<Lesson | null> {
        try {
            const lessonDoc = await getDoc(doc(db, 'Lessons', lessonId));

            if (!lessonDoc.exists()) {
                console.log('LessonService - Lesson not found:', lessonId);
                return null;
            }

            return {
                ...lessonDoc.data(),
                createdAt: lessonDoc.data()?.createdAt.toDate(),
                updatedAt: lessonDoc.data()?.updatedAt.toDate(),
            } as Lesson;
        } catch (error) {
            console.error('LessonService - Error fetching lesson:', error);
            return null;
        }
    }

    /**
 * Deletes a lesson document from the 'Lessons' collection in Firestore.
 *
 * @param lessonId - The unique identifier of the lesson to delete.
 * @returns A promise that resolves when the deletion is complete.
 * @throws Will throw an error if the deletion fails.
 *
 * @example
 * await lessonService.deleteLesson('lesson123');
 */
    async deleteLesson(lessonId: string): Promise<void> {
        try {
            await deleteDoc(doc(db, 'Lessons', lessonId));
            console.log(`LessonService - Lesson deleted successfully: ${lessonId}`);
        } catch (error) {
            console.error(`LessonService - Error deleting lesson:`, error);
            throw new Error('Failed to delete lesson');
        }
    }
}

export const lessonService = new LessonService();
