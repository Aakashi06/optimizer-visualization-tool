"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Surface3D } from "@/components/surface-3d"
import { ControlPanel } from "@/components/control-panel"
import {
  type OptimizerType,
  type OptimizerParams,
  type OptimizerState,
  type OptimizerStep,
  defaultParams,
  computeGradient,
  optimizerStep,
} from "@/lib/optimizers"
import { presetFunctions, createLossFunction, type LossFunction } from "@/lib/loss-functions"

export default function OptimizerVisualization() {
  // Loss function state
  const [selectedPreset, setSelectedPreset] = useState<string>("Quadratic Bowl")
  const [customExpression, setCustomExpression] = useState<string>("x^2 + y^2")
  const [expressionError, setExpressionError] = useState<string | null>(null)
  const [currentFunction, setCurrentFunction] = useState<LossFunction>(presetFunctions[0])

  // Optimizer state
  const [optimizerType, setOptimizerType] = useState<OptimizerType>("adam")
  const [optimizerParams, setOptimizerParams] = useState<OptimizerParams>(defaultParams.adam)

  // Starting point
  const [startX, setStartX] = useState<number>(2.5)
  const [startY, setStartY] = useState<number>(2.5)

  // Animation state
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [speed, setSpeed] = useState<number>(100)
  const [showGradient, setShowGradient] = useState<boolean>(true)

  // Path state
  const [path, setPath] = useState<OptimizerStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1)
  const optimizerStateRef = useRef<OptimizerState | null>(null)
  const animationRef = useRef<number | null>(null)
  const lastStepTimeRef = useRef<number>(0)

  // Handle preset change
  const handlePresetChange = useCallback((preset: string) => {
    setSelectedPreset(preset)
    if (preset === "custom") {
      return
    }
    const fn = presetFunctions.find((f) => f.name === preset)
    if (fn) {
      setCustomExpression(fn.expression)
      setCurrentFunction(fn)
      setExpressionError(null)
      setStartX(fn.suggestedStart.x)
      setStartY(fn.suggestedStart.y)
      handleReset()
    }
  }, [])

  // Handle custom expression change
  const handleCustomExpressionChange = useCallback((expr: string) => {
    setCustomExpression(expr)
    setSelectedPreset("custom")

    try {
      const fn = createLossFunction(expr)
      const testResult = fn(0, 0)
      if (isNaN(testResult)) {
        setExpressionError("Invalid expression")
        return
      }
      setExpressionError(null)
      setCurrentFunction({
        name: "Custom",
        expression: expr,
        fn,
        range: { x: [-5, 5], y: [-5, 5] },
        suggestedStart: { x: 2, y: 2 },
      })
    } catch {
      setExpressionError("Invalid expression")
    }
  }, [])

  // Handle surface click
  const handleSurfaceClick = useCallback((x: number, y: number) => {
    setStartX(x)
    setStartY(y)
    handleReset()
  }, [])

  // Initialize path
  const initializePath = useCallback(() => {
    const z = currentFunction.fn(startX, startY)
    const { gradX, gradY } = computeGradient(currentFunction.fn, startX, startY)
    const gradNorm = Math.sqrt(gradX * gradX + gradY * gradY)

    const initialStep: OptimizerStep = {
      x: startX,
      y: startY,
      z: isFinite(z) ? z : 0,
      gradX,
      gradY,
      gradNorm,
      step: 0,
    }

    setPath([initialStep])
    setCurrentStepIndex(0)
    optimizerStateRef.current = { x: startX, y: startY }
  }, [currentFunction, startX, startY])

  // Perform one optimization step
  const performStep = useCallback(() => {
    if (!optimizerStateRef.current) {
      initializePath()
      return
    }

    const state = optimizerStateRef.current
    const { gradX, gradY } = computeGradient(currentFunction.fn, state.x, state.y)

    // Check for convergence or divergence
    const gradNorm = Math.sqrt(gradX * gradX + gradY * gradY)
    if (gradNorm < 1e-6 || !isFinite(gradNorm)) {
      setIsRunning(false)
      return
    }

    const newState = optimizerStep(optimizerType, state, { gradX, gradY }, optimizerParams)

    // Check bounds
    if (Math.abs(newState.x) > 100 || Math.abs(newState.y) > 100 || !isFinite(newState.x) || !isFinite(newState.y)) {
      setIsRunning(false)
      return
    }

    optimizerStateRef.current = newState

    const z = currentFunction.fn(newState.x, newState.y)
    const newGrad = computeGradient(currentFunction.fn, newState.x, newState.y)

    const newStep: OptimizerStep = {
      x: newState.x,
      y: newState.y,
      z: isFinite(z) ? Math.min(Math.max(z, -50), 50) : 0,
      gradX: newGrad.gradX,
      gradY: newGrad.gradY,
      gradNorm: Math.sqrt(newGrad.gradX ** 2 + newGrad.gradY ** 2),
      step: path.length,
    }

    setPath((prev) => [...prev, newStep])
    setCurrentStepIndex((prev) => prev + 1)
  }, [currentFunction, optimizerType, optimizerParams, path.length, initializePath])

  // Animation loop
  useEffect(() => {
    if (!isRunning) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    const animate = (time: number) => {
      if (time - lastStepTimeRef.current >= speed) {
        performStep()
        lastStepTimeRef.current = time
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isRunning, speed, performStep])

  // Control handlers
  const handleStart = useCallback(() => {
    if (path.length === 0) {
      initializePath()
    }
    setIsRunning(true)
  }, [path.length, initializePath])

  const handlePause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const handleStep = useCallback(() => {
    if (path.length === 0) {
      initializePath()
    } else {
      performStep()
    }
  }, [path.length, initializePath, performStep])

  const handleReset = useCallback(() => {
    setIsRunning(false)
    setPath([])
    setCurrentStepIndex(-1)
    optimizerStateRef.current = null
  }, [])

  // Export handlers
  const handleExportCSV = useCallback(() => {
    if (path.length === 0) return

    const headers = "step,x,y,loss,gradX,gradY,gradNorm"
    const rows = path.map((p) => `${p.step},${p.x},${p.y},${p.z},${p.gradX},${p.gradY},${p.gradNorm}`)
    const csv = [headers, ...rows].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "optimizer_path.csv"
    a.click()
    URL.revokeObjectURL(url)
  }, [path])

  const handleSaveConfig = useCallback(() => {
    const config = {
      preset: selectedPreset,
      expression: customExpression,
      optimizerType,
      optimizerParams,
      startX,
      startY,
    }
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "optimizer_config.json"
    a.click()
    URL.revokeObjectURL(url)
  }, [selectedPreset, customExpression, optimizerType, optimizerParams, startX, startY])

  const handleLoadConfig = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const config = JSON.parse(ev.target?.result as string)
          if (config.preset) setSelectedPreset(config.preset)
          if (config.expression) handleCustomExpressionChange(config.expression)
          if (config.optimizerType) setOptimizerType(config.optimizerType)
          if (config.optimizerParams) setOptimizerParams(config.optimizerParams)
          if (config.startX !== undefined) setStartX(config.startX)
          if (config.startY !== undefined) setStartY(config.startY)
          handleReset()
        } catch {
          alert("Invalid configuration file")
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [handleCustomExpressionChange, handleReset])

  const currentStep = path.length > 0 ? path[currentStepIndex] || path[path.length - 1] : null

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <ControlPanel
        selectedPreset={selectedPreset}
        customExpression={customExpression}
        onPresetChange={handlePresetChange}
        onCustomExpressionChange={handleCustomExpressionChange}
        expressionError={expressionError}
        optimizerType={optimizerType}
        optimizerParams={optimizerParams}
        onOptimizerTypeChange={setOptimizerType}
        onOptimizerParamsChange={setOptimizerParams}
        startX={startX}
        startY={startY}
        onStartXChange={(x) => {
          setStartX(x)
          handleReset()
        }}
        onStartYChange={(y) => {
          setStartY(y)
          handleReset()
        }}
        isRunning={isRunning}
        speed={speed}
        onStart={handleStart}
        onPause={handlePause}
        onStep={handleStep}
        onReset={handleReset}
        onSpeedChange={setSpeed}
        showGradient={showGradient}
        onShowGradientChange={setShowGradient}
        currentStep={currentStep}
        totalSteps={path.length}
        onExportCSV={handleExportCSV}
        onSaveConfig={handleSaveConfig}
        onLoadConfig={handleLoadConfig}
      />

      <main className="flex-1 p-4">
        <div className="h-full w-full">
          <Surface3D
            lossFn={currentFunction.fn}
            range={currentFunction.range}
            path={path}
            currentStep={currentStepIndex}
            onSurfaceClick={handleSurfaceClick}
            showGradient={showGradient}
          />
        </div>
      </main>
    </div>
  )
}
