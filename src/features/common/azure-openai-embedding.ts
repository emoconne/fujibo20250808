"use server";

import OpenAI from "openai";

export async function generateEmbeddings(text: any): Promise<number[]> {
  console.log('=== GENERATE EMBEDDINGS START ===');
  console.log('Debug: Input text type:', typeof text);
  console.log('Debug: Input text is array:', Array.isArray(text));
  console.log('Debug: Input text is object:', text && typeof text === 'object');
  console.log('Debug: Input text length:', text?.length);
  console.log('Debug: Input text preview:', text?.substring ? text.substring(0, 100) : text);
  console.log('Debug: Input text is empty:', !text || (typeof text === 'string' && text.trim().length === 0));
  
  try {
    // 型チェック: 文字列でない場合は文字列に変換
    let textStr = text;
    if (typeof text !== 'string') {
      console.log('Converting non-string text to string');
      if (Array.isArray(text)) {
        textStr = text.join(' ');
        console.log('Converted array to string:', textStr);
      } else if (text && typeof text === 'object') {
        textStr = JSON.stringify(text);
        console.log('Converted object to string:', textStr);
      } else {
        textStr = String(text || '');
        console.log('Converted other type to string:', textStr);
      }
    }

    // テキストが空または無効な場合はエラーを投げる
    if (!textStr || textStr.trim().length === 0) {
      throw new Error("Empty or invalid text provided for embedding generation");
    }

    // 制御文字や無効な文字をチェック
    const hasInvalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(textStr);
    if (hasInvalidChars) {
      throw new Error("Text contains invalid control characters");
    }

    const cleanText = textStr.trim();
    console.log('Clean text for embedding:', cleanText);

    const client = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_KEY,
      baseURL: process.env.AZURE_OPENAI_ENDPOINT,
      defaultQuery: { 'api-version': '2024-02-15-preview' },
      defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_KEY }
    });

    console.log('Debug: OpenAI client created');
    console.log('Debug: Model name:', process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "text-embedding-ada-002");

    const result = await client.embeddings.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "text-embedding-ada-002",
      input: cleanText,
    });

    console.log('Debug: Embeddings generated successfully, length:', result.data[0].embedding.length);
    return result.data[0].embedding;
  } catch (error) {
    console.error("=== EMBEDDING GENERATION ERROR ===");
    console.error("Error generating embeddings:", {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      textType: typeof text,
      textIsArray: Array.isArray(text),
      textLength: text?.length,
      textPreview: text?.substring ? text.substring(0, 100) : text
    });
    throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
