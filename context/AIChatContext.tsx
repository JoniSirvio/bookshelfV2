import React, { createContext, useCallback, useContext, useState } from 'react';
import type { FinnaSearchResult } from '../api/finna';
import type { ChatMessage } from '../api/gemini';
import AskAIAboutBookModal from '../components/AskAIAboutBookModal';

interface AIChatContextType {
    book: FinnaSearchResult | null;
    initialConversation: ChatMessage[];
    isModalVisible: boolean;
    openAIModal: (book: FinnaSearchResult, initialConversation?: ChatMessage[]) => void;
    closeAIModal: () => void;
}

const AIChatContext = createContext<AIChatContextType | null>(null);

export const AIChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [book, setBook] = useState<FinnaSearchResult | null>(null);
    const [initialConversation, setInitialConversation] = useState<ChatMessage[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const openAIModal = useCallback((bookToOpen: FinnaSearchResult, initial?: ChatMessage[]) => {
        setBook(bookToOpen);
        setInitialConversation(initial ?? []);
        setIsModalVisible(true);
    }, []);

    const closeAIModal = useCallback(() => {
        setIsModalVisible(false);
        setBook(null);
        setInitialConversation([]);
    }, []);

    return (
        <AIChatContext.Provider
            value={{
                book,
                initialConversation,
                isModalVisible,
                openAIModal,
                closeAIModal,
            }}
        >
            {children}
        </AIChatContext.Provider>
    );
};

export const useAIChat = () => {
    const context = useContext(AIChatContext);
    if (!context) {
        throw new Error('useAIChat must be used within an AIChatProvider');
    }
    return context;
};

/** Renders the AI chat modal; place above the navigator so it appears on top of all screens. */
export const AIChatModalHost: React.FC = () => {
    const { book, initialConversation, isModalVisible, closeAIModal } = useAIChat();
    return (
        <AskAIAboutBookModal
            isVisible={isModalVisible}
            onClose={closeAIModal}
            book={book}
            initialConversation={initialConversation}
        />
    );
};
