/**
 * Минимальная обвязка WebGL2: контекст, шейдеры, текстуры, общий квад.
 * Без сторонних 3D-библиотек — сцены у нас простые (несколько квадов),
 * а свой код весит пару килобайт и полностью под контролем.
 */

export type GL = WebGL2RenderingContext;

const ATTRS: WebGLContextAttributes = {
  alpha: true,
  premultipliedAlpha: true,
  antialias: false,        // края сглаживаем в шейдере (fwidth), MSAA не нужен
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
  powerPreference: "default",
  // программная эмуляция WebGL медленнее DOM — в этом случае откажемся от WebGL
  failIfMajorPerformanceCaveat: true,
};

/** opaque — холст без прозрачности: композитор не рисует то, что под ним (фоны секций). */
export function createGl(canvas: HTMLCanvasElement, opaque = false): GL | null {
  try {
    return canvas.getContext("webgl2", opaque ? { ...ATTRS, alpha: false } : ATTRS) as GL | null;
  } catch {
    return null;
  }
}

let supported: boolean | undefined;
/** Есть ли нормальный (аппаратный) WebGL2. Проверяется один раз. */
export function webglSupported(): boolean {
  if (supported === undefined) {
    const gl = createGl(document.createElement("canvas"));
    supported = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }
  return supported;
}

function shader(gl: GL, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    throw new Error("GL shader: " + gl.getShaderInfoLog(s));
  }
  return s;
}

export interface Program<U extends string> {
  prog: WebGLProgram;
  u: Record<U, WebGLUniformLocation | null>;
}

export function program<U extends string>(gl: GL, vs: string, fs: string, uniforms: readonly U[]): Program<U> {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(prog, 0, "a_uv");
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost()) {
    throw new Error("GL link: " + gl.getProgramInfoLog(prog));
  }
  const u = {} as Record<U, WebGLUniformLocation | null>;
  for (const name of uniforms) u[name] = gl.getUniformLocation(prog, name);
  return { prog, u };
}

/** Единичный квад (0..1) в атрибуте 0: TRIANGLE_STRIP из 4 вершин. */
export function unitQuad(gl: GL) {
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  return vao;
}

/** Текстура из canvas/изображения, с предумноженной альфой (как композитит браузер). */
export function textureFrom(gl: GL, src: TexImageSource, tex?: WebGLTexture) {
  const t = tex ?? gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

/** Пустая текстура + framebuffer для отрисовки в неё. */
export function renderTarget(gl: GL, w: number, h: number) {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fb, w, h };
}

/**
 * Плотность пикселей холста: как у экрана, но не больше 2 и так, чтобы
 * холст влезал в лимит видеокарты (на телефонах бывает 4096).
 */
export function canvasDpr(gl: GL, cssW: number, cssH: number) {
  const max = Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number, 4096);
  return Math.min(window.devicePixelRatio || 1, 2, max / Math.max(cssW, 1), max / Math.max(cssH, 1));
}

/**
 * Отрисовка по требованию: invalidate() просит кадр, frame() возвращает true,
 * если анимация продолжается. В покое requestAnimationFrame не крутится.
 */
export function createLoop(frame: (now: number) => boolean) {
  let raf = 0;
  const tick = (now: number) => {
    raf = 0;
    if (frame(now)) raf = requestAnimationFrame(tick);
  };
  return {
    invalidate() { if (!raf) raf = requestAnimationFrame(tick); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };
}

/** Общие куски GLSL. */
export const GLSL = {
  /** Расстояние до скруглённого прямоугольника (p от центра, b — половины сторон). */
  sdRoundRect: /* glsl */ `
    float sdRoundRect(vec2 p, vec2 b, float r) {
      vec2 q = abs(p) - b + r;
      return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    }
    // покрытие пикселя фигурой с расстоянием d (сглаживание по размеру пикселя)
    float cover(float d) {
      float w = max(fwidth(d), 1e-4);
      return clamp(0.5 - d / w, 0.0, 1.0);
    }`,
};
