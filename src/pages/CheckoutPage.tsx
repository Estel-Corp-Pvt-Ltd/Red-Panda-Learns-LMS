import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { useToast } from "@/hooks/use-toast";
import { useCourseQuery } from "@/hooks/useCaching";
import { paymentService } from "@/services/paymentService";
import { ArrowLeft, CreditCard, Lock, RefreshCw, Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MapPin, Building2 } from "lucide-react";
import { Header } from "@/components/Header";
import { couponService } from "@/services/couponService";
import { couponUsageService } from "@/services/couponUsageService";
import { TransactionLineItem } from "@/types/transaction";

import { Input } from "@/components/ui/input";
import {
  ADDRESS_TYPE,
  CURRENCY,
  ENROLLED_PROGRAM_TYPE,
  PAYMENT_PROVIDER,
} from "@/constants";
import { Coupon } from "@/types/coupon";
import { Currency, PaymentProvider } from "@/types/general";
import { Address } from "@/types/order";

import { Timestamp } from "firebase/firestore";
import { METHOD_LOGOS } from "@/payment-method-logos";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import PaymentCheckout from "@/components/payment/PaymentCheckout";
import { Course } from "@/types/course";

export default function CheckoutPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [items, setItems] = useState<TransactionLineItem[]>([]);

  const { data, isLoading } = useCourseQuery(courseId);

  useEffect(() => {
    if (data) {
      setCourse(data);
      setItems([{
        itemId: data.id,
        itemType: "COURSE",
        name: data.title,
        amount: data.salePrice,
      }]);
    }
  }, [data]);

  return <PaymentCheckout items={items} />;
}
