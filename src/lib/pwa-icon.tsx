export function pwaIconElement({
  size,
  maskable = false,
}: {
  size: number;
  maskable?: boolean;
}) {
  const borderWidth = maskable ? 0 : Math.round(size * 0.047);
  const safePad = maskable ? Math.round(size * 0.1) : 0;
  const titleSize = Math.round(size * (maskable ? 0.46 : 0.55));
  const showSubtitle = size >= 384;
  const subtitleSize = Math.round(size * 0.075);
  const subtitleGap = Math.round(size * 0.066);
  const triH = Math.round(subtitleSize * 0.85);
  const triW = Math.round(subtitleSize * 0.7);

  return (
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
        letterSpacing: `-${Math.round(size * 0.033)}px`,
        border: `${borderWidth}px solid ${borderWidth ? "#c084fc" : "transparent"}`,
        padding: `${safePad}px`,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: titleSize,
          lineHeight: 1,
          textShadow: `0 0 ${Math.round(size * 0.1)}px #c084fc`,
        }}
      >
        NQ
      </div>
      {showSubtitle ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: Math.round(size * 0.016),
            fontSize: subtitleSize,
            letterSpacing: `${Math.round(size * 0.006)}px`,
            color: "#22d3ee",
            marginTop: subtitleGap,
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderTop: `${Math.round(triH / 2)}px solid transparent`,
              borderBottom: `${Math.round(triH / 2)}px solid transparent`,
              borderLeft: `${triW}px solid #22d3ee`,
              display: "flex",
            }}
          />
          <div style={{ display: "flex" }}>QUEST</div>
        </div>
      ) : null}
    </div>
  );
}
