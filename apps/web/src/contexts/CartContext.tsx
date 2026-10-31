import { createContext, useCallback, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';

/** Display-only snapshot of an ebook. The server re-prices everything at checkout. */
export interface CartEbook {
  id: string;
  title: string;
  author: string | null;
  price: number;
  currency: string;
  file_format: 'PDF' | 'EPUB' | null;
  cover_image_url: string | null;
}

export interface CartItem {
  ebook: CartEbook;
  quantity: number;
  addedAt: string;
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  addItem: (ebook: Omit<CartEbook, 'currency'> & { currency?: string }) => void;
  removeItem: (ebookId: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
}

const CART_KEY = 'ebook-cart';

const CartContext = createContext<CartContextType | undefined>(undefined);

function toCartEbook(raw: unknown): CartEbook | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.id !== 'string' || !e.id) return null;
  const price = Number(e.price);
  return {
    id: e.id,
    title: typeof e.title === 'string' ? e.title : 'Untitled',
    author: typeof e.author === 'string' ? e.author : null,
    price: Number.isFinite(price) ? price : 0,
    currency: typeof e.currency === 'string' && e.currency ? e.currency : 'USD',
    file_format: e.file_format === 'PDF' || e.file_format === 'EPUB' ? e.file_format : null,
    cover_image_url: typeof e.cover_image_url === 'string' ? e.cover_image_url : null,
  };
}

function loadCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(CART_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const result: CartItem[] = [];
    for (const entry of parsed) {
      const ebook = toCartEbook((entry as { ebook?: unknown })?.ebook);
      if (!ebook || seen.has(ebook.id)) continue;
      seen.add(ebook.id);
      const addedAt = (entry as { addedAt?: unknown }).addedAt;
      result.push({
        ebook,
        quantity: 1,
        addedAt: typeof addedAt === 'string' ? addedAt : new Date().toISOString(),
      });
    }
    return result;
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isOpen, setIsOpen] = useState(false);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable; cart stays in memory */
    }
  }, [items]);

  const addItem = useCallback<CartContextType['addItem']>((input) => {
    const ebook = toCartEbook(input);
    if (!ebook) return;
    setItems((currentItems) => {
      // Digital products: never more than one of each
      if (currentItems.some((item) => item.ebook.id === ebook.id)) return currentItems;
      return [...currentItems, { ebook, quantity: 1, addedAt: new Date().toISOString() }];
    });
  }, []);

  const removeItem = useCallback((ebookId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.ebook.id !== ebookId));
  }, []);

  const clearCart = useCallback(() => {
    setItems((currentItems) => (currentItems.length === 0 ? currentItems : []));
  }, []);

  const toggleCart = useCallback(() => {
    setIsOpen((open) => !open);
  }, []);

  const value = useMemo<CartContextType>(() => {
    const totalItems = items.reduce((total, item) => total + item.quantity, 0);
    const totalPrice = items.reduce((total, item) => total + item.ebook.price * item.quantity, 0);
    return {
      items,
      totalItems,
      totalPrice,
      isOpen,
      addItem,
      removeItem,
      clearCart,
      toggleCart,
    };
  }, [items, isOpen, addItem, removeItem, clearCart, toggleCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
