"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export interface CartItem {
  id: string; // unique key in cart: `${productId}_${variantId ?? "base"}`
  productId: string;
  variantId?: string | null;
  name: string;
  variantName?: string | null;
  price: number;
  compareAtPrice?: number | null;
  imageUrl?: string | null;
  quantity: number;
  maxQuantity?: number;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  storeSlug: string;
  storeName: string;
  currencySymbol: string;
  whatsappNumber?: string | null;
  whatsappEnabled: boolean;
  addItem: (item: Omit<CartItem, "id">, openDrawer?: boolean) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({
  children,
  storeSlug,
  storeName,
  currencySymbol,
  whatsappNumber,
  whatsappEnabled,
}: {
  children: React.ReactNode;
  storeSlug: string;
  storeName: string;
  currencySymbol: string;
  whatsappNumber?: string | null;
  whatsappEnabled: boolean;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const storageKey = `shopper_cart_${storeSlug}`;

  // Load cart from localStorage on client mount. This has to be an effect
  // (not a lazy useState initializer) because the server always renders an
  // empty cart — reading localStorage during the initial client render
  // instead would mismatch that and trigger a hydration error. The
  // `isHydrated` guard means this only ever fires once per mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from an external store (localStorage) on mount, not a derived-state update
        setItems(JSON.parse(stored));
      }
    } catch {
      // ignore storage errors
    }
    setIsHydrated(true);
  }, [storageKey]);

  // Save cart to localStorage on changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // ignore storage errors
    }
  }, [items, isHydrated, storageKey]);

  const addItem = (item: Omit<CartItem, "id">, openDrawer = true) => {
    const id = `${item.productId}_${item.variantId ?? "base"}`;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        const nextQty = existing.quantity + item.quantity;
        const cappedQty = item.maxQuantity ? Math.min(nextQty, item.maxQuantity) : nextQty;
        return prev.map((i) => (i.id === id ? { ...i, quantity: cappedQty } : i));
      }
      return [...prev, { ...item, id }];
    });

    if (openDrawer) {
      setIsOpen(true);
    }
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const cappedQty = item.maxQuantity ? Math.min(quantity, item.maxQuantity) : quantity;
          return { ...item, quantity: cappedQty };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        isOpen,
        storeSlug,
        storeName,
        currencySymbol,
        whatsappNumber,
        whatsappEnabled,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        toggleCart: () => setIsOpen((prev) => !prev),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
