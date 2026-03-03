"use client";

import { useState } from "react";
import { InventoryList } from "./_components/inventory-list";
import { CartSheet } from "./_components/cart-sheet";

interface CartItem {
  skuId: number;
  sku: string;
  name: string;
  quantity: number;
  maxQuantity: number;
}

export default function InventoryPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm">
            View stock levels and consume items
          </p>
        </div>
        <CartSheet cart={cart} setCart={setCart} />
      </div>

      <InventoryList cart={cart} setCart={setCart} />
    </div>
  );
}
