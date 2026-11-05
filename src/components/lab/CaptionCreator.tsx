"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { generateCaptions } from "@/app/create/actions";
import type { CaptionCandidate } from "@/lib/punnett/pairing";
import { validateUpload } from "@/lib/punnett/generation";
import { prepareUpload } from "@/lib/punnett/imageUpload";
import { CaptionActions } from "./CaptionActions";
import { LabLoader } from "./LabLoader";
import Image from "next/image";

type Created = { imageId: string; captions: CaptionCandidate[] };

export function CaptionCreator() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("");
  const tonePrefix = tone ? `Tone: ${tone}.\n` : "";
  const contextLimit = 1000 - tonePrefix.length;
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Created | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const busy = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    if (result) {
      resultsHeading.current?.focus({ preventScroll: true });
      resultsHeading.current?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "start" });
    }
  }, [result, reduceMotion]);

  function removePhoto() {
    if (busy.current) return;
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
    if (input.current) input.current.value = "";
    if (camera.current) camera.current.value = "";
  }

  function placeSample(candidate: File | undefined) {
    if (busy.current || !candidate) return;
    const uploadError = validateUpload(candidate);
    if (uploadError) {
      setError(uploadError);
      if (input.current) input.current.value = "";
      if (camera.current) camera.current.value = "";
      setFile(null);
      setPreview(null);
      setResult(null);
      return;
    }
    setFile(candidate);
    setPreview(URL.createObjectURL(candidate));
    setResult(null);
    setError("");
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) { placeSample(event.target.files?.[0]); }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 1) { setError("Upload one image at a time."); return; }
    placeSample(event.dataTransfer.files[0]);
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (!file) { setError("Upload an image first."); input.current?.focus(); return; }
    busy.current = true;
    setPending(true);
    setError("");
    setResult(null);
    try {
      const body = new FormData();
      if (file) body.set("image", await prepareUpload(file));
      body.set("prompt", tonePrefix + prompt.slice(0, contextLimit));
      const response = await generateCaptions(body);
      if (!response.ok) {
        const stage = { upload: "The upload", generate: "Caption writing", save: "Saving the captions" }[response.stage];
        setError(`${stage} did not finish. ${response.error}`);
        return;
      }
      setResult({ imageId: response.imageId, captions: response.captions });
      toast.success("Your captions are ready.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Caption generation could not finish. Check your connection and try again.");
    } finally { busy.current = false; setPending(false); }
  }

  return <div className="create-workbench">
    <form className="create-form" onSubmit={event => void generate(event)} aria-busy={pending}>
      <div className="create-upload" data-dragging={dragging} onDragOver={event => { event.preventDefault(); if (!busy.current) setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={onDrop}>
        {preview ? <Image className="upload-preview" src={preview} alt="Your image for caption generation" width={1200} height={900} unoptimized /> : null}
        <label className="create-file-label" htmlFor="create-image">{file ? file.name : "Upload an image"}</label>
        <p className="field-help">Drag it in. Or choose something from your camera roll.</p>
        <input id="create-image" name="image" ref={input} type="file" accept="image/*" onChange={onFile} disabled={pending} aria-describedby="image-limits" />
        <div className="create-camera"><button type="button" className="lab-button button-quiet" onClick={() => camera.current?.click()} disabled={pending}>Take a photo</button><input ref={camera} type="file" accept="image/*" capture="environment" onChange={onFile} disabled={pending} className="visually-hidden" tabIndex={-1} aria-label="Take a photo with your camera" /></div>
        <p id="image-limits" className="field-help">JPEG, PNG, WebP, or GIF. Up to 8 MB. Resized before upload.</p>
        {file ? <button type="button" className="lab-button button-quiet" onClick={removePhoto} disabled={pending}>Remove image</button> : null}
      </div>
      <div className="create-instructions">
        <h2>What’s the mood?</h2><p className="create-description">A little context makes the captions yours.</p><fieldset className="tone-picker" disabled={pending}><legend>Tone <span className="field-optional">Optional</span></legend>{["Dry", "Absurd", "Relatable", "Playful"].map(value => <button key={value} type="button" aria-pressed={tone === value} onClick={() => { const next = tone === value ? "" : value; setTone(next); setPrompt(current => current.slice(0, 1000 - (next ? `Tone: ${next}.\n`.length : 0))); }}><span>{value}</span>{tone === value ? <motion.span className="tone-selected" layoutId="selected-tone" transition={{ duration: reduceMotion ? 0 : .18 }} /> : null}</button>)}</fieldset>
        <div className="bench-field"><label htmlFor="create-prompt">Context <span className="field-optional">Optional</span></label><textarea placeholder="The group project is due tomorrow. Nobody has opened the doc." id="create-prompt" name="prompt" value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={contextLimit} rows={3} disabled={pending} aria-describedby="prompt-help prompt-count" /><span id="prompt-count" className="prompt-count">{prompt.length} / {contextLimit}</span><p id="prompt-help" className="field-help">Add the backstory, an inside joke, or who this is for.</p></div>
        <button className="lab-button button-primary create-submit" type="submit" disabled={pending || !file}>{pending ? "Generating captions…" : "Generate captions"}</button>
        <p className="create-sharing field-help">Your image and directions go to Gemini. Finished images and captions show up in public voting, so upload only images you are happy to share.</p>
        {pending ? <LabLoader label="Generating captions…" description="Preparing your image, asking AI for captions, and saving the results. Keep this tab open." /> : null}
        {error ? <p className="form-error create-error" role="alert">{error}</p> : null}
      </div>
    </form>
    {result ? <section className="create-results" aria-label="Generated captions" aria-live="polite">
      <div className="create-results-heading"><div><h2 ref={resultsHeading} tabIndex={-1}>Pick your favorite</h2></div><Link className="lab-button button-primary" href={`/?image=${encodeURIComponent(result.imageId)}`}>Vote on these captions</Link></div>
      <ul className="result-list">{result.captions.map((caption, index) => <motion.li key={caption.id} initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .25, delay: reduceMotion ? 0 : index * .06 }}><article className="result-card"><Image className="caption-card-image" src={`/media/${result.imageId}`} alt="The uploaded image for this caption" width={800} height={600} unoptimized /><h3>{caption.text}</h3><CaptionActions text={caption.text} imageId={result.imageId} /></article></motion.li>)}</ul><div className="results-next"><Link className="text-link" href="/lab/notebook/created">See your caption history</Link><button type="button" className="lab-button button-quiet" onClick={removePhoto}>Start with another image</button></div>
    </section> : null}
  </div>;
}
