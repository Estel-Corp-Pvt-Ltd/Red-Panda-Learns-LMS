// import * as functions from 'firebase-functions';
// import { onRequest } from "firebase-functions/v2/https";
// import { Request, Response } from "express";
// import { paypalService } from "../services/paypalService";
// import { transactionService } from "../services/transactionService";
// import { orderService } from "../services/orderService";
// import { TRANSACTION_STATUS } from "../constants";

// interface CreateOrderRequest {
//   orderId: string;
//   amount: number;
//   currency: string;
//   items: Array<{
//     itemId: string;
//     itemType: string;
//     name: string;
//     amount: number;
//   }>;
//   userId: string;
// }

// export const createPayPalOrder = onRequest(
//   { region: "us-central1", cors: true },
//   async (req: Request, res: Response) => {
//     try {
//       // Validate request
//       if (req.method !== 'POST') {
//         res.status(405).json({ error: 'Method not allowed' });
//         return;
//       }

//       const { orderId, amount, currency, items, userId }: CreateOrderRequest = req.body;

//       if (!orderId || !amount || !currency || !items || !userId) {
//         res.status(400).json({ error: 'Missing required fields' });
//         return;
//       }

//       // Get order details for item information
//       const orderResult = await orderService.getOrderById(orderId);
//       if (!orderResult.success || !orderResult.data) {
//         res.status(404).json({ error: 'Order not found' });
//         return;
//       }

//       // Create transaction record
//       const transactionResult = await transactionService.createTransaction({
//         id: generateId(), // Your ID generation logic
//         orderId: orderId,
//         userId: userId,
//         items: items,
//         type: 'PURCHASE',
//         amount: amount,
//         currency: currency,
//         paymentProvider: 'PAYPAL',
//         status: TRANSACTION_STATUS.PENDING,
//         paymentDetails: {},
//         metadata: {
//           userEmail: orderResult.data.userEmail,
//           itemTitles: items.map(item => item.name),
//           displayTitle: `Purchase: ${items.map(item => item.name).join(', ')}`,
//           subtotal: amount,
//           paymentAttempts: 1
//         },
//         createdAt: new Date(),
//         updatedAt: new Date()
//       });

//       if (!transactionResult.success) {
//         res.status(500).json({ error: 'Failed to create transaction' });
//         return;
//       }

//       // Create PayPal order
//       const paypalOrder = await paypalService.createOrder(
//         amount,
//         currency,
//         orderId,
//         items.map(item => ({
//           name: item.name,
//           description: `${item.itemType} - ${item.name}`,
//           amount: item.amount
//         }))
//       );

//       // Update transaction with PayPal order ID
//       await transactionService.updateTransactionStatusByOrderId(orderId, TRANSACTION_STATUS.PENDING, {
//         paymentDetails: {
//           paypalOrderId: paypalOrder.id,
//           status: paypalOrder.status
//         }
//       });

//       // Find approval URL
//       const approvalLink = paypalOrder.links.find(link => link.rel === 'approve');
//       if (!approvalLink) {
//         throw new Error('No approval URL found in PayPal response');
//       }

//       res.status(200).json({
//         success: true,
//         paypalOrderId: paypalOrder.id,
//         approvalUrl: approvalLink.href,
//         status: paypalOrder.status
//       });

//     } catch (error: any) {
//       functions.logger.error('❌ Create PayPal order failed:', error);
//       res.status(500).json({
//         error: 'Failed to create PayPal order',
//         message: error.message
//       });
//     }
//   }
// );

// function generateId(): string {
//   return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
// }
