import { ImageResponse } from "next/og";

export const alt = "Send By Me — vos colis voyagent dans la valise de quelqu'un";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  const rows: Array<[string, string, string, string]> = [
    ["0900", "CDG", "DLA", "9 €"],
    ["1300", "MRS", "DSS", "8 €"],
    ["1500", "CDG", "ABJ", "8,50 €"],
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0F1E3D", color: "white", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#FFC21A", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 30, height: 30, background: "#0F1E3D", borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 40, fontWeight: 800 }}>Send By Me</div>
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, maxWidth: 900 }}>Vos colis voyagent dans la valise de quelqu&apos;un.</div>
        <div style={{ display: "flex", gap: 28 }}>
          {rows.map(([t, a, b, p]) => (
            <div key={t} style={{ display: "flex", gap: 14, background: "#0B1630", padding: "14px 20px", borderRadius: 12, fontSize: 30, color: "#FFC21A", fontWeight: 700 }}>
              <span>{t}</span>
              <span>
                {a} › {b}
              </span>
              <span style={{ color: "white" }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
