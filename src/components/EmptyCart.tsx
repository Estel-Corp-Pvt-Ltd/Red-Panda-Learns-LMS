import React from "react";
import { Link } from "react-router-dom";

const EmptyCart: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center">
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">
        Your cart is empty 🛍️
      </h2>
      <p className="text-gray-500 mb-6">
        Browse our courses and add something to your cart!
      </p>
      <Link
        to="/courses"
        className="px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
      >
        Go back to courses
      </Link>
    </div>
  );
};

export default EmptyCart;
