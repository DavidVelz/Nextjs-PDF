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
	if (typeof node.lw === "number") badges.push(React.createElement(Text, { key: "lw", style: styles.badge }, React.createElement(Text, { style: styles.strong }, `Lw: ${node.lw} dB`)));
	if (typeof node.lp === "number") badges.push(React.createElement(Text, { key: "lp", style: styles.badge }, React.createElement(Text, { style: styles.strong }, `Lp: ${node.lp} dB`)));
	const children = (node.children || []).map((c, i) => React.createElement(View, { key: `child-${i}` }, renderElement(c, level + 1)));
	return React.createElement(
		View,
		{ key: `${node.name}-${level}`, style: { marginBottom: 4 } },
		React.createElement(
			View,
			{ style: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" } },
			React.createElement(View, { style: leftStyle }, React.createElement(Text, { style: styles.elementName }, node.name)),
			React.createElement(View, null, ...badges)
		),
		...children
	);
}

/** Crea elemento watermark (logo) para insertar en cada página */
function createWatermark(src?: string, opts?: { width?: number; top?: number; left?: number; opacity?: number }) {
	if (!src) return null;
	// if running in browser and src is relative, make absolute so the image can be fetched by react-pdf in the browser
	let finalSrc = src;
	if (typeof window !== "undefined" && typeof src === "string" && src.startsWith("/")) {
		try {
			finalSrc = window.location.origin + src;
		} catch {
			// fallback keep src as-is
			finalSrc = src;
		}
	}
	// smaller and subtler watermark by default
	const width = opts?.width ?? 140; // reduced from 260
	const top = opts?.top ?? 320;     // adjust vertical position
	const left = opts?.left ?? 180;   // adjust horizontal to center
	const opacity = typeof opts?.opacity === "number" ? opts?.opacity : 0.04; // more subtle
	return React.createElement(PDFImage, {
		key: "page-watermark",
		src: finalSrc,
		style: {
			position: "absolute",
			top,
			left,
			width,
			opacity,
		},
	});
}

// Nuevo: helper para crear footer fijo (logo pequeño + URL)
function createFooter(logoSrc?: string, urlText?: string) {
	if (!logoSrc && !urlText) return null;
	let finalSrc = logoSrc ?? "/insonor.png";
	if (typeof window !== "undefined" && typeof finalSrc === "string" && finalSrc.startsWith("/")) {
		try {
			finalSrc = window.location.origin + finalSrc;
		} catch {
			finalSrc = finalSrc;
		}
	}
	const parts: React.ReactElement[] = [];
	if (finalSrc) {
		parts.push(React.createElement(PDFImage, { key: "footer-logo", src: finalSrc, style: styles.footerLogo }));
	} else {
		parts.push(React.createElement(View, { key: "footer-spacer", style: { width: 64 } }));
	}
	if (urlText) {
		parts.push(React.createElement(Text, { key: "footer-text", style: styles.footerText }, urlText));
	} else {
		parts.push(React.createElement(Text, { key: "footer-text-empty", style: styles.footerText }, ""));
	}
	// container with fixed: true to render in bottom on every page
	return React.createElement(View, { key: "footer", fixed: true, style: styles.footerContainer }, ...parts);
}

