
import { GoogleGenAI, Modality, GroundingChunk, Type } from "@google/genai";

// Inicializa o cliente usando a chave do ambiente
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

function fileToGenerativePart(base64: string, mimeType: string) {
  return {
    inlineData: {
      data: base64.split(',')[1],
      mimeType
    },
  };
}

/**
 * Identifica um marco a partir de uma imagem enviada pelo usuário.
 * Pode usar a localização GPS para aumentar a precisão.
 */
export const analyzeImage = async (
  base64Image: string, 
  language: string,
  location?: { latitude: number; longitude: number }
): Promise<{ landmarkName: string; confidenceScore: number }> => {
  const ai = getAI();
  const imagePart = fileToGenerativePart(base64Image, 'image/jpeg');

  let promptText = `Analyze the image and identify the tourist landmark. Output Language: ${language}.`;
  
  if (location) {
    promptText += ` The user is at GPS coordinates: Lat ${location.latitude}, Long ${location.longitude}. Use this location to pinpoint the exact landmark, distinguishing from replicas or similar buildings.`;
  }

  promptText += `\nReturn a JSON with: 
1. "landmarkName": Name and city of the place (in ${language}).
2. "confidenceScore": Confidence from 0.0 to 1.0.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [{ text: promptText }, imagePart],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          landmarkName: { type: Type.STRING },
          confidenceScore: { type: Type.NUMBER },
        },
        required: ['landmarkName', 'confidenceScore'],
      },
    },
  });

  return JSON.parse(response.text || '{"landmarkName": "Unknown", "confidenceScore": 0}');
};

/**
 * Busca uma lista de locais históricos e turísticos próximos às coordenadas GPS.
 * Usa Google Maps e Google Search combinados para máxima precisão.
 */
export const fetchNearbyHistoricalPlaces = async (
  location: { latitude: number; longitude: number },
  language: string,
  excludeNames: string[] = []
): Promise<{ name: string; type: string; distance: string }[]> => {
  const ai = getAI();
  
  let prompt = `I am at these coordinates: Lat ${location.latitude}, Lon ${location.longitude}. 
Perform a full scan using Google Maps and Google Search within a 1000 meter (1km) radius.
Find monuments, statues, old architecture, squares, museums, or historical buildings.

List 5 places.
Output Language: ${language} (Ensure the Name and Type are in ${language}).

Required format per line:
NAME | TYPE | DISTANCE (e.g. 350m)

Example:
Palace of Culture | Cultural Center | 420m`;

  if (excludeNames.length > 0) {
    prompt += `\n\nIMPORTANT: Do NOT include these places in the list (I already have them): ${excludeNames.join(', ')}. Find DIFFERENT places.`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleMaps: {} }, { googleSearch: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        }
      }
    },
  });

  const text = response.text || "";
  console.debug("Radar Raw Output:", text);

  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 5 && (l.includes('|') || l.includes(':') || l.includes(' - ')));

  const places = lines.map(line => {
    let parts: string[] = [];
    if (line.includes('|')) parts = line.split('|');
    else if (line.includes(' - ')) parts = line.split(' - ');
    else if (line.includes(':')) parts = line.split(':');

    // Limpa apenas o nome de possíveis numerações de lista (1., 2., etc)
    const rawName = parts[0] || "";
    const name = rawName.replace(/^[\d\s\.\-\*]+/, '').trim();
    const type = (parts[1] || "Point of Interest").trim();
    const distance = (parts[2] || "").trim();
    
    return { 
      name: name || "Interesting Place", 
      type: type, 
      distance: distance 
    };
  }).filter(p => p.name.length > 2);

  return places;
};

/**
 * Busca história resumida e links para FOTOS REAIS via Grounding.
 */
export const fetchLandmarkDetails = async (
  landmarkName: string, 
  language: string,
  location?: { latitude: number; longitude: number }
): Promise<{ text: string, citations: GroundingChunk[] }> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Create a CONCISE and interesting SUMMARY (max 200 words) about the history, curiosities, and cultural importance of "${landmarkName}" in ${language}. 
    Be direct and immersive like a local guide. Avoid very long texts. Provide links from Google Maps and other reliable sources so I can see real photos and exact location.`,
    config: {
      tools: [{ googleMaps: {} }, { googleSearch: {} }],
      toolConfig: location ? {
        retrievalConfig: {
          latLng: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        }
      } : undefined
    },
  });

  return {
    text: response.text || "Historical information unavailable at the moment.",
    citations: response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []
  };
};

/**
 * Gera narração em áudio para o tour.
 */
export const generateNarration = async (text: string, language: string): Promise<string> => {
    const ai = getAI();
    try {
      const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: `Narrate this text as a professional, captivating, and enthusiastic tour guide in ${language}: ${text}` }] }],
          config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                  voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Zephyr' },
                  },
              },
          },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
    } catch (e) {
      console.warn("Failed to generate audio", e);
      return '';
    }
};
