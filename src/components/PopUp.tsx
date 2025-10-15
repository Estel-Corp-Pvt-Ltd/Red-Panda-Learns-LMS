import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PopUpCourseType } from "@/types/general";
import { POPUP_COURSE_TYPE } from "@/constants";

interface PopUpProps {
    icon?: React.ReactNode;
    title: string;
    description: string;
    type: PopUpCourseType;
    ctaText: string;
    ctaLink: string;
    autoClose?: boolean;
    duration?: number;
};

const PopUp = ({
    icon,
    title,
    description,
    type,
    ctaText,
    ctaLink,
    autoClose = false,
    duration = 5000,
}: PopUpProps) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (autoClose) {
            const timer = setTimeout(() => setVisible(false), duration);
            return () => clearTimeout(timer);
        }
    }, [autoClose, duration]);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ duration: 0.3 }}
                    className="fixed bottom-6 right-6 z-50 w-80"
                >
                    {/* Animated border wrapper */}
                    <div className="relative rounded-2xl p-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient">
                        {/* Content container */}
                        <div className="flex flex-col gap-2 rounded-2xl bg-white pt-2 pb-4 px-3 shadow-lg backdrop-blur-lg">
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setVisible(false)}
                                    className="rounded-md text-gray-500 hover:bg-gray-100"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    {
                                        icon && (
                                            <div className="text-lg text-gray-700">{icon}</div>
                                        )
                                    }
                                    <h3 className="font-semibold text-gray-900 w-fit">{title}</h3>
                                    {type === POPUP_COURSE_TYPE.LIVE && (
                                        <div className="flex items-center bg-red-300 text-white text-sm border-red-500 border-2 px-1 rounded-md">
                                            <span>
                                                {type}
                                            </span>
                                            <span className="ml-1 mt-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                        </div>
                                    )}
                                    {type === POPUP_COURSE_TYPE.SELF_PACED && (
                                        <div className="flex items-center bg-blue-300 text-white text-xs border-blue-500 border-2 px-1 rounded-md">
                                            <span>
                                                {POPUP_COURSE_TYPE.SELF_PACED.split('-')[0]}
                                            </span>
                                            <span className="ml-1 mt-1 h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 mt-1">{description}</p>
                            <a
                                href={ctaLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`mt-2 inline-block w-fit rounded-full px-3 py-1 text-sm font-medium text-white transition ${type === "LIVE"
                                    ? "bg-purple-600 hover:bg-purple-700"
                                    : "bg-blue-600 hover:bg-blue-700"
                                    }`}
                            >
                                {ctaText}
                            </a>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PopUp;
