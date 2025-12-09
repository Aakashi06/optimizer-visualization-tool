import { create, all, type MathJsInstance } from "mathjs"

const math: MathJsInstance = create(all, {})

export interface LossFunction {
  name: string
  expression: string
  fn: (x: number, y: number) => number
  range: { x: [number, number]; y: [number, number] }
  suggestedStart: { x: number; y: number }
}

// Safe evaluation using mathjs
export function createLossFunction(expression: string): (x: number, y: number) => number {
  try {
    const compiled = math.compile(expression)
    return (x: number, y: number) => {
      try {
        const result = compiled.evaluate({ x, y })
        if (typeof result !== "number" || !isFinite(result)) {
          return Number.NaN
        }
        return result
      } catch {
        return Number.NaN
      }
    }
  } catch {
    return () => Number.NaN
  }
}

export const presetFunctions: LossFunction[] = [
  {
    name: "Quadratic Bowl",
    expression: "x^2 + y^2",
    fn: (x, y) => x * x + y * y,
    range: { x: [-3, 3], y: [-3, 3] },
    suggestedStart: { x: 2.5, y: 2.5 },
  },
  {
    name: "Rosenbrock",
    expression: "(1 - x)^2 + 100 * (y - x^2)^2",
    fn: (x, y) => Math.pow(1 - x, 2) + 100 * Math.pow(y - x * x, 2),
    range: { x: [-2, 2], y: [-1, 3] },
    suggestedStart: { x: -1.5, y: 2 },
  },
  {
    name: "Himmelblau",
    expression: "(x^2 + y - 11)^2 + (x + y^2 - 7)^2",
    fn: (x, y) => Math.pow(x * x + y - 11, 2) + Math.pow(x + y * y - 7, 2),
    range: { x: [-5, 5], y: [-5, 5] },
    suggestedStart: { x: -4, y: 4 },
  },
  {
    name: "Saddle Point",
    expression: "x^2 - y^2",
    fn: (x, y) => x * x - y * y,
    range: { x: [-3, 3], y: [-3, 3] },
    suggestedStart: { x: 2, y: 0.1 },
  },
  {
    name: "Beale",
    expression: "(1.5 - x + x*y)^2 + (2.25 - x + x*y^2)^2 + (2.625 - x + x*y^3)^2",
    fn: (x, y) =>
      Math.pow(1.5 - x + x * y, 2) + Math.pow(2.25 - x + x * y * y, 2) + Math.pow(2.625 - x + x * y * y * y, 2),
    range: { x: [-4.5, 4.5], y: [-4.5, 4.5] },
    suggestedStart: { x: -3, y: 3 },
  },
  {
    name: "Rastrigin",
    expression: "20 + (x^2 - 10*cos(2*pi*x)) + (y^2 - 10*cos(2*pi*y))",
    fn: (x, y) => 20 + (x * x - 10 * Math.cos(2 * Math.PI * x)) + (y * y - 10 * Math.cos(2 * Math.PI * y)),
    range: { x: [-5.12, 5.12], y: [-5.12, 5.12] },
    suggestedStart: { x: 4, y: 4 },
  },
]
