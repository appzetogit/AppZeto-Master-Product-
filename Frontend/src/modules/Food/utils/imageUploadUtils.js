import { toast } from "sonner"

/**
 * Utility to convert base64 image data from Flutter bridge into a File object
 */
export const convertBase64ToFile = (base64Value, mimeType = "image/jpeg", fileNamePrefix = "upload") => {
  if (!base64Value || typeof base64Value !== "string") {
    throw new Error("Invalid base64 image data")
  }

  let pureBase64 = base64Value
  if (base64Value.includes(",")) {
    pureBase64 = base64Value.split(",")[1]
  }

  try {
    const byteCharacters = atob(pureBase64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i += 1) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    const extension = mimeType.includes("png") ? "png" : 
                     mimeType.includes("webp") ? "webp" : "jpg"
    const blob = new Blob([byteArray], { type: mimeType })
    return new File([blob], `${fileNamePrefix}-${Date.now()}.${extension}`, { type: mimeType })
  } catch (error) {
    console.error("Base64 conversion failed:", error)
    throw new Error("Failed to process image data")
  }
}

/**
 * Standard browser camera fallback
 */
export const openBrowserCameraFallback = (onSelectFile) => {
  try {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.capture = "environment"
    input.onchange = (event) => {
      const file = event?.target?.files?.[0] || null
      if (file) onSelectFile(file)
    }
    input.click()
  } catch (error) {
    console.error("Browser camera fallback failed:", error)
    toast.error("Could not open camera")
  }
}

/**
 * Check if the Flutter InAppWebView bridge is available
 */
export const isFlutterBridgeAvailable = () => {
  return (
    typeof window !== "undefined" &&
    window.flutter_inappwebview &&
    typeof window.flutter_inappwebview.callHandler === "function"
  )
}

/**
 * Open camera via Flutter bridge or browser fallback
 */
export const openCamera = async ({ onSelectFile, fileNamePrefix = "camera-photo", quality = 0.8 }) => {
  try {
    if (!isFlutterBridgeAvailable()) {
      openBrowserCameraFallback(onSelectFile)
      return
    }

    const result = await window.flutter_inappwebview.callHandler("openCamera", {
      source: "camera",
      accept: "image/*",
      multiple: false,
      quality: quality,
    })

    if (!result || !result.success) return

    let selectedFile = null
    if (result.base64) {
      selectedFile = convertBase64ToFile(
        result.base64,
        result.mimeType || "image/jpeg",
        fileNamePrefix
      )
    } else if (result.file instanceof File || result.file instanceof Blob) {
      selectedFile = result.file
    }

    if (!selectedFile || !String(selectedFile.type || "").startsWith("image/")) {
      toast.error("Failed to capture image")
      return
    }

    onSelectFile(selectedFile)
  } catch (error) {
    console.error("Camera capture failed:", error)
    // Try fallback on bridge failure
    openBrowserCameraFallback(onSelectFile)
  }
}

/**
 * Open gallery via Flutter bridge or browser fallback
 */
export const openGallery = async ({ onSelectFile, fileNamePrefix = "gallery-photo" }) => {
  try {
    // For Gallery, we use the standard browser input.
    // Why? Because the browser's native file picker on Android/iOS 
    // is highly reliable and provides direct gallery access.
    // The bridge "openCamera" seems to force camera even for gallery source.
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = (event) => {
      const file = event?.target?.files?.[0] || null
      if (file) onSelectFile(file)
    }
    input.click()
  } catch (error) {
    console.error("Gallery pick failed:", error)
    toast.error("Failed to open gallery")
  }
}
