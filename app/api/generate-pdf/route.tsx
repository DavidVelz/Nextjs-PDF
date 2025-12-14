export const runtime = "nodejs";

export async function POST() {
  return new Response(
    JSON.stringify({ error: "Server-side PDF generation disabled. Use client-side generator." }),
    {
      status: 410,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// (optional) respond to GET with same message
export async function GET() {
  return new Response(
    JSON.stringify({ error: "Server-side PDF generation disabled. Use client-side generator." }),
    {
      status: 410,
      headers: { "Content-Type": "application/json" },
    }
  );
}
