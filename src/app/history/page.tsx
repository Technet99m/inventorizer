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
import {
  ClockCounterClockwiseIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  CheckIcon,
  TrashIcon,
  FunnelIcon,
  XIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function HistoryPage() {
  const { data: transactions, isLoading } =
    api.inventory.getAllTransactions.useQuery();
  const { data: skus } = api.inventory.getAllSKUs.useQuery();
  const utils = api.useUtils();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "addition" | "removal" | "pending"
  >("all");

  const patchTransaction = api.inventory.patchTransaction.useMutation({
    onSuccess: () => {
      utils.inventory.getAllTransactions.invalidate().catch(() => {});
      utils.inventory.getAllSKUs.invalidate().catch(() => {});
      toast.success("Транзакція підтверджена!");
    },
    onError: () => toast.error("Не вдалося підтвердити транзакцію"),
  });

  const deleteTransaction = api.inventory.deleteTransaction.useMutation({
    onSuccess: () => {
      utils.inventory.getAllTransactions.invalidate().catch(() => {});
      utils.inventory.getAllSKUs.invalidate().catch(() => {});
      toast.success("Транзакція видалена!");
    },
    onError: () => toast.error("Не вдалося видалити транзакцію"),
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
          label: "Додано",
          variant: "default" as const,
          icon: ArrowUpIcon,
          color: "text-green-600",
        };
      case "removal":
        return {
          label: "Спожито",
          variant: "destructive" as const,
          icon: ArrowDownIcon,
          color: "text-red-600",
        };
      case "pending":
        return {
          label: "Очікується",
          variant: "secondary" as const,
          icon: ClockIcon,
          color: "text-yellow-600",
        };
      default:
        return {
          label: type,
          variant: "outline" as const,
          icon: ClockCounterClockwiseIcon,
          color: "text-muted-foreground",
        };
    }
  };

  const filteredTransactions = transactions?.filter((tx) => {
    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    const skuName = getSkuName(tx.skuId).toLowerCase();
    const skuCode = getSkuCode(tx.skuId).toLowerCase();
    const matchesSearch =
      search === "" ||
      skuName.includes(search.toLowerCase()) ||
      skuCode.includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const pendingCount =
    transactions?.filter((tx) => tx.type === "pending").length ?? 0;
  const hasActiveFilters = typeFilter !== "all" || search !== "";

  const clearFilters = () => {
    setTypeFilter("all");
    setSearch("");
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Історія транзакцій</h1>
        <p className="text-muted-foreground text-sm">
          Переглядайте всі переміщення інвентарю
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Пошук за SKU..."
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
            Всі
          </Button>
          <Button
            variant={typeFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("pending")}
            className={cn(
              typeFilter !== "pending" &&
                "border-yellow-600/50 text-yellow-600 hover:bg-yellow-50",
            )}
          >
            <ClockIcon className="mr-1 size-3" />
            Очікується
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 px-1.5 text-xs">
                {pendingCount}
              </Badge>
            )}
          </Button>
          <Button
            variant={typeFilter === "addition" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("addition")}
            className={cn(
              typeFilter !== "addition" &&
                "border-green-600/50 text-green-600 hover:bg-green-50",
            )}
          >
            <ArrowUpIcon className="mr-1 size-3" />
            Додано
          </Button>
          <Button
            variant={typeFilter === "removal" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("removal")}
            className={cn(
              typeFilter !== "removal" &&
                "border-red-600/50 text-red-600 hover:bg-red-50",
            )}
          >
            <ArrowDownIcon className="mr-1 size-3" />
            Спожито
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              <XIcon className="mr-1 size-3" />
              Очистити фільтри
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Завантаження транзакцій...</p>
        </div>
      ) : filteredTransactions?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClockCounterClockwiseIcon className="text-muted-foreground mb-4 size-12" />
            <p className="text-muted-foreground">
              {hasActiveFilters
                ? "Не знайдено відповідних транзакцій"
                : "Транзакцій ще немає"}
            </p>
            <p className="text-muted-foreground text-sm">
              {hasActiveFilters
                ? "Спробуйте змінити фільтри"
                : "Додані та спожиті речі з'являться тут"}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={clearFilters}
              >
                Очистити фільтри
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile View */}
          <div className="space-y-3 md:hidden">
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
                            "bg-muted rounded-md p-2",
                            config.color,
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {getSkuName(tx.skuId)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {getSkuCode(tx.skuId)}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {formatDate(tx.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge variant={config.variant}>{config.label}</Badge>
                        <p
                          className={cn("mt-1 text-lg font-bold", config.color)}
                        >
                          {tx.type === "addition"
                            ? "+"
                            : tx.type === "pending"
                              ? "~"
                              : "-"}
                          {tx.quantity}
                        </p>
                        <div className="mt-2 flex justify-end gap-1">
                          {tx.type === "pending" && (
                            <Button
                              variant="outline"
                              size="icon-xs"
                              className="border-green-600/50 text-green-600"
                              onClick={() => confirmPending(tx.id)}
                              disabled={patchTransaction.isPending}
                              title="Confirm as received"
                            >
                              <CheckIcon className="size-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive"
                            onClick={() =>
                              deleteTransaction.mutate({ id: tx.id })
                            }
                            disabled={deleteTransaction.isPending}
                            title="Delete"
                          >
                            <TrashIcon className="size-3" />
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
                    <TableHead>Дата</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Назва</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead className="text-right">Кількість</TableHead>
                    <TableHead className="text-right">Дії</TableHead>
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
                        <TableCell
                          className={cn("text-right font-bold", config.color)}
                        >
                          {tx.type === "addition"
                            ? "+"
                            : tx.type === "pending"
                              ? "~"
                              : "-"}
                          {tx.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {tx.type === "pending" && (
                              <Button
                                variant="outline"
                                size="icon-sm"
                                className="border-green-600/50 text-green-600 hover:bg-green-50"
                                onClick={() => confirmPending(tx.id)}
                                disabled={patchTransaction.isPending}
                                title="Confirm as received"
                              >
                                <CheckIcon className="size-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive"
                              onClick={() =>
                                deleteTransaction.mutate({ id: tx.id })
                              }
                              disabled={deleteTransaction.isPending}
                              title="Delete"
                            >
                              <TrashIcon className="size-4" />
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
