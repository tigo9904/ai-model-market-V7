"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, ArrowLeft, LogOut, AlertCircle } from "lucide-react"
import Link from "next/link"
import ProductForm from "@/components/product-form"
import AdminProductList from "@/components/admin-product-list"
import type { Product } from "@/types/product"
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/lib/database" // Assuming these functions are correctly implemented
import { isAdminAuthenticated, logoutAdmin } from "@/lib/auth"

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [view, setView] = useState<"list" | "form">("list") // 'list' or 'form'
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      router.push("/admin/login?redirect=/admin")
      return
    }
    loadProducts()
  }, [router])

  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    setPageError(null)
    try {
      const fetchedProducts = await getProducts()
      setProducts(fetchedProducts)
    } catch (err) {
      console.error("Error fetching products:", err)
      setPageError("Failed to load products. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleLogout = () => {
    logoutAdmin()
    router.push("/admin/login")
  }

  const handleShowAddForm = () => {
    setEditingProduct(null)
    setView("form")
    setPageError(null)
  }

  const handleShowEditForm = (productToEdit: Product) => {
    setEditingProduct(productToEdit)
    setView("form")
    setPageError(null)
  }

  const handleFormSubmit = async (productData: Product | Omit<Product, "id" | "createdAt" | "updatedAt">) => {
    setIsLoading(true)
    setPageError(null)
    try {
      let resultProduct: Product | null = null
      if (editingProduct && "id" in productData) {
        // Editing existing product
        console.log("Attempting to update product:", productData.id)
        resultProduct = await updateProduct(productData as Product)
      } else {
        // Adding new product
        console.log("Attempting to create new product...")
        resultProduct = await createProduct(productData as Omit<Product, "id" | "createdAt" | "updatedAt">)
      }

      if (resultProduct) {
        await loadProducts() // Reload products list
        setView("list")
        setEditingProduct(null)
        alert(`Product ${editingProduct ? "updated" : "added"} successfully!`)
      } else {
        throw new Error(`Failed to ${editingProduct ? "update" : "add"} product.`)
      }
    } catch (err: any) {
      console.error("Error submitting product form:", err)
      setPageError(err.message || `An error occurred while ${editingProduct ? "updating" : "adding"} the product.`)
      // Keep form open on error
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormCancel = () => {
    setView("list")
    setEditingProduct(null)
    setPageError(null)
  }

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) return

    setIsLoading(true)
    setPageError(null)
    try {
      const success = await deleteProduct(productId)
      if (success) {
        await loadProducts() // Reload products
        alert("Product deleted successfully!")
      } else {
        throw new Error("Failed to delete product.")
      }
    } catch (err: any) {
      console.error("Error deleting product:", err)
      setPageError(err.message || "An error occurred while deleting the product.")
    } finally {
      setIsLoading(false)
    }
  }

  // Ensure client-side auth check before rendering sensitive content
  if (typeof window !== "undefined" && !isAdminAuthenticated()) {
    // This will likely be caught by the useEffect redirect, but good as a safeguard
    return <div className="p-8 text-center">Redirecting to login...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/" passHref>
                <Button variant="outline" size="sm" className="text-sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Store
                </Button>
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-3">
              {view === "list" && (
                <Button onClick={handleShowAddForm} className="bg-blue-600 hover:bg-blue-700 text-sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Product
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleLogout}
                className="text-sm border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        {pageError && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md shadow-sm">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="font-semibold">Error:</span>
            </div>
            <p className="ml-7 text-sm">{pageError}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPageError(null)}
              className="mt-1 text-red-600 hover:text-red-800 text-xs"
            >
              Dismiss
            </Button>
          </div>
        )}

        {view === "form" ? (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-gray-700">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductForm
                product={editingProduct}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                isLoadingExternally={isLoading}
              />
            </CardContent>
          </Card>
        ) : (
          <AdminProductList
            products={products}
            onEdit={handleShowEditForm}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  )
}
