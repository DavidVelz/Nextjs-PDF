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

  async function downloadClientPdf() {
    try {
      setGenerating(true);
      const { results, overall } = computeIso12354_4(massPerArea);

      // load templates
      const [coverTpl, resultsTpl, bandsTpl, materialsTpl, recsTpl] = await Promise.all([
        loadTemplate("cover"),
        loadTemplate("results"),
        loadTemplate("bands"),
        loadTemplate("materials"),
        loadTemplate("recommendations"),
      ]);

      // build bands table HTML to inject into bandsTpl
      const bandsRowsHtml = `<table><thead><tr><th>Frecuencia (Hz)</th><th>Valor (dB)</th></tr></thead><tbody>${
        results.map((r) => `<tr><td>${r.freq}</td><td>${r.tl}</td></tr>`).join("")
      }</tbody></table>`;

      // sample materials list (if you have a JSON list, replace here)
      const materialsHtml = `<li>Paneles de yeso (1 capa)</li><li>Vidrio doble 4/12/4</li><li>Puerta entamborada</li>`;

      // sample recommendations list
      const recsHtml = `<li>Reemplazar ventanas por doble acristalamiento.</li><li>Aumentar masa de paredes con trasdosado.</li>`;

      // replace placeholders in templates
      const generatedAt = new Date().toISOString();
      const establishment = "Nombre del establecimiento"; // you can get this from JSON if present
      const coverFilled = coverTpl
        .replace("{{generatedAt}}", new Date(generatedAt).toLocaleString())
        .replace("{{study}}", "ISO 12354-4")
        .replace("{{establishment}}", establishment);

      // build data object passed to factory
      const data = {
        generatedAt,
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
        diagnostic: { Lw_emission_db: 0 }, // Provide default value to avoid 'never' type
        notes: "",
        templates: {}, // will fill below
      };

      const resultsFilled = resultsTpl
        .replace("{{LpA}}", String((Math.round((results.reduce((s, r) => s + r.tl, 0) / results.length) || 0))))
        .replace("{{Lw}}", String((Math.round((data?.diagnostic?.Lw_emission_db ?? 0) || 0)))
          || "N/A")
        .replace("{{observations}}", "Resultados calculados con aproximación (ley de masa).");

      const bandsFilled = bandsTpl.replace("{{bands_table}}", bandsRowsHtml);
      const materialsFilled = materialsTpl.replace("{{materials_list}}", materialsHtml);
      const recsFilled = recsTpl.replace("{{recommendations_list}}", recsHtml);

      // fill templates in data object
      data.templates = {
        cover: coverFilled,
        results: resultsFilled,
        bands: bandsFilled,
        materials: materialsFilled,
        recommendations: recsFilled,
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

      // load + fill templates (same as download)
      const [coverTpl, resultsTpl, bandsTpl, materialsTpl, recsTpl] = await Promise.all([
        loadTemplate("cover"),
        loadTemplate("results"),
        loadTemplate("bands"),
        loadTemplate("materials"),
        loadTemplate("recommendations"),
      ]);
      const bandsRowsHtml = `<table><thead><tr><th>Frecuencia (Hz)</th><th>Valor (dB)</th></tr></thead><tbody>${
        results.map((r) => `<tr><td>${r.freq}</td><td>${r.tl}</td></tr>`).join("")
      }</tbody></table>`;
      const materialsHtml = `<li>Paneles de yeso (1 capa)</li><li>Vidrio doble 4/12/4</li><li>Puerta entamborada</li>`;
      const recsHtml = `<li>Reemplazar ventanas por doble acristalamiento.</li><li>Aumentar masa de paredes con trasdosado.</li>`;

      const generatedAt = new Date().toISOString();
      const establishment = "Nombre del establecimiento";
      const coverFilled = coverTpl
        .replace("{{generatedAt}}", new Date(generatedAt).toLocaleString())
        .replace("{{study}}", "ISO 12354-4")
        .replace("{{establishment}}", establishment);

      const resultsFilled = resultsTpl
        .replace("{{LpA}}", String((Math.round((results.reduce((s, r) => s + r.tl, 0) / results.length) || 0))))
        .replace("{{Lw}}", String((Math.round((0) || 0)) || "N/A"))
        .replace("{{observations}}", "Resultados calculados con aproximación (ley de masa).");

      const bandsFilled = bandsTpl.replace("{{bands_table}}", bandsRowsHtml);
      const materialsFilled = materialsTpl.replace("{{materials_list}}", materialsHtml);
      const recsFilled = recsTpl.replace("{{recommendations_list}}", recsHtml);

      const data = {
        generatedAt,
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
        diagnostic: {},
        notes: "",
        templates: {
          cover: coverFilled,
          results: resultsFilled,
          bands: bandsFilled,
          materials: materialsFilled,
          recommendations: recsFilled,
        },
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
