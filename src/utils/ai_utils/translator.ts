import dotenv from "dotenv";
dotenv.config();

interface AIResponse {
  message: string;
  data: any[];
}

export async function TranslateText(
  text: string,
  language: string,
  languageCode: string,
): Promise<AIResponse> {
  try {
    const res = await fetch(
      `${process.env.SHEKI_AI_URL}/ai_v1/translate-language`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // Missing this!
        },
        body: JSON.stringify({
        // The API expects a 'data' wrapper
            languageCode,
            lang: language,
            text,
          
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return {
        message: `Error: ${data.message || 'Translation failed'}`,
        data: data,
      };
    }

    return {
      message: "Successfully translated",
      data: data,
    };
  } catch (error) {
    console.error("Translation error:", error);
    // Return a proper error response instead of undefined
    return {
      message: `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: [],
    };
  }
}