
import { useCourseQuery } from "@/hooks/useCaching";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { TransactionLineItem } from "@/types/transaction";

import PaymentCheckout from "@/components/payment/PaymentCheckout";

export default function CheckoutPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [items, setItems] = useState<TransactionLineItem[]>([]);

  const { data, isLoading } = useCourseQuery(courseId);
  const navigate = useNavigate();

  useEffect(() => {
    if (data) {
      setItems([{
        itemId: data.id,
        itemType: "COURSE",
        name: data.title,
        amount: data.salePrice,
      }]);
    }
  }, [data]);

  const handlePaymentSuccess = (orderId: string) => {
    console.log("Payment successful! Order ID:", orderId);
    navigate("/dashboard");
  }

  return <PaymentCheckout items={items} onPaymentSuccess={handlePaymentSuccess} />;
}
