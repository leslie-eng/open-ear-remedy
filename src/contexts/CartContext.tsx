import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Ebook {
  id: string;
  title: string;
  author: string;
  price: number;
  file_format: 'PDF' | 'EPUB';
  cover_image_url: string;
}

interface CartItem {
  ebook: Ebook;
  quantity: number;
  addedAt: string;
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  addItem: (ebook: Ebook) => void;
  removeItem: (ebookId: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('ebook-cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('ebook-cart', JSON.stringify(items));
  }, [items]);

  const addItem = (ebook: Ebook) => {
    setItems(currentItems => {
      // Check if item already exists
      const existingItem = currentItems.find(item => item.ebook.id === ebook.id);
      
      if (existingItem) {
        // For digital products, we don't increase quantity, just show it's already in cart
        return currentItems;
      }
      
      // Add new item
      return [...currentItems, {
        ebook,
        quantity: 1,
        addedAt: new Date().toISOString()
      }];
    });
  };

  const removeItem = (ebookId: string) => {
    setItems(currentItems => currentItems.filter(item => item.ebook.id !== ebookId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const toggleCart = () => {
    setIsOpen(!isOpen);
  };

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = items.reduce((total, item) => total + (item.ebook.price * item.quantity), 0);

  const value: CartContextType = {
    items,
    totalItems,
    totalPrice,
    isOpen,
    addItem,
    removeItem,
    clearCart,
    toggleCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}