import dotenv from "dotenv";
dotenv.config();

interface AIResponse {
  message: string;
  data: any[];
}
export async function TranlateText(
  text: string,
  language: string,
  languageCode: string,
): Promise<AIResponse> {
  try {
    const res = await fetch(
      `${process.env.SHEKI_AI_URL}/ai_v1/translate-language`,
      {
        method: "POST",
        body: JSON.stringify({
          languageCode,
          lang: language,
          text,
        }),
      },
    );

    const data = await res.json();

    return {
      message: "Successfully translated",
      data,
    };
  } catch (error) {
    console.error(error);
  }
}
