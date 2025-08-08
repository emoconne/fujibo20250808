"use server";

import { extractText, isSupportedFileType, isFileSizeValid } from "./azure-document-intelligence-service";
import { chunkDocumentIntelligenceText } from "../chat/chat-services/text-chunk";

// Document Intelligenceの処理をテストする関数
export async function testDocumentIntelligence(fileBuffer: ArrayBuffer, fileName: string) {
  try {
    console.log('=== Document Intelligence Test Start ===');
    
    // 1. ファイル形式のチェック
    const isSupported = await isSupportedFileType(fileName);
    console.log('File type check:', { fileName, isSupported });
    
    if (!isSupported) {
      return {
        success: false,
        message: 'サポートされていないファイル形式です',
        error: 'Unsupported file type'
      };
    }
    
    // 2. ファイルサイズのチェック
    const isValidSize = await isFileSizeValid(fileBuffer.byteLength);
    console.log('File size check:', { 
      fileName, 
      size: fileBuffer.byteLength, 
      isValid: isValidSize 
    });
    
    if (!isValidSize) {
      return {
        success: false,
        message: 'ファイルサイズが大きすぎます',
        error: 'File size too large'
      };
    }
    
    // 3. テキスト抽出のテスト
    console.log('Starting text extraction test...');
    const extractedText = await extractText(fileBuffer, fileName);
    
    console.log('Text extraction completed:', {
      pages: extractedText.pages,
      confidence: extractedText.confidence,
      wordCount: extractedText.wordCount,
      processingTime: extractedText.processingTime,
      contentLength: extractedText.content.length
    });
    
    // 4. チャンク分割のテスト
    console.log('Starting chunking test...');
    const chunks = chunkDocumentIntelligenceText(extractedText.content);
    
    console.log('Chunking completed:', {
      totalChunks: chunks.length,
      averageChunkSize: chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length,
      totalWords: chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0)
    });
    
    // 5. 結果のサマリー
    const summary = {
      success: true,
      fileName,
      fileSize: fileBuffer.byteLength,
      extraction: {
        pages: extractedText.pages,
        confidence: extractedText.confidence,
        wordCount: extractedText.wordCount,
        processingTime: extractedText.processingTime,
        contentLength: extractedText.content.length
      },
      chunking: {
        totalChunks: chunks.length,
        averageChunkSize: Math.round(chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length),
        totalWords: chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0)
      },
      sampleContent: extractedText.content.substring(0, 500) + (extractedText.content.length > 500 ? '...' : ''),
      message: 'Document Intelligenceの処理が正常に完了しました'
    };
    
    console.log('=== Document Intelligence Test Completed ===');
    console.log('Summary:', summary);
    
    return summary;
    
  } catch (error) {
    console.error('Document Intelligence test error:', error);
    return {
      success: false,
      message: 'Document Intelligenceのテストに失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// 処理時間を測定するヘルパー関数
export async function measureProcessingTime<T>(fn: () => Promise<T>): Promise<{ result: T; processingTime: number }> {
  const startTime = Date.now();
  try {
    const result = await fn();
    const processingTime = Date.now() - startTime;
    return { result, processingTime };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    throw { error, processingTime };
  }
}
