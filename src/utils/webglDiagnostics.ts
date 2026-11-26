/** Informations GPU nécessaires pour interpréter les mesures de fluidité. */

export interface WebGLDiagnostics {
  renderer: string;
  vendor: string;
  software: boolean;
  dpr: number;
  hardwareConcurrency: number;
}

export function getWebGLDiagnostics(): WebGLDiagnostics {
  const fallback: WebGLDiagnostics = {
    renderer: 'notMeasured',
    vendor: 'notMeasured',
    software: false,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
  };
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return fallback;
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = extension
      ? String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    const vendor = extension
      ? String(gl.getParameter(extension.UNMASKED_VENDOR_WEBGL))
      : String(gl.getParameter(gl.VENDOR));
    return {
      renderer,
      vendor,
      software: /swiftshader|llvmpipe|softpipe|software/i.test(renderer),
      dpr: fallback.dpr,
      hardwareConcurrency: fallback.hardwareConcurrency,
    };
  } catch {
    return fallback;
  }
}
