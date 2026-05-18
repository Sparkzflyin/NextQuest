import { ImageResponse } from "next/og";

export const alt =
  "NextQuest — log the games, rate the bangers, climb the genre leaderboards";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          background:
            "radial-gradient(circle at 50% 40%, #1a0d2e 0%, #06070d 70%)",
          color: "#f5d0fe",
          padding: 80,
          position: "relative",
        }}
      >
        {/* INTRO STRIP */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 32,
          }}
        >
          <div style={{ width: 80, height: 4, background: "#22d3ee" }} />
          <div
            style={{
              fontSize: 28,
              letterSpacing: 14,
              color: "#22d3ee",
            }}
          >
            NOW ENTERING
          </div>
          <div style={{ width: 80, height: 4, background: "#22d3ee" }} />
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 180,
            fontWeight: 900,
            letterSpacing: -6,
            lineHeight: 1,
            color: "#f5d0fe",
            textShadow:
              "0 0 24px #c084fc, 0 0 56px rgba(192,132,252,0.55)",
          }}
        >
          NEXTQUEST
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 36,
            color: "#ddd6fe",
            marginTop: 40,
            textAlign: "center",
          }}
        >
          Log the games. Rate the bangers. Climb the leaderboards.
        </div>

        {/* COMMUNITY STRIP */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginTop: 40,
          }}
        >
          <div style={{ width: 12, height: 12, background: "#7c3aed" }} />
          <div
            style={{
              fontSize: 22,
              letterSpacing: 6,
              color: "#a78bfa",
            }}
          >
            COMMUNITY RANKED — TOP 20 PER GENRE
          </div>
          <div style={{ width: 12, height: 12, background: "#7c3aed" }} />
        </div>

        {/* BOTTOM FRAME LINE */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: 80,
            right: 80,
            height: 2,
            background:
              "linear-gradient(to right, transparent 0%, #7c3aed 20%, #7c3aed 80%, transparent 100%)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
