"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, PencilIcon, TrashIcon, ClockIcon, PackageIcon, MinusIcon, WarningIcon, DotsSixVerticalIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SKUWithPending = {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  minThreshold: number;
  thumbnailUrl?: string | null;
  sortOrder: number;
  pending: number;
};

export default function SKUsPage() {
  const { data: skus, isLoading } = api.inventory.getAllSKUs.useQuery();
  const utils = api.useUtils();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const addSKU = api.inventory.addSKU.useMutation({
    onSuccess: () => {
      utils.inventory.getAllSKUs.invalidate().catch(() => {});
      toast.success("SKU created successfully!");
    },
    onError: () => toast.error("Failed to create SKU"),
  });

  const patchSKU = api.inventory.patchSKU.useMutation({
    onSuccess: () => {
      utils.inventory.getAllSKUs.invalidate().catch(() => {});
      toast.success("SKU updated successfully!");
    },
    onError: () => toast.error("Failed to update SKU"),
  });

  const deleteSKU = api.inventory.deleteSKU.useMutation({
    onSuccess: () => {
      utils.inventory.getAllSKUs.invalidate().catch(() => {});
      toast.success("SKU deleted successfully!");
    },
    onError: () => toast.error("Failed to delete SKU"),
  });

  const addTransaction = api.inventory.addTransaction.useMutation({
    onSuccess: () => {
      utils.inventory.getAllSKUs.invalidate().catch(() => {});
      utils.inventory.getAllTransactions.invalidate().catch(() => {});
      toast.success("Stock updated!");
    },
    onError: () => toast.error("Failed to update stock"),
  });

  const reorderSKUs = api.inventory.reorderSKUs.useMutation({
    onMutate: async (newOrder) => {
      await utils.inventory.getAllSKUs.cancel();
      const prev = utils.inventory.getAllSKUs.getData();
      utils.inventory.getAllSKUs.setData(undefined, (old) => {
        if (!old) return old;
        return newOrder
          .map(({ id }) => old.find((s) => s.id === id))
          .filter((s) => s !== undefined);
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.inventory.getAllSKUs.setData(undefined, ctx.prev);
      toast.error("Failed to reorder");
    },
    onSettled: () => utils.inventory.getAllSKUs.invalidate().catch(() => {}),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    if (!skus) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = skus.findIndex((s) => s.id === active.id);
    const newIndex = skus.findIndex((s) => s.id === over.id);
    const newOrder = arrayMove(skus, oldIndex, newIndex);
    reorderSKUs.mutate(newOrder.map((sku, i) => ({ id: sku.id, sortOrder: i })));
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold">Керування SKU</h1>
          <p className="text-muted-foreground text-sm">
            Додайте, редагуйте або видаляйте елементи інвентарю
          </p>
        </div>
        <AddSKUDialog onAdd={(data) => addSKU.mutate(data)} isPending={addSKU.isPending} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Завантаження SKU...</p>
        </div>
      ) : skus?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PackageIcon className="size-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">SKU не знайдено</p>
            <p className="text-muted-foreground text-sm">Створіть свій перший SKU, щоб почати</p>
          </CardContent>
        </Card>
      ) : skus ? (
        <>
          {/* Mobile View */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={skus.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="md:hidden space-y-4">
                {skus.map((sku) => (
                  <SortableMobileCard
                    key={sku.id}
                    sku={sku}
                    onConsume={(qty) => addTransaction.mutate({ skuId: sku.id, quantity: qty, type: "removal" })}
                    onAddStock={(qty) => addTransaction.mutate({ skuId: sku.id, quantity: qty, type: "addition" })}
                    onAddPending={(qty) => addTransaction.mutate({ skuId: sku.id, quantity: qty, type: "pending" })}
                    onEdit={(data) => patchSKU.mutate({ id: sku.id, ...data })}
                    onDelete={() => deleteSKU.mutate({ id: sku.id })}
                    isTransactionPending={addTransaction.isPending}
                    isPatchPending={patchSKU.isPending}
                    isDeletePending={deleteSKU.isPending}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Desktop View */}
          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Min Threshold</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={skus.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <TableBody>
                      {skus.map((sku) => (
                        <SortableTableRow
                          key={sku.id}
                          sku={sku}
                          onConsume={(qty) => addTransaction.mutate({ skuId: sku.id, quantity: qty, type: "removal" })}
                          onAddStock={(qty) => addTransaction.mutate({ skuId: sku.id, quantity: qty, type: "addition" })}
                          onAddPending={(qty) => addTransaction.mutate({ skuId: sku.id, quantity: qty, type: "pending" })}
                          onEdit={(data) => patchSKU.mutate({ id: sku.id, ...data })}
                          onDelete={() => deleteSKU.mutate({ id: sku.id })}
                          isTransactionPending={addTransaction.isPending}
                          isPatchPending={patchSKU.isPending}
                          isDeletePending={deleteSKU.isPending}
                        />
                      ))}
                    </TableBody>
                  </SortableContext>
                </DndContext>
              </Table>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

type SKURowProps = {
  sku: SKUWithPending;
  onConsume: (qty: number) => void;
  onAddStock: (qty: number) => void;
  onAddPending: (qty: number) => void;
  onEdit: (data: { sku?: string; name?: string; minThreshold?: number; thumbnailUrl?: string }) => void;
  onDelete: () => void;
  isTransactionPending: boolean;
  isPatchPending: boolean;
  isDeletePending: boolean;
};

function SortableMobileCard({ sku, ...props }: SKURowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: sku.id });
  const isLow = sku.quantity <= sku.minThreshold && sku.minThreshold > 0;
  const isOutOfStock = sku.quantity <= 0;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : undefined }}
    >
      <Card className={cn(isLow && !isOutOfStock && "ring-2 ring-yellow-500/50", isOutOfStock && "ring-2 ring-destructive/50")}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <button
              ref={setActivatorNodeRef}
              {...listeners}
              {...attributes}
              className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground shrink-0"
            >
              <DotsSixVerticalIcon className="size-5" />
            </button>
            <span className="truncate flex-1">{sku.name}</span>
            {isLow && !isOutOfStock && (
              <Badge variant="outline" className="shrink-0 text-yellow-600 border-yellow-600/50">
                <WarningIcon className="size-3 mr-1" />
                Мало
              </Badge>
            )}
            {isOutOfStock && (
              <Badge variant="destructive" className="shrink-0">Немає</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">SKU</p>
              <p className="font-mono">{sku.sku}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Stock</p>
              <p className={cn("font-bold", isOutOfStock && "text-destructive", isLow && !isOutOfStock && "text-yellow-600")}>{sku.quantity}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Min Threshold</p>
              <p>{sku.minThreshold}</p>
            </div>
            {sku.pending > 0 && (
              <div>
                <p className="text-muted-foreground text-xs">Pending</p>
                <p className="text-yellow-600 font-medium">{sku.pending}</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <ConsumeDialog sku={sku} onConsume={props.onConsume} isPending={props.isTransactionPending} />
            <AddStockDialog sku={sku} onAdd={props.onAddStock} isPending={props.isTransactionPending} />
            <AddPendingDialog sku={sku} onAdd={props.onAddPending} isPending={props.isTransactionPending} />
            <EditSKUDialog sku={sku} onEdit={props.onEdit} isPending={props.isPatchPending} />
            <DeleteSKUDialog sku={sku} onDelete={props.onDelete} isPending={props.isDeletePending} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SortableTableRow({ sku, ...props }: SKURowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: sku.id });
  const isLow = sku.quantity <= sku.minThreshold && sku.minThreshold > 0;
  const isOutOfStock = sku.quantity <= 0;

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : undefined }}
      className={cn(isOutOfStock && "bg-destructive/5", isLow && !isOutOfStock && "bg-yellow-500/5")}
    >
      <TableCell>
        <button
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground"
        >
          <DotsSixVerticalIcon className="size-4" />
        </button>
      </TableCell>
      <TableCell className="font-mono">{sku.sku}</TableCell>
      <TableCell>{sku.name}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {isLow && !isOutOfStock && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600/50">
              <WarningIcon className="size-3 mr-1" />
              Мало
            </Badge>
          )}
          {isOutOfStock && (
            <Badge variant="destructive">Немає</Badge>
          )}
          <span className={cn("font-bold", isOutOfStock && "text-destructive", isLow && !isOutOfStock && "text-yellow-600")}>
            {sku.quantity}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        {sku.pending > 0 ? (
          <Badge variant="secondary" className="text-yellow-600">
            <ClockIcon className="size-3 mr-1" />
            {sku.pending}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">{sku.minThreshold}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <ConsumeDialog sku={sku} onConsume={props.onConsume} isPending={props.isTransactionPending} />
          <AddStockDialog sku={sku} onAdd={props.onAddStock} isPending={props.isTransactionPending} />
          <AddPendingDialog sku={sku} onAdd={props.onAddPending} isPending={props.isTransactionPending} />
          <EditSKUDialog sku={sku} onEdit={props.onEdit} isPending={props.isPatchPending} />
          <DeleteSKUDialog sku={sku} onDelete={props.onDelete} isPending={props.isDeletePending} />
        </div>
      </TableCell>
    </TableRow>
  );
}

function AddSKUDialog({
  onAdd,
  isPending,
}: {
  onAdd: (data: { sku: string; name: string; minThreshold: number; thumbnailUrl?: string }) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [minThreshold, setMinThreshold] = useState(0);
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ sku, name, minThreshold, thumbnailUrl: thumbnailUrl || undefined });
    setSku("");
    setName("");
    setMinThreshold(0);
    setThumbnailUrl("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusIcon className="size-4" />
          <span className="hidden sm:inline">Додати SKU</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Додати новий SKU</DialogTitle>
            <DialogDescription>
              Створіть новий елемент інвентарю
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU Code</Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g., WIDGET-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Red Widget"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnail">Thumbnail URL (Optional)</Label>
              <Input
                id="thumbnail"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold">Min Threshold</Label>
              <Input
                id="threshold"
                type="number"
                value={minThreshold}
                onChange={(e) => setMinThreshold(parseInt(e.target.value) || 0)}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                Alert when stock falls below this level
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create SKU"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditSKUDialog({
  sku,
  onEdit,
  isPending,
}: {
  sku: { id: number; sku: string; name: string; minThreshold: number; thumbnailUrl?: string | null };
  onEdit: (data: { sku?: string; name?: string; minThreshold?: number; thumbnailUrl?: string }) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [skuCode, setSkuCode] = useState(sku.sku);
  const [name, setName] = useState(sku.name);
  const [minThreshold, setMinThreshold] = useState(sku.minThreshold);
  const [thumbnailUrl, setThumbnailUrl] = useState(sku.thumbnailUrl ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEdit({ sku: skuCode, name, minThreshold, thumbnailUrl: thumbnailUrl || undefined });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <PencilIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Редагувати SKU</DialogTitle>
            <DialogDescription>
              Оновіть деталі елемента
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-sku">SKU Code</Label>
              <Input
                id="edit-sku"
                value={skuCode}
                onChange={(e) => setSkuCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-thumbnail">Thumbnail URL (Optional)</Label>
              <Input
                id="edit-thumbnail"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-threshold">Min Threshold</Label>
              <Input
                id="edit-threshold"
                type="number"
                value={minThreshold}
                onChange={(e) => setMinThreshold(parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSKUDialog({
  sku,
  onDelete,
  isPending,
}: {
  sku: { id: number; name: string };
  onDelete: () => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-destructive">
          <TrashIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Видалити SKU</DialogTitle>
          <DialogDescription>
            Ви впевнені, що хочете видалити &quot;{sku.name}&quot;? Цю дію не можна скасувати.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Скасувати</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            disabled={isPending}
          >
            {isPending ? "Видалення..." : "Видалити"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConsumeDialog({
  sku,
  onConsume,
  isPending,
}: {
  sku: { id: number; name: string; quantity: number };
  onConsume: (quantity: number) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConsume(quantity);
    setQuantity(1);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/50 hover:bg-destructive/10" disabled={sku.quantity <= 0}>
          <MinusIcon className="size-3" />
          Спожити
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Спожити запас</DialogTitle>
            <DialogDescription>
              Зареєструйте споживання &quot;{sku.name}&quot;. Доступно: {sku.quantity}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="consume-quantity">Кількість</Label>
              <Input
                id="consume-quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min={1}
                max={sku.quantity}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Збереження..." : "Спожити"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddStockDialog({
  sku,
  onAdd,
  isPending,
}: {
  sku: { id: number; name: string };
  onAdd: (quantity: number) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(quantity);
    setQuantity(1);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <PlusIcon className="size-3" />
          Додати запас
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Додати запас</DialogTitle>
            <DialogDescription>
              Додати інвентар для &quot;{sku.name}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Кількість</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min={1}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Додавання..." : "Додати запас"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddPendingDialog({
  sku,
  onAdd,
  isPending,
}: {
  sku: { id: number; name: string };
  onAdd: (quantity: number) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(quantity);
    setQuantity(1);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-yellow-600 border-yellow-600/50 hover:bg-yellow-50">
          <ClockIcon className="size-3" />
          Очікування
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Додати очікуваний запас</DialogTitle>
            <DialogDescription>
              Додати очікуваний інвентар для &quot;{sku.name}&quot;. Цей запас очікується, але ще не отриманий.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pending-quantity">Кількість</Label>
              <Input
                id="pending-quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min={1}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending} className="bg-yellow-600 hover:bg-yellow-700">
              {isPending ? "Додавання..." : "Додати очікуваний запас"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
