import { DRAGON_SPINE } from '@/components/sections/home/dragon/dragon-spine';
import { bendTail, rigTail, TAIL } from '@/components/sections/home/dragon/tail';

/*
 * The dragon's two renderers (design §3.3, §5, §7). WebGL blends the three wing frames of the
 * tail-less body in a fragment shader and draws the tail under it as a textured triangle strip
 * along its bent centre line: createWebGLContext asks for a hardware context first, then
 * createWebGLRenderer builds the programs and textures on it, in short tasks (Ruling 40). Without
 * WebGL, the three full frames (tail included, not bending) are stacked images whose opacities are
 * the weights. Nothing here ever logs: a failure returns null and the caller falls back.
 */

export interface DragonRenderer {
  /** One frame: the (up, level, down) wing weights and the tail's clock in seconds. */
  draw(weights: readonly [number, number, number], tailSeconds: number): void;
  dispose(): void;
}

/** The WebGL frames' files, in texture units 0-3: the body's up, level and down frames, then the tail. */
export type WebGLFrames = readonly [string, string, string, string];

/**
 * Premultiplied as they are decoded: WebGL ignores UNPACK_PREMULTIPLY_ALPHA_WEBGL for an
 * ImageBitmap, so this does what that flag did for the <img> uploads before.
 */
const BITMAP: ImageBitmapOptions = { premultiplyAlpha: 'premultiply' };

/** One frame, fetched and decoded off the main thread; null when it does not load or decode. */
function frameBitmap(url: string): Promise<ImageBitmap | null> {
  return fetch(url)
    .then((response) => (response.ok ? response.blob() : null))
    .then((blob) => (blob ? createImageBitmap(blob, BITMAP) : null))
    .catch(() => null);
}

/**
 * The frames as bitmaps, in order, or null when one does not load or decode (a response that is
 * not ok, a failed fetch, a picture that does not decode): the one failure the start expects. The
 * other bitmaps are closed then.
 */
export async function frameBitmaps(urls: readonly string[]): Promise<ImageBitmap[] | null> {
  const all = await Promise.all(urls.map(frameBitmap));
  const made = all.filter((bitmap) => bitmap !== null);
  if (made.length === urls.length) return made;
  for (const bitmap of made) bitmap.close();
  return null;
}

/** Resolves in a task of its own: a message, not a timer, so nothing clamps or throttles it. */
function nextTask(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

const CONTEXT: WebGLContextAttributes = {
  alpha: true,
  premultipliedAlpha: true,
  antialias: true,
  depth: false,
  stencil: false,
  failIfMajorPerformanceCaveat: true,
  powerPreference: 'low-power',
};

/* The shaders, as the working mockup has them (.planning/painted-hero/mockup/scene-mockup.html). */
const TAIL_VS = 'attribute vec2 p; attribute vec2 uv; varying vec2 v; void main(){ v = uv; gl_Position = vec4(p, 0., 1.); }';
// Outside the picture the tail texture is empty (clamping would smear the edge row).
const TAIL_FS =
  'precision mediump float; varying vec2 v; uniform sampler2D tT; void main(){ if (v.x < 0. || v.y < 0. || v.x > 1. || v.y > 1.) { gl_FragColor = vec4(0.); return; } gl_FragColor = texture2D(tT, v); }';
const BODY_VS = 'attribute vec2 p; varying vec2 v; void main(){ v = vec2(p.x*.5+.5, .5-p.y*.5); gl_Position = vec4(p, 0., 1.); }';
const BODY_FS = [
  'precision mediump float;',
  'varying vec2 v;',
  'uniform sampler2D tU, tL, tD;',
  'uniform vec3 op;',
  'void main() {',
  '  vec4 col = texture2D(tU, v) * op.x;',
  '  vec4 b = texture2D(tL, v) * op.y; col = b + col * (1. - b.a);',
  '  vec4 c = texture2D(tD, v) * op.z; col = c + col * (1. - c.a);',
  '  gl_FragColor = col;',
  '}',
].join('\n');

/** Attribute locations, bound before linking: the position is 0 in both programs, the tail's UV is 1. */
const POSITION = 0;
const UV = 1;

/**
 * Software renderers. failIfMajorPerformanceCaveat still lets SwiftShader through where it is the
 * only adapter (a headless browser, a machine without a usable GPU). There every frame is drawn on
 * the CPU, and the compositor reads the canvas back, which Chromium reports as a console warning
 * ("GPU stall due to ReadPixels") once the canvas is on screen; the stacked frames serve instead.
 */
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;

function softwareRendered(gl: WebGLRenderingContext): boolean {
  let name = String(gl.getParameter(gl.RENDERER));
  // Chromium and Safari mask RENDERER; Firefox reports it directly (and deprecates the extension).
  if (name === 'WebKit WebGL') {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    if (info) name = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
  }
  return SOFTWARE.test(name);
}

/**
 * A program whose compile and link are queued, not waited for: reading its status right away would
 * block until the GPU process has linked it. Null without a context. (A shader that fails to
 * compile fails the link too.)
 */
function queueProgram(gl: WebGLRenderingContext, vertex: string, fragment: string, attributes: readonly string[]): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  attributes.forEach((name, location) => gl.bindAttribLocation(program, location, name));
  gl.linkProgram(program);
  return program;
}

