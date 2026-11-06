"use client";
import { useState } from "react";
import { toast } from "sonner";
export function CaptionActions({ text, imageId }: { text: string; imageId: string }) {
  const [pending, setPending] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); toast.success("Caption copied."); }
    catch { toast.error("Could not copy. Select the caption text to copy it manually."); }
  }
  async function download() {
    if (pending) return;
    setPending(true);
    let source: string | undefined;
    let output: string | undefined;
    try {
      const response = await fetch(`/media/${imageId}`);
      if (!response.ok) throw new Error("Image unavailable");
      source = URL.createObjectURL(await response.blob());
      const image = new window.Image();
      image.src = source;
      await image.decode();
      const width = Math.min(1600, Math.max(640, image.naturalWidth));
      const height = Math.round(image.naturalHeight * width / image.naturalWidth);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      const size = Math.round(width / 25);
      const font = `${size}px sans-serif`;
      context.font = font;
      const lines: string[] = [];
      let line = "";
      // Wrap even long, unbroken words so exported captions stay inside the image.
      for (const word of text.split(/\s+/)) {
        if (line && context.measureText(`${line} ${word}`).width > width - 64) { lines.push(line); line = ""; }
        for (const character of (line ? " " : "") + word) {
          if (line && context.measureText(line + character).width > width - 64) { lines.push(line); line = ""; }
          line += character;
        }
      }
      if (line) lines.push(line);
      canvas.width = width;
      canvas.height = height + 64 + lines.length * size * 1.35;
      // Export uses a neutral high-contrast caption band independent of app theme.
      context.fillStyle = "black";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, width, height);
      context.font = font;
      context.fillStyle = "white";
      context.textAlign = "center";
      context.textBaseline = "top";
      lines.forEach((value, index) => context.fillText(value, width / 2, height + 32 + index * size * 1.35));
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Export failed")), "image/png"));
      output = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = output;
      link.download = "punnett-meme.png";
      link.click();
      toast.success("Meme downloaded.");
    } catch { toast.error("Could not download the meme. Please try again."); }
    finally {
      if (source) URL.revokeObjectURL(source);
      if (output) { const completed = output; setTimeout(() => URL.revokeObjectURL(completed), 1000); }
      setPending(false);
    }
  }
  return <div className="caption-actions"><button type="button" className="app-button button-quiet" onClick={() => void copy()}>Copy caption</button><button type="button" className="app-button button-quiet" disabled={pending} onClick={() => void download()}>{pending ? "Downloading…" : "Download meme"}</button></div>;
}
