import { ProductsManager } from "@/components/admin/products-manager";

export default function AdminProductsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Produk</h1>
        <p className="mt-1 text-sm text-muted">
          Kelola produk siap beli yang tampil di halaman /produk.
        </p>
      </div>
      <ProductsManager />
    </div>
  );
}
