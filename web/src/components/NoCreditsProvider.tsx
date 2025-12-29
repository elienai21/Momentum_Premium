// web/src/components/NoCreditsProvider.tsx
import React, { useState, useEffect, createContext, useContext } from "react";
import { BuyCreditsModal } from "./BuyCreditsModal";

interface NoCreditsContextValue {
    openModal: () => void;
    closeModal: () => void;
}

const NoCreditsContext = createContext<NoCreditsContextValue>({
    openModal: () => { },
    closeModal: () => { },
});

export const useNoCredits = () => useContext(NoCreditsContext);

/**
 * Provider that listens for 'no-credits' events (dispatched by API interceptor)
 * and shows the BuyCreditsModal.
 */
export const NoCreditsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleNoCredits = () => {
            setIsOpen(true);
        };

        window.addEventListener("no-credits", handleNoCredits);
        return () => window.removeEventListener("no-credits", handleNoCredits);
    }, []);

    const openModal = () => setIsOpen(true);
    const closeModal = () => setIsOpen(false);

    return (
        <NoCreditsContext.Provider value={{ openModal, closeModal }}>
            {children}
            <BuyCreditsModal open={isOpen} onClose={closeModal} />
        </NoCreditsContext.Provider>
    );
};

export default NoCreditsProvider;
