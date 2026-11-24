export type WarehouseInventory = {
  currencyCode: string;
  timezone: string;
  warehouse: { id: string; name: string };
  summary: {
    products: number;
    totalUnits: number;
    lowStock: number;
    outOfStock: number;
  };
  products: Array<{
    id: string;
    sku: string;
    name: string;
    category: string;
    quantity: number;
    reorderLevel: number;
    status: "healthy" | "low" | "out";
  }>;
  recentMovements: Array<{
    id: string;
    movementType: string;
    quantityDelta: number;
    previousQuantity: number;
    newQuantity: number;
    reason: string;
    createdAt: string;
    productName: string;
    sku: string;
  }>;
  recentCounts: Array<{
    id: string;
    productName: string;
    sku: string;
    expectedQuantity: number;
    countedQuantity: number;
    quantityDelta: number;
    reason: string;
    createdAt: string;
  }>;
};
