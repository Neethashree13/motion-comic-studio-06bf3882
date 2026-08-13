/**
 * Speech bubble + caption drawing for the motion comic canvas.
 * Pure 2D-context helpers, no engine state, so the look can be tuned in one place.
 */

export type BubbleStyle = "speech" | "caption" | "whisper" | "shout";

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Comic speech balloon anchored near a focus point, with a tail pointing at it. */
export function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  options: {
    text: string;
    speaker?: string | null;
    anchorX: number;
    anchorY: number;
    canvasWidth: number;
    canvasHeight: number;
    style?: BubbleStyle;
    opacity?: number;
  },
) {
  const { text, speaker, canvasWidth, canvasHeight } = options;
  const style = options.style ?? "speech";
  const opacity = options.opacity ?? 1;
  if (!text.trim() || opacity <= 0.01) return;

  const scale = canvasWidth / 1280;
  const fontSize = (style === "shout" ? 34 : 26) * scale;
  const padding = 22 * scale;
  const maxBubbleWidth = canvasWidth * 0.46;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font = `${style === "shout" ? "700" : "500"} ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  ctx.textBaseline = "top";

  const lines = wrapText(ctx, text, maxBubbleWidth - padding * 2);
  const lineHeight = fontSize * 1.28;
  const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
  const speakerSize = fontSize * 0.62;
  const hasSpeaker = Boolean(speaker && speaker.trim());

  const bubbleWidth = Math.min(maxBubbleWidth, textWidth + padding * 2);
  const bubbleHeight =
    lines.length * lineHeight + padding * 2 + (hasSpeaker ? speakerSize * 1.6 : 0);

  const anchorX = options.anchorX * canvasWidth;
  const anchorY = options.anchorY * canvasHeight;

  // Keep the balloon inside frame, biased above the anchor.
  let x = anchorX - bubbleWidth / 2;
  let y = anchorY - bubbleHeight - 60 * scale;
  const margin = 28 * scale;
  x = Math.min(Math.max(x, margin), canvasWidth - bubbleWidth - margin);
  if (y < margin) y = Math.min(anchorY + 60 * scale, canvasHeight - bubbleHeight - margin);
  y = Math.min(Math.max(y, margin), canvasHeight - bubbleHeight - margin);

  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 24 * scale;
  ctx.shadowOffsetY = 6 * scale;
  ctx.fillStyle = style === "whisper" ? "rgba(248,248,246,0.86)" : "#f8f8f6";
  ctx.strokeStyle = "#101014";
  ctx.lineWidth = 3 * scale;
  roundedRect(ctx, x, y, bubbleWidth, bubbleHeight, (style === "shout" ? 10 : 26) * scale);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.stroke();

  // Tail toward the anchor point.
  const tailBaseX = Math.min(Math.max(anchorX, x + 34 * scale), x + bubbleWidth - 34 * scale);
  const tailFromBottom = anchorY > y + bubbleHeight;
  ctx.beginPath();
  if (tailFromBottom) {
    ctx.moveTo(tailBaseX - 18 * scale, y + bubbleHeight - 2);
    ctx.lineTo(tailBaseX + 18 * scale, y + bubbleHeight - 2);
    ctx.lineTo(anchorX, Math.min(anchorY, y + bubbleHeight + 60 * scale));
  } else {
    ctx.moveTo(tailBaseX - 18 * scale, y + 2);
    ctx.lineTo(tailBaseX + 18 * scale, y + 2);
    ctx.lineTo(anchorX, Math.max(anchorY, y - 60 * scale));
  }
  ctx.closePath();
  ctx.fillStyle = "#f8f8f6";
  ctx.fill();
  ctx.stroke();

  let textY = y + padding;
  if (hasSpeaker) {
    ctx.font = `700 ${speakerSize}px "Segoe UI", system-ui, sans-serif`;
    ctx.fillStyle = "#8a1c1c";
    ctx.fillText((speaker ?? "").toUpperCase(), x + padding, textY);
    textY += speakerSize * 1.6;
    ctx.font = `${style === "shout" ? "700" : "500"} ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  }

  ctx.fillStyle = "#12121a";
  for (const line of lines) {
    ctx.fillText(line, x + padding, textY);
    textY += lineHeight;
  }
  ctx.restore();
}

/** Rectangular narration caption box, bottom-left, comic style. */
export function drawCaption(
  ctx: CanvasRenderingContext2D,
  options: {
    text: string;
    canvasWidth: number;
    canvasHeight: number;
    opacity?: number;
  },
) {
  const { text, canvasWidth, canvasHeight } = options;
  const opacity = options.opacity ?? 1;
  if (!text.trim() || opacity <= 0.01) return;

  const scale = canvasWidth / 1280;
  const fontSize = 25 * scale;
  const padding = 20 * scale;
  const margin = 42 * scale;
  const maxWidth = canvasWidth * 0.56;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font = `500 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  ctx.textBaseline = "top";

  const lines = wrapText(ctx, text, maxWidth - padding * 2);
  const lineHeight = fontSize * 1.3;
  const boxWidth = Math.min(maxWidth, Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding * 2);
  const boxHeight = lines.length * lineHeight + padding * 1.7;
  const x = margin;
  const y = canvasHeight - boxHeight - margin;

  ctx.fillStyle = "rgba(250, 244, 224, 0.94)";
  ctx.strokeStyle = "#101014";
  ctx.lineWidth = 3 * scale;
  ctx.fillRect(x, y, boxWidth, boxHeight);
  ctx.strokeRect(x, y, boxWidth, boxHeight);

  ctx.fillStyle = "#17161b";
  let textY = y + padding * 0.85;
  for (const line of lines) {
    ctx.fillText(line, x + padding, textY);
    textY += lineHeight;
  }
  ctx.restore();
}

/** Subtle cinematic grade: vignette + faint halftone-ish grain. */
export function drawGrade(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity = 1,
) {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.32,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.78,
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, `rgba(0,0,0,${0.45 * intensity})`);
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
