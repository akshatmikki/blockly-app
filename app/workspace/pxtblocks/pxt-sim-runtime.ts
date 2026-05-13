export type PxtSimulatorStatus = "idle" | "loading" | "ready" | "running" | "stopped" | "error";

export type PxtSimulatorControl = {
  run: (code: string) => void;
  restart: () => void;
  stop: () => void;
};

type SimulatorMessage =
  | { type: "simulateproject"; project: string }
  | { type: "restartsimulator" }
  | { type: "stopsimulator" };

// Use the embedded static editor path.
// IMPORTANT: must be absolute. If we use a relative path like "./pxt-editor" and the app is on
// a nested route (e.g. "/editor"), the iframe will resolve to "/editor/pxt-editor/..." and 404.
const ENV_PXT_HOST =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_PXT_EDITOR_BASE as string | undefined)
    : undefined;

const FALLBACK_REMOTE_HOST = "https://makecode.microbit.org";

function normalizeHost(host: string) {
  const trimmed = host.trim();
  if (!trimmed) return "/pxt-editor";
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/, "");
  return `/${trimmed.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

const DEFAULT_PXT_HOST = normalizeHost(ENV_PXT_HOST ?? "/pxt-editor");

export function getPxtSimulatorHost() {
  return DEFAULT_PXT_HOST;
}

export function getPxtSimulatorUrl() {
  const host = getPxtSimulatorHost();
  return `${host}/run.html?server=1&simTop=0`;
}

export function getRemotePxtSimulatorHost() {
  return FALLBACK_REMOTE_HOST;
}

export function getRemotePxtSimulatorUrl() {
  return `${FALLBACK_REMOTE_HOST}/run.html?server=1&simTop=0`;
}

function containsRepeatedSpriteCreation(code: string) {
  return /while\s*\([^)]*\)\s*\{[\s\S]*?game\.createSprite\s*\(/.test(code)
    || /basic\.forever\s*\(\s*function\s*\(\)\s*\{[\s\S]*?game\.createSprite\s*\(/.test(code)
    || /loops\.everyInterval\s*\([^)]*,\s*function\s*\(\)\s*\{[\s\S]*?game\.createSprite\s*\(/.test(code);
}

export function sanitizeSimulatorTypescript(code: string) {
  const source = code?.trim() || "basic.showString('Hello')";

  if (containsRepeatedSpriteCreation(source)) {
    return {
      code: `// Repeated LED sprite creation can crash the micro:bit simulator.\nbasic.showString("Fix blocks")`,
      warning: "Repeated LED sprite creation can crash the micro:bit simulator."
    };
  }

  return { code: source };
}

export function buildPxtProjectFiles(code: string) {
  const mainTs = sanitizeSimulatorTypescript(code).code;
  console.log("[PXT Sim Runtime] Generated main.ts content:\n", mainTs);

  return {
    "pxt.json": JSON.stringify(
      {
        name: "blockly-project",
        description: "",
        dependencies: {
          core: "*",
          radio: "*",
          "radio-broadcast": "*"
        },
        files: [
          "main.ts"
        ],
        target: "microbit",
        targetVersion: "7.0.13"
      },
      null,
      2
    ),

    "main.ts": mainTs
  };
}

export function postToSimulator(iframe: HTMLIFrameElement, message: SimulatorMessage) {
  const frameWindow = iframe.contentWindow;
  if (!frameWindow) return false;
  frameWindow.postMessage(message, "*");
  return true;
}
