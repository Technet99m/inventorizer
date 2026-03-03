"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  Trash,
  Plus,
  Minus,
} from "@phosphor-icons/react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface CartItem {
  skuId: number;
  sku: string;
  name: string;
  quantity: number;
  maxQuantity: number;
}

interface CartSheetProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

export function CartSheet({ cart, setCart }: CartSheetProps) {
  const utils = api.useUtils();
  const addTransaction = api.inventory.addTransaction.useMutation({
    onSuccess: () => {
      utils.inventory.getAllSKUs.invalidate().catch(() => {});
      utils.inventory.getAllTransactions.invalidate().catch(() => {});
    },
  });

  const updateQuantity = (skuId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.skuId !== skuId) return item;
          const newQty = Math.max(0, Math.min(item.maxQuantity, item.quantity + delta));
          return { ...item, quantity: newQty };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const setQuantity = (skuId: number, quantity: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.skuId !== skuId) return item;
          const newQty = Math.max(0, Math.min(item.maxQuantity, quantity));
          return { ...item, quantity: newQty };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (skuId: number) => {
    setCart((prev) => prev.filter((item) => item.skuId !== skuId));
  };

  const consumeCart = async () => {
    if (cart.length === 0) return;

    try {
      await Promise.all(
        cart.map((item) =>
          addTransaction.mutateAsync({
            skuId: item.skuId,
            quantity: item.quantity,
            type: "removal",
          })
        )
      );
      toast.success("Items consumed successfully!");
      setCart([]);
    } catch {
      toast.error("Failed to consume items");
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ShoppingCart className="size-4" />
          <span className="hidden sm:inline">Cart</span>
          {totalItems > 0 && (
            <Badge variant="default" className="ml-1">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Consumption Cart</SheetTitle>
          <SheetDescription>
            Add items to consume from inventory
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {cart.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Your cart is empty
            </p>
          ) : (
            <div className="space-y-4 px-4">
              {cart.map((item) => (
                <div
                  key={item.skuId}
                  className="flex items-start justify-between gap-3 border-b border-border pb-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-muted-foreground text-xs">
                      SKU: {item.sku}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Max: {item.maxQuantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => updateQuantity(item.skuId, -1)}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        setQuantity(item.skuId, parseInt(e.target.value) || 0)
                      }
                      className="w-14 text-center h-7"
                      min={1}
                      max={item.maxQuantity}
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => updateQuantity(item.skuId, 1)}
                      disabled={item.quantity >= item.maxQuantity}
                    >
                      <Plus className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeFromCart(item.skuId)}
                      className="text-destructive"
                    >
                      <Trash className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-border">
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Total items:</span>
              <span className="font-bold">{totalItems}</span>
            </div>
            <Button
              className="w-full"
              disabled={cart.length === 0 || addTransaction.isPending}
              onClick={consumeCart}
            >
              {addTransaction.isPending ? "Consuming..." : "Consume Items"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
