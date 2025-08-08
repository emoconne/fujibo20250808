"use server";

import { AzureKeyCredential } from "@azure/core-auth";
import { DocumentAnalysisClient } from "@azure/ai-form-recognizer";

export interface ExtractedText {
  content: string;
  pages: number;
  confidence: number;
  extractedAt: Date;
  wordCount: number;
  processingTime: number;
}

// クライアントインスタンスを作成するヘルパー関数
export async function createDocumentIntelligenceClient() {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  console.log('Document Intelligence: Creating client with endpoint:', endpoint);
  console.log('Document Intelligence: Key provided:', key ? 'Yes' : 'No');

  if (!endpoint || !key) {
    throw new Error('Azure Document Intelligence configuration is missing');
  }

  try {
    const credential = new AzureKeyCredential(key);
    const client = new DocumentAnalysisClient(endpoint, credential);
    
    console.log('Document Intelligence: Client created successfully');
    console.log('Document Intelligence: Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
    
    return client;
  } catch (error) {
    console.error('Error creating Document Intelligence client:', error);
    throw error;
  }
}

// 抽出されたテキストを整形（改善版）
function formatExtractedText(result: any): { content: string; wordCount: number } {
  console.log('Debug: Starting formatExtractedText');
  console.log('Debug: Result structure:', {
    hasContent: !!result.content,
    hasParagraphs: !!result.paragraphs,
    paragraphsCount: result.paragraphs?.length,
    hasTables: !!result.tables,
    tablesCount: result.tables?.length
  });
  
  let formattedText = '';
  let wordCount = 0;

  // 段落からテキストを抽出（改善）
  if (result.paragraphs && result.paragraphs.length > 0) {
    for (const paragraph of result.paragraphs) {
      if (paragraph.content && paragraph.content.trim()) {
        formattedText += paragraph.content.trim() + '\n\n';
        wordCount += paragraph.content.split(/\s+/).length;
      }
    }
  }

  // テーブルからテキストを抽出（改善）
  if (result.tables && result.tables.length > 0) {
    for (const table of result.tables) {
      if (table.cells && table.cells.length > 0) {
        formattedText += '\n--- テーブル ---\n';
        
        // テーブルの行と列を整理
        const maxRow = Math.max(...table.cells.map((cell: any) => cell.rowIndex || 0));
        const maxCol = Math.max(...table.cells.map((cell: any) => cell.columnIndex || 0));
        
        for (let row = 0; row <= maxRow; row++) {
          const rowCells = table.cells.filter((cell: any) => cell.rowIndex === row);
          const rowText = rowCells
            .sort((a: any, b: any) => (a.columnIndex || 0) - (b.columnIndex || 0))
            .map((cell: any) => cell.content || '')
            .join('\t');
          
          if (rowText.trim()) {
            formattedText += rowText + '\n';
            wordCount += rowText.split(/\s+/).length;
          }
        }
        formattedText += '\n';
      }
    }
  }

  // キーと値のペアを抽出（改善）
  if (result.keyValuePairs && result.keyValuePairs.length > 0) {
    formattedText += '\n--- キー・値ペア ---\n';
    for (const pair of result.keyValuePairs) {
      if (pair.key?.content && pair.value?.content) {
        const pairText = `${pair.key.content}: ${pair.value.content}`;
        formattedText += pairText + '\n';
        wordCount += pairText.split(/\s+/).length;
      }
    }
  }

  // リスト項目を抽出（新機能）
  if (result.lists && result.lists.length > 0) {
    formattedText += '\n--- リスト ---\n';
    for (const list of result.lists) {
      if (list.items && list.items.length > 0) {
        for (const item of list.items) {
          if (item.content) {
            formattedText += `• ${item.content}\n`;
            wordCount += item.content.split(/\s+/).length;
          }
        }
      }
    }
  }

  return {
    content: formattedText.trim(),
    wordCount
  };
}

// 平均信頼度を計算（改善版）
function calculateAverageConfidence(result: any): number {
  let totalConfidence = 0;
  let confidenceCount = 0;

  // 段落の信頼度を集計
  if (result.paragraphs) {
    for (const paragraph of result.paragraphs) {
      if (paragraph.confidence !== undefined && paragraph.confidence > 0) {
        totalConfidence += paragraph.confidence;
        confidenceCount++;
      }
    }
  }

  // テーブルの信頼度を集計
  if (result.tables) {
    for (const table of result.tables) {
      if (table.confidence !== undefined && table.confidence > 0) {
        totalConfidence += table.confidence;
        confidenceCount++;
      }
    }
  }

  // キー・値ペアの信頼度を集計
  if (result.keyValuePairs) {
    for (const pair of result.keyValuePairs) {
      if (pair.key?.confidence !== undefined && pair.key.confidence > 0) {
        totalConfidence += pair.key.confidence;
        confidenceCount++;
      }
      if (pair.value?.confidence !== undefined && pair.value.confidence > 0) {
        totalConfidence += pair.value.confidence;
        confidenceCount++;
      }
    }
  }

  return confidenceCount > 0 ? Math.round((totalConfidence / confidenceCount) * 100) / 100 : 0;
}

// ドキュメントからテキストを抽出（改善版）
export async function extractText(fileBuffer: ArrayBuffer, fileName: string): Promise<ExtractedText> {
  const startTime = Date.now();
  
  try {
    console.log(`Document Intelligence: Starting text extraction for ${fileName}`);
    console.log(`Document Intelligence: File size: ${fileBuffer.byteLength} bytes`);

    const client = await createDocumentIntelligenceClient();
    
    // クライアントのメソッドを確認
    console.log('Document Intelligence: Client methods:', {
      hasBeginAnalyzeDocument: typeof client.beginAnalyzeDocument === 'function',
      availableMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(client)).filter(name => 
        name.includes('analyze') || name.includes('begin')
      )
    });
    
    // 分析オプションを設定
    const poller = await client.beginAnalyzeDocument("prebuilt-document", fileBuffer);
    
    console.log(`Document Intelligence: Analysis started for ${fileName}`);
    
    const result = await poller.pollUntilDone();
    const processingTime = Date.now() - startTime;

    console.log(`Document Intelligence: Analysis completed for ${fileName} in ${processingTime}ms`);

    console.log('Debug: Document Intelligence result received');
    console.log('Debug: Result content length:', result.content?.length);
    console.log('Debug: Result content preview:', result.content?.substring(0, 200));
    console.log('Debug: Result pages:', result.pages?.length);
    console.log('Debug: Result paragraphs:', result.paragraphs?.length);
    
    if (!result.content && !result.paragraphs) {
      console.error('Debug: No content extracted from document');
      throw new Error('テキストの抽出に失敗しました - コンテンツが見つかりません');
    }

    // 抽出されたテキストを整形
    const { content, wordCount } = formatExtractedText(result);
    console.log('Debug: Formatted content length:', content.length);
    console.log('Debug: Formatted content preview:', content.substring(0, 200));
    const pages = result.pages?.length || 1;
    const confidence = calculateAverageConfidence(result);

    console.log(`Document Intelligence: Extraction completed for ${fileName}`, {
      pages,
      confidence,
      wordCount,
      processingTime,
      contentLength: content.length
    });

    return {
      content,
      pages,
      confidence,
      extractedAt: new Date(),
      wordCount,
      processingTime
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Document Intelligence extraction error:', {
      fileName,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      processingTime
    });
    
    // より詳細なエラーメッセージを提供
    let errorMessage = 'テキスト抽出に失敗しました';
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        errorMessage = '認証エラー: Document Intelligenceの認証情報を確認してください';
      } else if (error.message.includes('413')) {
        errorMessage = 'ファイルサイズが大きすぎます';
      } else if (error.message.includes('415')) {
        errorMessage = 'サポートされていないファイル形式です';
      } else if (error.message.includes('429')) {
        errorMessage = 'レート制限に達しました。しばらく待ってから再試行してください';
      } else if (error.message.includes('500')) {
        errorMessage = 'サーバーエラーが発生しました。しばらく待ってから再試行してください';
      } else {
        errorMessage = `テキスト抽出エラー: ${error.message}`;
      }
    }
    
    throw new Error(errorMessage);
  }
}

// サポートされているファイル形式をチェック（改善版）
export async function isSupportedFileType(fileName: string): Promise<boolean> {
  const supportedExtensions = [
    '.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif',
    '.heic', '.heif', '.webp', '.gif'
  ];
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  const isSupported = supportedExtensions.includes(extension);
  
  console.log(`Document Intelligence: File type check for ${fileName}: ${isSupported}`);
  
  return isSupported;
}

// ファイルサイズの制限をチェック（Document Intelligenceの制限）
export async function isFileSizeValid(fileSize: number): Promise<boolean> {
  const maxSize = 500 * 1024 * 1024; // 500MB
  const isValid = fileSize <= maxSize;
  
  console.log(`Document Intelligence: File size check: ${fileSize} bytes (max: ${maxSize}), valid: ${isValid}`);
  
  return isValid;
} 