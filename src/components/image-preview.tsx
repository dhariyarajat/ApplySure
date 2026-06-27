"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ZoomIn, ZoomOut, RotateCw, X, Maximize2, Minimize2, AlertCircle, CheckCircle2, Brain } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { DocumentAnalysisResult } from "@/lib/document-ai"

/** Check if a value is a valid File or Blob object */
function isValidFileOrBlob(value: unknown): value is File | Blob {
  return (
    typeof Blob !== "undefined" &&
    value instanceof Blob
  )
}

interface ImagePreviewProps {
  file: File | Blob | null | undefined
  analysisResult?: DocumentAnalysisResult | null
  onRemove?: () => void
  className?: string
}

export function ImagePreview({ file, analysisResult, onRemove, className }: ImagePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string>("")
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isValidFileOrBlob(file)) {
      setImageUrl("")
      return
    }
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      setDimensions({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      })
    }
  }, [])

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.25))
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360)
  const handleReset = () => {
    setZoom(1)
    setRotation(0)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const isValid = analysisResult?.classification.isValidDocument
  const confidence = analysisResult?.overallConfidence ?? 0

  return (
    <div className={cn("space-y-3 animate-slide-up", className)}>
      {/* Preview Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">
  {file && "name" in file ? file.name : "Uploaded image"}
</span>
          <span className="text-muted-foreground">({file && "name" in file ? file.name : "Uploaded image"})</span>
          {dimensions.width > 0 && (
            <span className="text-muted-foreground hidden sm:inline">
              {dimensions.width}×{dimensions.height}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground w-8 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleRotate}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors"
            title="Rotate"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              className="rounded-lg p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 transition-colors"
              title="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className={cn(
          "relative overflow-hidden rounded-xl border bg-muted/30",
          isFullscreen ? "fixed inset-4 z-50 bg-background shadow-2xl" : "h-64 sm:h-80"
        )}
      >
        {/* Fullscreen toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="absolute top-2 right-2 z-10 rounded-lg bg-background/80 backdrop-blur-sm p-1.5 shadow-sm hover:bg-background transition-colors"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        {/* Analysis Badge */}
        {analysisResult && (
          <div className="absolute top-2 left-2 z-10">
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm backdrop-blur-sm",
                isValid
                  ? "bg-emerald-500/90 text-white"
                  : "bg-red-500/90 text-white"
              )}
            >
              {isValid ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              {isValid ? `Verified (${confidence}%)` : "Rejected"}
            </div>
          </div>
        )}

        {/* Image */}
        <div
          className="flex h-full w-full items-center justify-center transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
        >
          {imageUrl && (
            <img
              ref={imgRef}
              src={imageUrl}
              alt={file && "name" in file ? file.name : "Uploaded image"}
              className="max-h-full max-w-full object-contain"
              onLoad={handleImageLoad}
              onError={(e) => {
                const target = e.currentTarget
                target.style.display = "none"
              }}
            />
          )}
        </div>

        {/* Zoom level indicator */}
        {zoom !== 1 && (
          <div className="absolute bottom-2 right-2 rounded-lg bg-background/80 backdrop-blur-sm px-2 py-1 text-xs text-muted-foreground">
            {Math.round(zoom * 100)}%
          </div>
        )}
      </div>

      {/* Image Info Bar */}
      {analysisResult && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            AI Analysis
          </span>
          <span>Document: {analysisResult.classification.documentType.replace(/_/g, " ")}</span>
          <span>Confidence: {confidence}%</span>
          <span>Processing: {(analysisResult.processingTimeMs / 1000).toFixed(1)}s</span>
          {analysisResult.extraction?.rawText && (
            <span className="hidden sm:inline">
              Text chars: {analysisResult.extraction.rawText.length}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
