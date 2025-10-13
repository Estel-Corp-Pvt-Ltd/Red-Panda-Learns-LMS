import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
  useState,
} from "react";
import { courseService } from "@/services/courseService";

export interface CartItem {
  courseId: string;
}

type Action =
  | { type: "ADD"; item: CartItem }
  | { type: "REMOVE"; id: string }
  | { type: "CLEAR" };

function cartReducer(state: CartItem[], action: Action): CartItem[] {
  switch (action.type) {
    case "ADD":
      return state.some((c) => c.courseId === action.item.courseId)
        ? state
        : [...state, action.item];
    case "REMOVE":
      return state.filter((c) => c.courseId !== action.id);
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

interface CartContextType {
  cart: CartItem[];
  courses: any[]; // fetched course details
  loading: boolean;
  dispatch: React.Dispatch<Action>;
  fetchCourses: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "cart";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  // Initialize cart from localStorage
  const [cart, dispatch] = useReducer(cartReducer, [], () => {
    if (typeof window === "undefined") return []; // SSR safety
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    return storedCart ? JSON.parse(storedCart) : [];
  });

  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  // Fetch all course details whenever cart changes
  const fetchCourses = async () => {
    if (cart.length === 0) {
      setCourses([]);
      return;
    }

    setLoading(true);
    try {
      const fetchedCourses = await Promise.all(
        cart.map((item) => courseService.getCourseById(item.courseId))
      );

      setCourses(fetchedCourses.filter(Boolean));
    } catch (error) {
      console.error("Error fetching course data:", error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Refetch courses whenever cart changes
  useEffect(() => {
    fetchCourses();
  }, [cart]);

  return (
    <CartContext.Provider value={{ cart, courses, loading, dispatch, fetchCourses }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context)
    throw new Error("useCart must be used within a CartProvider");
  return context;
};