/** Frees the context's GPU memory now. Once only: a second loseContext() logs "INVALID_OPERATION: … context already lost". */
export function loseContext(gl: WebGLRenderingContext): void {
  if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext();
}

/**
 * A WebGL context on `canvas` (its 1000×906 backing store), or null: no context, or a software
 * renderer (lost first). Ask for it while the canvas is not in the document yet, so a context that
 * is refused never reaches the screen, and before downloading anything only WebGL uses.
 */
export function createWebGLContext(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  const gl = canvas.getContext('webgl', CONTEXT);
  if (!gl) return null;
  if (softwareRendered(gl)) {
    loseContext(gl);
    return null;
  }
  return gl;
}

/** The build stopped or failed: the context is lost, and the answer is null. */
function lost(gl: WebGLRenderingContext): null {
  loseContext(gl);
  return null;
}

/** Uploads one frame into texture unit `unit` (body frames 0-2, the tail 3). */
function upload(gl: WebGLRenderingContext, unit: number, frame: ImageBitmap): void {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);
}

/**
 * The WebGL renderer on `gl`, built in short tasks so that none holds the main thread for long
 * (design §5; Ruling 40):
 * 1. a task after the context's: the programs' compile and link are queued, and the frames at
 *    `urls` are requested (fetched and decoded off the main thread, frameBitmaps);
 * 2. once the frames are in, a later task than the link's: the link results, never waited for
 *    (with KHR_parallel_shader_compile, read once it reports both programs done, checked once a
 *    frame), then the buffers and uniforms;
 * 3. the uploads, one frame per task, each bitmap closed once it is uploaded.
 * Null when a frame does not load or decode or a program fails, and as soon as `stopped()` is true
 * after a wait (the scene was disposed, or motion was reduced): then the context is lost, every
 * bitmap is closed and nothing more happens.
 */
export async function createWebGLRenderer(gl: WebGLRenderingContext, urls: WebGLFrames, stopped: () => boolean): Promise<DragonRenderer | null> {
  await nextTask();
  if (stopped()) return lost(gl);
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const tailProgram = queueProgram(gl, TAIL_VS, TAIL_FS, ['p', 'uv']);
  const bodyProgram = queueProgram(gl, BODY_VS, BODY_FS, ['p']);
  const loaded = await frameBitmaps(urls);
  const frames = loaded ?? [];
  try {
    if (!loaded || stopped() || !tailProgram || !bodyProgram) return lost(gl);
    const programs = [tailProgram, bodyProgram];
    if (parallel) {
      while (!programs.every((program) => gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR))) {
        await nextFrame();
        if (stopped()) return lost(gl);
      }
    }
    const quad = gl.createBuffer();
    const strip = gl.createBuffer();
    if (!programs.every((program) => gl.getProgramParameter(program, gl.LINK_STATUS)) || !quad || !strip) return lost(gl);

    const rig = rigTail(DRAGON_SPINE);
    const { pad, canvasWidth: width, canvasHeight: height } = TAIL;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, strip);
    gl.bufferData(gl.ARRAY_BUFFER, rig.verts.byteLength, gl.DYNAMIC_DRAW);
    gl.useProgram(bodyProgram);
    ['tU', 'tL', 'tD'].forEach((name, unit) => gl.uniform1i(gl.getUniformLocation(bodyProgram, name), unit));
    const weightsAt = gl.getUniformLocation(bodyProgram, 'op');
    gl.useProgram(tailProgram);
    gl.uniform1i(gl.getUniformLocation(tailProgram, 'tT'), 3);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.enableVertexAttribArray(POSITION);

    for (const [unit, frame] of frames.entries()) {
      await nextTask();
      if (stopped()) return lost(gl);
      upload(gl, unit, frame);
      frame.close();
    }

      return {
      draw(weights, tailSeconds) {
        const verts = bendTail(rig, tailSeconds);
        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        // 1. The tail, behind the body: a strip along the bent centre line, over the whole canvas.
        gl.useProgram(tailProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, strip);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts);
        gl.vertexAttribPointer(POSITION, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(UV);
        gl.vertexAttribPointer(UV, 2, gl.FLOAT, false, 16, 8);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, verts.length / 4);
        gl.disableVertexAttribArray(UV);
        // 2. The body: the three wing frames blended, in the 800×706 frame inside the padding.
        gl.useProgram(bodyProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.vertexAttribPointer(POSITION, 2, gl.FLOAT, false, 0, 0);
        gl.uniform3f(weightsAt, weights[0], weights[1], weights[2]);
        gl.viewport(pad, pad, width - 2 * pad, height - 2 * pad);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
      dispose() {
        loseContext(gl);
      },
    };
  } finally {
    // Each bitmap is closed: once uploaded, or unused when the build stopped, failed or threw.
    for (const frame of frames) frame.close();
  }
}

/** The no-WebGL renderer: each full frame's opacity is its weight (the tail does not bend). */
export function createImageRenderer(frames: readonly [HTMLImageElement, HTMLImageElement, HTMLImageElement]): DragonRenderer {
  const shown = [Number.NaN, Number.NaN, Number.NaN];
  return {
    draw(weights) {
      frames.forEach((frame, index) => {
        const weight = weights[index] ?? 0;
        if (weight === shown[index]) return;
        shown[index] = weight;
        frame.style.opacity = String(weight);
      });
    },
    dispose() {
      // The frames belong to the dragon element, which the scene removes.
    },
  };
}
