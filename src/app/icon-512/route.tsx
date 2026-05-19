import { ImageResponse } from "next/og";
import { pwaIconElement } from "@/lib/pwa-icon";

export const contentType = "image/png";

export async function GET() {
  return new ImageResponse(pwaIconElement({ size: 512 }), {
    width: 512,
    height: 512,
  });
}
