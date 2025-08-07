"use server";

import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";

export interface ExtractedText {
  content: string;
  pages: number;
  confidence: number;
  extractedAt: Date;
}

// クライアントインスタンスを作成するヘルパー関数
function createDocumentIntelligenceClient(): DocumentAnalysisClient {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  if (!endpoint || !key) {
    throw new Error('Azure Document Intelligence configuration is missing');
  }

  return new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
}

// 抽出されたテキストを整形
function formatExtractedText(result: any): string {
  let formattedText = '';

  // 段落からテキストを抽出
  if (result.paragraphs) {
    for (const paragraph of result.paragraphs) {
      if (paragraph.content) {
        formattedText += paragraph.content + '\n\n';
      }
    }
  }

  // テーブルからテキストを抽出
  if (result.tables) {
    for (const table of result.tables) {
      formattedText += '\n--- テーブル ---\n';
      for (const cell of table.cells) {
        if (cell.content) {
          formattedText += cell.content + '\t';
        }
      }
      formattedText += '\n';
    }
  }

  // キーと値のペアを抽出
  if (result.keyValuePairs) {
    formattedText += '\n--- キー・値ペア ---\n';
    for (const pair of result.keyValuePairs) {
      if (pair.key?.content && pair.value?.content) {
        formattedText += `${pair.key.content}: ${pair.value.content}\n`;
      }
    }
  }

  return formattedText.trim();
}

// 平均信頼度を計算
function calculateAverageConfidence(result: any): number {
  let totalConfidence = 0;
  let confidenceCount = 0;

  // 段落の信頼度を集計
  if (result.paragraphs) {
    for (const paragraph of result.paragraphs) {
      if (paragraph.confidence !== undefined) {
        totalConfidence += paragraph.confidence;
        confidenceCount++;
      }
    }
  }

  // テーブルの信頼度を集計
  if (result.tables) {
    for (const table of result.tables) {
      if (table.confidence !== undefined) {
        totalConfidence += table.confidence;
        confidenceCount++;
      }
    }
  }

  return confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
}

// ドキュメントからテキストを抽出
export async function extractText(fileBuffer: ArrayBuffer, fileName: string): Promise<ExtractedText> {
  try {
    const client = createDocumentIntelligenceClient();
    const poller = await client.beginAnalyzeDocument("prebuilt-document", fileBuffer);
    const result = await poller.pollUntilDone();

    if (!result.content) {
      throw new Error('テキストの抽出に失敗しました');
    }

    // 抽出されたテキストを整形
    const content = formatExtractedText(result);
    const pages = result.pages?.length || 1;
    const confidence = calculateAverageConfidence(result);

    return {
      content,
      pages,
      confidence,
      extractedAt: new Date(),
    };
  } catch (error) {
    console.error('Document Intelligence extraction error:', error);
    throw new Error(`テキスト抽出に失敗しました: ${error}`);
  }
}

// サポートされているファイル形式をチェック
export async function isSupportedFileType(fileName: string): Promise<boolean> {
  const supportedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'];
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return supportedExtensions.includes(extension);
}

// ファイルサイズの制限をチェック（Document Intelligenceの制限）
export async function isFileSizeValid(fileSize: number): Promise<boolean> {
  const maxSize = 500 * 1024 * 1024; // 500MB
  return fileSize <= maxSize;
} 