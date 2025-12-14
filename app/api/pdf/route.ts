import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  // Dynamically import PDFKit at runtime to avoid Turbopack bundling
  // which can rewrite __dirname and break pdfkit's data file paths.
  const PDFKitModule = await import('pdfkit');
  // PDFKit exports a default in CJS/ESM interop.
  const PDFDocument: any = PDFKitModule?.default ?? PDFKitModule;

  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  const chunks: Buffer[] = [];

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  doc.on('end', () => {});

  // Contenido del PDF
  doc.fontSize(20).text('PDF con App Router + PDFKit', { align: 'center' });

  doc.moveDown();

  doc.fontSize(12).text('Este PDF se genera desde App Router en Next.js.');

  doc.moveDown();

  doc.text(`Fecha: ${new Date().toLocaleDateString()}`);

  // Finalizar documento
  doc.end();

  const pdfBuffer = Buffer.concat(chunks);

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="ejemplo.pdf"',
    },
  });
}
