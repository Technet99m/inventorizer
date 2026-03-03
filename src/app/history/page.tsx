"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClockCounterClockwise, ArrowUp, ArrowDown, Clock, Check, Trash, Funnel, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function HistoryPage() {
  const { data: transactions, isLoading } = api.inventory.getAllTransactions.useQuery();
  const { data: skus } = api.inventory.getAllSKUs.useQuery();
  const utils = api.useUtils();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "addition" | "removal" | "pending">("all");

  const patchTransaction = api.inventory.patchTransaction.useMutation({
    onSuccess: () => {
      utils.inventory.getAllTransactions.invalidate().catch(() => {});
      utils.inventory.getAllSKUs.invalidate().catch(() => {});
      toast.success("Transaction confirmed as received!");
    },
    onError: () => toast.error("Failed to confirm transaction"),
  });

  const deleteTransaction = api.inventory.deleteTransaction.useMutation({
    onSuccess: () => {
      utils.inventory.getAllTransactions.invalidate().catch(() => {});
      utils.inventory.getAllSKUs.invalidate().catch(() => {});
      toast.success("Transaction deleted!");
    },
    onError: () => toast.error("Failed to delete transaction"),
  });

  const confirmPending = (transactionId: number) => {
    patchTransaction.mutate({ id: transactionId, type: "addition" });
  };

  const getSkuName = (skuId: number) => {
    const sku = skus?.find((s) => s.id === skuId);
    return sku?.name ?? "Unknown";
  };

  const getSkuCode = (skuId: number) => {
    const sku = skus?.find((s) => s.id === skuId);
    return sku?.sku ?? "N/A";
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "addition":
        return {
          label: "Added",
          variant: "default" as const,
          icon: ArrowUp,
          color: "text-green-600",
        };
      case "removal":
        return {
          label: "Removed",
          variant: "destructive" as const,
          icon: ArrowDown,
          color: "text-red-600",
        };
      case "pending":
        return {
          label: "Pending",
          variant: "secondary" as const,
          icon: Clock,
          color: "text-yellow-600",
        };
      default:
        return {
          label: type,
          variant: "outline" as const,
          icon: ClockCounterClockwise,
          color: "text-muted-foreground",
        };
    }
  };

  const filteredTransactions = transactions?.filter((tx) => {
    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    const skuName = getSkuName(tx.skuId).toLowerCase();
    const skuCode = getSkuCode(tx.skuId).toLowerCase();
    const matchesSearch = search === "" || 
      skuName.includes(search.toLowerCase()) || 
      skuCode.includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const pendingCount = transactions?.filter((tx) => tx.type === "pending").length ?? 0;
  const hasActiveFilters = typeFilter !== "all" || search !== "";

  const clearFilters = () => {
    setTypeFilter("all");
    setSearch("");
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground text-sm">
          View all inventory movements
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="Search by item or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant={typeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("all")}
          >
            All
          </Button>
          <Button
            variant={typeFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("pending")}
            className={cn(
              typeFilter !== "pending" && "text-yellow-600 border-yellow-600/50 hover:bg-yellow-50"
            )}
          >
            <Clock className="size-3 mr-1" />
            Pending
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs px-1.5">
                {pendingCount}
              </Badge>
            )}
          </Button>
          <Button
            variant={typeFilter === "addition" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("addition")}
            className={cn(
              typeFilter !== "addition" && "text-green-600 border-green-600/50 hover:bg-green-50"
            )}
          >
            <ArrowUp className="size-3 mr-1" />
            Added
          </Button>
          <Button
            variant={typeFilter === "removal" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("removal")}
            className={cn(
              typeFilter !== "removal" && "text-red-600 border-red-600/50 hover:bg-red-50"
            )}
          >
            <ArrowDown className="size-3 mr-1" />
            Removed
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              <X className="size-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading transactions...</p>
        </div>
      ) : filteredTransactions?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClockCounterClockwise className="size-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {hasActiveFilters ? "No matching transactions" : "No transactions yet"}
            </p>
            <p className="text-muted-foreground text-sm">
              {hasActiveFilters 
                ? "Try adjusting your filters"
                : "Stock additions and removals will appear here"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {filteredTransactions?.map((tx) => {
              const config = getTypeConfig(tx.type);
              const Icon = config.icon;
              return (
                <Card key={tx.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-md bg-muted",
                            config.color
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {getSkuName(tx.skuId)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {getSkuCode(tx.skuId)}
                          </p>
                          <p className="text-muted-foreground text-xs mt-1">
                            {formatDate(tx.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant={config.variant}>{config.label}</Badge>
                        <p className={cn("text-lg font-bold mt-1", config.color)}>
                          {tx.type === "addition" ? "+" : tx.type === "pending" ? "~" : "-"}{tx.quantity}
                        </p>
                        <div className="flex gap-1 mt-2 justify-end">
                          {tx.type === "pending" && (
                            <Button
                              variant="outline"
                              size="icon-xs"
                              className="text-green-600 border-green-600/50"
                              onClick={() => confirmPending(tx.id)}
                              disabled={patchTransaction.isPending}
                              title="Confirm as received"
                            >
                              <Check className="size-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive"
                            onClick={() => deleteTransaction.mutate({ id: tx.id })}
                            disabled={deleteTransaction.isPending}
                            title="Delete"
                          >
                            <Trash className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions?.map((tx) => {
                    const config = getTypeConfig(tx.type);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-muted-foreground">
                          {formatDate(tx.timestamp)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {getSkuCode(tx.skuId)}
                        </TableCell>
                        <TableCell>{getSkuName(tx.skuId)}</TableCell>
                        <TableCell>
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </TableCell>
                        <TableCell className={cn("text-right font-bold", config.color)}>
                          {tx.type === "addition" ? "+" : tx.type === "pending" ? "~" : "-"}{tx.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {tx.type === "pending" && (
                              <Button
                                variant="outline"
                                size="icon-sm"
                                className="text-green-600 border-green-600/50 hover:bg-green-50"
                                onClick={() => confirmPending(tx.id)}
                                disabled={patchTransaction.isPending}
                                title="Confirm as received"
                              >
                                <Check className="size-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive"
                              onClick={() => deleteTransaction.mutate({ id: tx.id })}
                              disabled={deleteTransaction.isPending}
                              title="Delete"
                            >
                              <Trash className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
