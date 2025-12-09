// Optimizer implementations for gradient descent visualization

export type OptimizerType = "sgd" | "momentum" | "rmsprop" | "adam"

export interface OptimizerState {
  x: number
  y: number
  vx?: number // velocity x (momentum, adam)
  vy?: number // velocity y (momentum, adam)
  sx?: number // squared gradient cache x (rmsprop, adam)
  sy?: number // squared gradient cache y (rmsprop, adam)
  t?: number // timestep (adam)
}

export interface OptimizerParams {
  learningRate: number
  momentum?: number // for momentum
  rho?: number // for rmsprop
  beta1?: number // for adam
  beta2?: number // for adam
  epsilon?: number // for rmsprop, adam
}

export interface OptimizerStep {
  x: number
  y: number
  z: number
  gradX: number
  gradY: number
  gradNorm: number
  step: number
}

// Compute gradient using central differences
export function computeGradient(
  f: (x: number, y: number) => number,
  x: number,
  y: number,
  h = 1e-5,
): { gradX: number; gradY: number } {
  const gradX = (f(x + h, y) - f(x - h, y)) / (2 * h)
  const gradY = (f(x, y + h) - f(x, y - h)) / (2 * h)
  return { gradX, gradY }
}

// SGD optimizer
export function sgdStep(
  state: OptimizerState,
  gradient: { gradX: number; gradY: number },
  params: OptimizerParams,
): OptimizerState {
  return {
    x: state.x - params.learningRate * gradient.gradX,
    y: state.y - params.learningRate * gradient.gradY,
  }
}

// Momentum optimizer
export function momentumStep(
  state: OptimizerState,
  gradient: { gradX: number; gradY: number },
  params: OptimizerParams,
): OptimizerState {
  const momentum = params.momentum ?? 0.9
  const vx = momentum * (state.vx ?? 0) + params.learningRate * gradient.gradX
  const vy = momentum * (state.vy ?? 0) + params.learningRate * gradient.gradY

  return {
    x: state.x - vx,
    y: state.y - vy,
    vx,
    vy,
  }
}

// RMSProp optimizer
export function rmspropStep(
  state: OptimizerState,
  gradient: { gradX: number; gradY: number },
  params: OptimizerParams,
): OptimizerState {
  const rho = params.rho ?? 0.9
  const epsilon = params.epsilon ?? 1e-8

  const sx = rho * (state.sx ?? 0) + (1 - rho) * gradient.gradX * gradient.gradX
  const sy = rho * (state.sy ?? 0) + (1 - rho) * gradient.gradY * gradient.gradY

  return {
    x: state.x - (params.learningRate * gradient.gradX) / (Math.sqrt(sx) + epsilon),
    y: state.y - (params.learningRate * gradient.gradY) / (Math.sqrt(sy) + epsilon),
    sx,
    sy,
  }
}

// Adam optimizer
export function adamStep(
  state: OptimizerState,
  gradient: { gradX: number; gradY: number },
  params: OptimizerParams,
): OptimizerState {
  const beta1 = params.beta1 ?? 0.9
  const beta2 = params.beta2 ?? 0.999
  const epsilon = params.epsilon ?? 1e-8
  const t = (state.t ?? 0) + 1

  // Update biased first moment estimate
  const vx = beta1 * (state.vx ?? 0) + (1 - beta1) * gradient.gradX
  const vy = beta1 * (state.vy ?? 0) + (1 - beta1) * gradient.gradY

  // Update biased second raw moment estimate
  const sx = beta2 * (state.sx ?? 0) + (1 - beta2) * gradient.gradX * gradient.gradX
  const sy = beta2 * (state.sy ?? 0) + (1 - beta2) * gradient.gradY * gradient.gradY

  // Compute bias-corrected estimates
  const vxCorrected = vx / (1 - Math.pow(beta1, t))
  const vyCorrected = vy / (1 - Math.pow(beta2, t))
  const sxCorrected = sx / (1 - Math.pow(beta2, t))
  const syCorrected = sy / (1 - Math.pow(beta2, t))

  return {
    x: state.x - (params.learningRate * vxCorrected) / (Math.sqrt(sxCorrected) + epsilon),
    y: state.y - (params.learningRate * vyCorrected) / (Math.sqrt(syCorrected) + epsilon),
    vx,
    vy,
    sx,
    sy,
    t,
  }
}

export function optimizerStep(
  type: OptimizerType,
  state: OptimizerState,
  gradient: { gradX: number; gradY: number },
  params: OptimizerParams,
): OptimizerState {
  switch (type) {
    case "sgd":
      return sgdStep(state, gradient, params)
    case "momentum":
      return momentumStep(state, gradient, params)
    case "rmsprop":
      return rmspropStep(state, gradient, params)
    case "adam":
      return adamStep(state, gradient, params)
    default:
      return sgdStep(state, gradient, params)
  }
}

export const defaultParams: Record<OptimizerType, OptimizerParams> = {
  sgd: { learningRate: 0.1 },
  momentum: { learningRate: 0.1, momentum: 0.9 },
  rmsprop: { learningRate: 0.01, rho: 0.9, epsilon: 1e-8 },
  adam: { learningRate: 0.1, beta1: 0.9, beta2: 0.999, epsilon: 1e-8 },
}
