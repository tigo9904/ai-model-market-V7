"use server"

import { supabase } from "@/lib/supabase"
import { Buffer } from "buffer"

interface UploadResult {
  urls?: string[]
  error?: string
}

const PRODUCT_IMAGE_BUCKET = "product-images" // Ensure this matches your Supabase bucket name

export async function uploadProductImagesToSupabaseAction(base64Images: string[]): Promise<UploadResult> {
  console.log("[Server Action] Attempting to upload images to Supabase Storage.")
  if (!supabase) {
    console.error("[Server Action] Supabase client is not initialized.")
    return { error: "Supabase client not initialized. Check server configuration." }
  }

  const uploadedUrls: string[] = []
  for (let i = 0; i < base64Images.length; i++) {
    const base64Image = base64Images[i]
    if (!base64Image.startsWith("data:image/")) {
      console.warn(`[Server Action] Invalid base64 image format at index ${i}. Skipping.`)
      continue
    }

    const parts = base64Image.split(",")
    const base64Data = parts[1]
    const imageTypeMatch = parts[0].match(/^data:(image\/[a-zA-Z+]+);base64$/)
    const contentType = imageTypeMatch?.[1] || "image/jpeg"
    const fileExtension = contentType.split("/")[1] || "jpg"
    const fileName = `product-${Date.now()}-${i}.${fileExtension}`

    try {
      const buffer = Buffer.from(base64Data, "base64")
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(fileName, buffer, { contentType, upsert: false })

      if (uploadError) {
        console.error(`[Server Action] Supabase storage upload error for ${fileName}:`, uploadError)
        return { error: `Failed to upload ${fileName}: ${uploadError.message}` }
      }

      if (uploadData?.path) {
        const { data: publicUrlData } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(uploadData.path)
        if (publicUrlData?.publicUrl) {
          uploadedUrls.push(publicUrlData.publicUrl)
          console.log(`[Server Action] Successfully uploaded ${fileName}. URL: ${publicUrlData.publicUrl}`)
        } else {
          console.warn(`[Server Action] Uploaded ${fileName} but failed to get public URL. Check bucket permissions.`)
          // Storing the path might be an alternative if public URLs are problematic
          // For now, we'll consider it an issue if public URL isn't available.
          return { error: `Uploaded ${fileName} but could not retrieve public URL. Check bucket permissions.` }
        }
      } else {
        console.error(`[Server Action] Supabase storage upload for ${fileName} did not return a path.`)
        return { error: `Upload for ${fileName} failed to return a path.` }
      }
    } catch (e: any) {
      console.error(`[Server Action] Exception during upload for image ${i}:`, e)
      return { error: `Error processing image ${i}: ${e.message}` }
    }
  }

  if (base64Images.length > 0 && uploadedUrls.length === 0) {
    return { error: "No images were successfully uploaded. Check logs for details." }
  }
  return { urls: uploadedUrls }
}
