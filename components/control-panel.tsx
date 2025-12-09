"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, RotateCcw, ChevronRight, Download, Save, Upload } from "lucide-react"
import type { OptimizerType, OptimizerParams, OptimizerStep } from "@/lib/optimizers"
import { defaultParams } from "@/lib/optimizers"
import { presetFunctions } from "@/lib/loss-functions"

interface ControlPanelProps {
  // Loss function
  selectedPreset: string
  customExpression: string
  onPresetChange: (preset: string) => void
  onCustomExpressionChange: (expr: string) => void
  expressionError: string | null

  // Optimizer
  optimizerType: OptimizerType
  optimizerParams: OptimizerParams
  onOptimizerTypeChange: (type: OptimizerType) => void
  onOptimizerParamsChange: (params: OptimizerParams) => void

  // Starting point
  startX: number
  startY: number
  onStartXChange: (x: number) => void
  onStartYChange: (y: number) => void

  // Animation
  isRunning: boolean
  speed: number
  onStart: () => void
  onPause: () => void
  onStep: () => void
  onReset: () => void
  onSpeedChange: (speed: number) => void

  // Display
  showGradient: boolean
  onShowGradientChange: (show: boolean) => void

  // Current state
  currentStep: OptimizerStep | null
  totalSteps: number

  // Export
  onExportCSV: () => void
  onSaveConfig: () => void
  onLoadConfig: () => void
}

