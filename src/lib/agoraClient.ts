import AgoraRTC, { IAgoraRTCClient } from "agora-rtc-sdk-ng";

let rtcClient: IAgoraRTCClient | null = null;

/**
 * Singleton pattern for Agora RTC Client
 * Reuses the same client instance across the app
 */
export function getAgoraClient(): IAgoraRTCClient {
  if (!rtcClient) {
    rtcClient = AgoraRTC.createClient({
      mode: "rtc",
      codec: "vp8",
    });
    console.log("[Agora] Created new RTC client");
  }
  return rtcClient;
}

/**
 * Reset the client (useful for testing or cleanup)
 */
export function resetAgoraClient(): void {
  if (rtcClient) {
    rtcClient = null;
    console.log("[Agora] Reset RTC client");
  }
}
