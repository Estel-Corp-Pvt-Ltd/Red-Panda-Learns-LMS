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
  WhereFilterOp,
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';
import { COLLECTION } from '@/constants';
import { ContentLock } from '@/types/content-lock';
import { fail, ok, Result } from '@/utils/response';
import { logError } from '@/utils/logger';
import { authService } from './authService';

/**
 * Firestore-based service for managing Content Locks
 */
class ContentLockService {

  /**
   * Generates a unique content lock ID
   */
  private async generateContentLockId(): Promise<string> {
    const counterRef = doc(db, COLLECTION.COUNTERS, 'contentLockCounter');

    const newId = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      let lastNumber = 100000;

      if (snap.exists()) {
        lastNumber = snap.data().lastNumber;
      }

      const nextNumber = lastNumber + 1;
      transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });

      return nextNumber;
    });

    return `content_lock_${newId}`;
  }

  /**
   * Creates a content lock
   */
  async createContentLock(
    data: Omit<ContentLock, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<string>> {
    try {
      const id = await this.generateContentLockId();

      const lock: ContentLock = {
        id,
        contentType: data.contentType,
        contentId: data.contentId,
        appliesToAllUsers: data.appliesToAllUsers ?? false,
        organizationId: data.organizationId,
        class: data.class,
        division: data.division,
        isLocked: data.isLocked,
        scheduledAt: data.scheduledAt,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, COLLECTION.CONTENT_LOCKS, id), lock);
      
      return ok(id);
    } catch (error) {
      logError('ContentLockService - Error creating lock:', error);
      return fail('Error creating content lock');
    }
  }

  /**
   * Updates a content lock
   */
  async updateContentLock(
    lockId: string,
    updates: Partial<ContentLock>
  ): Promise<Result<null>> {
    try {
      const ref = doc(db, COLLECTION.CONTENT_LOCKS, lockId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        return fail('Content lock not found');
      }

      await updateDoc(ref, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      return ok(null);
    } catch (error) {
      logError('ContentLockService - Error updating lock:', error);
      return fail('Error updating content lock');
    }
  }

  /**
   * Deletes a content lock
   */
  async deleteContentLock(lockId: string): Promise<Result<null>> {
    try {
      await deleteDoc(doc(db, COLLECTION.CONTENT_LOCKS, lockId));
      return ok(null);
    } catch (error) {
      logError('ContentLockService - Error deleting lock:', error);
      return fail('Error deleting content lock');
    }
  }

  /**
   * Gets a content lock by ID
   */
  async getContentLockById(lockId: string): Promise<Result<ContentLock | null>> {
    try {
      const snap = await getDoc(doc(db, COLLECTION.CONTENT_LOCKS, lockId));

      if (!snap.exists()) {
        return fail('Content lock not found');
      }

      const data = snap.data();
      return ok({
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as ContentLock);
    } catch (error) {
      logError('ContentLockService - Error fetching lock:', error);
      return fail('Error fetching content lock');
    }
  }

  /**
   * Fetch content locks by ONE contentId
   */
  async getLocksByContentId(contentId: string): Promise<Result<ContentLock[]>> {
    try {
      const q = query(
        collection(db, COLLECTION.CONTENT_LOCKS),
        where('contentId', '==', contentId)
      );

      const snapshot = await getDocs(q);

      const locks = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as ContentLock;
      });

      return ok(locks);
    } catch (error) {
      logError('ContentLockService - Error fetching locks by contentId:', error);
      return fail('Error fetching content locks');
    }
  }

  /**
   * Fetch content locks by MULTIPLE contentIds (chunked)
   * Firestore "in" query limit = 10
   */
  async getLocksByContentIds(
    contentIds: string[]
  ): Promise<Result<ContentLock[]>> {
    try {
      if (!contentIds.length) {
        return ok([]);
      }

      const chunks: string[][] = [];
      for (let i = 0; i < contentIds.length; i += 10) {
        chunks.push(contentIds.slice(i, i + 10));
      }

      const results: ContentLock[] = [];

      for (const chunk of chunks) {
        const q = query(
          collection(db, COLLECTION.CONTENT_LOCKS),
          where('contentId', 'in', chunk)
        );

        const snapshot = await getDocs(q);

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          results.push({
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as ContentLock);
        });
      }

      return ok(results);
    } catch (error) {
      logError('ContentLockService - Error fetching locks by contentIds:', error);
      return fail('Error fetching content locks');
    }
  }

  // ───────────────────────────────────────────────
  // Teacher-facing lock management (routed through the Worker, which enforces
  // the org-scope + course-enrollment gate server-side). Admins may also use
  // these, but the existing admin form continues to use the direct methods above.
  // ───────────────────────────────────────────────

  private readonly backendUrl = import.meta.env.VITE_BACKEND_URL;

  private async authedFetch(path: string, init: RequestInit): Promise<any> {
    const idToken = await authService.getToken();
    const res = await fetch(`${this.backendUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        ...(init.headers || {}),
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((json as any)?.error || `Request failed: ${res.status}`);
    }
    return json;
  }

  /**
   * Teacher: create a content lock for a lesson/topic in a course they teach.
   */
  async teacherCreateLock(input: {
    courseId: string;
    contentType: ContentLock['contentType'];
    contentId: string;
    isLocked: boolean;
    class?: string | null;
    division?: string | null;
  }): Promise<Result<string>> {
    try {
      const json = await this.authedFetch('/teacher/content-locks', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return ok(json.id as string);
    } catch (error) {
      logError('ContentLockService - teacherCreateLock', error);
      return fail(error instanceof Error ? error.message : 'Error creating content lock');
    }
  }

  /**
   * Teacher: update an existing lock (toggle locked state / retarget class/division).
   */
  async teacherUpdateLock(
    lockId: string,
    updates: { isLocked?: boolean; class?: string | null; division?: string | null }
  ): Promise<Result<null>> {
    try {
      await this.authedFetch(`/teacher/content-locks/${encodeURIComponent(lockId)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return ok(null);
    } catch (error) {
      logError('ContentLockService - teacherUpdateLock', error);
      return fail(error instanceof Error ? error.message : 'Error updating content lock');
    }
  }

  /**
   * Teacher: delete a lock in their organization.
   */
  async teacherDeleteLock(lockId: string): Promise<Result<null>> {
    try {
      await this.authedFetch(`/teacher/content-locks/${encodeURIComponent(lockId)}`, {
        method: 'DELETE',
      });
      return ok(null);
    } catch (error) {
      logError('ContentLockService - teacherDeleteLock', error);
      return fail(error instanceof Error ? error.message : 'Error deleting content lock');
    }
  }
}

export const contentLockService = new ContentLockService();
