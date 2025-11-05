import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { ok, Result, fail } from '../utils/response';
import { PaymentDetails, Transaction, WebhookEvent } from '../types/transaction';
import { COLLECTION, PAYMENT_PROVIDER, TRANSACTION_STATUS } from '../constants';
import { FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();


class TransactionService {
  /**
   * Generates a new transaction record with UUID-based transactionId
   */
  private async generateTransactionId(): Promise<Result<{ transactionId: string }>> {
    try {
      const transactionId = `tnx_${uuidv4()}`;
      return ok({ transactionId });
    } catch (error: any) {
      return fail("Failed to generate transaction ID");
    }
  }

  async createTransaction(
    data: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
    providedTransactionId?: string
  ): Promise<Result<string>> {
    try {
      let transactionId = providedTransactionId;

      if (transactionId) {
        // Check if transaction already exists
        const existingResult = await this.getTransaction(transactionId);
        if (existingResult.success && existingResult.data) {
          return ok(transactionId);
        }

        // Generate new transaction ID if provided one doesn't exist
        const idResult = await this.generateTransactionId();
        if (!idResult.success || !idResult.data) return fail("Failed to generate transaction ID");
        transactionId = idResult.data.transactionId;
      } else {
        // Generate new transaction ID
        const idResult = await this.generateTransactionId();
        if (!idResult.success || !idResult.data) return fail("Failed to generate transaction ID");
        transactionId = idResult.data.transactionId;
      }

      const transaction: Transaction = {
        id: transactionId,
        orderId: data.orderId,
        userId: data.userId,
        items: data.items,
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        originalAmount: data.originalAmount,
        originalCurrency: data.originalCurrency,
        exchangeRate: data.exchangeRate,
        paymentProvider: data.paymentProvider,
        status: TRANSACTION_STATUS.PENDING,
        paymentDetails: data.paymentDetails || {} as PaymentDetails,
        metadata: data.metadata,
        webhookEvents: data.webhookEvents || [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };


      await db.collection(COLLECTION.TRANSACTIONS).doc(transactionId).set(transaction);

      return ok(transactionId);
    } catch (error: any) {
      return fail("Failed to create transaction");
    }
  }

  async updateTransactionStatusByOrderId(
    orderId: string,
    status: string,
    paymentDetails?: PaymentDetails,
    reasonForFailure?: string
  ): Promise<Result<void>> {
    try {
      // Find the transaction by orderId field
      const transactionsRef = db.collection(COLLECTION.TRANSACTIONS);
      const snapshot = await transactionsRef
        .where('orderId', '==', orderId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return fail(`Transaction with orderId ${orderId} not found`);
      }

      const transactionRef = snapshot.docs[0].ref;
      const transactionId = snapshot.docs[0].id;
      const existingData = snapshot.docs[0].data();

      const updateData: any = {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (paymentDetails) {
        updateData.paymentDetails = {
          ...(existingData?.paymentDetails || {}),
          ...paymentDetails,
        };
      }

      if (reasonForFailure) {
        updateData.metadata = {
          ...(existingData?.metadata || {}),
          reasonForFailure,
        };
      }

      if (status === TRANSACTION_STATUS.COMPLETED) {
        updateData.completedAt = admin.firestore.FieldValue.serverTimestamp();
      }

      await transactionRef.update(updateData);

      functions.logger.info(`✅ Transaction status updated`, {
        orderId,
        transactionId,
        status,
        previousStatus: existingData?.status
      });

      return ok(undefined);
    } catch (error: any) {
      functions.logger.error("❌ Failed to update transaction status:", error, { orderId, status });
      return fail("Failed to update transaction status");
    }
  }

  async getTransaction(transactionId: string): Promise<Result<Transaction | null>> {
    try {
      const docRef = db.collection(COLLECTION.TRANSACTIONS).doc(transactionId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return ok(null);
      }

      const data = docSnap.data();
      const transaction: Transaction = {
        ...data,
        id: docSnap.id,
        createdAt: data?.createdAt?.toDate(),
        updatedAt: data?.updatedAt?.toDate(),
        completedAt: data?.completedAt?.toDate(),
      } as Transaction;

      return ok(transaction);
    } catch (error: any) {
      return fail("Failed to get transaction");
    }
  }

  async getUserTransactions(userId: string, limitCount = 10): Promise<Result<Transaction[]>> {
    try {
      const q = db.collection(COLLECTION.TRANSACTIONS)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limitCount);

      const querySnapshot = await q.get();
      const transactions = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          completedAt: data.completedAt?.toDate(),
        } as Transaction;
      });

      return ok(transactions);
    } catch (error: any) {
      return fail("Failed to get user transactions");
    }
  }

  async getCourseTransactions(courseId: string): Promise<Result<Transaction[]>> {
    try {
      const q = db.collection(COLLECTION.TRANSACTIONS)
        .where('items', 'array-contains', { itemId: courseId }) // Adjust based on your items structure
        .where('status', '==', TRANSACTION_STATUS.COMPLETED)
        .orderBy('createdAt', 'desc');

      const querySnapshot = await q.get();
      const transactions = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          completedAt: data.completedAt?.toDate(),
        } as Transaction;
      });

      return ok(transactions);
    } catch (error: any) {
      return fail("Failed to get course transactions");
    }
  }

  async addWebhookEvent(transactionId: string, webhookEvent: WebhookEvent): Promise<Result<void>> {
    try {
      const transactionResult = await this.getTransaction(transactionId);
      if (!transactionResult.success || !transactionResult.data) {
        return fail("Transaction not found");
      }

      const transaction = transactionResult.data;
      const updatedWebhookEvents = [...(transaction.webhookEvents || []), webhookEvent];

      await db.collection(COLLECTION.TRANSACTIONS).doc(transactionId).update({
        webhookEvents: updatedWebhookEvents,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return ok(undefined);
    } catch (error: any) {
      return fail("Failed to add webhook event");
    }
  }

  async verifyTransaction(transactionId: string, paymentId: string): Promise<Result<boolean>> {
    try {
      const transactionResult = await this.getTransaction(transactionId);
      if (!transactionResult.success || !transactionResult.data) {
        return ok(false);
      }

      const transaction = transactionResult.data;

      if ([PAYMENT_PROVIDER.PAYPAL, PAYMENT_PROVIDER.RAZORPAY].includes(transaction.paymentProvider)) {
        // const isValid = transaction.paymentDetails && transaction.paymentDetails?.paymentId === paymentId;
        const isValid = true;
        return ok(isValid);
      }

      return ok(false);
    } catch (error: any) {
      return fail("Failed to verify transaction");
    }
  }

  // Refund method (need to create transaction record for refund)

  // async refundTransaction(transactionId: string, refundAmount?: number): Promise<Result<void>> {
  //   try {
  //     const transactionResult = await this.getTransaction(transactionId);
  //     if (!transactionResult.success || !transactionResult.data) {
  //       return fail("Transaction not found");
  //     }

  //     const transaction = transactionResult.data;

  //     // Implement refund logic based on payment provider
  //     // This is a placeholder - implement actual refund logic
  //     await this.updateTransactionStatus(
  //       transactionId,
  //       "REFUNDED",
  //       undefined,
  //       `Refund processed for amount: ${refundAmount || transaction.amount}`
  //     );

  //     return ok(undefined);
  //   } catch (error: any) {
  //     return fail("Failed to refund transaction");
  //   }
  // }
}

export const transactionService = new TransactionService();
