
import { useCourseQuery } from "@/hooks/useCaching";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { TransactionLineItem } from "@/types/transaction";

import PaymentCheckout from "@/components/payment/PaymentCheckout";

export default function CheckoutPage() {
  const { param } = useParams<{ param: string }>();

  const { data: course } = useCourseQuery(param!);
  
  useEffect(() => {
    if (!user || !courseId || loadingEnrollments) return;

    if (isEnrolled(courseId)) {
      navigate(`/course/${course.url ? course.url : course.id}`);
    }
  }, [user, courseId, loadingEnrollments, navigate]);

  const [items, setItems] = useState<TransactionLineItem[]>([]);

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
