import type React from "react"

import { useState, useRef, useEffect } from "react"
import cornerstone from "cornerstone-core"
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader"
import dicomParser from "dicom-parser"
import jsPDF from "jspdf"
import { ZoomIn, ZoomOut, RotateCw, Move, Pencil, Type, Ruler, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"

cornerstoneWADOImageLoader.external.cornerstone = cornerstone
cornerstoneWADOImageLoader.external.dicomParser = dicomParser
cornerstoneWADOImageLoader.configure({ useWebWorkers: true })

interface Study {
  id: string
  patientName: string
  patientId: string
  modality: string
  description: string
  studyDate: string
  images: string[]
  pixelSpacing?: number // Para convertir píxeles a mm
}

interface DicomViewerProps {
  study: Study
}

interface Point {
  x: number
  y: number
}

interface Measurement {
  start: Point
  end: Point
  distance: number
  distanceMm: number
}

export default function DicomViewer({ study }: DicomViewerProps) {
  const cornerstoneElementRef = useRef<HTMLDivElement>(null)
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [doctorComment, setDoctorComment] = useState("")
  const [comments, setComments] = useState<{ text: string; date: string }[]>([])
  const [activeTool, setActiveTool] = useState("move")
  const containerRef = useRef<HTMLDivElement>(null)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [currentMeasurement, setCurrentMeasurement] = useState<{start: Point | null, end: Point | null}>({
    start: null,
    end: null
  })
  const [pixelSpacing, setPixelSpacing] = useState(0.2) // Valor predeterminado: 0.2 mm por píxel

  // Inicializar Cornerstone y configurar la herramienta de mover
  useEffect(() => {
    if (!study || !cornerstoneElementRef.current) return

    const element = cornerstoneElementRef.current
    cornerstone.enable(element)

    // Si tenemos espaciado de píxeles en el estudio, usarlo
    if (study.pixelSpacing) {
      setPixelSpacing(study.pixelSpacing)
    }

    const imageId = `wadouri:${study.images[currentImageIndex]}`
    cornerstone
      .loadImage(imageId)
      .then((image) => {
        const viewport = cornerstone.getDefaultViewportForImage(element, image)
        viewport.scale = zoom
        viewport.rotation = rotation
        viewport.voi = {
          windowWidth: 100 + contrast * 2, // Ajuste para el nuevo rango
          windowCenter: brightness,
        }

        cornerstone.displayImage(element, image, viewport)
        
        // Obtener el espaciado de píxeles de los metadatos DICOM si está disponible
        const imageMetadata = cornerstone.metaData.get('imagePlaneModule', imageId)
        if (imageMetadata && imageMetadata.rowPixelSpacing) {
          setPixelSpacing(imageMetadata.rowPixelSpacing)
        }
      })
      .catch(console.error)

    // Configurar el evento de arrastre para la herramienta de mover
    const handleMouseDown = (e: MouseEvent) => {
      if (activeTool !== 'move') return
      
      e.preventDefault()
      e.stopPropagation()
      
      let lastX = e.clientX
      let lastY = e.clientY
      let isDragging = true
      
      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging) return
        
        const deltaX = moveEvent.clientX - lastX
        const deltaY = moveEvent.clientY - lastY
        lastX = moveEvent.clientX
        lastY = moveEvent.clientY
        
        const viewport = cornerstone.getViewport(element)
        viewport.translation.x += (deltaX / viewport.scale)
        viewport.translation.y += (deltaY / viewport.scale)
        cornerstone.setViewport(element, viewport)
      }
      
      const handleMouseUp = () => {
        isDragging = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    
    // Agregar evento solo si la herramienta activa es "move"
    if (activeTool === 'move') {
      element.addEventListener('mousedown', handleMouseDown)
    }

    return () => {
      cornerstone.disable(element)
      element.removeEventListener('mousedown', handleMouseDown)
    }
  }, [study, currentImageIndex, zoom, rotation, brightness, contrast, activeTool])

  // Ajustar el tamaño del canvas de anotaciones
  useEffect(() => {
    const resizeCanvas = () => {
      const baseCanvas = cornerstoneElementRef.current?.querySelector("canvas")
      const annotationCanvas = annotationCanvasRef.current

      if (baseCanvas && annotationCanvas) {
        annotationCanvas.width = baseCanvas.width
        annotationCanvas.height = baseCanvas.height
        drawAnnotations()
      }
    }

    setTimeout(resizeCanvas, 500)
    const observer = new MutationObserver(resizeCanvas)
    const element = cornerstoneElementRef.current

    if (element) {
      observer.observe(element, { childList: true, subtree: true })
    }

    window.addEventListener("resize", resizeCanvas)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [cornerstoneElementRef.current])

  // Dibujar anotaciones y mediciones
  const drawAnnotations = () => {
    const canvas = annotationCanvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx || !canvas) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Dibujar mediciones existentes
    measurements.forEach((measure) => {
      ctx.beginPath()
      ctx.moveTo(measure.start.x, measure.start.y)
      ctx.lineTo(measure.end.x, measure.end.y)
      ctx.strokeStyle = "#00FF00"
      ctx.lineWidth = 2
      ctx.stroke()

      // Dibujar texto con la distancia en mm
      const midX = (measure.start.x + measure.end.x) / 2
      const midY = (measure.start.y + measure.end.y) / 2
      ctx.fillStyle = "#00FF00"
      ctx.font = "14px Arial"
      ctx.fillText(`${measure.distanceMm.toFixed(2)} mm`, midX + 5, midY - 5)
    })

    // Dibujar medición en curso
    if (currentMeasurement.start && currentMeasurement.end) {
      ctx.beginPath()
      ctx.moveTo(currentMeasurement.start.x, currentMeasurement.start.y)
      ctx.lineTo(currentMeasurement.end.x, currentMeasurement.end.y)
      ctx.strokeStyle = "#00FF00"
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.stroke()
      ctx.setLineDash([])
      
      // Calcular y mostrar la distancia en tiempo real
      const distancePx = Math.sqrt(
        Math.pow(currentMeasurement.end.x - currentMeasurement.start.x, 2) + 
        Math.pow(currentMeasurement.end.y - currentMeasurement.start.y, 2)
      )
      const distanceMm = distancePx * pixelSpacing
      
      const midX = (currentMeasurement.start.x + currentMeasurement.end.x) / 2
      const midY = (currentMeasurement.start.y + currentMeasurement.end.y) / 2
      ctx.fillStyle = "#00FF00"
      ctx.font = "14px Arial"
      ctx.fillText(`${distanceMm.toFixed(2)} mm`, midX + 5, midY - 5)
    }
  }

  // Funciones de dibujo
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Si estamos en modo "move", no hacer nada aquí
    if (activeTool === "move") return
    
    const canvas = annotationCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)

    if (activeTool === "measure") {
      if (!currentMeasurement.start) {
        setCurrentMeasurement({ start: { x, y }, end: { x, y } })
      } else {
        const distancePx = Math.sqrt(
          Math.pow(x - currentMeasurement.start.x, 2) + Math.pow(y - currentMeasurement.start.y, 2)
        )
        const distanceMm = distancePx * pixelSpacing
        
        setMeasurements([
          ...measurements,
          {
            start: currentMeasurement.start,
            end: { x, y },
            distance: distancePx,
            distanceMm: distanceMm
          },
        ])
        setCurrentMeasurement({ start: null, end: null })
      }
      return
    }

    if (activeTool === "draw" || activeTool === "text") {
      setIsDrawing(true)
      setLastPosition({ x, y })

      if (activeTool === "text") {
        const ctx = canvas.getContext("2d")
        if (ctx) {
          const text = prompt("Ingrese el texto para la anotación:", "")
          if (text) {
            ctx.font = "16px Arial"
            ctx.fillStyle = "#FF0000"
            ctx.fillText(text, x, y)
          }
        }
        setIsDrawing(false)
      }
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Si estamos en modo "move", no hacer nada aquí
    if (activeTool === "move") return
    
    if (!isDrawing && activeTool !== "measure") return

    const canvas = annotationCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)

    if (activeTool === "measure" && currentMeasurement.start) {
      setCurrentMeasurement((prev) => ({ ...prev, end: { x, y } }))
      drawAnnotations()
      return
    }

    if (activeTool === "draw" && isDrawing) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.beginPath()
        ctx.strokeStyle = "#FF0000"
        ctx.lineWidth = 2
        ctx.moveTo(lastPosition.x, lastPosition.y)
        ctx.lineTo(x, y)
        ctx.stroke()
        setLastPosition({ x, y })
      }
    }
  }

  const stopDrawing = () => setIsDrawing(false)

  // Funciones de manipulación de imagen
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 3))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5))
  const handleRotateClockwise = () => setRotation((prev) => prev + 90)
  const handleRotateCounterClockwise = () => setRotation((prev) => prev - 90)

  // Restablecer todos los valores y limpiar anotaciones
  const handleResetView = () => {
    setZoom(1)
    setRotation(0)
    setBrightness(0)
    setContrast(0)
    handleClearAnnotations()
    handleClearMeasurements()
    
    // Restablecer la posición de la imagen (pan)
    if (cornerstoneElementRef.current) {
      const element = cornerstoneElementRef.current
      const viewport = cornerstone.getViewport(element)
      viewport.translation = { x: 0, y: 0 }
      cornerstone.setViewport(element, viewport)
    }
  }

  const handleClearAnnotations = () => {
    const canvas = annotationCanvasRef.current
    const ctx = canvas?.getContext("2d")
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  const handleClearMeasurements = () => {
    setMeasurements([])
    setCurrentMeasurement({ start: null, end: null })
    drawAnnotations()
  }

  // Exportación de imágenes
  const exportCanvas = () => {
    const baseCanvas = cornerstoneElementRef.current?.querySelector("canvas")
    const annotationCanvas = annotationCanvasRef.current
    if (!baseCanvas || !annotationCanvas) return null
    const merged = document.createElement("canvas")
    merged.width = baseCanvas.width
    merged.height = baseCanvas.height
    const ctx = merged.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(baseCanvas, 0, 0)
    ctx.drawImage(annotationCanvas, 0, 0)
    return merged
  }

  const exportAs = (format: "jpg" | "png" | "pdf") => {
    const merged = exportCanvas()
    if (!merged) return alert("No se pudo generar la imagen.")
    const dataUrl = merged.toDataURL(format === "pdf" ? "image/jpeg" : `image/${format}`)
    if (format === "pdf") {
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [merged.width, merged.height] })
      pdf.addImage(dataUrl, "JPEG", 0, 0, merged.width, merged.height)
      pdf.save("imagen_dicom.pdf")
    } else {
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = `imagen_dicom.${format}`
      link.click()
    }
  }

  // Manejo de comentarios
  const handleAddComment = () => {
    if (doctorComment.trim()) {
      setComments([
        ...comments,
        {
          text: doctorComment,
          date: new Date().toLocaleDateString(),
        },
      ])
      setDoctorComment("")
    }
  }

  // Cambiar herramienta activa
  const handleToolChange = (tool: string) => {
    setActiveTool(tool)
  }

  // Reset values when changing images
  useEffect(() => {
    // Only reset if not the first load
    if (currentImageIndex !== 0) {
      setZoom(1)
      setBrightness(0)
      setContrast(0)
    }
  }, [currentImageIndex])

  if (!study) return null

  return (
    <div className="flex flex-col w-full h-full bg-white" ref={containerRef}>
      {/* Header superior con botones de exportación */}
      <div className="px-6 py-4 bg-white border-b shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-blue-700">NeoRadia</h1>
          <p className="text-sm text-gray-500">
            {study.patientName} | {study.patientId} | {study.modality}: {study.description}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleClearAnnotations}>
            Limpiar
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportAs("jpg")}>
            JPG
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportAs("png")}>
            PNG
          </Button>
          <Button variant="default" size="sm" onClick={() => exportAs("pdf")}>
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetView}>
            Restablecer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 h-full">
        {/* Columna izquierda - Herramientas */}
        <div className="md:col-span-3 flex flex-col h-full">
          {/* Herramientas del médico */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3">Herramientas</h3>
              <div className="grid grid-cols-4 gap-2 mb-4">
                <Button
                  variant={activeTool === "move" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolChange("move")}
                  className="flex flex-col items-center justify-center h-16 px-1"
                >
                  <Move className="h-4 w-4 mb-1" />
                  <span className="text-xs">Mover</span>
                </Button>
                <Button
                  variant={activeTool === "draw" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolChange("draw")}
                  className="flex flex-col items-center justify-center h-16 px-1"
                >
                  <Pencil className="h-4 w-4 mb-1" />
                  <span className="text-xs">Dibujar</span>
                </Button>
                <Button
                  variant={activeTool === "text" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolChange("text")}
                  className="flex flex-col items-center justify-center h-16 px-1"
                >
                  <Type className="h-4 w-4 mb-1" />
                  <span className="text-xs">Texto</span>
                </Button>
                <Button
                  variant={activeTool === "measure" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolChange("measure")}
                  className="flex flex-col items-center justify-center h-16 px-1"
                >
                  <Ruler className="h-4 w-4 mb-1" />
                  <span className="text-xs">Medir</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAnnotations}
                  className="flex flex-col items-center justify-center h-16 px-1"
                >
                  <Trash2 className="h-4 w-4 mb-1" />
                  <span className="text-xs">Limpiar</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearMeasurements}
                  className="flex flex-col items-center justify-center h-16 px-1"
                >
                  <Trash2 className="h-4 w-4 mb-1" />
                  <span className="text-xs">Limpiar medidas</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  className="flex flex-col items-center justify-center h-16 px-1"
                >
                  <ZoomIn className="h-4 w-4 mb-1" />
                  <span className="text-xs">Ampliar</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  className="flex flex-col items-center justify-center h-16 px-1"
                >
                  <ZoomOut className="h-4 w-4 mb-1" />
                  <span className="text-xs">Reducir</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRotateClockwise}
                  className="flex flex-col items-center justify-center h-16 px-1"
                >
                  <RotateCw className="h-4 w-4 mb-1" />
                  <span className="text-xs">Rotar</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ajustes de brillo y contraste */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3">Ajustes</h3>
              <div className="space-y-2">
                <label className="flex justify-between text-sm">
                  <span>Brillo</span>
                  <span className="font-medium">{brightness}</span>
                </label>
                <Slider value={[brightness]} min={-100} max={100} step={1} onValueChange={(v) => setBrightness(v[0])} />
              </div>
              <div className="space-y-2 mt-2">
                <label className="flex justify-between text-sm">
                  <span>Contraste</span>
                  <span className="font-medium">{contrast}</span>
                </label>
                <Slider value={[contrast]} min={-100} max={100} step={1} onValueChange={(v) => setContrast(v[0])} />
              </div>
              <Button variant="outline" size="sm" onClick={handleResetView} className="w-full mt-3">
                Restablecer valores
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Columna central - Imagen principal */}
        <div className="md:col-span-6 flex flex-col h-full">
          <div className="relative rounded-lg border bg-black flex-1" style={{ minHeight: "400px" }}>
            <div ref={cornerstoneElementRef} className="w-full h-full rounded-lg" />
            <canvas
              ref={annotationCanvasRef}
              className="absolute top-0 left-0 z-10 w-full h-full"
              style={{
                cursor:
                  activeTool === "draw"
                    ? "crosshair"
                    : activeTool === "text"
                      ? "text"
                      : activeTool === "measure"
                        ? "crosshair"
                        : activeTool === "move"
                          ? "move"
                          : "default",
              }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>

          {/* Slider para navegación entre imágenes */}
          {study.images.length > 1 && (
            <div className="mt-4 px-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Imagen {currentImageIndex + 1} de {study.images.length}
                </span>
              </div>
              <Slider
                value={[currentImageIndex]}
                min={0}
                max={study.images.length - 1}
                step={1}
                onValueChange={(v) => setCurrentImageIndex(v[0])}
              />
            </div>
          )}
        </div>

        {/* Columna derecha - Información del estudio y comentarios */}
        <div className="md:col-span-3 flex flex-col h-full gap-4">
          {/* Información del estudio */}
          <Card className="bg-white border rounded-lg flex-shrink-0">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-4">Información del estudio</h3>
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Paciente</h4>
                  <p className="text-sm font-medium">{study.patientName}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">ID</h4>
                  <p className="text-sm font-medium">{study.patientId}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Modalidad</h4>
                  <p className="text-sm font-medium">{study.modality}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Descripción</h4>
                  <p className="text-sm font-medium">{study.description}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Fecha</h4>
                  <p className="text-sm font-medium">{study.studyDate}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Imágenes</h4>
                  <p className="text-sm font-medium">{study.images.length} disponibles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Comentarios del médico - Movido a la derecha */}
          <Card className="flex-1 flex flex-col">
            <CardContent className="p-4 flex flex-col h-full">
              <h3 className="text-lg font-medium mb-3">Comentarios del médico</h3>

              <div className="max-h-[200px] overflow-y-auto space-y-3 mb-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay comentarios todavía.</p>
                ) : (
                  comments.map((comment, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm">{comment.text}</p>
                      <p className="text-xs text-gray-500 mt-1">Fecha: {comment.date}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 mt-auto">
                <Textarea
                  placeholder="Escribe tu comentario médico aquí..."
                  value={doctorComment}
                  onChange={(e) => setDoctorComment(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <Button className="w-full" onClick={handleAddComment} disabled={!doctorComment.trim()}>
                  Guardar comentario
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}