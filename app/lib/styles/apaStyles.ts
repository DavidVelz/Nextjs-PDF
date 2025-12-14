import { StyleSheet } from "@react-pdf/renderer";

export const apaStyles = StyleSheet.create({
	// usar márgenes 1" = 72pt, fuente Times-Roman y tamaño 12 con interlineado 1.5
	page: { padding: 72, fontSize: 12, fontFamily: "Times-Roman", lineHeight: 1.5 },
	coverTitle: { fontSize: 20, fontWeight: 700, marginBottom: 6, textAlign: "center" },
	coverSub: { fontSize: 12, color: "#666", marginBottom: 18, textAlign: "center" },
	sectionTitle: { fontSize: 12, marginBottom: 6, marginTop: 12, fontWeight: 700, textAlign: "center" },
	smallMeta: { fontSize: 10, color: "#444" },
	tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 6, marginBottom: 6 },
	tableRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
	tableCell: { fontSize: 10 },
	badge: { fontSize: 9, padding: 4, borderRadius: 4, backgroundColor: "#f3f4f6", marginLeft: 6 },
	note: { fontSize: 10, color: "#555", marginTop: 8 },
	pageNumber: { position: "absolute", top: 24, right: 72, fontSize: 10, color: "#444" },
	runningHeadLeft: { position: "absolute", top: 24, left: 72, fontSize: 10, color: "#444", textTransform: "uppercase" },
});
