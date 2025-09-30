import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import {
  PaymentDetails,
  Transaction,
  WebhookEvent
} from '@/types/transaction';
import { TransactionStatus } from '@/types/general';
import { PAYMENT_PROVIDER, TRANSACTION_STATUS } from '@/constants';
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
  private async generateTransactionId(): Promise<{ transactionId: string; orderNumber: number }> {
    const counterRef = doc(db, 'counters', 'transactionCounter');

    const orderNumber = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      let lastNumber = 20000000;
      if (counterDoc.exists()) {
        lastNumber = counterDoc.data().lastNumber;
      }

      const nextNumber = lastNumber + 1; // strictly sequential for readability
      transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });

      return nextNumber;
    });

    const transactionId = `tx${uuidv4()}`;

    return {
      transactionId,
      orderNumber,
    };
  }

  async createTransaction(
    data: Omit<Transaction, "id" | "orderNumber" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      const transactionIdentifiers = await this.generateTransactionId();

      const transaction: Transaction = {
        id: transactionIdentifiers.transactionId,
        orderNumber: transactionIdentifiers.orderNumber,
        userId: data.userId,
        courseId: data.courseId || null,
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

      // 👀 Debug which fields are undefined
for (const [key, value] of Object.entries(transaction)) {
  if (value === undefined) {
    console.error(`❌ Field "${key}" is undefined`);
  } else {
    console.log(`✅ ${key}:`, value);
  }
}

      console.log("transaction: ", transaction)

      await setDoc(doc(db, 'Transactions', transactionIdentifiers.transactionId), transaction);

      console.log('Transaction created:', transactionIdentifiers);
      return transactionIdentifiers.transactionId;
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
      const transactionRef = doc(db, "Transactions", transactionId);
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
      console.log("Transaction updated:", transactionId, status);
    } catch (error) {
      console.error("Error updating transaction:", error);
      throw new Error("Failed to update transaction");
    }
  }

  async getTransaction(transactionId: string): Promise<Transaction | null> {
    try {
      const docRef = doc(db, 'Transactions', transactionId);
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
        collection(db, 'Transactions'),
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
        collection(db, 'Transactions'),
        where('courseId', '==', courseId),
        where('status', '==', 'completed'),
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

      await updateDoc(doc(db, 'Transactions', transactionId), {
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

      if (transaction.paymentProvider === PAYMENT_PROVIDER.PAYPAL || PAYMENT_PROVIDER.RAZORPAY)
        return transaction.paymentDetails.paymentId === paymentId;

      return false;
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return false;
    }
  }
}

export const transactionService = new TransactionService();
