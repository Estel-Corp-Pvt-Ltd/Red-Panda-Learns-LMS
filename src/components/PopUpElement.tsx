"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { POPUP_COURSE_TYPE } from "@/constants";
import { PopUp } from "@/types/pop-up";

type Props = Partial<PopUp> & {
  onDone?: () => void; // callback after exit animation completes
};

const PopUpElement = ({
  icon,
  title,
  description,
  type,
  ctaText,
  ctaLink,
  autoClose = false,
  duration = 5000,
  onDone,
}: Props) => {
  const [visible, setVisible] = useState(() => {
    const saved = localStorage.getItem("popupHideTime");
    if (saved) {
      const savedTime = Number(saved);
      const now = Date.now();

      const twentyFourHours = 12 * 60 * 60 * 1000; // ms in 12h

      if (now - savedTime > twentyFourHours) {
        return true;
      } else {
        return false;
      }
    }
    return true;
  });

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration]);

  const isLive = type === POPUP_COURSE_TYPE.LIVE;
  const isSelfPaced = type === POPUP_COURSE_TYPE.SELF_PACED;

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotate: 5 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="z-50 w-80 sm:w-96"
        >
          <div className="relative">
            {/* Animated blob background - Main blob */}
            <motion.div
              className={`absolute inset-0 ${isLive
                ? "bg-gradient-to-br from-red-400 via-pink-400 to-orange-400"
                : isSelfPaced
                  ? "bg-gradient-to-br from-blue-400 via-purple-400 to-cyan-400"
                  : "bg-gradient-to-br from-purple-400 via-pink-400 to-indigo-400"
                } rounded-[40%_60%_70%_30%/40%_50%_60%_50%] blur-2xl opacity-30`}
              animate={{
                borderRadius: [
                  "40% 60% 70% 30% / 40% 50% 60% 50%",
                  "60% 40% 30% 70% / 50% 60% 40% 50%",
                  "40% 60% 70% 30% / 40% 50% 60% 50%",
                ],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Secondary blob for extra depth */}
            <motion.div
              className={`absolute inset-0 ${isLive
                ? "bg-gradient-to-tl from-pink-300 to-red-300"
                : isSelfPaced
                  ? "bg-gradient-to-tl from-cyan-300 to-blue-300"
                  : "bg-gradient-to-tl from-indigo-300 to-purple-300"
                } rounded-[60%_40%_30%_70%/60%_30%_70%_40%] blur-2xl opacity-20`}
              animate={{
                borderRadius: [
                  "60% 40% 30% 70% / 60% 30% 70% 40%",
                  "30% 60% 70% 40% / 50% 60% 30% 60%",
                  "60% 40% 30% 70% / 60% 30% 70% 40%",
                ],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
            />

            {/* Card */}
            <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 backdrop-blur-sm">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {icon && (
                    <motion.div
                      className={`p-3 rounded-2xl ${isLive
                        ? "bg-gradient-to-br from-red-500 to-pink-500"
                        : isSelfPaced
                          ? "bg-gradient-to-br from-blue-500 to-purple-500"
                          : "bg-gradient-to-br from-purple-500 to-indigo-500"
                        } text-white text-2xl shadow-lg`}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{
                        scale: 1,
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{
                        scale: {
                          type: "spring",
                          stiffness: 200,
                          delay: 0.2,
                        },
                        rotate: {
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 1.2,
                        },
                      }}
                    >
                      {icon}
                    </motion.div>
                  )}
                  <div>
                    <motion.h3
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="font-bold text-lg text-gray-900 dark:text-white leading-tight"
                    >
                      {title}
                    </motion.h3>
                    {isLive && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, type: "spring" }}
                        className="flex items-center gap-1.5 mt-1"
                      >
                        <motion.div
                          className="w-2 h-2 bg-red-500 rounded-full"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <span className="text-xs font-bold text-red-500 uppercase tracking-wide">
                          Live Now
                        </span>
                      </motion.div>
                    )}
                    {isSelfPaced && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, type: "spring" }}
                        className="flex items-center gap-1.5 mt-1"
                      >
                        <motion.div
                          className="w-2 h-2 bg-blue-500 rounded-full"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [1, 0.5, 1],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">
                          {POPUP_COURSE_TYPE.SELF_PACED.split("-")[0]}
                        </span>
                      </motion.div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setVisible(false)
                    localStorage.setItem("popupHideTime", Date.now().toString());
                  }}
                  className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:rotate-90"
                  aria-label="Close notification"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
              >
                {description}
              </motion.p>

              {/* CTA Button */}
              {ctaText && ctaLink && (
                <motion.a
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  href={ctaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group relative overflow-hidden flex items-center justify-center gap-2 w-full ${isLive
                    ? "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                    : isSelfPaced
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                      : "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
                    } text-white font-semibold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]`}
                >
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                  />

                  <span className="relative z-10">{ctaText}</span>
                  <motion.svg
                    className="relative z-10 w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={{ x: [0, 5, 0] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </motion.svg>
                </motion.a>
              )}

              {/* Auto-close progress bar */}
              {autoClose && (
                <div className="relative h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${isLive
                      ? "bg-gradient-to-r from-red-500 via-pink-500 to-red-500"
                      : isSelfPaced
                        ? "bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"
                        : "bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500"
                      }`}
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: duration / 1000, ease: "linear" }}
                    style={{ transformOrigin: "left" }}
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PopUpElement;
