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
  serverTimestamp,
  Query,
  orderBy,
  endBefore,
  limitToLast,
  startAfter,
  limit
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import {
  courseService,
} from './courseService';
import {
  Bundle
} from '@/types/bundle';
import { BUNDLE_STATUS } from '@/constants';
import { Course } from '@/types/course';
import { WhereFilterOp } from 'firebase-admin/firestore';
import { PaginatedResult, PaginationOptions } from '@/utils/pagination';
import { fail, ok, Result } from '@/utils/response';
import { COLLECTION } from "@/constants";

class BundleService {
  /**
   * Generates a new bundle ID in the format `bundle_<number>`, where <number> is a
   * monotonically increasing integer starting from 10000000.
   *
   * The increment (gap) between consecutive IDs is a random value between 30 and 100.
   * The last generated number is stored in Firestore (`Counters/bundleCounter`) to ensure
   * persistence across server restarts and to prevent ID collisions in concurrent environments.
   *
   * Uses a Firestore transaction to guarantee atomic reads and updates, ensuring safe
   * generation of unique IDs even with multiple concurrent requests.
   *
   * @returns A promise that resolves to the newly generated bundle ID string.
   */

  private async generateBundleId(): Promise<string> {
    const counterRef = doc(db, COLLECTION.COUNTERS, "bundleCounter");

    const newId = await runTransaction(db, async (transaction) => {
      const gap = Math.floor(Math.random() * (100 - 30 + 1)) + 30; // 30–100 gap

      const counterDoc = await transaction.get(counterRef);

      let lastNumber = 10000000; // starting number
      if (counterDoc.exists()) {
        lastNumber = counterDoc.data().lastNumber;
      }

      const nextNumber = lastNumber + gap;

      transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });

      return nextNumber;
    });

    return `bundle_${newId}`;
  }

  /**
   * Creates a new course bundle in Firestore with pricing details and metadata.
   *
   * Steps performed:
   * 1. Generates a unique, persistent bundle ID using `generateBundleId()`.
   * 2. Fetches full course details for the provided course IDs to ensure validity.
   * 3. Calculates the bundle's regular and sale prices if not provided:
   *    - Regular price defaults to the sum of each course's sale price or regular price.
   *    - Sale price (if missing) is intended to be calculated with a discount or markup logic.
   * 4. Constructs a complete `Bundle` object, initializing metadata such as creation
   *    date, update date, tags, and status.
   * 5. Saves the bundle to Firestore under the `bundles` collection using the generated ID.
   *
   * Data validation:
   * - Throws an error if one or more provided course IDs cannot be found.
   *
   * @param data - The bundle details including title, description, course IDs, pricing,
   *               and other metadata.
   * @returns A promise that resolves to the newly created bundle ID string.
   * @throws Error if bundle creation fails or course validation fails.
   */

  async createBundle(
    data: Omit<Bundle, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      const bundleId = await this.generateBundleId();
      console.log("bundle Id", bundleId);

      // Get course details to calculate original price
      const courses = await Promise.all(
        data.courses.map((course) => courseService.getCourseById(course.id))
      );

      const validCourses = courses.filter(
        (course) => course !== null
      ) as Course[];
      if (validCourses.length !== data.courses.length) {
        throw new Error("Some courses were not found");
      }

      let regularPrice = data.regularPrice;
      if (!regularPrice) {
        // Sum of all course prices
        regularPrice = validCourses.reduce((sum, course) => {
          return sum + (course.salePrice || course.regularPrice);
        }, 0);
      }

      let salePrice = data.salePrice;
      if (!salePrice) {
        // Regular price - 10% of regular price
        salePrice = regularPrice - regularPrice * 0.1;
      }

      const bundle: Bundle = {
        id: bundleId,
        title: data.title,
        description: data.description,
        slug: data.slug,
        courses: data.courses,
        regularPrice,
        salePrice,
        pricingModel: data.pricingModel,
        instructorId: data.instructorId,
        instructorName: data.instructorName,
        status: data.status,
        thumbnail: data.thumbnail,
        categoryIds: data.categoryIds || [],
        targetAudienceIds: data.targetAudienceIds || [],
        tags: data.tags || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log("bundle", bundle);

      await setDoc(doc(db, COLLECTION.BUNDLES, bundleId), bundle);
      console.log("BundleService - Bundle created successfully:", bundleId);

      return bundleId;
    } catch (error) {
      console.error("BundleService - Error creating bundle:", error);
      throw new Error("Failed to create bundle");
    }
  }

  /**
   * Updates or creates a bundle document in Firestore.
   *
   * @param bundleId - The ID of the bundle document to update.
   * @param updatedData - An object containing the fields to update.
   */
  async updateBundleQuery(
    bundleId: string,
    updatedData: Record<string, any>
  ): Promise<void> {
    const bundleRef = doc(db, COLLECTION.BUNDLES, bundleId);

    try {
      const snap = await getDoc(bundleRef);

      if (snap.exists()) {
        await updateDoc(bundleRef, updatedData);
      } else {
        await setDoc(bundleRef, updatedData, { merge: true });
      }
    } catch (error) {
      console.error("❌ Error updating bundle:", error);
      throw error;
    }
  }

  /**
   * Updates an existing bundle with the provided changes in Firestore.
   *
   * This method:
   * - Checks if the specified bundle exists before updating.
   * - Recalculates `regularPrice` and `salePrice` if `courseIds` are updated
   *   (defaults to sum of course prices and adds 10% markup for sale price).
   * - Updates only the provided fields and automatically sets `updatedAt`.
   *
   * @param bundleId - The ID of the bundle to update.
   * @param updates - Partial bundle data containing the fields to update.
   * @throws Error if the bundle is not found or the update fails.
   */

  async updateBundle(
    bundleId: string,
    updates: Partial<Bundle>
  ): Promise<void> {
    try {
      const bundleRef = doc(db, COLLECTION.BUNDLES, bundleId);
      const bundleDoc = await getDoc(bundleRef);

      if (!bundleDoc.exists()) {
        throw new Error("Bundle not found");
      }

      const updateData: Partial<Bundle> = {
        updatedAt: serverTimestamp(),
      };

      // If courseIds are being updated, recalculate pricing
      if (updates.courses) {
        const courses = await Promise.all(
          updates.courses.map((course) =>
            courseService.getCourseById(course.id)
          )
        );

        const validCourses = courses.filter(
          (course) => course !== null
        ) as Course[];

        let regularPrice = updates.regularPrice;
        if (!regularPrice) {
          // Sum of all course prices
          regularPrice = validCourses.reduce((sum, course) => {
            return sum + (course.salePrice || course.regularPrice);
          }, 0);
        }

        let salePrice = updates.salePrice;
        if (!salePrice) {
          // Regular price - 10% of regular price
          salePrice = regularPrice - regularPrice * 0.1;
        }

        updateData.courses = updates.courses;
        updateData.regularPrice = regularPrice;
        updateData.salePrice = salePrice;
      }

      // Update other fields
      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.slug) updateData.slug = updates.slug;
      if (updates.categoryIds) updateData.categoryIds = updates.categoryIds;
      if (updates.targetAudienceIds)
        updateData.targetAudienceIds = updates.targetAudienceIds;
      if (updates.thumbnail) updateData.thumbnail = updateData.thumbnail;
      if (updates.tags) updateData.tags = updates.tags;
      if (updates.pricingModel) updateData.pricingModel = updates.pricingModel;
      if (updates.instructorId) updateData.instructorId = updates.instructorId;
      if (updates.status) updateData.status = updates.status;

      await updateDoc(bundleRef, updateData);
      console.log("BundleService - Bundle updated successfully:", bundleId);
    } catch (error) {
      console.error("BundleService - Error updating bundle:", error);
      throw new Error("Failed to update bundle");
    }
  }

  /**
   * Publishes a bundle by setting its status to `PUBLISHED` in Firestore.
   *
   * This method:
   * - Updates the bundle document with `status` set to `BUNDLE_STATUS.PUBLISHED`.
   * - Sets `updatedAt` to the current date and time.
   *
   * @param bundleId - The ID of the bundle to publish.
   * @throws Error if the update fails.
   */

  async publishBundle(bundleId: string): Promise<void> {
    try {
      const bundleRef = doc(db, COLLECTION.BUNDLES, bundleId);
      await updateDoc(bundleRef, {
        status: BUNDLE_STATUS.PUBLISHED,
        updatedAt: serverTimestamp(),
      });
      console.log("BundleService - Bundle published successfully:", bundleId);
    } catch (error) {
      console.error("BundleService - Error publishing bundle:", error);
      throw new Error("Failed to publish bundle");
    }
  }

  /**
   * Retrieves all bundle documents from Firestore.
   *
   * This method:
   * - Fetches all documents from the `bundles` collection.
   * - Converts `createdAt` and `updatedAt` fields from Firestore Timestamps to JavaScript Date objects.
   * - Returns the resulting array of bundles.
   *
   * @returns A promise that resolves to an array of `Bundle` objects.
   *          Returns an empty array if the fetch operation fails.
   */

  async getAllBundles(): Promise<Bundle[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION.BUNDLES));

      const bundles = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Bundle[];

      console.log("BundleService - Fetched bundles:", bundles.length);
      return bundles;
    } catch (error) {
      console.error("BundleService - Error fetching bundles:", error);
      return [];
    }
  }

  /**
   * Retrieves all bundles from Firestore that are marked as published.
   *
   * This method:
   * - Queries the `bundles` collection where `status` equals `BUNDLE_STATUS.PUBLISHED`.
   * - Converts `createdAt` and `updatedAt` fields from Firestore Timestamps to JavaScript Date objects.
   * - Returns the resulting array of published bundles.
   *
   * @returns A promise that resolves to an array of published `Bundle` objects.
   *          Returns an empty array if the fetch operation fails.
   */

  async getPublishedBundles(): Promise<Bundle[]> {
    try {
      const q = query(
        collection(db, COLLECTION.BUNDLES),
        where("status", "==", BUNDLE_STATUS.PUBLISHED)
      );
      const querySnapshot = await getDocs(q);

      const bundles = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Bundle[];

      console.log("BundleService - Fetched published bundles:", bundles.length);
      return bundles;
    } catch (error) {
      console.error("BundleService - Error fetching published bundles:", error);
      return [];
    }
  }

  /**
   * Retrieves a single bundle from Firestore by its ID.
   *
   * This method:
   * - Fetches the document from the `bundles` collection with the provided `bundleId`.
   * - If the document does not exist, logs the result and returns `null`.
   * - Converts `createdAt` and `updatedAt` fields from Firestore Timestamps to JavaScript Date objects.
   * - Returns the bundle as a `Bundle` object if found.
   *
   * @param bundleId - The unique identifier of the bundle to retrieve.
   * @returns A promise that resolves to the matching `Bundle` object, or `null` if not found or on error.
   */

  async getBundleById(bundleId: string): Promise<Bundle | null> {
    try {
      console.log("fetching bundles", bundleId);
      const bundleDoc = await getDoc(doc(db, COLLECTION.BUNDLES, bundleId));

      if (!bundleDoc.exists()) {
        console.log("BundleService - Bundle not found:", bundleId);
        return null;
      }

      const bundle = {
        ...bundleDoc.data(),
        createdAt: bundleDoc.data()?.createdAt.toDate(),
        updatedAt: bundleDoc.data()?.updatedAt.toDate(),
      } as Bundle;

      console.log("BundleService - Bundle fetched:", bundleId);
      return bundle;
    } catch (error) {
      console.error("BundleService - Error fetching bundle:", error);
      return null;
    }
  }

  /**
   * Deletes a bundle from Firestore by its ID.
   *
   * This method:
   * - Removes the document from the `bundles` collection that matches the provided `bundleId`.
   * - Logs a success message if the deletion is successful.
   * - Throws an error if the deletion fails.
   *
   * @param bundleId - The unique identifier of the bundle to delete.
   * @returns A promise that resolves when the deletion is complete.
   * @throws Will throw an error if the bundle cannot be deleted.
   */

  async deleteBundle(bundleId: string): Promise<Result<void>> {
    try {
      await deleteDoc(doc(db, COLLECTION.BUNDLES, bundleId));
      console.log("BundleService - Bundle deleted successfully:", bundleId);
      return ok(null);
    } catch (error) {
      console.error("BundleService - Error deleting bundle:", error);
      return fail("Failed to delete bundle");
    }
  }

  /**
   * Retrieves all courses associated with a specific bundle from Firestore.
   *
   * This method first fetches the bundle document by its ID.
   * If the bundle exists, it retrieves all courses whose IDs are listed in the bundle's `courseIds` array.
   * Courses that cannot be found are excluded from the returned list.
   *
   * @param bundleId - The unique identifier of the bundle to fetch courses for.
   * @returns A promise that resolves to an array of `Course` objects for the given bundle.
   *          Returns an empty array if the bundle does not exist or if no courses are found.
   *
   * @example
   * const courses = await bundleService.getBundleCourses('bundle123');
   * console.log(courses.length); // e.g., 5
   */

  async getBundleCourses(bundleId: string): Promise<Course[]> {
    console.log("bundleId", bundleId);
    try {
      const bundle = await this.getBundleById(bundleId);
      if (!bundle) {
        return [];
      }

      const courses = await Promise.all(
        bundle.courses.map((course) => courseService.getCourseById(course.id))
      );

      return courses.filter((course) => course !== null) as Course[];
    } catch (error) {
      console.error("BundleService - Error fetching bundle courses:", error);
      return [];
    }
  }

  /**
   * Calculates bundle pricing based on the provided course IDs.
   *
   * This method fetches all courses for the given IDs, sums up their prices
   * (preferring `salePrice` over `regularPrice` if available), and computes:
   * - **regularPrice**: Total price of all courses without any bundle discount.
   * - **suggestedPrice**: A discounted price based on a 10% base discount plus
   *   an additional 1% for each course in the bundle (capped at 30% total discount).
   * - **maxDiscount**: The maximum allowable discount (50% off regular price).
   *
   * If any course cannot be found, it is excluded from calculations.
   * In case of an error, all returned prices default to `0`.
   *
   * @param courseIds - An array of course IDs to include in the bundle calculation.
   * @returns A promise that resolves to an object containing:
   *          - `regularPrice`: number
   *          - `suggestedPrice`: number
   *          - `maxDiscount`: number
   *
   * @example
   * const pricing = await bundleService.calculateBundlePricing(['course1', 'course2']);
   * console.log(pricing.suggestedPrice); // e.g., 450
   */

  async calculateBundlePricing(courseIds: string[]): Promise<{
    regularPrice: number;
    suggestedPrice: number;
    maxDiscount: number;
  }> {
    try {
      const courses = await Promise.all(
        courseIds.map((id) => courseService.getCourseById(id))
      );

      const validCourses = courses.filter(
        (course) => course !== null
      ) as Course[];

      const regularPrice = validCourses.reduce((sum, course) => {
        return sum + (course.salePrice || course.regularPrice);
      }, 0);

      // Suggest 10-15% discount for bundles
      const suggestedDiscount = 0.1 + validCourses.length * 0.01; // More courses = more discount
      const suggestedPrice = Math.round(
        regularPrice * (1 - Math.min(suggestedDiscount, 0.3))
      );
      const maxDiscount = Math.round(regularPrice * 0.5); // Max 50% discount

      return {
        regularPrice: regularPrice,
        suggestedPrice,
        maxDiscount,
      };
    } catch (error) {
      console.error("BundleService - Error calculating bundle pricing:", error);
      return {
        regularPrice: 0,
        suggestedPrice: 0,
        maxDiscount: 0,
      };
    }
  }


  async getBundleByIds(bundleIds: string[]): Promise<Bundle[]> {
    if (!bundleIds || bundleIds.length === 0) return [];

    const CHUNK_SIZE = 10; // Firestore 'in' queries allow max 10 items
    const chunks: string[][] = [];

    for (let i = 0; i < bundleIds.length; i += CHUNK_SIZE) {
      chunks.push(bundleIds.slice(i, i + CHUNK_SIZE));
    }

    const bundles: Bundle[] = [];

    for (const chunk of chunks) {
      const q = query(collection(db, COLLECTION.BUNDLES), where("id", "in", chunk));
      const snapshot = await getDocs(q);

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        bundles.push({
          ...data,
          createdAt: data?.createdAt?.toDate(),
          updatedAt: data?.updatedAt?.toDate(),
        } as Bundle);
      });
    }

    return bundles;
  }


  async getBundles(
    filters?: {
      field: keyof Bundle;
      op: WhereFilterOp;
      value: any;
    }[],
    options: PaginationOptions<Bundle> = {}
  ): Promise<Result<PaginatedResult<Bundle>>> {
    try {
      const {
        limit: itemsPerPage = 25,
        orderBy: orderByOption = { field: "createdAt", direction: "desc" },
        pageDirection = "next",
        cursor = null,
      } = options;

      let q: Query = collection(db, COLLECTION.BUNDLES);

      // Apply filters if provided
      if (filters && filters.length > 0) {
        const whereClauses = filters.map((f) =>
          where(f.field as string, f.op, f.value)
        );
        q = query(q, ...whereClauses);
      }

      // Apply ordering
      const { field, direction } = orderByOption;

      // For pagination, we need to handle different scenarios
      if (pageDirection === "previous" && cursor) {
        q = query(
          q,
          orderBy(field as string, direction),
          endBefore(cursor),
          limitToLast(itemsPerPage)
        );
      } else if (cursor) {
        q = query(
          q,
          orderBy(field as string, direction),
          startAfter(cursor),
          limit(itemsPerPage)
        );
      } else {
        q = query(q, orderBy(field as string, direction), limit(itemsPerPage));
      }

      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs;

      if (pageDirection === "previous") {
        documents.reverse();
      }

      const bundles = documents.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          slug: data.slug,
          regularPrice: data.regularPrice,
          salePrice: data.salePrice,
          courses: data.courses || [],
          pricingModel: data.pricingModel,
          categories: data.categories || [],
          tags: data.tags || [],
          instructorId: data.instructorId,
          instructorName: data.instructorName,
          categoryIds: data.categoryIds || [],
          targetAudienceIds: data.targetAudienceIds || [],
          thumbnail: data.thumbnail,
          status: data.status,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        } as Bundle;
      });

      const hasNextPage = querySnapshot.docs.length === itemsPerPage;
      const hasPreviousPage = cursor !== null;
      const nextCursor = hasNextPage
        ? querySnapshot.docs[querySnapshot.docs.length - 1]
        : null;
      const previousCursor = hasPreviousPage ? querySnapshot.docs[0] : null;

      return ok({
        data: bundles,
        hasNextPage,
        hasPreviousPage,
        nextCursor,
        previousCursor,
      });
    } catch (error) {
      console.error("BundleService - Error fetching bundles:", error);
      return fail("Error fetching bundles");
    }
  }

  async isBundleSlugTaken(slug: string, currentBundleId?: string): Promise<boolean> {
    if (!slug) return false;

    const q = query(
      collection(db, COLLECTION.BUNDLES),
      where("slug", "==", slug)
    );

    const snap = await getDocs(q);

    // If editing: ignore the current bundle
    if (currentBundleId) {
      return snap.docs.some((doc) => doc.id !== currentBundleId);
    }

    // If creating: any existing doc with the same URL means it's taken
    return !snap.empty;
  }



  async getBundleBySlug(slug: string): Promise<Bundle | null> {
    try {
      const q = query(
        collection(db, COLLECTION.BUNDLES),
        where("slug", "==", slug)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        console.log("BundleService - Bundle not found for slug:", slug);
        return null;
      }

      const bundleDoc = snap.docs[0];

      const bundle = {
        id: bundleDoc.id,
        ...bundleDoc.data(),
        createdAt: bundleDoc.data()?.createdAt?.toDate?.(),
        updatedAt: bundleDoc.data()?.updatedAt?.toDate?.(),
      } as Bundle;

      return bundle;
    } catch (error) {
      console.error("CourseService - Error fetching course by URL:", error);
      return null;
    }
  }

}
export const bundleService = new BundleService();
