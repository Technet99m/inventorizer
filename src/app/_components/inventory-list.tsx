"use client";

import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, WarningIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface CartItem {
  skuId: number;
  sku: string;
  name: string;
  quantity: number;
  maxQuantity: number;
}

interface InventoryListProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

export function InventoryList({ cart, setCart }: InventoryListProps) {
  const { data: skus, isLoading } = api.inventory.getAllSKUs.useQuery();
  const [search, setSearch] = useState("");

  const addToCart = (sku: NonNullable<typeof skus>[number]) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.skuId === sku.id);
      if (existing) {
        if (existing.quantity >= existing.maxQuantity) return prev;
        return prev.map((item) =>
          item.skuId === sku.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      if (sku.quantity <= 0) return prev;
      return [
        ...prev,
        {
          skuId: sku.id,
          sku: sku.sku,
          name: sku.name,
          quantity: 1,
          maxQuantity: sku.quantity,
        },
      ];
    });
  };

  const getCartQuantity = (skuId: number) => {
    const item = cart.find((c) => c.skuId === skuId);
    return item?.quantity ?? 0;
  };

  const filteredSkus = skus?.filter(
    (sku) =>
      sku.name.toLowerCase().includes(search.toLowerCase()) ||
      sku.sku.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Завантаження інвентарю...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Пошук речей..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {filteredSkus?.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          Не знайдено жодної речі, що відповідає пошуку.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredSkus?.map((sku) => {
          const cartQty = getCartQuantity(sku.id);
          const availableQty = sku.quantity - cartQty;
          const isLow = sku.quantity <= sku.minThreshold && sku.minThreshold > 0;
          const isOutOfStock = sku.quantity <= 0;

          return (
            <Card key={sku.id} className={cn(isLow && "ring-2 ring-yellow-500/50")}>
              {sku.thumbnailUrl && (
                <div className="w-full h-24 sm:h-32 md:h-40 overflow-hidden bg-muted">
                  <img
                    src={sku.thumbnailUrl}
                    alt={sku.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate">{sku.name}</CardTitle>
                    <p className="text-muted-foreground text-xs truncate">
                      SKU: {sku.sku}
                    </p>
                  </div>
                  {isLow && !isOutOfStock && (
                    <Badge variant="outline" className="shrink-0 text-yellow-600 border-yellow-600/50">
                      <WarningIcon className="size-3 mr-1" />
                      Мало
                    </Badge>
                  )}
                  {isOutOfStock && (
                    <Badge variant="destructive" className="shrink-0">
                      Немає в наявності
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{sku.quantity}</p>
                    <p className="text-muted-foreground text-xs">в наявності</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cartQty > 0 && (
                      <Badge variant="secondary">{cartQty} в кошику</Badge>
                    )}
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={availableQty <= 0}
                      onClick={() => addToCart(sku)}
                    >
                      <PlusIcon className="size-4" />
                    </Button>
                  </div>
                </div>
                {sku.pending > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-yellow-600">
                    <span className="text-xs font-medium">
                      +{sku.pending} очікується
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