export function ControlPanel({
  selectedPreset,
  customExpression,
  onPresetChange,
  onCustomExpressionChange,
  expressionError,
  optimizerType,
  optimizerParams,
  onOptimizerTypeChange,
  onOptimizerParamsChange,
  startX,
  startY,
  onStartXChange,
  onStartYChange,
  isRunning,
  speed,
  onStart,
  onPause,
  onStep,
  onReset,
  onSpeedChange,
  showGradient,
  onShowGradientChange,
  currentStep,
  totalSteps,
  onExportCSV,
  onSaveConfig,
  onLoadConfig,
}: ControlPanelProps) {
  return (
    <div className="w-80 h-full overflow-y-auto bg-card border-r border-border p-4 space-y-4">
      {/* Loss Function Section */}
      <Card className="border-border">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">Loss Function</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Preset Functions</Label>
            <Select value={selectedPreset} onValueChange={onPresetChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select a preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom</SelectItem>
                {presetFunctions.map((fn) => (
                  <SelectItem key={fn.name} value={fn.name}>
                    {fn.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Expression f(x, y)</Label>
            <Input
              value={customExpression}
              onChange={(e) => onCustomExpressionChange(e.target.value)}
              placeholder="x^2 + y^2"
              className="h-9 font-mono text-xs"
            />
            {expressionError && <p className="text-xs text-destructive">{expressionError}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Optimizer Section */}
      <Card className="border-border">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">Optimizer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Algorithm</Label>
            <Select
              value={optimizerType}
              onValueChange={(v) => {
                onOptimizerTypeChange(v as OptimizerType)
                onOptimizerParamsChange(defaultParams[v as OptimizerType])
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sgd">SGD</SelectItem>
                <SelectItem value="momentum">Momentum</SelectItem>
                <SelectItem value="rmsprop">RMSProp</SelectItem>
                <SelectItem value="adam">Adam</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hyperparameters */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Learning Rate</Label>
                <span className="text-xs font-mono text-foreground">{optimizerParams.learningRate.toFixed(4)}</span>
              </div>
              <Slider
                value={[optimizerParams.learningRate]}
                onValueChange={([v]) => onOptimizerParamsChange({ ...optimizerParams, learningRate: v })}
                min={0.001}
                max={1}
                step={0.001}
              />
            </div>

            {optimizerType === "momentum" && (
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="text-xs text-muted-foreground">Momentum</Label>
                  <span className="text-xs font-mono text-foreground">
                    {(optimizerParams.momentum ?? 0.9).toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={[optimizerParams.momentum ?? 0.9]}
                  onValueChange={([v]) => onOptimizerParamsChange({ ...optimizerParams, momentum: v })}
                  min={0}
                  max={0.99}
                  step={0.01}
                />
              </div>
            )}

            {optimizerType === "rmsprop" && (
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="text-xs text-muted-foreground">Rho (ρ)</Label>
                  <span className="text-xs font-mono text-foreground">{(optimizerParams.rho ?? 0.9).toFixed(2)}</span>
                </div>
                <Slider
                  value={[optimizerParams.rho ?? 0.9]}
                  onValueChange={([v]) => onOptimizerParamsChange({ ...optimizerParams, rho: v })}
                  min={0.5}
                  max={0.999}
                  step={0.001}
                />
              </div>
            )}

            {optimizerType === "adam" && (
              <>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">Beta1 (β₁)</Label>
                    <span className="text-xs font-mono text-foreground">
                      {(optimizerParams.beta1 ?? 0.9).toFixed(3)}
                    </span>
                  </div>
                  <Slider
                    value={[optimizerParams.beta1 ?? 0.9]}
                    onValueChange={([v]) => onOptimizerParamsChange({ ...optimizerParams, beta1: v })}
                    min={0.5}
                    max={0.999}
                    step={0.001}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">Beta2 (β₂)</Label>
                    <span className="text-xs font-mono text-foreground">
                      {(optimizerParams.beta2 ?? 0.999).toFixed(4)}
                    </span>
                  </div>
                  <Slider
                    value={[optimizerParams.beta2 ?? 0.999]}
                    onValueChange={([v]) => onOptimizerParamsChange({ ...optimizerParams, beta2: v })}
                    min={0.9}
                    max={0.9999}
                    step={0.0001}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Starting Point */}
      <Card className="border-border">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">Starting Point</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          <p className="text-xs text-muted-foreground">
            Click on the 3D surface to set a starting point, or enter coordinates below.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">X</Label>
              <Input
                type="number"
                value={startX}
                onChange={(e) => onStartXChange(Number.parseFloat(e.target.value) || 0)}
                className="h-8 font-mono text-xs"
                step={0.1}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Y</Label>
              <Input
                type="number"
                value={startY}
                onChange={(e) => onStartYChange(Number.parseFloat(e.target.value) || 0)}
                className="h-8 font-mono text-xs"
                step={0.1}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Animation Controls */}
      <Card className="border-border">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">Animation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isRunning ? "secondary" : "default"}
              onClick={isRunning ? onPause : onStart}
              className="flex-1"
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 mr-1" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" /> Start
                </>
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={onStep}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={onReset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Speed</Label>
              <span className="text-xs font-mono text-foreground">{speed}ms</span>
            </div>
            <Slider value={[speed]} onValueChange={([v]) => onSpeedChange(v)} min={10} max={500} step={10} />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showGradient"
              checked={showGradient}
              onChange={(e) => onShowGradientChange(e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="showGradient" className="text-xs text-muted-foreground cursor-pointer">
              Show gradient arrow
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Current State */}
      {currentStep && (
        <Card className="border-border">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Current State</CardTitle>
              <Badge variant="secondary" className="text-xs">
                Step {totalSteps}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-muted-foreground">x:</span>
                <span className="text-foreground ml-1">{currentStep.x.toFixed(4)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">y:</span>
                <span className="text-foreground ml-1">{currentStep.y.toFixed(4)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">loss:</span>
                <span className="text-foreground ml-1">{currentStep.z.toFixed(4)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">|∇|:</span>
                <span className="text-foreground ml-1">{currentStep.gradNorm.toFixed(4)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export & Save */}
      <Card className="border-border">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">Export & Save</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-4 pb-4">
          <Button size="sm" variant="outline" className="w-full justify-start bg-transparent" onClick={onExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export Path as CSV
          </Button>
          <Button size="sm" variant="outline" className="w-full justify-start bg-transparent" onClick={onSaveConfig}>
            <Save className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
          <Button size="sm" variant="outline" className="w-full justify-start bg-transparent" onClick={onLoadConfig}>
            <Upload className="w-4 h-4 mr-2" />
            Load Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
