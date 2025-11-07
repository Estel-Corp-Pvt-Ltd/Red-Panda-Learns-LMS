import React, { useEffect, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import CartItemCard from "@/components/CartItemCard";
import EmptyCart from "@/components/EmptyCart";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CART_ACTION } from "@/constants";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CartPage: React.FC = () => {
  const { cartCourses, cartBundles, cartDispatch, loading } = useCart();
  const { toast } = useToast();
  const [totalAmount, setTotalAmount] = useState(0);
  const [regularTotal, setRegularTotal] = useState(0);
  const [savings, setSavings] = useState(0);
  const navigate = useNavigate();

  // Calculate totals and savings
  useEffect(() => {
    const regTotal = cartCourses.reduce((sum, c) => sum + (c.regularPrice ?? 0), 0) + cartBundles.reduce((sum, b) => sum + (b.regularPrice ?? 0), 0);
    const saleTotal = cartCourses.reduce(
      (sum, c) => sum + (c.salePrice ?? c.regularPrice ?? 0),
      0
    ) + cartBundles.reduce(
      (sum, b) => sum + (b.salePrice ?? b.regularPrice ?? 0),
      0
    );

    setRegularTotal(regTotal);
    setTotalAmount(saleTotal);
    setSavings(regTotal - saleTotal);
  }, [cartCourses]);

  const handleClearCart = () => {
    toast({
      title: "Courses removed",
      description: `All courses removed from your cart.`,
    });
    cartDispatch({ type: CART_ACTION.CLEAR });
  };

  const handleCheckout = () => {
    navigate("checkout");
  };

  const itemCount = cartCourses?.length + cartBundles?.length;
  const hasDiscount = regularTotal > totalAmount;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Page heading */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Your Cart
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </div>

          <Button
            variant="destructive"
            onClick={handleClearCart}
            
            className="w-full sm:w-auto"
          >
            Clear Cart
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center min-h-[20rem]">
            {/* Theme-aware spinner */}
            <div
              className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin"
              aria-label="Loading"
            />
          </div>
        ) : itemCount === 0 ? (
          <div className="flex justify-center items-center min-h-[20rem]">
            <EmptyCart />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items */}
            <Card className="lg:col-span-2 bg-card text-card-foreground border border-border shadow-sm rounded-xl">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-lg font-semibold">Items</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  {cartBundles.map((bundle) => (
                    <div
                      key={bundle.id}
                      className="rounded-lg border border-border bg-background/60 hover:bg-background transition-colors"
                    >
                      <CartItemCard item={bundle} type="BUNDLE" />
                    </div>
                  ))}
                  {cartCourses.map((course) => (
                    <div
                      key={course.id}
                      className="rounded-lg border border-border bg-background/60 hover:bg-background transition-colors"
                    >
                      <CartItemCard item={course} type="COURSE" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-card text-card-foreground border border-border shadow-sm rounded-xl lg:sticky lg:top-24 h-fit">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-lg font-semibold">
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{regularTotal.toFixed(2)}</span>
                </div>

                {hasDiscount && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Savings</span>
                    <span className="text-green-600 dark:text-green-500">
                      -₹{savings.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="h-px w-full bg-border my-2" />

                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>

                <Button
                  className="w-full mt-2"
                  size="lg"
                  onClick={handleCheckout}
                >
                  Checkout
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default CartPage;
