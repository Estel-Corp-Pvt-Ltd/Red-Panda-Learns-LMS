import React, { useEffect, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import CartItemCard from "@/components/CartItemCard";
import EmptyCart from "@/components/EmptyCart";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";

const CartPage: React.FC = () => {
  const { cart, courses, fetchCourses, dispatch, loading } = useCart();
  const [totalAmount, setTotalAmount] = useState(0);
  const [regularTotal, setRegularTotal] = useState(0);
  const [savings, setSavings] = useState(0);


  // Calculate totals and savings
  useEffect(() => {
    if (!courses || courses.length === 0) {
      setTotalAmount(0);
      setRegularTotal(0);
      setSavings(0);
      return;
    }

    const regTotal = courses.reduce((sum, c) => sum + (c.regularPrice ?? 0), 0);
    const saleTotal = courses.reduce(
      (sum, c) => sum + (c.salePrice ?? c.regularPrice ?? 0),
      0
    );

    setRegularTotal(regTotal);
    setTotalAmount(saleTotal);
    setSavings(regTotal - saleTotal);
  }, [courses]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="w-full max-w-5xl mx-auto mt-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Your Cart</h1>
          <button
            onClick={() => dispatch({ type: "CLEAR" })}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-md transition-colors"
          >
            Clear Cart
          </button>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex justify-center items-center min-h-[20rem]">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="flex justify-center items-center min-h-[20rem]">
            <EmptyCart />
          </div>
        ) : (
          <div className="flex flex-col space-y-6">
            {/* Cart Items */}
            <div className="space-y-4">
              {courses.map((course) => (
                <CartItemCard key={course.courseId} item={course} />
              ))}
            </div>

            {/* Totals Section */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-6 p-6 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
              <div className="mb-4 sm:mb-0">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Total: ${totalAmount.toFixed(2)}
                </h2>
                {regularTotal > totalAmount && (
                  <p className="text-sm text-green-600 mt-1">
                    You save ${savings.toFixed(2)} today!
                  </p>
                )}
              </div>
              <div>
                <Button className="px-6 py-3 font-medium w-full sm:w-auto" disabled>
                  Checkout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
