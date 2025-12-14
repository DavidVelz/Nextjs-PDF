"use client";
import React, { ReactElement, useState } from "react";
import { DocumentProps, pdf } from "@react-pdf/renderer";
import { computeIso12354_4, tlToTau, OCTAVE_BANDS } from "../lib/iso12354";
import { createPdfDocumentElement } from "../lib/pdfDocumentFactory";

// ejemplo de elementos de construcción (jerarquía)
const sampleElements = [
  {
    name: "Piso",
    lw: 0.0,
    lp: 0.0,
    children: [{ name: "Piso 1", lw: 0.0, lp: 0.0 }],
  },
  {
    name: "Techo",
    lw: 85.6,
    children: [{ name: "Techo 1", lw: 98.8, lp: 78.2 }],
  },
  {
    name: "Fachadas",
    lw: 80.2,
    children: [
      { name: "Pared 1", lw: 89.7, lp: 69.6 },
      { name: "Pared 2", lw: 88.7, lp: 68.9 },
      { name: "Pared 3", lw: 89.7, lp: 69.6 },
      {
        name: "Pared 4",
        lw: 105.4,
        lp: 85.6,
        children: [
          { name: "Abertura 1", lw: 0.0, lp: 0.0 },
          { name: "Abertura 2", lw: 0.0, lp: 0.0 },
        ],
      },
    ],
  },
];

export default function PdfGenerator() {
  const [title, setTitle] = useState("Cálculo ISO 12354-4 (ejemplo)");
  const [body, setBody] = useState("Este PDF incluye una tabla de pérdidas de transmisión por banda calculadas con una aproximación.");
  const [massPerArea, setMassPerArea] = useState<number>(15);
  const [area, setArea] = useState<number>(10);
  const [sourceLevel, setSourceLevel] = useState<number>(80);
  const [generating, setGenerating] = useState(false);

  function computePreview() {
    return computeIso12354_4(massPerArea);
  }

  async function loadTemplate(name: string) {
    const res = await fetch(`/pdf-templates/${name}.html`);
    if (!res.ok) return "";
    return await res.text();
  }

  // helper: fetch image and convert to data URL (client only)
  async function fetchImageAsDataUrl(url: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn("Could not fetch image as data URL:", err);
      return "";
    }
  }

  async function downloadClientPdf() {
    try {
      setGenerating(true);
      const { results, overall } = computeIso12354_4(massPerArea);

      // fetch logo as data URL to ensure react-pdf can embed it
      const logoDataUrl = await fetchImageAsDataUrl("/insonor.webp");

      const data = {
        generatedAt: new Date().toISOString(),
        title: `${title} — TL global ${overall} dB`,
        body: `${body}\nÁrea: ${area} m² — Nivel fuente: ${sourceLevel} dB`,
        parameters: {
          massPerArea_kg_per_m2: massPerArea,
          area_m2: area,
          sourceLevel_dB: sourceLevel,
        },
        frequencies_used_Hz: OCTAVE_BANDS,
        perBand_TL_dB_octave: {
          octaveBands_Hz: OCTAVE_BANDS,
          perBand_TL_dB: results.map((r) => r.tl),
          overall_TL_dB: overall,
        },
        elements: sampleElements,
        summary: {},
        diagnostic: undefined,
        criticalPoints: [],
        improvementStrategy: [],
        notes: "",
        // pass data URI for reliable embedding
        logoDataUrl,
      };

      const docElement = createPdfDocumentElement(data) as ReactElement<DocumentProps>;
      const blob = await pdf(docElement).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title || "document").replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error("Error generando PDF en cliente (download):", err);
      alert("Error generando PDF en cliente. Revisa la consola.");
    } finally {
      setGenerating(false);
    }
  }

  async function openInNewTab() {
    try {
      setGenerating(true);
      const { results, overall } = computeIso12354_4(massPerArea);

      // fetch logo as data URL
      const logoDataUrl = await fetchImageAsDataUrl("/insonor.webp");

      const data = {
        generatedAt: new Date().toISOString(),
        title: `${title} — TL global ${overall} dB`,
        body: `${body}\nÁrea: ${area} m² — Nivel fuente: ${sourceLevel} dB`,
        parameters: {
          massPerArea_kg_per_m2: massPerArea,
          area_m2: area,
          sourceLevel_dB: sourceLevel,
        },
        frequencies_used_Hz: OCTAVE_BANDS,
        perBand_TL_dB_octave: {
          octaveBands_Hz: OCTAVE_BANDS,
          perBand_TL_dB: results.map((r) => r.tl),
          overall_TL_dB: overall,
        },
        elements: sampleElements,
        summary: {},
        diagnostic: undefined,
        criticalPoints: [],
        improvementStrategy: [],
        notes: "",
        logoDataUrl,
      };

      const docElement = createPdfDocumentElement(data) as ReactElement<DocumentProps>;
      const blob = await pdf(docElement).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error("Error generando PDF en cliente (open):", err);
      alert("Error generando PDF en cliente. Revisa la consola.");
    } finally {
      setGenerating(false);
    }
  }

  const preview = computePreview();

  return (
    <div className="w-full max-w-3xl space-y-4">
      <div className="flex flex-col gap-2">
        <label className="font-medium">Título</label>
        <input className="border rounded px-2 py-1" value={title} onChange={(e) => setTitle(e.target.value)} />

        <label className="font-medium">Contenido</label>
        <textarea className="border rounded px-2 py-1" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />

        <label className="font-medium">Masa superficial (kg/m²) — m</label>
        <input
          type="number"
          className="border rounded px-2 py-1"
          value={String(massPerArea)}
          onChange={(e) => setMassPerArea(Number(e.target.value))}
        />

        <label className="font-medium">Área (m²)</label>
        <input type="number" className="border rounded px-2 py-1" value={String(area)} onChange={(e) => setArea(Number(e.target.value))} />

        <label className="font-medium">Nivel fuente (dB)</label>
        <input type="number" className="border rounded px-2 py-1" value={String(sourceLevel)} onChange={(e) => setSourceLevel(Number(e.target.value))} />
      </div>

      <div>
        <h3 className="font-semibold">Resultados (vista previa)</h3>
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div className="font-medium">Banda</div>
          <div className="font-medium">TL (dB)</div>
          <div className="font-medium">Tau</div>
          <div className="font-medium">—</div>
          {preview.results.map((r) => (
            <React.Fragment key={r.freq}>
              <div>{r.freq} Hz</div>
              <div>{r.tl} dB</div>
              <div>{tlToTau(r.tl).toExponential(2)}</div>
              <div />
            </React.Fragment>
          ))}
        </div>
        <div className="mt-2">TL global aproximado: {preview.overall} dB</div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={downloadClientPdf} className="px-3 py-2 rounded bg-blue-600 text-white" disabled={generating}>
          {generating ? "Generando..." : "Descargar PDF (cliente)"}
        </button>

        <button onClick={openInNewTab} className="px-3 py-2 rounded border bg-white" disabled={generating}>
          {generating ? "Generando..." : "Abrir en nueva pestaña (cliente)"}
        </button>
      </div>
    </div>
  );
}
