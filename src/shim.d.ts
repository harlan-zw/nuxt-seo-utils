declare module '#seo-utils-virtual/pageDirImages' {
  export const fileMapping: Record<string, string>
}

declare module 'sharp' {
  interface ResizeOptions {
    fit?: 'contain'
    background?: {
      r: number
      g: number
      b: number
      alpha: number
    }
  }

  interface SharpInstance {
    resize: (width: number, height: number, options?: ResizeOptions) => SharpInstance
    png: () => SharpInstance
    toFile: (outputPath: string) => Promise<unknown>
    toBuffer: () => Promise<import('node:buffer').Buffer>
  }

  interface SharpFactory {
    (input?: string | import('node:buffer').Buffer): SharpInstance
  }

  const sharp: SharpFactory
  export default sharp
}