/** Create the PDF Document using data (templates strings inserted as plain text) */
export function createPdfDocumentElement(data: ExportedData = {}): React.ReactElement {
	const title = data.title ?? "Informe acústico";
	const generatedAt = data.generatedAt ?? new Date().toISOString();
	// crear running head corto
	const makeRunningHead = (t: string) => t.length > 40 ? t.slice(0, 37) + "..." : t;
	const runningHead = makeRunningHead(title);

	// resolve logo source (prefer data URI)
	const rawLogo = (data as any).logoDataUrl;
	const logoSource = typeof rawLogo === "string" && rawLogo.startsWith("data:") ? rawLogo : "/insonor.png";

	// create watermark and footer
	const watermark = createWatermark(logoSource, { width: 100, top: 320, left: 180, opacity: 0.04 });
	const footer = createFooter(logoSource, "app.insonor.co");

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
			React.createElement(PDFImage, { src: "/insonor.png", style: { width: 140, height: "auto", opacity: 0.95 } })
		)
	);
	coverChildren.push(React.createElement(Text, { style: styles.coverTitle }, data.title ?? "Informe acústico"));
	coverChildren.push(React.createElement(Text, { style: styles.coverSub }, `Estudio: ISO 12354-4`));
	coverChildren.push(React.createElement(Text, { style: styles.smallMeta }, `Fecha: ${new Date(data.generatedAt ?? new Date().toISOString()).toLocaleDateString()}`));
	if (data.templates && data.templates.cover) coverChildren.push(React.createElement(Text, { style: { marginTop: 12 } }, HtmlUtils.stripHtml(data.templates.cover)));
	// añadir footer al final de la portada
	if (footer) coverChildren.push(footer);
	const coverPage = React.createElement(Page, { size: "A4", style: styles.page, key: "cover" }, ...coverChildren);

	// --- Results page ---
	const resultsChildren: React.ReactElement[] = [];
	resultsChildren.push(headerLeft, pageNumber);
	if (watermark) resultsChildren.push(watermark);
	resultsChildren.push(React.createElement(Text, { style: styles.sectionTitle }, "Resultados generales"));
	// Results page: use importantValue for key metrics
	if (data.summary && (data.summary.LpA_db !== undefined)) {
		resultsChildren.push(React.createElement(Text, { style: styles.importantValue }, `LpA: ${data.summary.LpA_db} dB`));
	}
	if (data.diagnostic && data.diagnostic.Lw_emission_db !== undefined) {
		resultsChildren.push(React.createElement(Text, { style: styles.importantValue }, `Lw (emisión): ${data.diagnostic.Lw_emission_db} dB`));
	}
	if (data.templates && data.templates.results) resultsChildren.push(React.createElement(Text, { style: styles.smallMeta }, HtmlUtils.stripHtml(data.templates.results)));
	// añadir footer
	if (footer) resultsChildren.push(footer);
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
				React.createElement(Text, { style: { width: 120, ...styles.labelBold } }, "Frecuencia (Hz)"),
				React.createElement(Text, { style: { width: 120, textAlign: "right", ...styles.labelBold } }, "TL (dB)")
			));
			tlLabels.forEach((f: number, i: number) => {
				bandsChildren.push(React.createElement(View, { style: styles.tableRow, key: `band-row-${i}` },
					React.createElement(Text, { style: { ...styles.tableCell } }, `${f} Hz`),
					React.createElement(Text, { style: { ...styles.tableCell, textAlign: "right", fontWeight: 700 } }, `${chartValues[i] ?? "-"} dB`)
				));
			});
		}
	} else if (data.templates && data.templates.bands) {
		bandsChildren.push(React.createElement(Text, null, HtmlUtils.stripHtml(data.templates.bands)));
	}
	// añadir footer
	if (footer) bandsChildren.push(footer);
	const bandsPage = React.createElement(Page, { size: "A4", style: styles.page, key: "bands" }, ...bandsChildren);

	// --- Materials page ---
	const materialsChildren: React.ReactElement[] = [];
	materialsChildren.push(headerLeft, pageNumber);
	if (watermark) materialsChildren.push(watermark);
	materialsChildren.push(React.createElement(Text, { style: styles.sectionTitle }, "Materiales utilizados"));
	if (data.elements && data.elements.length) {
		// list element names
		data.elements.forEach((el, i) => {
			const materialText = el.material ? ` — ${el.material}` : "";
			materialsChildren.push(React.createElement(View, { key: `mat-${i}`, style: { flexDirection: "row", justifyContent: "flex-start" } },
				React.createElement(Text, { style: styles.elementName }, `• ${el.name}`),
				React.createElement(Text, { style: { marginLeft: 6 } }, materialText)
			));
		});
	} else if (data.templates && data.templates.materials) {
		materialsChildren.push(React.createElement(Text, null, HtmlUtils.stripHtml(data.templates.materials)));
	} else {
		materialsChildren.push(React.createElement(Text, null, "No hay materiales registrados."));
	}
	// añadir footer
	if (footer) materialsChildren.push(footer);
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
	// añadir footer
	if (footer) recChildren.push(footer);
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
	// añadir footer
	if (footer) elementsChildren.push(footer);
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
	// añadir footer
	if (footer) diagChildren.push(footer);
	const diagPage = React.createElement(Page, { size: "A4", style: styles.page, key: "diagnostic" }, ...diagChildren);

	// Build document with pages in order
	const doc = React.createElement(Document, null, coverPage, resultsPage, bandsPage, materialsPage, recPage, elementsPage, diagPage);

	return doc;
}

export default createPdfDocumentElement;
