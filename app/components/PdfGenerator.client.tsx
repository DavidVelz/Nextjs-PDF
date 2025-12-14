"use client";
import React, { useState, useEffect } from "react";
import { pdf } from "@react-pdf/renderer";
import { createPdfDocumentElement } from "../lib/pdfDocumentFactory";
import { computeIso12354_4, OCTAVE_BANDS } from "../lib/iso12354";

type Band = { freq: number; tl: number; lp?: number; lw?: number };

// Genera resultados inventados de forma determinística a partir de masa por área
function generateFakeBands(massPerArea: number): Band[] {
  const baseOffset = Math.max(1, massPerArea / 2);
  return OCTAVE_BANDS.map((f, i) => {
    const tl = Math.round((20 + i * 6 + baseOffset + (Math.sin(i) * 2)) * 10) / 10;
    const lp = Math.round((70 + Math.log10(f) * 10 - baseOffset * 0.3) * 10) / 10;
    const lw = Math.round((lp + tl) * 10) / 10; // simplificado
    return { freq: f, tl, lp, lw };
  });
}

export default function PdfGenerator() {
  const [title, setTitle] = useState("Informe acústico - ejemplo");
  const [massPerArea, setMassPerArea] = useState<number>(15);
  const [area, setArea] = useState<number>(10);
  const [sourceLevel, setSourceLevel] = useState<number>(80);
  const [useFake, setUseFake] = useState<boolean>(true);
  const [bands, setBands] = useState<Band[]>([]);
  const [generating, setGenerating] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string>("");

  useEffect(() => {
    // preload logo as data URI
    fetchImageAsDataUrl("/insonor.png").then((d) => {
      if (d) setLogoDataUrl(d);
      else fetchImageAsDataUrl("/insonor.png").then((d2) => d2 && setLogoDataUrl(d2));
    });
  }, []);

  useEffect(() => {
    // compute bands either from real calc or fake
    if (useFake) {
      setBands(generateFakeBands(massPerArea));
    } else {
      const { results } = computeIso12354_4(massPerArea);
      // map computeIso results to Band[]
      setBands(results.map((r) => ({ freq: r.freq, tl: r.tl } as Band)));
    }
  }, [massPerArea, useFake]);

  // calcula LpA y Lw a partir de bandas (promedio energético simplificado)
  function energyAverageDb(values: number[]) {
    if (!values || !values.length) return null;
    const lin = values.map((v) => Math.pow(10, v / 10));
    const mean = lin.reduce((s, v) => s + v, 0) / lin.length;
    return Math.round((10 * Math.log10(mean)) * 10) / 10;
  }

  const previewLpA = energyAverageDb(bands.map((b) => b.lp ?? (b.tl ? 60 : NaN)).filter(Number.isFinite) as number[]) ?? null;
  const previewLw = energyAverageDb(bands.map((b) => b.lw ?? (b.tl ? 80 : NaN)).filter(Number.isFinite) as number[]) ?? null;

  async function buildDataObject() {
    const tlArray = bands.map((b) => b.tl);
    const lpEntries = bands.map((b) => ({ freq_Hz: b.freq, Lp_dB: b.lp ?? null }));
    const lwEntries = bands.map((b) => ({ freq_Hz: b.freq, Lw_dB: b.lw ?? null }));

    return {
      generatedAt: new Date().toISOString(),
      title,
      body: `Informe generado (demo). Área: ${area} m² — Nivel fuente: ${sourceLevel} dB`,
      parameters: { massPerArea_kg_per_m2: massPerArea, area_m2: area, sourceLevel_dB: sourceLevel },
      frequencies_used_Hz: bands.map((b) => b.freq),
      perBand_TL_dB_octave: { octaveBands_Hz: bands.map((b) => b.freq), perBand_TL_dB: tlArray, overall_TL_dB: Math.round((tlArray.reduce((s, v) => s + v, 0) / tlArray.length) * 10) / 10 },
      perBand_Lp_exterior_dB: lpEntries,
      perBand_Lw_dB: lwEntries,
      elements: [
        { name: "Fachada", lw: 80.2, lp: 0.0, material: "Ladrillo" },
        { name: "Ventana", lw: 30.0, lp: 25.0, material: "Vidrio doble" },
      ],
      summary: { LpA_db: previewLpA, Lw_db: previewLw },
      diagnostic: { note: "Resultados inventados para demostración" },
      improvementStrategy: [{ priority: 1, title: "Mejorar ventanas", description: "Reemplazar por doble acristalamiento" }],
      notes: "Valores de ejemplo generados localmente (demo).",
      logoDataUrl,
    } as any;
  }

  async function downloadPdf() {
    try {
      setGenerating(true);
      const data = await buildDataObject();
      const doc = createPdfDocumentElement(data) as React.ReactElement<import("@react-pdf/renderer").DocumentProps>;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error(err);
      alert("Error generando PDF");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Resumen rápido</h3>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useFake} onChange={(e) => setUseFake(e.target.checked)} />
          Usar resultados inventados
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded shadow-sm bg-white">
          <div className="text-sm text-gray-500">LpA (nivel ponderado A)</div>
          <div className="text-2xl font-bold text-gray-900">{previewLpA !== null ? `${previewLpA} dB(A)` : "N/D"}</div>
          <div className="mt-2 text-sm text-gray-600">Indicador del nivel percibido por el oído humano.</div>
        </div>

        <div className="p-4 border rounded shadow-sm bg-white">
          <div className="text-sm text-gray-500">Lw (nivel de potencia sonora)</div>
          <div className="text-2xl font-bold text-gray-900">{previewLw !== null ? `${previewLw} dB` : "N/D"}</div>
          <div className="mt-2 text-sm text-gray-600">Potencia acústica total de la fuente (estimada).</div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Resultados por banda (octava)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs text-gray-600">
                <th className="px-2 py-1">Frecuencia (Hz)</th>
                <th className="px-2 py-1">TL (dB)</th>
                <th className="px-2 py-1">Lp (dB)</th>
                <th className="px-2 py-1">Lw (dB)</th>
              </tr>
            </thead>
            <tbody>
              {bands.map((b) => (
                <tr key={b.freq} className="odd:bg-white even:bg-slate-50">
                  <td className="px-2 py-1">{b.freq}</td>
                  <td className="px-2 py-1 font-medium">{b.tl}</td>
                  <td className="px-2 py-1">{b.lp ?? "-"}</td>
                  <td className="px-2 py-1">{b.lw ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Materiales y recomendaciones</h4>
        <ul className="list-disc ml-6 mb-2">
          <li><strong>Fachada:</strong> Ladrillo, trasdosado recomendado.</li>
          <li><strong>Ventanas:</strong> Vidrio doble 4/12/4 — prioridad de mejora.</li>
        </ul>
        <div className="text-sm text-gray-600">Recomendación principal: priorizar mejora de aberturas para reducir LpA.</div>
      </div>

      <div className="flex gap-3">
        <button onClick={downloadPdf} disabled={generating} className="px-4 py-2 bg-blue-600 text-white rounded">
          {generating ? "Generando..." : "Descargar PDF"}
        </button>
        <button
          onClick={async () => {
            setGenerating(true);
            const data = await buildDataObject();
            const doc = createPdfDocumentElement(data) as React.ReactElement<import("@react-pdf/renderer").DocumentProps>;
            const blob = await pdf(doc).toBlob();
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            setGenerating(false);
          }}
          disabled={generating}
          className="px-4 py-2 border rounded"
        >
          {generating ? "Generando..." : "Abrir en nueva pestaña"}
        </button>
      </div>
    </div>
  );
}

async function fetchImageAsDataUrl(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}
