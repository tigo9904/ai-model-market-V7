"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Product } from "@/types/product"
import { uploadProductImagesToSupabaseAction } from "@/app/admin/actions"
import { X } from "lucide-react"

interface ProductFormProps {
  product?: Product | null
  onSubmit: (productData: Product | Omit<Product, "id" | "createdAt" | "updatedAt">) => Promise<void>
  onCancel: () => void
  isLoadingExternally?: boolean
}

export default function ProductForm({ product, onSubmit, onCancel, isLoadingExternally = false }: ProductFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [category, setCategory] = useState("Starter Package")
  const [paymentLink, setPaymentLink] = useState("")
  const [existingImages, setExistingImages] = useState<string[]>([]) // URLs from DB
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]) // New files selected by user
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]) // Base64 previews for new files

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (product) {
      setName(product.name)
      setDescription(product.description)
      setPrice(product.price)
      setCategory(product.category)
      setPaymentLink(product.paymentLink)
      setExistingImages(product.images || [])
    } else {
      // Reset form for new product
      setName("")
      setDescription(productDefaults["Starter Package"].description)
      setPrice(productDefaults["Starter Package"].price)
      setCategory("Starter Package")
      setPaymentLink("")
      setExistingImages([])
    }
    setNewImageFiles([])
    setNewImagePreviews([])
    setError(null)
    setFormErrors({})
  }, [product])

  const productDefaults = {
    "Starter Package": {
      price: "$497",
      description: `Starter Package ($497)\n\n(For Beginners Ready To Launch Their First AI Model whilst skipping the AI Creation Phase)\n\nWhat You Get:\n\n• A Custom Built Pre-made AI Model LoRa - (So that you can plug and play and start generating images of your model immediately)\n• A Basic ComfyUI Workflow - (So that you can skip the platform setup and plug in your LoRa Immediately)  \n• A Basic ComfyUI Workflow Video Guide - (So you know how to use the Lora to create content)\n\nThis Package Is Perfect For:\n\n• People who are just starting out in their AI Model journey and would like to skip the trial and error phase of designing and creating their first model\n• People who have completed The AI Model Method $47 course and would like to take their AI Model business to the next level immediately\n• Those who are struggling to generate consistent ultra realistic content\n• Those who want to fast track the process and have an extremely high quality AI Model within the next couple minutes`,
    },
    "Pro Package": {
      price: "$997",
      description: `Pro Package ($997)\n\n(For Serious AI Model Creators Ready To Monetise)\n\nWhat You Get:\n\nEVERYTHING IN 'STARTER PACKAGE', PLUS:\n\n• 15 Pre-made Instagram Posts - (So that you can start marketing immediately)\n• 15 Fanvue Free Wall Posts - (So that you have a Fanvue worth subscribing to today)\n• 1 Fanvue Profile Picture - (Designed for conversions)\n• 1 Fanvue Banner Image - (A 5 image collage designed for conversion)\n• 1 Image ready to turn into a Fanvue Intro Video - (To help boost your discoverability and conversions)\n\nBonuses:\n\n• Intermediate ComfyUI Workflow + Upscaler - (So that you can develop content on the most advanced AI platform with ease)\n• Video Tutorial Guide\n• SFW Prompt Guide\n\nThis Package Is Perfect For:\n\n• Creators who understand the basics and are ready to establish a profitable AI Model presence\n• Those who want a head start getting their AI Model business up and running from DAY 1\n• Creators looking to implement a world class level AI Model into their business`,
    },
  }

  const handleCategoryChange = (newCategory: "Starter Package" | "Pro Package") => {
    setCategory(newCategory)
    setPrice(productDefaults[newCategory].price)
    setDescription(productDefaults[newCategory].description)
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = "Product name is required"
    if (!description.trim()) errors.description = "Description is required"
    if (!price.trim()) errors.price = "Price is required"
    if (!paymentLink.trim()) errors.paymentLink = "Payment link is required"
    if (!paymentLink.startsWith("http")) errors.paymentLink = "Payment link must be a valid URL"
    if (existingImages.length + newImageFiles.length === 0) errors.images = "At least one image is required"
    if (existingImages.length + newImageFiles.length > 5) errors.images = "Maximum 5 images allowed"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const totalImages = existingImages.length + newImageFiles.length + files.length
    if (totalImages > 5) {
      setError("You can upload a maximum of 5 images in total.")
      return
    }

    setNewImageFiles((prev) => [...prev, ...files])

    const newPreviews: string[] = []
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        newPreviews.push(reader.result as string)
        if (newPreviews.length === files.length) {
          setNewImagePreviews((prev) => [...prev, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = "" // Allow selecting the same file again if removed
  }

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeNewImage = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index))
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const convertFilesToBase64 = async (files: File[]): Promise<string[]> => {
    const base64Promises = files.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    })
    return Promise.all(base64Promises)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setError(null)
    console.log("Form submission started...")

    try {
      let uploadedNewImageUrls: string[] = []
      if (newImageFiles.length > 0) {
        console.log(`Attempting to upload ${newImageFiles.length} new images...`)
        const base64NewImages = await convertFilesToBase64(newImageFiles)
        const uploadResult = await uploadProductImagesToSupabaseAction(base64NewImages)
        if (uploadResult.error || !uploadResult.urls) {
          throw new Error(uploadResult.error || "Failed to upload new images.")
        }
        uploadedNewImageUrls = uploadResult.urls
        console.log("New images uploaded successfully:", uploadedNewImageUrls)
      }

      const finalImageUrls = [...existingImages, ...uploadedNewImageUrls]

      const productData = {
        name,
        description,
        price,
        category,
        paymentLink,
        images: finalImageUrls,
      }

      if (product && product.id) {
        await onSubmit({ ...product, ...productData }) // For update
      } else {
        await onSubmit(productData) // For create
      }

      console.log("Product submission successful.")
      // Resetting form fields after successful submission is usually handled by the parent component
      // by unmounting/remounting or changing the `product` prop.
      // For clarity, we can reset new image states here.
      setNewImageFiles([])
      setNewImagePreviews([])
    } catch (err: any) {
      console.error("Error during product submission:", err)
      setError(err.message || "An unexpected error occurred during submission.")
    } finally {
      setIsSubmitting(false)
      console.log("Form submission ended.")
    }
  }

  const allImages = [
    ...existingImages.map((url) => ({ type: "existing" as const, src: url })),
    ...newImagePreviews.map((src) => ({ type: "new" as const, src: src })),
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="name">Product Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          {formErrors.name && <p className="text-red-500 text-sm">{formErrors.name}</p>}
        </div>
        <div>
          <Label htmlFor="price">Price</Label>
          <Input id="price" value={price} onChange={(e) => setPrice(e.target.value)} />
          {formErrors.price && <p className="text-red-500 text-sm">{formErrors.price}</p>}
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={category}
            onValueChange={(val) => handleCategoryChange(val as "Starter Package" | "Pro Package")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Starter Package">Starter Package</SelectItem>
              <SelectItem value="Pro Package">Pro Package</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="paymentLink">Payment Link</Label>
          <Input id="paymentLink" type="url" value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} />
          {formErrors.paymentLink && <p className="text-red-500 text-sm">{formErrors.paymentLink}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={10} />
        {formErrors.description && <p className="text-red-500 text-sm">{formErrors.description}</p>}
      </div>

      <div>
        <Label htmlFor="images">Product Images ({allImages.length}/5)</Label>
        <Input
          id="images"
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageChange}
          disabled={allImages.length >= 5}
        />
        {formErrors.images && <p className="text-red-500 text-sm">{formErrors.images}</p>}
        {allImages.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {allImages.map((image, index) => (
              <div key={index} className="relative group aspect-square">
                <img
                  src={image.src || "/placeholder.svg"}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover rounded-md border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() =>
                    image.type === "existing"
                      ? removeExistingImage(existingImages.findIndex((url) => url === image.src))
                      : removeNewImage(newImagePreviews.findIndex((src) => src === image.src))
                  }
                >
                  <X size={16} />
                </Button>
                {index === 0 && (
                  <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">
                    Main
                  </div>
                )}
                {image.type === "new" && (
                  <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">New</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isLoadingExternally}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isLoadingExternally}>
          {isSubmitting ? "Saving..." : product ? "Update Product" : "Add Product"}
        </Button>
      </div>
    </form>
  )
}
