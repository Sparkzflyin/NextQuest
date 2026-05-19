import { ImageResponse } from "next/og";
import { pwaIconElement } from "@/lib/pwa-icon";

export const contentType = "image/png";

export async function GET() {
  return new ImageResponse(pwaIconElement({ size: 192 }), {
    width: 192,
    height: 192,
  });
}
