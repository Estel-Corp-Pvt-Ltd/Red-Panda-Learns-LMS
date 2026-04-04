import { createContext, useContext, useState, ReactNode } from "react";

import LoadingSpinnerOverlay from "@/components/LogoSpinnerOverlay";

interface LoadingOverlayContextType {
    showOverlay: (message?: string) => void;
    hideOverlay: () => void;
};

const LoadingOverlayContext = createContext<LoadingOverlayContextType | undefined>(undefined);

export const useLoadingOverlay = () => {
    const context = useContext(LoadingOverlayContext);
    if (!context) {
        throw new Error("useLoadingOverlay must be used within a LoadingOverlayProvider");
    }
    return context;
};

export const LoadingOverlayProvider = ({ children }: { children: ReactNode }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [message, setMessage] = useState("Loading...");

    const showOverlay = (msg?: string) => {
        setMessage(msg || "Loading...");
        setIsVisible(true);
    };

    const hideOverlay = () => {
        setIsVisible(false);
    };

    return (
        <LoadingOverlayContext.Provider value={{ showOverlay, hideOverlay }}>
            {children}
            {isVisible && <LoadingSpinnerOverlay message={message} />}
        </LoadingOverlayContext.Provider>
    );
};
