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

// Use the embedded static editor path. In Electron, this points to the local public/pxt-editor folder.
const DEFAULT_PXT_HOST = typeof window !== "undefined" && window.location.hostname === "localhost" 
  ? "/pxt-editor" 
  : "./pxt-editor";

export function getPxtSimulatorHost() {
  return DEFAULT_PXT_HOST;
}

export function getPxtSimulatorUrl() {
  const host = getPxtSimulatorHost();
  return `${host}/run.html?server=1&simTop=0`;
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
