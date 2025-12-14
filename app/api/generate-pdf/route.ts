export const runtime = "nodejs";

import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 12, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 10 },
  section: { marginBottom: 8 },
});

export async function POST(request: Request) {
  try {
    const { title = "Documento", body = "" } = (await request.json()) as {
      title?: string;
      body?: string;
    };

    // Define a function that returns the document structure
    const MyDoc = () =>
      React.createElement(
        Document,
        null,
        React.createElement(
          Page,
          { size: "A4", style: styles.page },
          React.createElement(
            View,
            { style: styles.section },
            React.createElement(Text, { style: styles.title }, title)
          ),
          React.createElement(
            View,
            null,
            React.createElement(Text, null, body)
          )
        )
      );

    // Genera buffer del PDF en el servidor
    const pdfInstance = pdf(React.createElement(MyDoc));
    const pdfBuffer: any = await pdfInstance.toBuffer();

    // Use Buffer directly in the Response
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${(title || "document").replace(/\s+/g, "_")}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Error generating PDF:", err);
    return new Response("Error generating PDF", { status: 500 });
  }
}
