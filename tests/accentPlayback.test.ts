import { describe, expect, it } from "vitest";
import { accentLanguage, matchingVoice, formatIpa } from "@/lib/accentPlayback";

describe("US/UK playback", () => {
  const voices = [{ name: "US", lang: "en-US" }, { name: "UK", lang: "en_GB" }, { name: "AU", lang: "en-AU" }] as SpeechSynthesisVoice[];
  it("selects exactly the requested accent instead of substituting US for UK", () => {
    expect(matchingVoice(voices, "us")?.name).toBe("US");
    expect(matchingVoice(voices, "uk")?.name).toBe("UK");
    expect(matchingVoice(voices.filter(v => v.name !== "UK"), "uk")).toBeUndefined();
    expect(accentLanguage("uk")).toBe("en-GB"); expect(accentLanguage("us")).toBe("en-US");
  });
  it("displays IPA with one pair of slash marks", () => {
    expect(formatIpa("/ˈpeərənt/")).toBe("/ˈpeərənt/");
    expect(formatIpa("ˈpeərənt")).toBe("/ˈpeərənt/");
  });
});
