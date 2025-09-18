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

class TransactionService {

  /**
     * Generates a new transaction ID in the format `transaction_<number>`, starting from 20000000.
     * Uses a random gap between 10 and 50 to avoid easy guessing.
     */
  private async generateTransactionId(): Promise<string> {
    const counterRef = doc(db, 'counters', 'transactionCounter');

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

    return `transaction_${newId}`;
  }

  async createTransaction(
    data: Omit<Transaction, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      const transactionId = await this.generateTransactionId();

      const transaction: Transaction = {
        id: transactionId,
        userId: data.userId,
        courseId: data.courseId || null,
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        originalAmount: data.originalAmount,
        exchangeRate: data.exchangeRate,
        paymentProvider: data.paymentProvider,
        status: TRANSACTION_STATUS.PENDING,
        paymentDetails: {} as PaymentDetails,
        metadata: data.metadata,
        reasonForFailure: data.reasonForFailure,
        webhookEvents: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log("transaction: ", transaction)

      await setDoc(doc(db, 'Transactions', transactionId), transaction);

      console.log('Transaction created:', transactionId);
      return transactionId;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error('Failed to create transaction');
    }
  }

  async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus,
    paymentDetails?: PaymentDetails
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: serverTimestamp(),
      };

      if (paymentDetails) {
        updateData.paymentDetails = paymentDetails;
      }

      if (status === TRANSACTION_STATUS.COMPLETED) {
        updateData.completedAt = serverTimestamp();
      }

      await updateDoc(doc(db, 'Transactions', transactionId), updateData);
      console.log('Transaction updated:', transactionId, status);
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw new Error('Failed to update transaction');
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
