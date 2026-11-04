import { DRAGON_SPINE } from '@/components/sections/home/dragon/dragon-spine';
import { bendTail, rigTail, TAIL } from '@/components/sections/home/dragon/tail';

/*
 * The dragon's two renderers (design §3.3, §5, §7). WebGL blends the three wing frames of the
 * tail-less body in a fragment shader and draws the tail under it as a textured triangle strip
 * along its bent centre line. Without WebGL, the three full frames (tail included, not bending)
 * are stacked images whose opacities are the weights. Neither ever logs: a failure returns null
 * and the caller falls back.
 */

export interface DragonRenderer {
  /** One frame: the (up, level, down) wing weights and the tail's clock in seconds. */
  draw(weights: readonly [number, number, number], tailSeconds: number): void;
  dispose(): void;
}

export interface DragonImages {
  readonly up: HTMLImageElement;
  readonly level: HTMLImageElement;
  readonly down: HTMLImageElement;
  readonly tail: HTMLImageElement;
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

/** A linked program, or null (a shader that fails to compile fails the link too). */
function link(gl: WebGLRenderingContext, vertex: string, fragment: string, attributes: readonly string[]): WebGLProgram | null {
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
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

/**
 * The WebGL renderer on `canvas` (1000×906 backing store), or null without a usable context or when
 * a program fails to build. Call it while the canvas is not in the document yet: a context that is
 * refused then never reaches the screen.
 */
export function createWebGLRenderer(canvas: HTMLCanvasElement, images: DragonImages): DragonRenderer | null {
  const gl = canvas.getContext('webgl', CONTEXT);
  if (!gl) return null;
  const lose = (): void => gl.getExtension('WEBGL_lose_context')?.loseContext();
  if (softwareRendered(gl)) {
    lose();
    return null;
  }
  const tailProgram = link(gl, TAIL_VS, TAIL_FS, ['p', 'uv']);
  const bodyProgram = link(gl, BODY_VS, BODY_FS, ['p']);
  const quad = gl.createBuffer();
  const strip = gl.createBuffer();
  if (!tailProgram || !bodyProgram || !quad || !strip) {
    lose();
    return null;
  }

  const rig = rigTail(DRAGON_SPINE);
  const { pad, canvasWidth: width, canvasHeight: height } = TAIL;
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, strip);
  gl.bufferData(gl.ARRAY_BUFFER, rig.verts.byteLength, gl.DYNAMIC_DRAW);

  // Body frames in texture units 0-2, the tail in unit 3; premultiplied on upload.
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  [images.up, images.level, images.down, images.tail].forEach((image, unit) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  });
  gl.useProgram(bodyProgram);
  ['tU', 'tL', 'tD'].forEach((name, unit) => gl.uniform1i(gl.getUniformLocation(bodyProgram, name), unit));
  const weightsAt = gl.getUniformLocation(bodyProgram, 'op');
  gl.useProgram(tailProgram);
  gl.uniform1i(gl.getUniformLocation(tailProgram, 'tT'), 3);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  gl.enableVertexAttribArray(POSITION);

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
    dispose: lose,
  };
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
