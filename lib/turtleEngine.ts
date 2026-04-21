// lib/turtleEngine.ts
// Canvas-based Turtle Engine (Browser-safe)

export type TurtleShape = "turtle" | "circle" | "square" | "triangle";

type Segment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
};

type Dot = {
  x: number;
  y: number;
  radius: number;
  color: string;
};

export function createTurtle(canvasId: string = "turtleCanvas") {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    throw new Error(`Canvas with id '${canvasId}' not found`);
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to get 2D canvas context");
  }

  let x = 0;
  let y = 0;
  let angle = 0;

  let isPenDown = true;
  let visible = false;

  let penColor = "#000000";
  let fillColor = "#00aa00";
  let lineWidth = 2;
  let backgroundColor = "#ffffff";

  let shape: TurtleShape = "turtle";
  const turtleSize = 14;
  const viewportMargin = 20;

  const segments: Segment[] = [];
  const dots: Dot[] = [];

  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const getBounds = () => {
    let minX = x - turtleSize;
    let maxX = x + turtleSize;
    let minY = y - turtleSize;
    let maxY = y + turtleSize;

    for (const s of segments) {
      minX = Math.min(minX, s.x1, s.x2);
      maxX = Math.max(maxX, s.x1, s.x2);
      minY = Math.min(minY, s.y1, s.y2);
      maxY = Math.max(maxY, s.y1, s.y2);
    }

    for (const d of dots) {
      minX = Math.min(minX, d.x - d.radius);
      maxX = Math.max(maxX, d.x + d.radius);
      minY = Math.min(minY, d.y - d.radius);
      maxY = Math.max(maxY, d.y + d.radius);
    }

    return { minX, maxX, minY, maxY };
  };

  const getViewport = () => {
    const { minX, maxX, minY, maxY } = getBounds();
    const worldW = Math.max(1, maxX - minX);
    const worldH = Math.max(1, maxY - minY);
    const availableW = Math.max(1, canvas.width - viewportMargin * 2);
    const availableH = Math.max(1, canvas.height - viewportMargin * 2);

    const fitScale = Math.min(availableW / worldW, availableH / worldH);
    const scale = Math.min(1, fitScale);

    const offsetX = (canvas.width - worldW * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - worldH * scale) / 2 - minY * scale;

    return {
      scale,
      mapX: (wx: number) => wx * scale + offsetX,
      mapY: (wy: number) => wy * scale + offsetY
    };
  };

  const drawCursor = (mapX: (wx: number) => number, mapY: (wy: number) => number) => {
    if (!visible) return;

    ctx.save();
    ctx.translate(mapX(x), mapY(y));
    ctx.rotate(toRadians(angle));
    ctx.lineWidth = 2;
    ctx.strokeStyle = penColor;
    ctx.fillStyle = penColor;

    switch (shape) {
      case "circle":
        ctx.beginPath();
        ctx.arc(0, 0, turtleSize, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "square":
        ctx.fillRect(-turtleSize, -turtleSize, turtleSize * 2, turtleSize * 2);
        break;
      case "triangle":
        ctx.beginPath();
        ctx.moveTo(0, -turtleSize);
        ctx.lineTo(turtleSize, turtleSize);
        ctx.lineTo(-turtleSize, turtleSize);
        ctx.closePath();
        ctx.fill();
        break;
      default:
        ctx.beginPath();
        ctx.moveTo(0, -turtleSize);
        ctx.lineTo(turtleSize * 0.8, turtleSize);
        ctx.lineTo(-turtleSize * 0.8, turtleSize);
        ctx.closePath();
        ctx.stroke();
    }

    ctx.restore();
  };

  const render = () => {
    const viewport = getViewport();
    const scaledLine = (w: number) => Math.max(1, w * viewport.scale);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    for (const s of segments) {
      ctx.beginPath();
      ctx.moveTo(viewport.mapX(s.x1), viewport.mapY(s.y1));
      ctx.lineTo(viewport.mapX(s.x2), viewport.mapY(s.y2));
      ctx.strokeStyle = s.color;
      ctx.lineWidth = scaledLine(s.width);
      ctx.stroke();
    }

    for (const d of dots) {
      ctx.beginPath();
      ctx.arc(
        viewport.mapX(d.x),
        viewport.mapY(d.y),
        Math.max(1, d.radius * viewport.scale),
        0,
        Math.PI * 2
      );
      ctx.fillStyle = d.color;
      ctx.fill();
    }

    drawCursor(viewport.mapX, viewport.mapY);
  };

  const turtle = {
    reset() {
      x = 0;
      y = 0;
      angle = 0;
      isPenDown = true;
      visible = false;
      penColor = "#000000";
      fillColor = "#00aa00";
      lineWidth = 2;
      backgroundColor = "#ffffff";
      shape = "turtle" as TurtleShape;
      segments.length = 0;
      dots.length = 0;
      render();
    },

    showturtle() {
      visible = true;
      render();
    },

    hideturtle() {
      visible = false;
      render();
    },

    setShape(newShape: TurtleShape) {
      shape = newShape;
      visible = true;
      render();
    },

    bgcolor(color: string) {
      backgroundColor = color;
      render();
    },

    forward(distance: number) {
      const nx = x + Math.cos(toRadians(angle)) * distance;
      const ny = y + Math.sin(toRadians(angle)) * distance;

      if (isPenDown) {
        segments.push({
          x1: x,
          y1: y,
          x2: nx,
          y2: ny,
          color: penColor,
          width: lineWidth
        });
      }

      x = nx;
      y = ny;
      render();
    },

    backward(distance: number) {
      turtle.forward(-distance);
    },

    right(deg: number) {
      angle += deg;
      render();
    },

    left(deg: number) {
      angle -= deg;
      render();
    },

    setHeading(deg: number) {
      angle = deg;
      render();
    },

    goto(nx: number, ny: number) {
      if (isPenDown) {
        segments.push({
          x1: x,
          y1: y,
          x2: nx,
          y2: ny,
          color: penColor,
          width: lineWidth
        });
      }
      x = nx;
      y = ny;
      render();
    },

    penup() {
      isPenDown = false;
    },

    pendown() {
      isPenDown = true;
    },

    penUp() {
      isPenDown = false;
    },

    penDown() {
      isPenDown = true;
    },

    pencolor(color: string) {
      penColor = color;
      render();
    },

    color(color: string) {
      penColor = color;
      fillColor = color;
      render();
    },

    width(w: number) {
      lineWidth = w;
      render();
    },

    dot(radius: number) {
      dots.push({ x, y, radius, color: fillColor });
      render();
    },

    fillcolor(color: string) {
      fillColor = color;
      render();
    },

    beginFill() {
      // Placeholder to match Blockly API.
    },

    endFill() {
      // Placeholder to match Blockly API.
    },

    speed(_s: number) {
      // Placeholder to match Blockly API.
    },

    clear() {
      segments.length = 0;
      dots.length = 0;
      render();
    }
  };

  render();
  return turtle;
}
