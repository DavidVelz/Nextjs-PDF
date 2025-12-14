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

const styles = StyleSheet.create({
	page: { padding: 24, fontSize: 11, fontFamily: "Helvetica" },
	coverTitle: { fontSize: 20, fontWeight: 700, marginBottom: 6 },
	coverSub: { fontSize: 10, color: "#666", marginBottom: 12 },
	sectionTitle: { fontSize: 14, marginBottom: 6, marginTop: 8, fontWeight: 600 },
	smallMeta: { fontSize: 9, color: "#444" },
	tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 6, marginBottom: 6 },
	tableRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
	tableCell: { fontSize: 9 },
	badge: { fontSize: 9, padding: 4, borderRadius: 4, backgroundColor: "#f3f4f6", marginLeft: 6 },
	note: { fontSize: 9, color: "#555", marginTop: 8 }
});

/** Remove <style> and <script> blocks, then strip tags and basic entities */
function stripHtml(html?: string): string {
	if (!html) return "";
	// remove style and script contents entirely
	let s = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
	s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
	// normalize newlines
	s = s.replace(/\r\n|\r/g, "\n");
	// replace block tags with newline
	s = s.replace(/<\/(div|p|br|li|h[1-6]|tr|table|thead|tbody)>/gi, "\n");
	// remove remaining tags
	s = s.replace(/<[^>]+>/g, "");
	// unescape few entities
	s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
	// collapse multiple newlines
	s = s.replace(/\n\s*\n+/g, "\n\n");
	return s.trim();
}

type PerBandEntry = { freq_Hz: number; Lp_dB?: number; Lw_dB?: number; TL_dB?: number };
type ElementNode = { name: string; lw?: number | null; lp?: number | null; material?: string; children?: ElementNode[] };

type ExportedData = {
	generatedAt?: string;
	title?: string;
	body?: string;
	parameters?: { massPerArea_kg_per_m2?: number; area_m2?: number; sourceLevel_dB?: number };
	frequencies_used_Hz?: number[];
	perBand_TL_dB_octave?: { octaveBands_Hz?: number[]; perBand_TL_dB?: number[]; overall_TL_dB?: number };
	perBand_Lp_exterior_dB?: PerBandEntry[];
	perBand_Lw_dB?: PerBandEntry[];
	facade_impacts_dB?: { name: string; impact_dB: number }[];
	summary?: Record<string, any>;
	elements?: ElementNode[];
	diagnostic?: Record<string, any>;
	criticalPoints?: any[];
	improvementStrategy?: any[];
	notes?: string;
	templates?: {
		cover?: string;
		results?: string;
		bands?: string;
		materials?: string;
		recommendations?: string;
	};
};

/** Render hierarchical construction elements */
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

