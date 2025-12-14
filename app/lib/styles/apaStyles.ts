import { StyleSheet } from "@react-pdf/renderer";

// Importa familias registradas
import { fontFamilies } from "../fonts";

export const apaStyles = StyleSheet.create({
	// usar márgenes 1" = 72pt, fuente Montserrat y tamaño 12 con interlineado 1.5
	page: { padding: 72, fontSize: 12, fontFamily: fontFamilies.Montserrat, lineHeight: 1.5, color: "#111", fontStyle: "normal" },
	coverTitle: { fontSize: 20, fontWeight: 700, marginBottom: 6, textAlign: "center", fontFamily: fontFamilies.Montserrat, fontStyle: "normal", color: "#111" },
	coverSub: { fontSize: 12, color: "#222", marginBottom: 18, textAlign: "center", fontFamily: fontFamilies.Montserrat, fontStyle: "normal" },
	sectionTitle: { fontSize: 12, marginBottom: 6, marginTop: 12, fontWeight: 700, textAlign: "center", fontFamily: fontFamilies.Montserrat, fontStyle: "normal", color: "#111" },
	smallMeta: { fontSize: 10, color: "#222", fontFamily: fontFamilies.Montserrat, fontStyle: "normal" },
	tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 6, marginBottom: 6 },
	tableRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
	tableCell: { fontSize: 10, fontFamily: fontFamilies.Montserrat, fontStyle: "normal", color: "#111" },
	badge: { fontSize: 9, padding: 4, borderRadius: 4, backgroundColor: "#f3f4f6", marginLeft: 6, fontFamily: fontFamilies.Montserrat, fontStyle: "normal", color: "#111" },
	note: { fontSize: 10, color: "#333", marginTop: 8, fontFamily: fontFamilies.Montserrat, fontStyle: "normal" },
	pageNumber: { position: "absolute", top: 24, right: 72, fontSize: 10, color: "#444", fontFamily: fontFamilies.Montserrat, fontStyle: "normal" },
	runningHeadLeft: { position: "absolute", top: 24, left: 72, fontSize: 10, color: "#444", textTransform: "uppercase", fontFamily: fontFamilies.Montserrat, fontStyle: "normal" },

	// Footer styles (mantener coherencia)
	footerContainer: {
		position: "absolute",
		bottom: 24,
		left: 72,
		right: 72,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	footerLogo: {
		width: 64, // pequeño y sutil
		height: 16,
		opacity: 0.9,
	},
	footerText: {
		fontSize: 9,
		color: "#222",
		textAlign: "right",
		fontFamily: fontFamilies.Montserrat,
		fontStyle: "normal",
	},

	// Énfasis / negrita
	strong: { fontFamily: fontFamilies.Montserrat, fontWeight: 700, fontStyle: "normal", color: "#111" },
	importantValue: { fontFamily: fontFamilies.Montserrat, fontSize: 12, fontWeight: 700, color: "#111", fontStyle: "normal" },
	labelBold: { fontFamily: fontFamilies.Montserrat, fontSize: 10, fontWeight: 700, fontStyle: "normal" },
	elementName: { fontFamily: fontFamilies.Montserrat, fontSize: 10, fontWeight: 700, fontStyle: "normal" },
});
