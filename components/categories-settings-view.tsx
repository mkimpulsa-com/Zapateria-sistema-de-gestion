"use client";

import { useState, FormEvent } from "react";
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  Boxes,
  FolderTree,
  AlertTriangle,
  Check,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

interface CategoriesSettingsViewProps {
  categories: CategoryItem[];
  products: any[];
  onSave: (payload: any, successMessage: string) => Promise<any>;
  busy: boolean;
}

export function CategoriesSettingsView({
  categories = [],
  products = [],
  onSave,
  busy,
}: CategoriesSettingsViewProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null);

  const productCounts = products.reduce((acc: Record<string, number>, p: any) => {
    const cat = String(p.category || "").trim();
    if (cat) {
      acc[cat] = (acc[cat] || 0) + 1;
    }
    return acc;
  }, {});

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    const ok = await onSave(
      {
        action: "create_category",
        name: cleanName,
        description: description.trim(),
      },
      `Categoría "${cleanName}" creada exitosamente`
    );

    if (ok) {
      setName("");
      setDescription("");
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const cleanName = editName.trim();
    if (!cleanName) return;

    const ok = await onSave(
      {
        action: "edit_category",
        categoryId: editingCategory.id,
        name: cleanName,
        description: editDesc.trim(),
      },
      `Categoría actualizada correctamente`
    );

    if (ok) {
      setEditingCategory(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    const ok = await onSave(
      {
        action: "delete_category",
        categoryId: deletingCategory.id,
      },
      `Categoría "${deletingCategory.name}" eliminada`
    );

    if (ok) {
      setDeletingCategory(null);
    }
  };

  const filteredCategories = categories.filter((cat) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      cat.name.toLowerCase().includes(q) ||
      (cat.description && cat.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* TARJETA DE CREACIÓN RÁPIDA */}
      <Card className="border-0 shadow-sm bg-card">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <FolderTree className="size-5" />
            </span>
            <div>
              <CardTitle className="text-lg font-bold">Gestión de Categorías</CardTitle>
              <CardDescription className="text-xs">
                Clasificá tus productos en categorías que estarán disponibles en los formularios de carga y filtros de la tienda.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
            <div>
              <label className="text-xs font-semibold text-foreground/90 block mb-1">
                Nombre de la categoría <span className="text-destructive">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Borcegos, Zapatillas..."
                className="h-10 text-sm font-semibold rounded-xl"
                required
                disabled={busy}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/90 block mb-1">
                Descripción o notas (opcional)
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Temporada invierno, urbano formal..."
                className="h-10 text-sm rounded-xl"
                disabled={busy}
              />
            </div>

            <div className="flex items-end">
              <Button
                type="submit"
                disabled={busy || !name.trim()}
                className="h-10 gap-1.5 rounded-xl font-bold px-5 w-full sm:w-auto"
              >
                <Plus className="size-4" />
                Agregar categoría
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* LISTADO DE CATEGORÍAS */}
      <Card className="border-0 shadow-sm bg-card overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              Categorías registradas
              <Badge variant="secondary" className="font-mono text-xs">
                {categories.length}
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Administrá los nombres y consultá cuántos modelos pertenecen a cada grupo.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar categoría…"
              className="pl-8 h-9 text-xs rounded-xl"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-bold text-xs">Nombre</TableHead>
                <TableHead className="font-bold text-xs">Descripción</TableHead>
                <TableHead className="text-center font-bold text-xs">Modelos en inventario</TableHead>
                <TableHead className="text-right font-bold text-xs pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    {search ? "No se encontraron categorías que coincidan con la búsqueda." : "No hay categorías cargadas."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((cat) => {
                  const count = productCounts[cat.name] || 0;
                  return (
                    <TableRow key={cat.id} className="hover:bg-muted/30">
                      <TableCell className="font-bold text-sm text-foreground flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                          <Tag className="size-3.5" />
                        </span>
                        {cat.name}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {cat.description || "—"}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            count > 0
                              ? "bg-primary/5 text-primary border-primary/20 font-bold"
                              : "text-muted-foreground font-normal"
                          }
                        >
                          <Boxes className="size-3 mr-1" />
                          {count} {count === 1 ? "modelo" : "modelos"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-lg"
                            title="Editar categoría"
                            onClick={() => {
                              setEditingCategory(cat);
                              setEditName(cat.name);
                              setEditDesc(cat.description || "");
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="Eliminar categoría"
                            onClick={() => setDeletingCategory(cat)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DIÁLOGO DE EDICIÓN */}
      <Dialog open={Boolean(editingCategory)} onOpenChange={(v) => !v && setEditingCategory(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Pencil className="size-4 text-primary" />
              Editar categoría
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modificá el nombre o la descripción. Si cambiás el nombre, los productos asignados se actualizarán automáticamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold block mb-1">
                Nombre de la categoría <span className="text-destructive">*</span>
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-10 text-sm font-semibold rounded-xl"
                required
                disabled={busy}
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Descripción</label>
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="h-10 text-sm rounded-xl"
                disabled={busy}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingCategory(null)}
                disabled={busy}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={busy || !editName.trim()}>
                {busy ? "Guardando…" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <AlertDialog
        open={Boolean(deletingCategory)}
        onOpenChange={(v) => !v && setDeletingCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              ¿Eliminar categoría "{deletingCategory?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>Esta acción quitará la categoría de la lista de opciones para nuevos productos.</p>
                {deletingCategory && (productCounts[deletingCategory.name] || 0) > 0 && (
                  <div className="font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    ¡Atención! Actualmente hay {productCounts[deletingCategory.name]} modelo(s) asignados a esta categoría. Los productos conservarán el texto asignado pero ya no formará parte de las categorías principales.
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Eliminando…" : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
