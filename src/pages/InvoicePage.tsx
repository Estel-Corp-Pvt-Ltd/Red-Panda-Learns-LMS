import { InvoiceComponent } from '@/components/Invoice';
import { orderService } from '@/services/orderService';
import { Address, Order } from '@/types/order';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const InvoicePage: React.FC = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    // Fetch order data based on orderId
    const fetchOrder = async () => {
      try {
        const result = await orderService.getOrderById(orderId as string);
        if (result) {
          console.log('Fetched order:', result);
          setOrder(result);
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      }
    };
    fetchOrder();
  }, [orderId]);

  const formatAddress = (address: Address) => {
    if (!address) return null;
    return {
      name: address.fullName,
      address: {
        line1: (address.line1 || ""),
        city: address.city,
        state: address.state,
        country: address.country,
        postalCode: address.postalCode,
      }
    }
  };

  if (!order) {
    return <div>Loading...</div>;
  }


  const invoiceData = {
    // Invoice basic info
    invoiceNumber: order.orderId.replace('order_', 'INV-'),
    invoiceDate: "2024-01-15",
    // Billing and shipping
    billTo: formatAddress(order?.billingAddress),
    shipTo: formatAddress(order?.shippingAddress),

    // Items
    items: order.items.map(item => ({
      description: item.name,
      quantity: 1,
      rate: item.amount - (item.amount) * 0.18,
      hsnSac: "998314",
      gstPercentage: 18,
      gstAmount: (item.amount) * 0.18,
      amount: item.amount
    })),

    // Financial calculations
    subtotal: order.items.reduce((acc, item) => acc + item.amount, 0) - order.items.reduce((acc, item) => acc + (item.amount) * 0.18, 0),
    totalTax: order.items.reduce((acc, item) => acc + (item.amount) * 0.18, 0),
    total: order.amount,
    currency: order.currency,
    paymentMade: order.amount,
    balanceDue: 0,
    // note: "Bank Name: State Bank of India\nBranch: Main Branch\nAccount No: 12345678901\nRTGS/NEFT IFSC: SBIN0001234"
  };

  return (
    <div className='mx-auto max-w-5xl'>
      <InvoiceComponent invoiceData={invoiceData} />
    </div>
  )
}

export default InvoicePage
