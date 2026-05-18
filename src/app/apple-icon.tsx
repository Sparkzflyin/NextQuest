import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#06070d",
          color: "#f5d0fe",
          fontWeight: 900,
          letterSpacing: "-6px",
          border: "8px solid #c084fc",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 100,
            lineHeight: 1,
            textShadow: "0 0 18px #c084fc",
          }}
        >
          NQ
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            letterSpacing: 3,
            color: "#22d3ee",
            marginTop: 12,
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderTop: "6px solid transparent",
              borderBottom: "6px solid transparent",
              borderLeft: "10px solid #22d3ee",
              display: "flex",
            }}
          />
          <div style={{ display: "flex" }}>QUEST</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