/** Create the PDF Document using data (templates strings inserted as plain text) */
export function createPdfDocumentElement(data: ExportedData = {}): React.ReactElement {
	const title = data.title ?? "Informe acústico";
	const generatedAt = data.generatedAt ?? new Date().toISOString();
	const params = data.parameters ?? {};
	const tlInfo = data.perBand_TL_dB_octave ?? {};
	const tlValues = tlInfo.perBand_TL_dB ?? [];
	const tlLabels = tlInfo.octaveBands_Hz ?? [];
	const templates = data.templates ?? {};

	// Clean templates (remove style/script) then extract text
	const coverText = stripHtml(templates.cover);
	const resultsText = stripHtml(templates.results);
	const bandsText = stripHtml(templates.bands);
	const materialsText = stripHtml(templates.materials);
	const recsText = stripHtml(templates.recommendations);

	// Prepare chart children (TL by octave)
	const chartValues = tlValues.length ? tlValues : [];
	const svgChildren = chartValues.map((v: number, i: number) => {
		const max = Math.max(...chartValues, 1);
		const width = 420;
		const height = 100;
		const padding = 8;
		const barGap = 6;
		const barWidth = (width - padding * 2) / (chartValues.length || 1) - barGap;
		const h = (v / max) * (height - 24);
		const x = padding + i * (barWidth + barGap);
		const y = height - h - 12;
		return React.createElement(Rect, {
			key: `bar-${i}`,
			x,
			y,
			width: barWidth,
			height: h,
			rx: 2,
			ry: 2,
			fill: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][i % 5],
		});
	});

	// Cover page: use logo if available (public/insonor.webp)
	const coverPage = React.createElement(
		Page,
		{ size: "A4", style: styles.page, key: "cover" },
		// logo
		React.createElement(View, { style: { alignItems: "center", marginBottom: 12 } },
			React.createElement(PDFImage, { src: "/insonor.webp", style: { width: 160, height: 40 } })
		),
		React.createElement(Text, { style: styles.coverTitle }, title),
		React.createElement(Text, { style: styles.coverSub }, `Estudio: ISO 12354-4`),
		React.createElement(Text, { style: styles.smallMeta }, `Fecha: ${new Date(generatedAt).toLocaleString()}`),
		coverText ? React.createElement(Text, { style: { marginTop: 12 } }, coverText) : null
	);

	// Detail page children
	const details: React.ReactElement[] = [];

	// General results (use summary/diagnostic when present, else fallback to template text)
	details.push(React.createElement(Text, { style: styles.sectionTitle, key: "res-title" }, "Resultados generales"));
	if (data.summary && (data.summary.LpA_db || data.summary.LpA_db === 0)) {
		details.push(React.createElement(View, { key: "res-block" },
			React.createElement(Text, null, `LpA: ${data.summary.LpA_db} dB`),
			React.createElement(Text, null, `Weighted isolation: ${data.summary.weighted_isolation_db ?? "-"} dB`)
		));
	} else if (data.diagnostic && data.diagnostic.Lw_emission_db) {
		details.push(React.createElement(View, { key: "res-block2" },
			React.createElement(Text, null, `Lw (emisión): ${data.diagnostic.Lw_emission_db} dB`),
			React.createElement(Text, null, `LpA aproximado: ${data.diagnostic.exteriorLevel_dBA ?? "-"} dB`)
		));
	} else if (resultsText) {
		details.push(React.createElement(Text, { key: "res-tpl" }, resultsText));
	} else {
		details.push(React.createElement(Text, { key: "res-none" }, "No hay resultados generales disponibles."));
	}

	// Bands: chart + structured table
	details.push(React.createElement(Text, { style: styles.sectionTitle, key: "bands-title" }, "Resultados por banda"));
	if (chartValues.length) {
		details.push(React.createElement(View, { key: "bands-chart" }, React.createElement(Svg, { width: 440, height: 120 }, ...svgChildren)));
		// table header
		details.push(React.createElement(View, { style: styles.tableHeader, key: "bands-hdr" },
			React.createElement(Text, { style: { width: 120 } }, "Frecuencia (Hz)"),
			React.createElement(Text, { style: { width: 120, textAlign: "right" } }, "TL (dB)")
		));
		// rows
		tlLabels.forEach((f: number, i: number) => {
			details.push(React.createElement(View, { style: styles.tableRow, key: `band-row-${i}` },
				React.createElement(Text, { style: styles.tableCell }, `${f} Hz`),
				React.createElement(Text, { style: { ...styles.tableCell, textAlign: "right" } }, `${chartValues[i] ?? "-"} dB`)
			));
		});
	} else if (bandsText) {
		details.push(React.createElement(Text, { key: "bands-tpl" }, bandsText));
	} else {
		details.push(React.createElement(Text, { key: "bands-none" }, "No hay datos por banda."));
	}

	// Materials
	details.push(React.createElement(Text, { style: styles.sectionTitle, key: "materials-title" }, "Materiales utilizados"));
	if (data.elements && data.elements.length) {
		// list element names
		data.elements.forEach((el, i) => {
			details.push(React.createElement(Text, { key: `mat-${i}` }, `• ${el.name}${el.material ? ` — ${el.material}` : ""}`));
		});
	} else if (materialsText) {
		details.push(React.createElement(Text, { key: "materials-tpl" }, materialsText));
	} else {
		details.push(React.createElement(Text, { key: "materials-none" }, "No hay materiales registrados."));
	}

	// Recommendations
	details.push(React.createElement(Text, { style: styles.sectionTitle, key: "reco-title" }, "Recomendaciones"));
	if (data.improvementStrategy && data.improvementStrategy.length) {
		data.improvementStrategy.forEach((s, i) => {
			details.push(React.createElement(Text, { key: `rec-${i}` }, `${s.priority}. ${s.title} — ${s.description}`));
		});
	} else if (recsText) {
		details.push(React.createElement(Text, { key: "reco-tpl" }, recsText));
	} else {
		details.push(React.createElement(Text, { key: "reco-none" }, "No hay recomendaciones registradas."));
	}

	// Elements detailed tree
	if (data.elements && data.elements.length) {
		details.push(React.createElement(Text, { style: styles.sectionTitle, key: "els-title" }, "Elementos de construcción"));
		data.elements.forEach((el) => details.push(renderElement(el, 0)));
	}

	// Notes
	if (data.notes) {
		details.push(React.createElement(Text, { style: styles.note, key: "notes" }, `Notas: ${data.notes}`));
	}

	const detailPage = React.createElement(Page, { size: "A4", style: styles.page, key: "details" }, ...details);

	const doc = React.createElement(Document, null, coverPage, detailPage);

	return doc;
}

export default createPdfDocumentElement;
