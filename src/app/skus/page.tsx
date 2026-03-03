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
import { Plus, Pencil, Trash, Package, Clock } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function SKUsPage() {
  const { data: skus, isLoading } = api.inventory.getAllSKUs.useQuery();
  const utils = api.useUtils();

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

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold">Manage SKUs</h1>
          <p className="text-muted-foreground text-sm">
            Add, edit, or remove inventory items
          </p>
        </div>
        <AddSKUDialog onAdd={(data) => addSKU.mutate(data)} isPending={addSKU.isPending} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading SKUs...</p>
        </div>
      ) : skus?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="size-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No SKUs found</p>
            <p className="text-muted-foreground text-sm">Create your first SKU to get started</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {skus?.map((sku) => (
              <Card key={sku.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{sku.name}</span>
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
                      <p className="font-bold">{sku.quantity}</p>
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
                    <AddStockDialog
                      sku={sku}
                      onAdd={(qty) =>
                        addTransaction.mutate({
                          skuId: sku.id,
                          quantity: qty,
                          type: "addition",
                        })
                      }
                      isPending={addTransaction.isPending}
                    />
                    <AddPendingDialog
                      sku={sku}
                      onAdd={(qty) =>
                        addTransaction.mutate({
                          skuId: sku.id,
                          quantity: qty,
                          type: "pending",
                        })
                      }
                      isPending={addTransaction.isPending}
                    />
                    <EditSKUDialog
                      sku={sku}
                      onEdit={(data) => patchSKU.mutate({ id: sku.id, ...data })}
                      isPending={patchSKU.isPending}
                    />
                    <DeleteSKUDialog
                      sku={sku}
                      onDelete={() => deleteSKU.mutate({ id: sku.id })}
                      isPending={deleteSKU.isPending}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Min Threshold</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skus?.map((sku) => (
                    <TableRow key={sku.id}>
                      <TableCell className="font-mono">{sku.sku}</TableCell>
                      <TableCell>{sku.name}</TableCell>
                      <TableCell className="text-right font-bold">{sku.quantity}</TableCell>
                      <TableCell className="text-right">
                        {sku.pending > 0 ? (
                          <Badge variant="secondary" className="text-yellow-600">
                            <Clock className="size-3 mr-1" />
                            {sku.pending}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{sku.minThreshold}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <AddStockDialog
                            sku={sku}
                            onAdd={(qty) =>
                              addTransaction.mutate({
                                skuId: sku.id,
                                quantity: qty,
                                type: "addition",
                              })
                            }
                            isPending={addTransaction.isPending}
                          />
                          <AddPendingDialog
                            sku={sku}
                            onAdd={(qty) =>
                              addTransaction.mutate({
                                skuId: sku.id,
                                quantity: qty,
                                type: "pending",
                              })
                            }
                            isPending={addTransaction.isPending}
                          />
                          <EditSKUDialog
                            sku={sku}
                            onEdit={(data) => patchSKU.mutate({ id: sku.id, ...data })}
                            isPending={patchSKU.isPending}
                          />
                          <DeleteSKUDialog
                            sku={sku}
                            onDelete={() => deleteSKU.mutate({ id: sku.id })}
                            isPending={deleteSKU.isPending}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </>
      )}
    </div>
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
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add SKU</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New SKU</DialogTitle>
            <DialogDescription>
              Create a new inventory item
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
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit SKU</DialogTitle>
            <DialogDescription>
              Update item details
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
          <Trash className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete SKU</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{sku.name}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
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
          <Plus className="size-3" />
          Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Stock</DialogTitle>
            <DialogDescription>
              Add inventory for &quot;{sku.name}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
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
              {isPending ? "Adding..." : "Add Stock"}
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
          <Clock className="size-3" />
          Pending
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Pending Stock</DialogTitle>
            <DialogDescription>
              Add pending inventory for &quot;{sku.name}&quot;. This stock is expected but not yet received.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pending-quantity">Quantity</Label>
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
              {isPending ? "Adding..." : "Add Pending"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
