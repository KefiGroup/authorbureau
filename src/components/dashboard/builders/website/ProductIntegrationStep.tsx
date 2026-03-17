import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingBag, Sparkles, Plus, Trash2, ExternalLink } from "lucide-react";
import type { ProductCard } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookTitle: string;
  plan: any;
}

const DEFAULT_PRODUCTS: ProductCard[] = [
  { id: "book", title: "", description: "Your published book", price: "", category: "build", imageUrl: "", ctaLabel: "Buy Now", ctaUrl: "" },
  { id: "workbook", title: "Companion Workbook", description: "Exercises and reflection prompts", price: "Free", category: "build", imageUrl: "", ctaLabel: "Download Free", ctaUrl: "" },
  { id: "course", title: "Online Course", description: "Deep-dive video course", price: "$197", category: "build", imageUrl: "", ctaLabel: "Enroll Now", ctaUrl: "" },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  build: { label: "B·Build", color: "bg-emerald-500/10 text-emerald-600" },
  bridge: { label: "B·Build", color: "bg-violet-500/10 text-violet-600" },
  yield: { label: "Y·Yield", color: "bg-amber-500/10 text-amber-600" },
};

export default function ProductIntegrationStep({ stepData, setStepData, onMarkEdited, bookTitle, plan }: Props) {
  const products: ProductCard[] = stepData["products"]?.products || DEFAULT_PRODUCTS.map(p => ({
    ...p,
    title: p.id === "book" ? bookTitle : p.title,
  }));
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateProducts = (updated: ProductCard[]) => {
    setStepData(prev => ({ ...prev, products: { ...prev.products, products: updated } }));
    onMarkEdited("products");
  };

  const updateProduct = (id: string, patch: Partial<ProductCard>) => {
    updateProducts(products.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const addProduct = () => {
    const newProduct: ProductCard = {
      id: `product-${Date.now()}`,
      title: "New Product",
      description: "",
      price: "$0",
      category: "build",
      imageUrl: "",
      ctaLabel: "Learn More",
      ctaUrl: "",
    };
    updateProducts([...products, newProduct]);
    setEditingId(newProduct.id);
  };

  const removeProduct = (id: string) => {
    updateProducts(products.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Abby tip */}
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Abby's tip:</span> Products are auto-populated from all your built products. Organize them by ABBY category (Brand, Build, Yield) so visitors can see your full ecosystem.
          </p>
        </div>
      </Card>

      {/* Products by category */}
      {(["build", "bridge", "yield"] as const).map(cat => {
        const catProducts = products.filter(p => p.category === cat);
        if (catProducts.length === 0) return null;
        const catInfo = CATEGORY_LABELS[cat];
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <Badge className={`text-[10px] ${catInfo.color}`}>{catInfo.label}</Badge>
              <span className="text-xs text-muted-foreground">{catProducts.length} products</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catProducts.map(product => (
                <Card key={product.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingId(editingId === product.id ? null : product.id)} className="text-muted-foreground hover:text-foreground p-1">
                        <ExternalLink className="h-3 w-3" />
                      </button>
                      <button onClick={() => removeProduct(product.id)} className="text-muted-foreground hover:text-destructive p-1">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-xs font-semibold">{product.title}</h4>
                  <p className="text-[10px] text-muted-foreground mt-1">{product.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <Badge variant="outline" className="text-[10px]">{product.price}</Badge>
                    <span className="text-[10px] text-secondary font-medium">{product.ctaLabel}</span>
                  </div>

                  {editingId === product.id && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      <div>
                        <Label className="text-[10px]">Title</Label>
                        <Input value={product.title} onChange={e => updateProduct(product.id, { title: e.target.value })} className="text-xs h-8" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Price</Label>
                        <Input value={product.price} onChange={e => updateProduct(product.id, { price: e.target.value })} className="text-xs h-8" />
                      </div>
                      <div>
                        <Label className="text-[10px]">CTA Label</Label>
                        <Input value={product.ctaLabel} onChange={e => updateProduct(product.id, { ctaLabel: e.target.value })} className="text-xs h-8" />
                      </div>
                      <div>
                        <Label className="text-[10px]">CTA URL</Label>
                        <Input value={product.ctaUrl} onChange={e => updateProduct(product.id, { ctaUrl: e.target.value })} placeholder="https://..." className="text-xs h-8" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Category</Label>
                        <div className="flex gap-2 mt-1">
                          {(["build", "bridge", "yield"] as const).map(c => (
                            <button
                              key={c}
                              onClick={() => updateProduct(product.id, { category: c })}
                              className={`text-[10px] px-2 py-1 rounded border ${product.category === c ? "border-secondary bg-secondary/5" : "border-border"}`}
                            >
                              {CATEGORY_LABELS[c].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* Add product */}
      <Button variant="outline" size="sm" onClick={addProduct} className="w-full border-dashed">
        <Plus className="h-3.5 w-3.5 mr-2" /> Add Product
      </Button>

      {/* Summary */}
      <Card className="p-4 bg-muted/30 border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingBag className="h-3.5 w-3.5 text-secondary" />
          <span className="text-xs font-semibold">Product Summary</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {products.length} products • {products.filter(p => p.category === "build").length} Build • {products.filter(p => p.category === "bridge").length} Bridge • {products.filter(p => p.category === "yield").length} Yield
        </p>
      </Card>
    </div>
  );
}
