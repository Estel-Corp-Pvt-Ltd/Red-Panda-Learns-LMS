import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WORDS = ["right", "fun", "epic", "yours", "bold", "wild"];
const INTERVAL = 2400;

export function WordRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % WORDS.length);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="word-rotator-wrapper">
      <AnimatePresence mode="wait">
        <motion.span
          key={WORDS[index]}
          className="word-rotator-pill"
          initial={{ y: 40, opacity: 0, scale: 0.8, rotateX: 90 }}
          animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
          exit={{ y: -40, opacity: 0, scale: 0.8, rotateX: -90 }}
          transition={{
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
