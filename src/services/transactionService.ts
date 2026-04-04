import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../firebaseConfig.ts';
import { COLLECTION } from '../constants.ts';
import {
  PaymentDetails,
  Transaction,
  WebhookEvent
} from '../types/transaction';
import { TransactionStatus } from '../types/general.ts';
import { PAYMENT_PROVIDER, TRANSACTION_STATUS } from '../constants.ts';
import { v4 as uuidv4 } from 'uuid';


class TransactionService {

  /**
   * Generates a new transaction record with:
   * - UUID-based transactionId (globally unique, safe for DB).
   * - Sequential orderNumber (human-friendly, starts from 20000000).
   * 
   * Example:
   * {
   *   transactionId: "transaction_550e8400-e29b-41d4-a716-446655440000",
   *   orderNumber: 20000037
   * }
   */
  private async generateTransactionId(): Promise<{ transactionId: string; }> {
    const transactionId = `tnx_${uuidv4()}`;

    return {
      transactionId
    };
  }
  async createTransaction(
    data: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
    providedTransactionId?: string // <-- add this
  ): Promise<string> {
    try {
      let transactionId = providedTransactionId;

      if (transactionId) {
        // 🔎 If caller gave us one, check DB first
        const existing = await this.getTransaction(transactionId);
        if (existing) {
          return transactionId; // idempotent return
        }

        // need a new orderNumber for human-friendly readability
        const ids = await this.generateTransactionId();

      } else {
        // If no transactionId provided → create new
        const ids = await this.generateTransactionId();
        transactionId = ids.transactionId;
      }

      const transaction: Transaction = {
        id: transactionId,
        orderNumber: data.orderNumber,
        userId: data.userId,
       items : data.items,
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        originalAmount: data.originalAmount,
        originalCurrency: data.originalCurrency,
        exchangeRate: data.exchangeRate,
        paymentProvider: data.paymentProvider,
        status: TRANSACTION_STATUS.PENDING,
        paymentDetails: {} as PaymentDetails,
        metadata: data.metadata,
        webhookEvents: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, COLLECTION.TRANSACTIONS, transactionId), transaction);
      return transactionId;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error('Failed to create transaction');
    }
  }

  async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus,
    paymentDetails?: PaymentDetails,
    reasonForFailure?: string
  ): Promise<void> {
    try {
      const transactionRef = doc(db, COLLECTION.TRANSACTIONS, transactionId);
      const snapshot = await getDoc(transactionRef);

      if (!snapshot.exists()) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      const existingData = snapshot.data();
      const updateData: any = {
        status,
        updatedAt: serverTimestamp(),
      };

      if (paymentDetails) {
        updateData.paymentDetails = {
          ...(existingData.paymentDetails || {}),
          ...paymentDetails,
        };
      }

      if (reasonForFailure) {
        updateData.metadata = {
          ...(existingData.metadata || {}),
          reasonForFailure,
        };
      }

      if (status === TRANSACTION_STATUS.COMPLETED) {
        updateData.completedAt = serverTimestamp();
      }

      await updateDoc(transactionRef, updateData);
    } catch (error) {
      console.error("Error updating transaction:", error);
      throw new Error("Failed to update transaction");
    }
  }

  async getTransaction(transactionId: string): Promise<Transaction | null> {
    try {
      const docRef = doc(db, COLLECTION.TRANSACTIONS, transactionId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          completedAt: data.completedAt?.toDate(),
        } as Transaction;
      }

      return null;
    } catch (error) {
      console.error('Error getting transaction:', error);
      return null;
    }
  }

  async getUserTransactions(userId: string, limitCount = 10): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, COLLECTION.TRANSACTIONS),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          completedAt: data.completedAt?.toDate(),
        } as Transaction;
      });
    } catch (error) {
      console.error('Error getting user transactions:', error);
      return [];
    }
  }

  async getCourseTransactions(courseId: string): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, COLLECTION.TRANSACTIONS),
        where('courseId', '==', courseId),
        where('status', '==', TRANSACTION_STATUS.COMPLETED),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          completedAt: data.completedAt?.toDate(),
        } as Transaction;
      });
    } catch (error) {
      console.error('Error getting course transactions:', error);
      return [];
    }
  }

  async addWebhookEvent(transactionId: string, webhookEvent: WebhookEvent): Promise<void> {
    try {
      const transaction = await this.getTransaction(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const updatedWebhookData = [...(transaction.webhookEvents || []), {
        ...webhookEvent
      }];

      await updateDoc(doc(db, COLLECTION.TRANSACTIONS, transactionId), {
        webhookData: updatedWebhookData,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error adding webhook data:', error);
      throw error;
    }
  }

  async verifyTransaction(transactionId: string, paymentId: string): Promise<boolean> {
    try {
      const transaction = await this.getTransaction(transactionId);
      if (!transaction) {
        return false;
      }

      if (transaction.paymentProvider === PAYMENT_PROVIDER.RAZORPAY)
        return transaction.paymentDetails.paymentId === paymentId;

      return false;
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return false;
    }
  }

  // TODO: Create a method to handle refunds
}

export const transactionService = new TransactionService();