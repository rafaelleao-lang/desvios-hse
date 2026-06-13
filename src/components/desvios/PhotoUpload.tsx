'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, X, Image as ImageIcon, Video, FileText, Loader2 } from 'lucide-react'
import { cn, compressImage, formatFileSize } from '@/lib/utils'
import Image from 'next/image'

interface UploadedFile {
  id: string
  file: File
  preview: string
  type: 'image' | 'video' | 'document'
  uploading?: boolean
  error?: string
}

interface PhotoUploadProps {
  onFilesChange?: (files: File[]) => void
  maxFiles?: number
  accept?: string
  label?: string
}

export function PhotoUpload({ onFilesChange, maxFiles = 10, accept = 'image/*,video/*', label = 'Fotos do Desvio' }: PhotoUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function getFileType(file: File): UploadedFile['type'] {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    return 'document'
  }

  function isPreviewable(file: File): boolean {
    const t = file.type.toLowerCase()
    const n = file.name.toLowerCase()
    return !t.includes('heic') && !t.includes('heif') && !t.includes('avif') &&
           !n.endsWith('.heic') && !n.endsWith('.heif')
  }

  async function processFiles(incoming: File[]) {
    const remaining = maxFiles - files.length
    const toProcess = incoming.slice(0, remaining)

    const newFiles: UploadedFile[] = toProcess.map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      preview: isPreviewable(f) ? URL.createObjectURL(f) : '',
      type: getFileType(f),
      uploading: true,
    }))

    setFiles((prev) => [...prev, ...newFiles])

    // Compress images
    const processed = await Promise.all(
      newFiles.map(async (uf) => {
        if (uf.type === 'image') {
          try {
            const compressed = await compressImage(uf.file)
            const oldPreview = uf.preview
            const preview = isPreviewable(compressed) ? URL.createObjectURL(compressed) : ''
            if (oldPreview) URL.revokeObjectURL(oldPreview)
            return { ...uf, file: compressed, preview, uploading: false }
          } catch {
            return { ...uf, uploading: false }
          }
        }
        return { ...uf, uploading: false }
      }),
    )

    setFiles((prev) => {
      const updated = prev.map((f) => {
        const p = processed.find((pf) => pf.id === f.id)
        return p || f
      })
      onFilesChange?.(updated.map((f) => f.file))
      return updated
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    processFiles(Array.from(e.dataTransfer.files))
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) processFiles(Array.from(e.target.files))
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id)
      onFilesChange?.(updated.map((f) => f.file))
      return updated
    })
  }

  const openCamera = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.setAttribute('capture', 'environment')
      inputRef.current.click()
    }
  }, [])

  const openGallery = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.removeAttribute('capture')
      inputRef.current.click()
    }
  }, [])

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-zinc-300">{label}</label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all duration-200',
          dragging
            ? 'border-amber-500/60 bg-amber-500/5'
            : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600',
          files.length >= maxFiles && 'opacity-50 pointer-events-none',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleInput}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center justify-center py-8 px-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-3">
            <Upload className="w-6 h-6 text-zinc-500" />
          </div>
          <p className="text-sm font-medium text-zinc-300 mb-1">
            Arraste arquivos ou clique para selecionar
          </p>
          <p className="text-xs text-zinc-600">PNG, JPG, MP4 · Máx {maxFiles} arquivos</p>

          {/* Quick action buttons */}
          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openCamera() }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors active:scale-95"
            >
              <Camera className="w-4 h-4" />
              Câmera
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openGallery() }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors active:scale-95"
            >
              <ImageIcon className="w-4 h-4" />
              Galeria
            </button>
          </div>
        </div>
      </div>

      {/* Preview grid */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2"
          >
            {files.map((f) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group aspect-square rounded-xl overflow-hidden bg-zinc-800"
              >
                {f.type === 'image' && f.preview ? (
                  <Image src={f.preview} alt={f.file.name} fill className="object-cover" unoptimized />
                ) : f.type === 'image' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                    <ImageIcon className="w-6 h-6 text-zinc-400" />
                    <span className="text-[9px] text-zinc-500 text-center">foto</span>
                  </div>
                ) : f.type === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="w-6 h-6 text-zinc-400" />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                    <FileText className="w-6 h-6 text-zinc-400" />
                    <span className="text-[9px] text-zinc-500 text-center truncate w-full">{f.file.name}</span>
                  </div>
                )}

                {/* Uploading overlay */}
                {f.uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                  </div>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="w-3 h-3 text-white" />
                </button>

                {/* File size */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                  <p className="text-[9px] text-zinc-400 truncate">{formatFileSize(f.file.size)}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {files.length > 0 && (
        <p className="text-xs text-zinc-600">{files.length}/{maxFiles} arquivo{files.length !== 1 && 's'} selecionado{files.length !== 1 && 's'}</p>
      )}
    </div>
  )
}
