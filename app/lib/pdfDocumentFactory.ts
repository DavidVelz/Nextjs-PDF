import React from "react";
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	Svg,
	Rect,
	Image as PDFImage,
} from "@react-pdf/renderer";
import { HtmlUtils } from "./utils/htmlUtils";
// reemplazamos la definición local de tipos por import desde la carpeta types
import { PerBandEntry, ElementNode, ExportedData } from "./types";
// reemplazamos la definición local de estilos por la importación:
import { apaStyles as styles } from "./styles/apaStyles";

function renderElement(node: ElementNode, level = 0): React.ReactElement {
	const indent = level * 8;
	const leftStyle = { marginLeft: indent };
	const badges: React.ReactElement[] = [];
	if (typeof node.lw === "number") badges.push(React.createElement(Text, { key: "lw", style: styles.badge }, `Lw: ${node.lw} dB`));
	if (typeof node.lp === "number") badges.push(React.createElement(Text, { key: "lp", style: styles.badge }, `Lp: ${node.lp} dB`));
	const children = (node.children || []).map((c, i) => React.createElement(View, { key: `child-${i}` }, renderElement(c, level + 1)));
	return React.createElement(
		View,
		{ key: `${node.name}-${level}`, style: { marginBottom: 4 } },
		React.createElement(
			View,
			{ style: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" } },
			React.createElement(View, { style: leftStyle }, React.createElement(Text, { style: { fontSize: 10 } }, node.name)),
			React.createElement(View, null, ...badges)
		),
		...children
	);
}

/** Crea elemento watermark (logo) para insertar en cada página */
function createWatermark(src?: string, opts?: { width?: number; top?: number; left?: number; opacity?: number }) {
	if (!src) return null;
	const width = opts?.width ?? 260;
	const top = opts?.top ?? 280;
	const left = opts?.left ?? 150; // approximate center for A4
	const opacity = typeof opts?.opacity === "number" ? opts.opacity : 0.06;
	// Use absolute positioning so watermark sits behind content
	return React.createElement(PDFImage, {
		key: "page-watermark",
		src,
		style: {
			position: "absolute",
			top,
			left,
			width,
			opacity,
		},
	});
}

/** Create the PDF Document using data (templates strings inserted as plain text) */
export function createPdfDocumentElement(data: ExportedData = {}): React.ReactElement {
	const title = data.title ?? "Informe acústico";
	const generatedAt = data.generatedAt ?? new Date().toISOString();
	// crear running head corto
	const makeRunningHead = (t: string) => t.length > 40 ? t.slice(0, 37) + "..." : t;
	const runningHead = makeRunningHead(title);

	// prepare watermark once (uses public/insonor.webp)
	const watermark = createWatermark("/insonor.webp", { width: 260, top: 280, left: 150, opacity: 0.06 });

	// header and page number (fixed) for APA
	const headerLeft = React.createElement(Text, { key: "header-left", fixed: true, style: styles.runningHeadLeft }, makeRunningHead(data.title ?? "Informe acústico"));
	const pageNumber = React.createElement(Text, {
		key: "page-number",
		fixed: true,
		style: styles.pageNumber,
		render: ({ pageNumber: pn }: { pageNumber: number }) => String(pn),
	});

	// Build each page separately

	// --- Cover page ---
	const coverChildren: React.ReactElement[] = [];
	coverChildren.push(headerLeft, pageNumber);
	if (watermark) coverChildren.push(watermark);
	coverChildren.push(
		React.createElement(View, { style: { alignItems: "center", marginTop: 40, marginBottom: 18 } },
			React.createElement(PDFImage, { src: "/insonor.webp", style: { width: 220, height: "auto" } })
		)
	);
	coverChildren.push(React.createElement(Text, { style: styles.coverTitle }, data.title ?? "Informe acústico"));
	coverChildren.push(React.createElement(Text, { style: styles.coverSub }, `Estudio: ISO 12354-4`));
	coverChildren.push(React.createElement(Text, { style: styles.smallMeta }, `Fecha: ${new Date(data.generatedAt ?? new Date().toISOString()).toLocaleDateString()}`));
	if (data.templates && data.templates.cover) coverChildren.push(React.createElement(Text, { style: { marginTop: 12 } }, HtmlUtils.stripHtml(data.templates.cover)));
	const coverPage = React.createElement(Page, { size: "A4", style: styles.page, key: "cover" }, ...coverChildren);

	// --- Results page ---
	const resultsChildren: React.ReactElement[] = [];
	resultsChildren.push(headerLeft, pageNumber);
	if (watermark) resultsChildren.push(watermark);
	resultsChildren.push(React.createElement(Text, { style: styles.sectionTitle }, "Resultados generales"));
	if (data.summary && (data.summary.LpA_db !== undefined)) {
		resultsChildren.push(React.createElement(Text, null, `LpA: ${data.summary.LpA_db} dB`));
	}
	if (data.diagnostic && data.diagnostic.Lw_emission_db !== undefined) {
		resultsChildren.push(React.createElement(Text, null, `Lw (emisión): ${data.diagnostic.Lw_emission_db} dB`));
	}
	if (data.templates && data.templates.results) resultsChildren.push(React.createElement(Text, { style: styles.smallMeta }, HtmlUtils.stripHtml(data.templates.results)));
	const resultsPage = React.createElement(Page, { size: "A4", style: styles.page, key: "results" }, ...resultsChildren);

	// --- Bands page ---
	const bandsChildren: React.ReactElement[] = [];
	bandsChildren.push(headerLeft, pageNumber);
	if (watermark) bandsChildren.push(watermark);
	bandsChildren.push(React.createElement(Text, { style: styles.sectionTitle }, "Resultados por banda"));
	// chart
	if (data.perBand_TL_dB_octave?.perBand_TL_dB && data.perBand_TL_dB_octave.perBand_TL_dB.length) {
		const tlLabels: number[] = data.perBand_TL_dB_octave?.octaveBands_Hz ?? [];
		const chartValues: (number | undefined)[] = data.perBand_TL_dB_octave?.perBand_TL_dB ?? [];
		const svgChildren: React.ReactElement[] = []; // You can add chart drawing logic here if needed
		bandsChildren.push(React.createElement(View, { key: "bands-chart" }, React.createElement(Svg, { width: 440, height: 120 }, ...svgChildren)));
		// structured table of octave bands
		if (tlLabels && tlLabels.length) {
			bandsChildren.push(React.createElement(View, { style: styles.tableHeader },
				React.createElement(Text, { style: { width: 120 } }, "Frecuencia (Hz)"),
				React.createElement(Text, { style: { width: 120, textAlign: "right" } }, "TL (dB)")
			));
			tlLabels.forEach((f: number, i: number) => {
				bandsChildren.push(React.createElement(View, { style: styles.tableRow, key: `band-row-${i}` },
					React.createElement(Text, { style: styles.tableCell }, `${f} Hz`),
					React.createElement(Text, { style: { ...styles.tableCell, textAlign: "right" } }, `${chartValues[i] ?? "-"} dB`)
				));
			});
		}
	} else if (data.templates && data.templates.bands) {
		bandsChildren.push(React.createElement(Text, null, HtmlUtils.stripHtml(data.templates.bands)));
	}
	const bandsPage = React.createElement(Page, { size: "A4", style: styles.page, key: "bands" }, ...bandsChildren);

	// --- Materials page ---
	const materialsChildren: React.ReactElement[] = [];
	materialsChildren.push(headerLeft, pageNumber);
	if (watermark) materialsChildren.push(watermark);
	materialsChildren.push(React.createElement(Text, { style: styles.sectionTitle }, "Materiales utilizados"));
	if (data.elements && data.elements.length) {
		// list element names
		data.elements.forEach((el, i) => {
			materialsChildren.push(React.createElement(Text, { key: `mat-${i}` }, `• ${el.name}${el.material ? ` — ${el.material}` : ""}`));
		});
	} else if (data.templates && data.templates.materials) {
		materialsChildren.push(React.createElement(Text, null, HtmlUtils.stripHtml(data.templates.materials)));
	} else {
		materialsChildren.push(React.createElement(Text, null, "No hay materiales registrados."));
	}
	const materialsPage = React.createElement(Page, { size: "A4", style: styles.page, key: "materials" }, ...materialsChildren);

	// --- Recommendations page ---
	const recChildren: React.ReactElement[] = [];
	recChildren.push(headerLeft, pageNumber);
	if (watermark) recChildren.push(watermark);
	recChildren.push(React.createElement(Text, { style: styles.sectionTitle }, "Recomendaciones"));
	if (data.improvementStrategy && data.improvementStrategy.length) {
		data.improvementStrategy.forEach((s, i) => {
			recChildren.push(React.createElement(Text, { key: `rec-${i}` }, `${s.priority}. ${s.title} — ${s.description}`));
		});
	} else if (data.templates && data.templates.recommendations) {
		recChildren.push(React.createElement(Text, null, HtmlUtils.stripHtml(data.templates.recommendations)));
	} else {
		recChildren.push(React.createElement(Text, null, "No hay recomendaciones registradas."));
	}
	const recPage = React.createElement(Page, { size: "A4", style: styles.page, key: "recommendations" }, ...recChildren);

	// --- Elements (construction tree) page ---
	const elementsChildren: React.ReactElement[] = [];
	elementsChildren.push(headerLeft, pageNumber);
	if (watermark) elementsChildren.push(watermark);
	elementsChildren.push(React.createElement(Text, { style: styles.sectionTitle }, "Elementos de construcción"));
	if (data.elements && data.elements.length) {
		data.elements.forEach((el: ElementNode) => elementsChildren.push(renderElement(el, 0)));
	} else {
		elementsChildren.push(React.createElement(Text, null, "No hay elementos."));
	}
	const elementsPage = React.createElement(Page, { size: "A4", style: styles.page, key: "elements" }, ...elementsChildren);

	// --- Diagnostic / Notes page (optional) ---
	const diagChildren: React.ReactElement[] = [];
	diagChildren.push(headerLeft, pageNumber);
	if (watermark) diagChildren.push(watermark);
	if (data.diagnostic) {
		diagChildren.push(React.createElement(Text, { style: styles.sectionTitle }, "Diagnóstico"));
		diagChildren.push(React.createElement(Text, null, JSON.stringify(data.diagnostic)));
	}
	if (data.criticalPoints && data.criticalPoints.length) {
		diagChildren.push(React.createElement(Text, { style: styles.sectionTitle }, "Puntos críticos"));
		data.criticalPoints.forEach((c, i) => diagChildren.push(React.createElement(Text, { key: `crit-${i}` }, `${c.type ?? c.name} — ${c.note ?? ""}`)));
	}
	if (data.notes) diagChildren.push(React.createElement(Text, { style: styles.note }, `Notas: ${data.notes}`));
	const diagPage = React.createElement(Page, { size: "A4", style: styles.page, key: "diagnostic" }, ...diagChildren);

	// Build document with pages in order
	const doc = React.createElement(Document, null, coverPage, resultsPage, bandsPage, materialsPage, recPage, elementsPage, diagPage);

	return doc;
}

export default createPdfDocumentElement;
