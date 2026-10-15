import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
async function proxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (!process.env.MYLIB_BACKEND || !process.env.MYLIB_TOKEN)
    return Response.json(
      { detail: "Démarrez MyLibApp avec son lanceur." },
      { status: 503 },
    );
  const host = req.headers.get("host") || "";
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))
    return Response.json({ detail: "Hôte non autorisé." }, { status: 403 });
  const origin = req.headers.get("origin");
  if (origin && origin !== `http://${host}`)
    return Response.json({ detail: "Origine non autorisée." }, { status: 403 });
  const headers = new Headers({ "x-mylib-token": process.env.MYLIB_TOKEN });
  for (const name of ["content-type", "range", "if-range"]) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const result = await fetch(
      `${process.env.MYLIB_BACKEND}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`,
      {
        method: req.method,
        headers,
        body: ["GET", "HEAD"].includes(req.method)
          ? undefined
          : await req.arrayBuffer(),
        cache: "no-store",
        signal: AbortSignal.timeout(660000),
      },
    );
    const responseHeaders = new Headers();
    for (const name of [
      "content-type",
      "content-length",
      "content-disposition",
      "content-range",
      "accept-ranges",
      "last-modified",
      "etag",
    ]) {
      const value = result.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set("cache-control", "no-store");
    return new Response(result.body, {
      status: result.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      {
        detail: "La connexion au service audio est momentanément interrompue.",
      },
      { status: 503 },
    );
  }
}
export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as HEAD,
};
