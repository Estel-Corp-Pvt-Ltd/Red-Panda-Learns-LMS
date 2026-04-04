import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const EmptyCart: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center">
      <h2 className="text-2xl font-bold text-foreground mb-2">
        Your cart is empty 🛍️
      </h2>
      <p className="text-muted-foreground mb-6">
        Browse our courses and add something to your cart!
      </p>
      <Button asChild size="lg" className="px-6">
        <Link to="/courses">Go back to courses</Link>
      </Button>
    </div>
  );
};

export default EmptyCart;