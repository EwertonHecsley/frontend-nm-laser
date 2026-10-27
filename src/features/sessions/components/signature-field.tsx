"use client";

import "@fontsource/caveat/latin-400.css";

import { Eraser, PenLine, Type } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isSignatureImage } from "@/features/sessions/utils";
import { cn } from "@/lib/utils";

const SIGNATURE_WIDTH = 640;
const SIGNATURE_HEIGHT = 220;
const MAX_TYPED_LENGTH = 80;

type SignatureMode = "draw" | "type";

function toSignatureImage(
  source: HTMLCanvasElement,
  outputWidth = SIGNATURE_WIDTH,
  outputHeight = SIGNATURE_HEIGHT,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    return "";
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputWidth, outputHeight);

  const sourceRatio = source.width / source.height;
  const outputRatio = outputWidth / outputHeight;
  let width = outputWidth;
  let height = outputHeight;

  if (sourceRatio > outputRatio) {
    height = outputWidth / sourceRatio;
  } else {
    width = outputHeight * sourceRatio;
  }

  context.drawImage(
    source,
    (outputWidth - width) / 2,
    (outputHeight - height) / 2,
    width,
    height,
  );

  return canvas.toDataURL("image/jpeg", 0.86);
}

function renderTypedSignature(name: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = SIGNATURE_WIDTH;
  canvas.height = SIGNATURE_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) {
    return "";
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, SIGNATURE_WIDTH, SIGNATURE_HEIGHT);
  context.fillStyle = "#111827";
  context.textAlign = "center";
  context.textBaseline = "middle";

  let fontSize = 78;
  const maxTextWidth = SIGNATURE_WIDTH - 72;

  do {
    context.font = `italic ${fontSize}px "Caveat", cursive`;
    if (context.measureText(name).width <= maxTextWidth) {
      break;
    }
    fontSize -= 4;
  } while (fontSize > 28);

  context.fillText(name, SIGNATURE_WIDTH / 2, SIGNATURE_HEIGHT / 2, maxTextWidth);

  return canvas.toDataURL("image/jpeg", 0.86);
}

export function SignatureField({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<SignatureMode>("draw");
  const [typedName, setTypedName] = useState("");
  const [hasDrawing, setHasDrawing] = useState(false);
  const [typedError, setTypedError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = canvas.offsetWidth || SIGNATURE_WIDTH;
    const height = canvas.offsetHeight || SIGNATURE_HEIGHT;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgba(0,0,0,0)",
      penColor: "#111827",
      minWidth: 0.7,
      maxWidth: 2.6,
      throttle: 8,
    });

    const handleEndStroke = () => {
      if (pad.isEmpty()) {
        setHasDrawing(false);
        return;
      }

      setHasDrawing(true);
      onChangeRef.current(toSignatureImage(canvas));
    };

    pad.addEventListener("endStroke", handleEndStroke);
    padRef.current = pad;

    return () => {
      pad.removeEventListener("endStroke", handleEndStroke);
      pad.off();
      padRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mode !== "draw" || disabled) {
      return;
    }

    const pad = padRef.current;
    const canvas = canvasRef.current;
    if (pad && canvas && !pad.isEmpty()) {
      onChangeRef.current(toSignatureImage(canvas));
    }
  }, [disabled, mode]);

  useEffect(() => {
    if (mode !== "type" || disabled) {
      return;
    }

    const name = typedName.trim();
    if (name.length < 2) {
      onChangeRef.current("");
      return;
    }

    let cancelled = false;

    void document.fonts
      .load('italic 78px "Caveat"')
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        const signature = renderTypedSignature(name);
        if (signature) {
          onChangeRef.current(signature);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [disabled, mode, typedName]);

  function handleClear() {
    padRef.current?.clear();
    setHasDrawing(false);
    setTypedName("");
    setTypedError(null);
    onChangeRef.current("");
  }

  function handleTypedNameChange(nextValue: string) {
    setTypedName(nextValue);

    if (!nextValue.trim()) {
      setTypedError(null);
      if (mode === "type") {
        onChangeRef.current("");
      }
      return;
    }

    if (nextValue.trim().length < 2) {
      setTypedError("Digite ao menos dois caracteres para gerar a assinatura.");
    } else {
      setTypedError(null);
    }
  }

  const preview = value.trim();
  const hasSignature = preview.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Forma de assinatura">
          <Button
            type="button"
            size="sm"
            variant={mode === "draw" ? "secondary" : "outline"}
            aria-pressed={mode === "draw"}
            disabled={disabled}
            onClick={() => setMode("draw")}
          >
            <PenLine className="size-4" />
            Desenhar
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "type" ? "secondary" : "outline"}
            aria-pressed={mode === "type"}
            disabled={disabled}
            onClick={() => setMode("type")}
          >
            <Type className="size-4" />
            Digitar nome
          </Button>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || (!hasSignature && !hasDrawing && !typedName)}
          onClick={handleClear}
        >
          <Eraser className="size-4" />
          Limpar
        </Button>
      </div>

      <div
        className={cn(
          "rounded-xl border bg-white p-2",
          disabled && "opacity-60",
        )}
      >
        <div className={cn(mode !== "draw" && "hidden")}>
          <canvas
            ref={canvasRef}
            id={id}
            aria-label="Área para assinatura com caneta, mouse ou toque"
            className="h-44 w-full touch-none rounded-lg bg-white"
          />
        </div>

        <div className={cn("space-y-2", mode !== "type" && "hidden")}>
          <Input
            value={typedName}
            maxLength={MAX_TYPED_LENGTH}
            disabled={disabled}
            placeholder="Digite o nome completo de quem está assinando"
            aria-label="Nome para gerar a assinatura automática"
            aria-invalid={Boolean(typedError)}
            onChange={(event) => handleTypedNameChange(event.target.value)}
          />
          {typedError ? (
            <p className="text-xs text-destructive">{typedError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              A assinatura será desenhada automaticamente com o nome informado.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          Prévia da assinatura
        </p>
        {hasSignature ? (
          isSignatureImage(preview) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Prévia da assinatura"
              className="h-24 w-full max-w-md rounded-lg border bg-white object-contain p-2"
            />
          ) : (
            <p className="whitespace-pre-wrap break-all rounded-lg border bg-white px-3 py-2 text-sm text-muted-foreground">
              {preview}
            </p>
          )
        ) : (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            Sem assinatura. Este campo é opcional.
          </p>
        )}
      </div>
    </div>
  );
}
