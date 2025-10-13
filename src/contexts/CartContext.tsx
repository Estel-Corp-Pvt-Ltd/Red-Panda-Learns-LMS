import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
  useState,
} from "react";
import { courseService } from "@/services/courseService";
import { Course } from "@/types/course";
import { useAuth } from "./AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { COLLECTION } from "@/constants";
import { CART_ACTIONS } from "@/types/cart";

export interface CartItem {
  courseId: string;
}

type Action =
  | { type: typeof CART_ACTIONS.ADD; item: CartItem }
  | { type: typeof CART_ACTIONS.REMOVE; id: string }
  | { type: typeof CART_ACTIONS.CLEAR }
  | { type: typeof CART_ACTIONS.SET_CART; payload: CartItem[] };

function cartReducer(state: CartItem[], action: Action): CartItem[] {
  switch (action.type) {
    case CART_ACTIONS.ADD:
      return state.some((c) => c.courseId === action.item.courseId)
        ? state
        : [...state, action.item];
    case CART_ACTIONS.REMOVE:
      return state.filter((c) => c.courseId !== action.id);
    case CART_ACTIONS.CLEAR:
      return [];
    case CART_ACTIONS.SET_CART:
      return action.payload || [];
    default:
      return state;
  }
}

interface CartContextType {
  cart: CartItem[];
  cartCourses: Course[]; // fetched course details
  loading: boolean;
  cartDispatch: React.Dispatch<Action>;
  fetchCourses: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "cart";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  // Initialize cart from localStorage
  const [cart, cartDispatch] = useReducer(cartReducer, [], () => {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    return storedCart ? JSON.parse(storedCart) : [];
  });

  const [cartCourses, setCartCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  // --- Sync cart to Firebase whenever it changes ---
  useEffect(() => {
    if (!user) return;
    const timeout = setTimeout(async () => {
      await setDoc(doc(db, COLLECTION.CARTS, user.id), { courses: cart });
    }, 300);

    return () => clearTimeout(timeout);
  }, [cart, user]);

  // Load cart from Firebase on mount ---
  useEffect(() => {
    if (!user) return;

    const loadCart = async () => {
      try {
        const cartDoc = await getDoc(doc(db, COLLECTION.CARTS, user.id));
        if (cartDoc.exists()) {
          const data = cartDoc.data();
          if (data?.courses) {
            cartDispatch({ type: CART_ACTIONS.CLEAR }); // clear initial local cart
            data.courses.forEach((item: CartItem) =>
              cartDispatch({ type: CART_ACTIONS.ADD, item })
            );
          }
        }
      } catch (err) {
        console.error("Failed to load cart from Firebase:", err);
      }
    };

    loadCart();
  }, [user]);

  // Fetch all course details whenever cart changes
  const fetchCourses = async () => {
    if (cart.length === 0) {
      setCartCourses([]);
      return;
    }

    setLoading(true);
    try {
      const courseIds = cart.map((item) => item.courseId);
      console.log(courseIds);
      const fetchedCourses = await courseService.getCoursesByIds(courseIds);
      console.log(fetchedCourses);
      setCartCourses(fetchedCourses);
    } catch (error) {
      console.error("Error fetching course data:", error);
      setCartCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Refetch courses whenever cart changes
  useEffect(() => {
    fetchCourses();
  }, [cart]);

  return (
    <CartContext.Provider value={{ cart, cartCourses, loading, cartDispatch, fetchCourses }}>
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
