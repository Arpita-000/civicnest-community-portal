/**
 * Placeholder artwork for the demo records in the shared database, which reference
 * `/demo/issue-drain.svg`, `/demo/avatar-3.svg`, ... (files that never shipped with the original app).
 * Any `/demo/<name>.svg` resolves to a deterministic illustration so no image is ever broken.
 */
const PALETTES: [string, string][] = [
  ["#0f766e", "#5eead4"],
  ["#1d4ed8", "#93c5fd"],
  ["#b45309", "#fcd34d"],
  ["#7c3aed", "#c4b5fd"],
  ["#be123c", "#fda4af"],
  ["#15803d", "#86efac"],
  ["#0e7490", "#67e8f9"],
  ["#c2410c", "#fdba74"],
];

const ICONS: Record<string, string> = {
  garbage: "M9 3h6l1 2h4v2H4V5h4l1-2zm-3 6h12l-1 12H7L6 9zm4 2v8h1v-8h-1zm3 0v8h1v-8h-1z",
  drain: "M4 6h16v2H4V6zm1 4h14v10H5V10zm2 2v6h2v-6H7zm4 0v6h2v-6h-2zm4 0v6h2v-6h-2z",
  pothole: "M3 17c3-4 7-4 9-1s6 3 9-1v4H3v-2zm5-6a3 3 0 106 0 3 3 0 00-6 0z",
  waterlogging: "M12 3c3 4 6 7 6 10a6 6 0 01-12 0c0-3 3-6 6-10zM3 20c2 1 4 1 6 0s4-1 6 0 4 1 6 0v2c-2 1-4 1-6 0s-4-1-6 0-4 1-6 0v-2z",
  streetlight: "M11 3h6v2h-4v2l3 3v2H8v-2l3-3V5zm1 11h2v8h-2v-8z",
  tree: "M12 2l6 8h-3l5 7h-6v5h-4v-5H4l5-7H6l6-8z",
  bench: "M3 9h18v3H3V9zm1 5h2v6H4v-6zm14 0h2v6h-2v-6zM7 14h10v2H7v-2z",
  canal: "M2 8c3-2 5-2 8 0s5 2 8 0l4 2v2c-3 2-5 2-8 0s-5-2-8 0L2 10V8zm0 8c3-2 5-2 8 0s5 2 8 0l4 2v2c-3 2-5 2-8 0s-5-2-8 0l-4-2v-2z",
  safety: "M12 2l8 3v6c0 5-3 9-8 11C7 20 4 16 4 11V5l8-3zm-1 6v5h2V8h-2zm0 7v2h2v-2h-2z",
  cleanup: "M12 2c4 3 7 6 7 10a7 7 0 01-14 0c0-4 3-7 7-10zm-1 7v6h2V9h-2z",
};

function hash(text: string) {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export async function GET(_req: Request, { params }: { params: { file: string } }) {
  const name = decodeURIComponent(params.file).replace(/\.svg$/i, "").replace(/[^a-zA-Z0-9_-]/g, "");
  const [dark, light] = PALETTES[hash(name) % PALETTES.length];
  const headers = { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable" };

  if (name.startsWith("avatar")) {
    const n = name.replace(/\D/g, "") || String(hash(name) % 10);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="${light}"/></linearGradient></defs><rect width="128" height="128" fill="url(#g)"/><circle cx="64" cy="50" r="22" fill="#fff" fill-opacity=".92"/><path d="M20 128c0-26 20-42 44-42s44 16 44 42z" fill="#fff" fill-opacity=".92"/><title>Avatar ${n}</title></svg>`;
    return new Response(svg, { headers });
  }

  const key = Object.keys(ICONS).find((k) => name.includes(k)) || "cleanup";
  const label = name.replace(/^(issue|cleanup|event)-?/, "").replace(/[-_]/g, " ") || "community";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="${light}"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><circle cx="650" cy="110" r="150" fill="#fff" fill-opacity=".08"/><circle cx="120" cy="520" r="190" fill="#fff" fill-opacity=".07"/><g transform="translate(400 270) scale(9) translate(-12 -12)" fill="#fff" fill-opacity=".92"><path d="${ICONS[key]}"/></g><text x="400" y="500" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="700" fill="#fff" fill-opacity=".9" style="text-transform:capitalize">${label}</text><title>${label}</title></svg>`;
  return new Response(svg, { headers });
}
