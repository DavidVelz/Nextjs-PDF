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

// --- NUEVAS UTILIDADES ---
// Convierte un array de entradas {freq_Hz, value_dB} a un promedio energético en dB
function energyAverageFromDbValues(valuesDb: number[]): number | null {
	if (!valuesDb || !valuesDb.length) return null;
	// convertir dB -> linear (10^(dB/10)), promedio, volver a dB
	const linear = valuesDb.map((d) => Math.pow(10, (d || 0) / 10));
	const meanLinear = linear.reduce((s, v) => s + v, 0) / linear.length;
	const avgDb = 10 * Math.log10(meanLinear);
	return Number(isFinite(avgDb) ? avgDb.toFixed(1) : NaN);
}

// Extrae un array numérico desde entradas {freq_Hz, Lp_dB} u objetos similares
function mapEntriesToDb(entries: any[], key: string) {
	if (!Array.isArray(entries)) return [];
	return entries.map((e) => {
		if (e == null) return undefined;
		// admite varios nombres: Lp_dB / Lw_dB / value
		return typeof e[key] === "number" ? e[key] : (typeof e.value === "number" ? e.value : undefined);
	}).filter((v) => typeof v === "number") as number[];
}

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

	// obtener campos (con fallbacks)
	const establishment = (data.summary && (data.summary as any).establishment) || (data as any).establishment || "La Candela";
	const studyName = (data as any).studyName || data.title || "xxxxxx";
	const studyDateRaw = (data as any).studyDate || data.generatedAt || new Date().toISOString();
	const studyDate = (() => {
		try { return new Date(studyDateRaw).toLocaleDateString(); } catch { return String(studyDateRaw); }
	})();

	// prefer explicit data URI (logoDataUrl). Otherwise force use of local public file '/insonor.png'
	const rawLogo = (data as any).logoDataUrl;
	const logoSource = typeof rawLogo === "string" && rawLogo.startsWith("data:") ? rawLogo : "/insonor.png";
	const watermark = createWatermark(logoSource, { width: 140, top: 320, left: 180, opacity: 0.04 });

	// Define footer once to use in all pages
	const footer = createFooter(logoSource, "insonor.cl");

	// header and page number (fixed) for APA
	const headerLeft = React.createElement(Text, { key: "header-left", fixed: true, style: styles.runningHeadLeft }, makeRunningHead(data.title ?? "Informe acústico"));
	const pageNumber = React.createElement(Text, {
		key: "page-number",
		fixed: true,
		style: styles.pageNumber,
		render: ({ pageNumber: pn }: { pageNumber: number }) => String(pn),
	});

	// --- Cover page (reemplazado) ---
	const coverChildren: React.ReactElement[] = [];
	coverChildren.push(headerLeft, pageNumber);
	if (watermark) coverChildren.push(watermark);

	// línea superior distinta al título central
	coverChildren.push(
		React.createElement(Text, { key: "top-line", style: { ...styles.smallMeta, textAlign: "center", marginBottom: 8 } }, `insonor - estudio acústico en ${establishment}`)
	);

	// logo (más pequeño y sutil)
	coverChildren.push(
		React.createElement(View, { key: "logo-wrap", style: { alignItems: "center", marginTop: 8, marginBottom: 12 } },
			React.createElement(PDFImage, { src: logoSource, style: { width: 120, height: "auto", opacity: 0.95 } })
		)
	);

	// título central y norma debajo
	coverChildren.push(React.createElement(Text, { key: "central-title", style: styles.coverTitle }, "Resultados del estudio acústico"));
	coverChildren.push(React.createElement(Text, { key: "iso-line", style: styles.coverSub }, "ISO 12354-4"));

	// bloque con datos del estudio
	coverChildren.push(
		React.createElement(View, { key: "study-block", style: { marginTop: 18, alignSelf: "flex-start" } },
			React.createElement(View, { key: "row-est", style: { flexDirection: "row", marginBottom: 6 } },
				React.createElement(Text, { style: styles.labelBold }, "Establecimiento: "),
				React.createElement(Text, { style: styles.smallMeta }, String(establishment))
			),
			React.createElement(View, { key: "row-name", style: { flexDirection: "row", marginBottom: 6 } },
				React.createElement(Text, { style: styles.labelBold }, "Nombre del estudio: "),
				React.createElement(Text, { style: styles.smallMeta }, String(studyName))
			),
			React.createElement(View, { key: "row-date", style: { flexDirection: "row", marginBottom: 6 } },
				React.createElement(Text, { style: styles.labelBold }, "Fecha del estudio: "),
				React.createElement(Text, { style: styles.smallMeta }, String(studyDate))
			)
		)
	);

	// si existe plantilla adicional, mostrarla (limpiada)
	if (data.templates && data.templates.cover) {
		coverChildren.push(React.createElement(Text, { key: "tpl-cover", style: { marginTop: 12 } }, HtmlUtils.stripHtml(data.templates.cover)));
	}

	const coverPage = React.createElement(Page, { size: "A4", style: styles.page, key: "cover" }, ...coverChildren);

	// --- Results page ---
	const resultsChildren: React.ReactElement[] = [];
	resultsChildren.push(headerLeft, pageNumber);
	if (watermark) resultsChildren.push(watermark);
	resultsChildren.push(React.createElement(Text, { style: styles.sectionTitle }, "Resultados generales"));

	// Intentar obtener LpA:
	let lpA_value: number | null = null;
	if (data.summary && typeof data.summary.LpA_db === "number") {
		lpA_value = Number(data.summary.LpA_db);
	} else if (data.perBand_Lp_exterior_dB && data.perBand_Lp_exterior_dB.length) {
		const lpArray = mapEntriesToDb(data.perBand_Lp_exterior_dB, "Lp_dB");
		lpA_value = energyAverageFromDbValues(lpArray);
	}

	// Intentar obtener Lw:
	let lw_value: number | null = null;
	if (data.diagnostic && typeof data.diagnostic.Lw_emission_db === "number") {
		lw_value = Number(data.diagnostic.Lw_emission_db);
	} else if (data.perBand_Lw_dB && data.perBand_Lw_dB.length) {
		const lwArray = mapEntriesToDb(data.perBand_Lw_dB, "Lw_dB");
		lw_value = energyAverageFromDbValues(lwArray);
	}

	// Mostrar valores destacados
	if (lpA_value !== null && !isNaN(lpA_value)) {
		resultsChildren.push(React.createElement(Text, { style: styles.importantValue }, `LpA (nivel ponderado A): ${lpA_value} dB`));
	} else {
		resultsChildren.push(React.createElement(Text, { style: styles.smallMeta }, `LpA: datos no disponibles`));
	}

	if (lw_value !== null && !isNaN(lw_value)) {
		resultsChildren.push(React.createElement(Text, { style: styles.importantValue }, `Lw (nivel de potencia sonora): ${lw_value} dB`));
	} else {
		resultsChildren.push(React.createElement(Text, { style: styles.smallMeta }, `Lw: datos no disponibles`));
	}

	// Añadir una breve explicación de qué es cada magnitud
	resultsChildren.push(
		React.createElement(Text, { style: { marginTop: 8 } },
			"Explicación: LpA (nivel de presión sonora ponderado A) es el nivel de presión sonora ajustado para la sensibilidad del oído humano; se expresa en dB(A). Lw (nivel de potencia sonora) es la potencia acústica emitida por una fuente y se expresa en dB (referido a 10⁻¹² W)."
		)
	);

	// Si hay datos por banda, mostrar tabla Lp y Lw con encabezado explicativo
	if (data.perBand_Lp_exterior_dB && data.perBand_Lp_exterior_dB.length) {
		resultsChildren.push(React.createElement(Text, { style: styles.sectionTitle, key: "lp-band-title" }, "Detalle Lp por banda (exterior)"));
		// tabla simple
		resultsChildren.push(React.createElement(View, { style: styles.tableHeader, key: "lp-hdr" },
			React.createElement(Text, { style: { width: 120, ...styles.labelBold } }, "Frecuencia (Hz)"),
			React.createElement(Text, { style: { width: 120, textAlign: "right", ...styles.labelBold } }, "Lp (dB)")
		));
		(data.perBand_Lp_exterior_dB as any[]).forEach((e, i) => {
			const freq = e.freq_Hz ?? e.freq ?? "-";
			const val = typeof e.Lp_dB === "number" ? `${e.Lp_dB}` : (typeof e.value === "number" ? `${e.value}` : "-");
			resultsChildren.push(React.createElement(View, { style: styles.tableRow, key: `lp-row-${i}` },
				React.createElement(Text, { style: styles.tableCell }, `${freq}`),
				React.createElement(Text, { style: { ...styles.tableCell, textAlign: "right" } }, val)
			));
		});
	}

	if (data.perBand_Lw_dB && data.perBand_Lw_dB.length) {
		resultsChildren.push(React.createElement(Text, { style: styles.sectionTitle, key: "lw-band-title" }, "Detalle Lw por banda"));
		resultsChildren.push(React.createElement(View, { style: styles.tableHeader, key: "lw-hdr" },
			React.createElement(Text, { style: { width: 120, ...styles.labelBold } }, "Frecuencia (Hz)"),
			React.createElement(Text, { style: { width: 120, textAlign: "right", ...styles.labelBold } }, "Lw (dB)")
		));
		(data.perBand_Lw_dB as any[]).forEach((e, i) => {
			const freq = e.freq_Hz ?? e.freq ?? "-";
			const val = typeof e.Lw_dB === "number" ? `${e.Lw_dB}` : (typeof e.value === "number" ? `${e.value}` : "-");
			resultsChildren.push(React.createElement(View, { style: styles.tableRow, key: `lw-row-${i}` },
				React.createElement(Text, { style: styles.tableCell }, `${freq}`),
				React.createElement(Text, { style: { ...styles.tableCell, textAlign: "right" } }, val)
			));
		});
	}

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
