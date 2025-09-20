import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  runTransaction,
  WhereFilterOp
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';
import { Course } from '@/types/course';
import { COURSE_STATUS, PRICING_MODEL } from '@/constants';

class CourseService {
  /**
   * Generates a new course ID in the format `course_<number>`, starting from 20000000.
   * Uses a random gap between 10 and 50 to avoid easy guessing.
   */
  private async generateCourseId(): Promise<string> {
    const counterRef = doc(db, 'counters', 'courseCounter');

    const newId = await runTransaction(db, async (transaction) => {
      const gap = Math.floor(Math.random() * (50 - 10 + 1)) + 10; // 10–50 gap
      const counterDoc = await transaction.get(counterRef);

      let lastNumber = 20000000;
      if (counterDoc.exists()) {
        lastNumber = counterDoc.data().lastNumber;
      }

      const nextNumber = lastNumber + gap;
      transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });

      return nextNumber;
    });

    return `course_${newId}`;
  }

  /**
 * Creates a new course in the Firestore `courses` collection.
 *
 * This method:
 * 1. Generates a unique course ID using `generateCourseId`.
 * 2. Constructs a `Course` object with all required fields populated.
 *    - Sets default values for optional fields (`tags`, `topics`, `isEnrollmentPaused`).
 *    - Automatically assigns the current timestamp to `createdAt` and `updatedAt`.
 * 3. Persists the course object to Firestore under the generated course ID.
 *
 * @param data - A `Course` object containing the course details. Some fields may be optional
 *               (like `tags`, and `topics`) and will be defaulted if not provided.
 * @returns A promise that resolves to the generated course ID if creation is successful.
 * @throws An error if the course could not be created in Firestore.
 *
 * @example
 * ```ts
 * const courseId = await courseService.createCourse({
 *   title: 'Intro to Machine Learning',
 *   url: 'intro-to-ml',
 *   description: 'A beginner-friendly course on ML concepts.',
 *   regularPrice: 100,
 *   salePrice: 80,
 *   pricingModel: 'one-time',
 *   tags: ['ML', 'AI', 'Beginner'],
 *   category: 'Technology',
 *   authorId: 'author123',
 *   status: 'published',
 *   topics: ['Regression', 'Classification'],
 *   isEnrollmentPaused: false,
 *   certificateTemplateId: 'template456'
 * });
 * console.log(courseId); // Outputs the generated course ID
 * ```
 */

  async createCourse(data: Omit<Course, 'id' | 'status' | 'topics' | 'url' | 'categories' | 'regularPrice' | 'salePrice' | 'pricingModel' | 'isEnrollmentPaused' | 'tags' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const courseId = await this.generateCourseId();

      const course: Partial<Course> = {
        id: courseId,
        title: data.title,
        url: "",
        description: data.description,
        regularPrice: 0,
        salePrice: 0,
        pricingModel: PRICING_MODEL.PAID,
        tags: [],
        categories: [],
        authorId: data.authorId,
        status: COURSE_STATUS.DRAFT,
        certificateTemplateId: data.certificateTemplateId || '',
        topics: [],
        isEnrollmentPaused: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, 'Courses', courseId), course);
      console.log('CourseService - Course created successfully:', courseId);

      return courseId;
    } catch (error) {
      console.error('CourseService - Error creating course:', error);
      throw new Error('Failed to create course');
    }
  }

  /**
 * Updates an existing course document in the Firestore `courses` collection.
 *
 * This method applies partial updates to the course identified by `courseId`.
 * Only the fields provided in the `updates` object will be modified, while all
 * other existing fields remain unchanged. The `updatedAt` timestamp is always
 * refreshed to the current time to reflect the modification.
 *
 * The method first verifies that the course exists. If it does not, an error is thrown.
 * Commonly updated fields include title, description, pricing, category, tags,
 * enrollment status, and certificate template information.
 *
 * @param courseId - The unique identifier of the course to update.
 * @param updates - A partial `Course` object containing the fields to be updated.
 *                  Fields left undefined will not be modified.
 *
 * @throws Will throw an error if the course does not exist or if the update operation fails.
 *
 * @example
 * await courseService.updateCourse("course123", {
 *   title: "Updated Course Title",
 *   salePrice: 499,
 *   isEnrollmentPaused: true
 * });
 */

  async updateCourse(courseId: string, updates: Partial<Course>): Promise<void> {
    try {
      const courseRef = doc(db, 'Courses', courseId);
      const courseDoc = await getDoc(courseRef);

      if (!courseDoc.exists()) {
        throw new Error('Course not found');
      }

      const updateData: Partial<Course> = {
        updatedAt: new Date(),
      };

      // Simple field mapping
      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.url) updateData.url = updates.url;
      if (updates.regularPrice) updateData.regularPrice = updates.regularPrice;
      if (updates.salePrice) updateData.salePrice = updates.salePrice;
      if (updates.categories) updateData.categories = updates.categories;
      if (updates.tags) updateData.tags = updates.tags;
      if (updates.status) updateData.status = updates.status;
      if (updates.authorId) updateData.authorId = updates.authorId;
      if (updates.authorName) updateData.authorName = updates.authorName;
      if (updates.pricingModel) updateData.pricingModel = updates.pricingModel;
      if (updates.topics) updateData.topics = updates.topics;
      if (updates.isEnrollmentPaused !== undefined) updateData.isEnrollmentPaused = updates.isEnrollmentPaused;
      if (updates.certificateTemplateId) updateData.certificateTemplateId = updates.certificateTemplateId;

      await updateDoc(courseRef, updateData);
      console.log('CourseService - Course updated successfully:', courseId);
    } catch (error) {
      console.error('CourseService - Error updating course:', error);
      throw new Error('Failed to update course');
    }
  }

  /**
 * Publishes a course by updating its `status` field to `COURSE_STATUS.PUBLISHED`
 * in the Firestore `courses` collection.
 *
 * This method also updates the `updatedAt` timestamp to the current time.
 * It is typically called when a course is ready to be made visible and accessible
 * to enrolled or prospective students.
 *
 * @param courseId - The unique identifier of the course to publish.
 *
 * @throws Will throw an error if the course update fails (e.g., if the course does not exist
 *         or if there is a Firestore write error).
 *
 * @example
 * await courseService.publishCourse("course123");
 */

  async publishCourse(courseId: string): Promise<void> {
    try {
      const courseRef = doc(db, 'Courses', courseId);
      await updateDoc(courseRef, {
        status: COURSE_STATUS.PUBLISHED,
        updatedAt: new Date(),
      });
      console.log('CourseService - Course published successfully:', courseId);
    } catch (error) {
      console.error('CourseService - Error publishing course:', error);
      throw new Error('Failed to publish course');
    }
  }

  /**
 * Retrieves all courses from the Firestore `courses` collection.
 *
 * The method fetches every document in the `courses` collection,
 * converts the Firestore `createdAt` and `updatedAt` timestamps to
 * JavaScript `Date` objects, and returns the result as an array of
 * `Course` objects.
 *
 * @returns A promise that resolves to an array of all courses. 
 *          Returns an empty array if an error occurs during retrieval.
 *
 * @throws This method does not throw an error; instead, it logs the error 
 *         and returns an empty array to ensure graceful failure.
 *
 * @example
 * const courses = await courseService.getAllCourses();
 * console.log(courses.length); // e.g., 5
 */

  async getAllCourses(): Promise<Course[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'Courses'));
      
      const courses = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Course[];
      console.log(courses);
      console.log('CourseService - Fetched courses:', courses.length);
      return courses;
    } catch (error) {
      console.error('CourseService - Error fetching courses:', error);
      return [];
    }
  }

  /**
   * Retrieves courses from the Firestore `Courses` collection based on filters.
   *
   * This method builds a Firestore query using the provided filters,
   * fetches matching documents, converts Firestore Timestamps to JS Dates,
   * and returns them as an array of `Course` objects.
   *
   * @param filters - An optional array of filter conditions.
   *                  Each filter is an object with:
   *                  - field: string (the field name in the document)
   *                  - op: FirebaseFirestore.WhereFilterOp (e.g., '==', '>=', 'array-contains')
   *                  - value: any (the value to compare against)
   *
   * @returns A promise that resolves to an array of filtered courses.
   *          Returns an empty array if an error occurs.
   *
   * @example
   * // Get all published courses in "AI" category
   * const courses = await courseService.getFilteredCourses([
   *   { field: 'status', op: '==', value: 'published' },
   *   { field: 'category', op: '==', value: 'AI' }
   * ]);
   */

  async getFilteredCourses(
    filters?: { field: keyof Course; op: WhereFilterOp; value: any }[]
  ): Promise<Course[]> {
    try {
      let q = collection(db, 'Courses');

      if (filters && filters.length > 0) {
        let queryRef = query(
          q,
          ...filters.map(f => where(f.field as string, f.op, f.value))
        );
        const querySnapshot = await getDocs(queryRef);

        const courses = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        })) as Course[];

        console.log('CourseService - Fetched filtered courses:', courses.length);
        return courses;
      } else {
        // No filters: fetch all courses
        const querySnapshot = await getDocs(q);
        const courses = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        })) as Course[];

        console.log('CourseService - Fetched all courses:', courses.length);
        return courses;
      }
    } catch (error) {
      console.error('CourseService - Error fetching filtered courses:', error);
      return [];
    }
  }

  /**
 * Retrieves all published courses from the Firestore `courses` collection.
 *
 * This method queries the `courses` collection for documents where the `status`
 * field is equal to `COURSE_STATUS.PUBLISHED`. It converts the Firestore
 * `createdAt` and `updatedAt` timestamps to JavaScript `Date` objects before
 * returning them as an array of `Course` objects.
 *
 * @returns A promise that resolves to an array of all published courses. 
 *          Returns an empty array if an error occurs during retrieval.
 *
 * @throws This method does not throw an error; instead, it logs the error 
 *         and returns an empty array to ensure graceful failure.
 *
 * @example
 * const publishedCourses = await courseService.getPublishedCourses();
 * console.log(publishedCourses.length); // e.g., 3
 */

  async getPublishedCourses(): Promise<Course[]> {
    try {
      const q = query(
        collection(db, 'Courses'),
        where('status', '==', COURSE_STATUS.PUBLISHED)
      );
      const querySnapshot = await getDocs(q);

      const courses = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Course[];

      console.log('CourseService - Fetched published courses:', courses.length);
      return courses;
    } catch (error) {
      console.error('CourseService - Error fetching published courses:', error);
      return [];
    }
  }

  /**
 * Retrieves a specific course by its ID from the Firestore `courses` collection.
 *
 * This method fetches a single course document matching the given `courseId`.
 * If the course exists, its `createdAt` and `updatedAt` timestamps are converted
 * to JavaScript `Date` objects before returning it as a `Course` object.
 *
 * @param courseId - The unique identifier of the course to retrieve.
 * @returns A promise that resolves to the `Course` object if found, or `null` if
 *          the course does not exist or an error occurs.
 *
 * @throws This method does not throw an error; instead, it logs the error
 *         and returns `null` to ensure graceful failure.
 *
 * @example
 * const course = await courseService.getCourseById('abc123');
 * if (course) {
 *   console.log(course.title);
 * } else {
 *   console.log('Course not found.');
 * }
 */

  async getCourseById(courseId: string): Promise<Course | null> {
    try {
      const courseDoc = await getDoc(doc(db, 'Courses', courseId));

      if (!courseDoc.exists()) {
        console.log('CourseService - Course not found:', courseId);
        return null;
      }

      const course = {
        ...courseDoc.data(),
        createdAt: courseDoc.data()?.createdAt.toDate(),
        updatedAt: courseDoc.data()?.updatedAt.toDate(),
      } as Course;

      return course;
    } catch (error) {
      console.error('CourseService - Error fetching course:', error);
      return null;
    }
  }

  /**
   * Deletes a course from the Firestore `courses` collection by its ID.
   *
   * This method removes the specified course document from Firestore.
   * If the deletion succeeds, a success message is logged.
   * If an error occurs, it is logged and an error is thrown.
   *
   * @param courseId - The unique identifier of the course to delete.
   * @returns A promise that resolves when the course has been successfully deleted.
   *
   * @throws Throws an `Error` if the deletion operation fails.
   *
   * @example
   * await courseService.deleteCourse('abc123');
   * console.log('Course deleted successfully.');
   */

  async deleteCourse(courseId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'Courses', courseId));
      console.log('CourseService - Course deleted successfully:', courseId);
    } catch (error) {
      console.error('CourseService - Error deleting course:', error);
      throw new Error('Failed to delete course');
    }
  }
}

export const courseService = new CourseService();
