import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebaseConfig.ts";
import { OrderStatus } from "../types/general.ts";
import { ORDER_STATUS } from "@/constants.ts";
import { Order } from "@/types/order.ts";

class OrderService {
  private async generateOrderId(): Promise<{ orderId: string }> {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;

    const counterRef = doc(db, 'counters', 'orderCounters');

    // Use Firestore transaction to increment safely
    const dailySequence = await runTransaction(db, async (tx) => {
      const snapshot = await tx.get(counterRef);
      let seq = 1;

      if (snapshot.exists()) {
        const data = snapshot.data();
        seq = (data?.seq || 0) + 1;
      }

      tx.set(counterRef, { seq }, { merge: true });
      return seq;
    });

    const paddedSeq = String(dailySequence).padStart(3, "0");
    const orderId = `ORD-${dateStr}-${paddedSeq}`;
    return { orderId };
  }


  async createOrder(
    data: Omit<Order, "orderId" | "createdAt" | "completedAt" | "updatedAt">,
    providedOrderId?: string // optional idempotent orderId
  ): Promise<string> {
    try {
      let transactionId = providedTransactionId;

      if (transactionId) {
        // 🔎 If caller gave us one, check DB first
        const existing = await this.getTransaction(transactionId);
        if (existing) {
          console.log("♻️ Returning existing transaction:", transactionId);
          return transactionId; // idempotent return
        }

        // need a new orderNumber for human-friendly readability
        const ids = await this.generateTransactionId();

      } else {
        const generated = await this.generateOrderId();        // If no orderId provided → create new Firestore doc
        orderId = generated.orderId
      }

      const order: Order = {
        orderId,
        userId: data.userId,
        courseIds: data.courseIds,
        bundleIds: data.bundleIds || null,
        status: data.status || ORDER_STATUS.PENDING,
        amount: data.amount,
        currency: data.currency,
        transactionId: data.transactionId || null,
        metadata: data.metadata || {},
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'Transactions', transactionId), transaction);
      console.log('Transaction created:', transaction);
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

  // TODO: Add method for refunds
}

export const transactionService = new TransactionService();