import { useState } from "react";
import { Package, ScanBarcode, Store } from "lucide-react";
import { filterProducts } from "../../../domain/sales";
import type { PosProduct } from "./types";
import { CATEGORY_EMOJI, money } from "./pos-format";

type ProductCatalogProps = {
  branchName: string;
  products: PosProduct[];
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  allProducts: PosProduct[];
  onScanMiss: () => void;
  onAddProduct: (product: PosProduct) => void;
  currencyCode: string;
};

export function ProductCatalog({
  branchName,
  products,
  allProducts,
  categories,
  activeCategory,
  onCategoryChange,
  onScanMiss,
  onAddProduct,
  currencyCode,
}: ProductCatalogProps) {
  const [scanQuery, setScanQuery] = useState("");

  function scan() {
    const match = filterProducts(allProducts, { query: scanQuery })[0];
    if (!match) {
      if (scanQuery.trim()) onScanMiss();
      return;
    }
    onAddProduct(match);
    setScanQuery("");
  }

  return (
    <section className="pos-catalog">
      <div className="pos-branch-row">
        <span className="pos-branch active"><Store size={13} /> {branchName}</span>
        <span className="pos-session-hint">Sales are recorded to this branch and its assigned warehouse.</span>
      </div>

      <section className="pos-rapid" aria-label="Fast barcode console">
        <div className="pos-rapid-icon"><ScanBarcode size={20} /></div>
        <input
          className="pos-rapid-input"
          type="text"
          aria-label="Scan or search products"
          placeholder="Scan barcode or enter SKU / item name (press Enter)…"
          value={scanQuery}
          onChange={(event) => setScanQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              scan();
            }
          }}
        />
        <kbd className="pos-rapid-enter">ENTER</kbd>
      </section>

      <div className="pos-tabs-head">
        <div className="pos-tabs" role="tablist" aria-label="Product categories">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={activeCategory === category}
              className={`pos-tab ${activeCategory === category ? "active" : ""}`}
              onClick={() => onCategoryChange(category)}
            >{category}</button>
          ))}
        </div>
        <span className="pos-available">{products.length} products</span>
      </div>

      {products.length ? (
        <div className="pos-prod-grid">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              className="pos-prod"
              disabled={product.isStocked === 1 && product.stock === 0}
              onClick={() => onAddProduct(product)}
            >
              <div className="pos-prod-visual"><span>{CATEGORY_EMOJI[product.category] ?? "📦"}</span></div>
              <div className="pos-prod-info">
                <strong>{product.name}</strong>
                <span>{product.sku}</span>
                <div className="pos-prod-meta">
                  <b>{money(product.priceMinor, currencyCode)}</b>
                  <small>{product.isStocked ? `${product.stock} in stock` : "Non-stock item"}</small>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="pos-catalog-empty">
          <Package size={23} />
          <strong>No matching active products</strong>
          <span>Try another category or search term, or add products to the company catalog.</span>
        </div>
      )}
    </section>
  );
}
