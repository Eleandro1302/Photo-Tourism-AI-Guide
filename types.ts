
// This type is based on the expected structure from the Gemini API's grounding metadata.
export interface GroundingChunk {
    web?: {
      uri?: string;
      title?: string;
    };
    maps?: {
      uri?: string;
      title?: string;
    };
}

export interface SavedDiscovery {
  id: string;
  landmarkName: string;
  image: string; // Base64 or URL
  history: string;
  citations: GroundingChunk[];
  date: string;
  language: string;
  latitude?: number;
  longitude?: number;
}
