import React, { createContext, useContext } from "react";
import { useBooks } from "../hooks/useBooks";

export type BooksContextType = ReturnType<typeof useBooks>;

const BooksContext = createContext<BooksContextType | null>(null);

export const BooksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const books = useBooks();
  return <BooksContext.Provider value={books}>{children}</BooksContext.Provider>;
};

export const useBooksContext = () => {
  const context = useContext(BooksContext);
  if (!context) {
    throw new Error("useBooksContext must be used within a BooksProvider");
  }
  return context;
};
