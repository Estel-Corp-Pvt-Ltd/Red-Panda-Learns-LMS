// src/handlers/orders/index.ts

/**
 * Orders API - Public endpoints with API Key authentication
 */

import { Request, Response } from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { orderService } from '../../services/orderService';
import { corsMiddleware } from '../../middlewares/cors';
import { apiKeyAuthMiddleware } from '../../middlewares/auth';
import { withMiddleware } from '../../middlewares';
import * as functions from 'firebase-functions';
import { API_SECRET_TOKEN } from '../../middlewares/auth';
// ============================================
// Response Helpers
// ============================================

interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    count?: number;
    timestamp: string;
  };
}

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
  };
}

const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: { count?: number }
): void => {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
    },
  };
  res.status(statusCode).json(response);
};

const sendError = (
  res: Response,
  message: string,
  code: string,
  statusCode: number = 500
): void => {
  const response: ErrorResponse = {
    success: false,
    error: { message, code },
  };
  res.status(statusCode).json(response);
};

// ============================================
// Handlers
// ============================================

/**
 * GET /getOrders - Retrieve all orders with optional filters
 */
const getAllOrdersHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (req.method !== 'GET') {
      sendError(res, `Method ${req.method} not allowed. Use GET.`, 'METHOD_NOT_ALLOWED', 405);
      return;
    }

    const { status, userId, email, provider, startDate, endDate, limit } = req.query;

    functions.logger.info('GET /getOrders request', {
      query: { status, userId, email, provider, startDate, endDate, limit },
    });

    const options: {
      status?: string;
      userId?: string;
      userEmail?: string;
      provider?: string;
      dateRange?: { startDate?: Date; endDate?: Date };
      limit?: number;
    } = {};

    if (status && typeof status === 'string') options.status = status;
    if (userId && typeof userId === 'string') options.userId = userId;
    if (email && typeof email === 'string') options.userEmail = email.toLowerCase();
    if (provider && typeof provider === 'string') options.provider = provider;

    if (startDate || endDate) {
      options.dateRange = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };
    }

    if (limit) options.limit = parseInt(limit as string, 10);

    const hasFilters = Object.keys(options).length > 0;
    const result = hasFilters
      ? await orderService.getOrders(options)
      : await orderService.getAllOrders();

    if (!result.success) {
      functions.logger.error('Failed to fetch orders', { error: result.error });
      sendError(res, result.error?.message || 'Failed to fetch orders', result.error?.code || 'FETCH_ERROR', 500);
      return;
    }

    sendSuccess(res, result.data, 200, { count: result.data!.length });
  } catch (error) {
    functions.logger.error('Unexpected error in getOrders', { error });
    sendError(res, 'An unexpected error occurred', 'INTERNAL_SERVER_ERROR', 500);
  }
};

/**
 * GET /getOrderById?id=<orderId> - Retrieve single order by ID
 */
const getOrderByIdHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (req.method !== 'GET') {
      sendError(res, `Method ${req.method} not allowed. Use GET.`, 'METHOD_NOT_ALLOWED', 405);
      return;
    }

    const orderId = req.query.id as string;

    if (!orderId) {
      sendError(res, 'Order ID is required. Use ?id=<orderId>', 'MISSING_ORDER_ID', 400);
      return;
    }

    functions.logger.info('GET /getOrderById request', { orderId });

    const result = await orderService.getOrderByIdSerialized(orderId);

    if (!result.success) {
      sendError(res, result.error?.message || 'Failed to fetch order', result.error?.code || 'FETCH_ERROR', 500);
      return;
    }

    if (!result.data) {
      sendError(res, `Order ${orderId} not found`, 'ORDER_NOT_FOUND', 404);
      return;
    }

    sendSuccess(res, result.data);
  } catch (error) {
    functions.logger.error('Unexpected error in getOrderById', { error });
    sendError(res, 'An unexpected error occurred', 'INTERNAL_SERVER_ERROR', 500);
  }
};

/**
 * GET /getOrderStats - Get order statistics
 */
const getOrderStatsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (req.method !== 'GET') {
      sendError(res, `Method ${req.method} not allowed. Use GET.`, 'METHOD_NOT_ALLOWED', 405);
      return;
    }

    functions.logger.info('GET /getOrderStats request');

    const result = await orderService.getOrderCountByStatus();

    if (!result.success) {
      sendError(res, result.error?.message || 'Failed to fetch stats', result.error?.code || 'FETCH_ERROR', 500);
      return;
    }

    sendSuccess(res, result.data);
  } catch (error) {
    functions.logger.error('Unexpected error in getOrderStats', { error });
    sendError(res, 'An unexpected error occurred', 'INTERNAL_SERVER_ERROR', 500);
  }
};

/**
 * GET /ordersHealthCheck - Health check (no auth required)
 */
const healthCheckHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      service: 'orders-api',
      version: '1.0.0',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

// ============================================
// Cloud Function Exports
// ============================================

export const getOrders = onRequest(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
      // ✅ THIS IS THE KEY FIX - Allow public access (unauthenticated)
  // Your apiKeyAuthMiddleware handles the actual authentication
  invoker: 'public',

    secrets: [API_SECRET_TOKEN],// Required for apiKeyAuthMiddleware
  },
  withMiddleware(corsMiddleware, apiKeyAuthMiddleware, getAllOrdersHandler)
);

export const getOrderById = onRequest(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
      invoker: 'public',
    secrets: [API_SECRET_TOKEN],
  },
  withMiddleware(corsMiddleware, apiKeyAuthMiddleware, getOrderByIdHandler)
);

export const getOrderStats = onRequest(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
      invoker: 'public',
   secrets: [API_SECRET_TOKEN],
  },
  withMiddleware(corsMiddleware, apiKeyAuthMiddleware, getOrderStatsHandler)
);

export const ordersHealthCheck = onRequest(
  {
    region: 'us-central1',
    memory: '128MiB',
    timeoutSeconds: 10,
  },
  withMiddleware(corsMiddleware, healthCheckHandler)
);