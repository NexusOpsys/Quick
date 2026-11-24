import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { WarehouseInventory } from "../types";

type StatusFilter = "all" | "low" | "out";
const PAGE_SIZE = 12;

export function StockInventoryTable({ products }: { products: WarehouseInventory["products"] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const matchesQuery = !normalizedQuery
        || `${product.name} ${product.sku} ${product.category}`.toLocaleLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || product.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [products, query, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageProducts = filteredProducts.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  function updateQuery(value: string) {
    setQuery(value);
    setPage(0);
  }

  function updateStatus(value: StatusFilter) {
    setStatusFilter(value);
    setPage(0);
  }

  return (
    <section className="warehouse-panel warehouse-table-panel">
      <div className="warehouse-panel-heading">
        <div>
          <h2>Stock overview</h2>
          <p>Current quantities in your assigned warehouse</p>
        </div>
        <span className="warehouse-record-count">{filteredProducts.length.toLocaleString()} products</span>
      </div>
      <div className="warehouse-table-tools">
        <label className="warehouse-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            name="warehouse-product-search"
            autoComplete="off"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Search products or SKU…"
            aria-label="Search warehouse products"
          />
        </label>
        <div className="warehouse-filters" role="group" aria-label="Filter products by stock status">
          {(["all", "low", "out"] as const).map((filter) => (
            <button
              type="button"
              key={filter}
              className={statusFilter === filter ? "active" : ""}
              aria-pressed={statusFilter === filter}
              onClick={() => updateStatus(filter)}
            >
              {filter === "all" ? "All stock" : filter === "low" ? "Low stock" : "Out of stock"}
            </button>
          ))}
        </div>
      </div>

      <div className="warehouse-table-scroll">
        <table className="warehouse-table">
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">SKU</th>
              <th scope="col">Category</th>
              <th scope="col" className="numeric">On hand</th>
              <th scope="col" className="numeric">Reorder point</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageProducts.map((product) => (
              <tr key={product.id}>
                <td><strong className="warehouse-product-name">{product.name}</strong></td>
                <td><span className="warehouse-sku">{product.sku}</span></td>
                <td>{product.category || "Uncategorized"}</td>
                <td className="numeric warehouse-quantity">{product.quantity.toLocaleString()}</td>
                <td className="numeric">{product.reorderLevel.toLocaleString()}</td>
                <td><span className={`warehouse-status ${product.status}`}>{product.status === "out" ? "Out of stock" : product.status === "low" ? "Reorder" : "In stock"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {pageProducts.length === 0 && (
          <div className="warehouse-empty">
            <strong>{products.length ? "No products match these filters" : "No stocked products yet"}</strong>
            <span>{products.length ? "Try another search or stock status." : "Products with stock tracking will appear here."}</span>
          </div>
        )}
      </div>

      <div className="warehouse-pagination">
        <span>Showing {filteredProducts.length === 0 ? 0 : currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filteredProducts.length)} of {filteredProducts.length.toLocaleString()}</span>
        <div>
          <button type="button" aria-label="Previous products page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button>
          <button type="button" aria-label="Next products page" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button>
        </div>
      </div>
    </section>
  );
}
