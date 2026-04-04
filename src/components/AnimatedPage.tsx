import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

export default function AnimatedPage({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  );
}
