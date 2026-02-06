import { useCourseQuery } from "@/hooks/useCaching";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { TransactionLineItem } from "@/types/transaction";

import PaymentCheckout from "@/components/payment/PaymentCheckout";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { useAuth } from "@/contexts/AuthContext";
import { ENROLLED_PROGRAM_TYPE } from "@/constants";

export default function CheckoutPage() {
  const { param } = useParams<{ param: string }>();
  const { isEnrolled, loading } = useEnrollment();
  const { data: course, isLoading } = useCourseQuery(param!); // Assuming useCourseQuery is providing isLoading state
  const { user } = useAuth();
  const navigate = useNavigate();

  // Prevent errors if course is undefined or loading
  useEffect(() => {
    if (!user || !course || isLoading || loading) return;

    // Check if the user is already enrolled
    if (isEnrolled(course.id)) {
      navigate(`/course/${course.slug ? course.slug : course.id}`);
    }
  }, [user, course, isLoading, loading, navigate, isEnrolled]);

  const [items, setItems] = useState<TransactionLineItem[]>([]);

  useEffect(() => {
    if (course) {
      setItems([
        {
          itemId: course.id,
          itemType: ENROLLED_PROGRAM_TYPE.COURSE,
          name: course.title,
          amount: course.salePrice,
        },
      ]);
    }
  }, [course]);

  const handlePaymentSuccess = (orderId: string) => {
    console.log("Payment successful! Order ID:", orderId);
    navigate("/dashboard");
  };

  if (isLoading || loading) {
    return <div>Loading...</div>; // Loading state handling
  }

  if (!course) {
    return <div>Course not found.</div>; // Handling when the course is not found
  }

  return <PaymentCheckout items={items} onPaymentSuccess={handlePaymentSuccess} />;
}
