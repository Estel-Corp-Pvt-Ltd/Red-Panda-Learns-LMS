import * as functions from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';

const PAYPAL_CLIENT_ID = defineSecret("PAYPAL_CLIENT_ID");
const PAYPAL_CLIENT_SECRET = defineSecret("PAYPAL_CLIENT_SECRET");

export interface PayPalOrder {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export interface PayPalCapture {
  id: string;
  status: string;
  amount: {
    value: string;
    currency_code: string;
  };
}

export class PayPalService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.paypal.com'
      : 'https://api.sandbox.paypal.com';
  }

  /**
   * Create a PayPal order
   */
  async createOrder(
    amount: number,
    currency: string,
    orderId: string,
    items: Array<{ name: string; description: string; amount: number }>
  ): Promise<PayPalOrder> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: orderId,
            description: 'Course Purchase',
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
              breakdown: {
                item_total: {
                  currency_code: currency,
                  value: amount.toFixed(2)
                }
              }
            },
            items: items.map(item => ({
              name: item.name.substring(0, 127), // PayPal limit
              description: item.description?.substring(0, 127) || '',
              quantity: 1,
              unit_amount: {
                currency_code: currency,
                value: item.amount.toFixed(2)
              },
              category: 'DIGITAL_GOODS'
            }))
          }],
          application_context: {
            return_url: 'https://yourapp.com/payment/success',
            cancel_url: 'https://yourapp.com/payment/cancel',
            brand_name: 'Vizuara AI Labs',
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            payment_method: {
              payer_selected: 'PAYPAL',
              payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
            }
          }
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`PayPal API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      functions.logger.info('✅ PayPal order created:', { orderId: data.id });
      return data;

    } catch (error: any) {
      functions.logger.error('❌ PayPal create order failed:', error);
      throw new Error(`Failed to create PayPal order: ${error.message}`);
    }
  }

  /**
   * Capture a PayPal payment
   */
  async capturePayment(orderId: string): Promise<PayPalCapture> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'return=representation'
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`PayPal capture error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      functions.logger.info('✅ PayPal payment captured:', { captureId: data.id });
      return data;

    } catch (error: any) {
      functions.logger.error('❌ PayPal capture payment failed:', error);
      throw new Error(`Failed to capture PayPal payment: ${error.message}`);
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`PayPal API error: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      functions.logger.error('❌ PayPal get order failed:', error);
      throw error;
    }
  }

  /**
   * Get access token for API calls
   */
  private async getAccessToken(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID.value()}:${PAYPAL_CLIENT_SECRET.value()}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`PayPal auth error: ${response.status}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error: any) {
      functions.logger.error('❌ PayPal auth failed:', error);
      throw new Error('Failed to authenticate with PayPal');
    }
  }
}

export const paypalService = new PayPalService();
