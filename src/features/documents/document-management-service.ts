"use server";

import { uploadFile, downloadFile, deleteFile, listUserFiles } from "./azure-blob-service";
import { extractText, isSupportedFileType, isFileSizeValid } from "./azure-document-intelligence-service";
import { generateEmbeddings } from "../common/azure-openai-embedding";
import { indexDocument, deleteDocument as deleteSearchDocument, searchDocuments as searchDocumentsService, getAllDocuments as getAllSearchDocuments, getDocument as getSearchDocument, getIndexStats, SearchDocument } from "./azure-cognitive-search-service";
import { saveDocument, updateDocument, deleteDocument as deleteCosmosDocument, getAllDocuments, getDocument as getCosmosDocument, getDocumentStats, updateDocumentTags as updateDocumentTagsService, updateDocumentCategories as updateDocumentCategoriesService, updateDocumentDescription as updateDocumentDescriptionService, DocumentMetadata } from "./cosmos-db-document-service";
import { userHashedId } from "@/features/auth/helpers";

export interface DocumentInfo {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  pages: number;
  confidence: number;
  categories?: string[];
  tags?: string[];
  description?: string;
}

export interface UploadResult {
  success: boolean;
  documentId?: string;
  message: string;
  error?: string;
}

// サービスインスタンスを作成（CosmosDBDocumentServiceは関数に変換済み）

// バックグラウンドでドキュメントを処理
async function processDocumentInBackground(documentId: string, file: File, blobName: string) {
  console.log('=== BACKGROUND PROCESSING START ===');
  try {
    console.log('Debug: Starting background document processing', { documentId, fileName: file.name });
    
    // ステータスを処理中に更新
    console.log('Debug: Updating document status to processing');
    await updateDocument(documentId, { status: 'processing' });

    // 1. Document Intelligenceでテキスト抽出
    console.log('Debug: Converting file to ArrayBuffer');
    const arrayBuffer = await file.arrayBuffer();
    console.log('Debug: ArrayBuffer created', { byteLength: arrayBuffer.byteLength });
    
    console.log('Debug: Starting text extraction with Document Intelligence');
    const extractedText = await extractText(arrayBuffer, file.name);
    console.log('Debug: Text extraction completed', { 
      contentLength: extractedText.content.length,
      pages: extractedText.pages,
      confidence: extractedText.confidence,
      wordCount: extractedText.wordCount,
      processingTime: extractedText.processingTime
    });
    
    // 2. Embeddingを生成
    console.log('Debug: Generating embeddings');
    const embeddings = await generateEmbeddings(extractedText.content);
    console.log('Debug: Embeddings generated, length:', embeddings.length);

    // 2. Azure Cognitive Searchにインデックス作成
    const searchDocument: SearchDocument = {
      id: documentId,
      fileName: file.name,
      content: extractedText.content,
      contentVector: embeddings,
      fileType: file.type,
      fileSize: file.size,
      uploadedBy: await userHashedId(),
      uploadedAt: new Date().toISOString(),
      blobUrl: (await listUserFiles(await userHashedId()))
        .find(f => f.name === file.name)?.url || '',
      pages: extractedText.pages,
      confidence: extractedText.confidence,
    };

            await indexDocument(searchDocument);

    // 3. Cosmos DBのメタデータを更新
    await updateDocument(documentId, {
      status: 'completed',
      pages: extractedText.pages,
      confidence: extractedText.confidence,
      searchIndexId: documentId,
    });

    console.log(`Document processing completed: ${documentId}`);

  } catch (error) {
    console.error("=== DOCUMENT PROCESSING ERROR ===");
    console.error("Document processing error:", {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      documentId,
      fileName: file.name
    });
    
    // エラー時はステータスを更新
    console.log('Debug: Updating document status to error');
    await updateDocument(documentId, { 
      status: 'error' 
    });
  }
}

// ファイルをアップロードして処理
export async function uploadAndProcessFile(file: File): Promise<UploadResult> {
  console.log('=== UPLOAD AND PROCESS FILE START ===');
  try {
    const userId = await userHashedId();
    console.log('Debug: User ID:', userId);
    
    // 1. ファイルの検証
    if (!(await isSupportedFileType(file.name))) {
      return {
        success: false,
        message: "サポートされていないファイル形式です",
        error: "Unsupported file type"
      };
    }

    if (!(await isFileSizeValid(file.size))) {
      return {
        success: false,
        message: "ファイルサイズが500MBを超えています",
        error: "File size too large"
      };
    }

    // 2. Azure Blob Storageにアップロード
    const uploadResult = await uploadFile(file, userId);
    
    // 3. Cosmos DBにメタデータを保存（初期状態）
    const documentId = await saveDocument({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      blobUrl: uploadResult.url,
      blobName: uploadResult.blobName,
      pages: 0,
      confidence: 0,
      status: 'uploaded',
      isDeleted: false,
    });

    console.log('Debug: Starting background processing');
    // 4. バックグラウンドでテキスト抽出とインデックス作成を実行
    processDocumentInBackground(documentId, file, uploadResult.blobName);

    const result = {
      success: true,
      documentId,
      message: "ファイルが正常にアップロードされました。処理中です..."
    };
    console.log('Debug: Returning result:', result);
    return result;

  } catch (error) {
    console.error("=== UPLOAD ERROR ===");
    console.error("Upload error:", {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    });
    return {
      success: false,
      message: "アップロードに失敗しました",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// ドキュメント一覧を取得
export async function getDocuments(): Promise<DocumentInfo[]> {
  try {
    const documents = await getAllDocuments();
    return documents.map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      uploadedBy: doc.uploadedBy,
      uploadedAt: doc.uploadedAt,
      status: doc.status,
      pages: doc.pages,
      confidence: doc.confidence,
      categories: doc.categories,
      tags: doc.tags,
      description: doc.description,
    }));
  } catch (error) {
    console.error("Get documents error:", error);
    throw new Error("ドキュメント一覧の取得に失敗しました");
  }
}

// ドキュメントを削除
export async function deleteDocument(documentId: string): Promise<void> {
  try {
    const document = await getCosmosDocument(documentId);
    if (!document) {
      throw new Error("ドキュメントが見つかりません");
    }

    // 1. Azure Blob Storageから削除
    await deleteFile(document.blobName);

            // 2. Azure Cognitive Searchから削除
        if (document.searchIndexId) {
          await deleteSearchDocument(document.searchIndexId);
        }

    // 3. Cosmos DBから論理削除
    await deleteCosmosDocument(documentId);

  } catch (error) {
    console.error("Delete document error:", error);
    throw new Error("ドキュメントの削除に失敗しました");
  }
}

// ドキュメントをダウンロード
export async function downloadDocument(documentId: string): Promise<{
  data: ArrayBuffer;
  contentType: string;
  fileName: string;
}> {
  try {
    const document = await getCosmosDocument(documentId);
    if (!document) {
      throw new Error("ドキュメントが見つかりません");
    }

    const downloadResult = await downloadFile(document.blobName);
    
    return {
      data: downloadResult.data,
      contentType: downloadResult.contentType,
      fileName: downloadResult.originalName,
    };

  } catch (error) {
    console.error("Download document error:", error);
    throw new Error("ドキュメントのダウンロードに失敗しました");
  }
}

// ドキュメントを検索
export async function searchDocuments(query: string, filters?: string): Promise<any[]> {
  try {
          const results = await searchDocumentsService(query, filters);
    return results;
  } catch (error) {
    console.error("Search documents error:", error);
    throw new Error("ドキュメント検索に失敗しました");
  }
}

// 統計情報を取得
export async function getStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalSize: number;
  indexStats: { documentCount: number; storageSize: number };
}> {
  try {
    const [cosmosStats, indexStats] = await Promise.all([
      getDocumentStats(),
              getIndexStats(),
    ]);

    return {
      ...cosmosStats,
      indexStats,
    };
  } catch (error) {
    console.error("Get stats error:", error);
    throw new Error("統計情報の取得に失敗しました");
  }
}

// ドキュメントのタグを更新
export async function updateDocumentTags(documentId: string, tags: string[]): Promise<void> {
  try {
    await updateDocumentTagsService(documentId, tags);
  } catch (error) {
    console.error("Update tags error:", error);
    throw new Error("タグの更新に失敗しました");
  }
}

// ドキュメントのカテゴリを更新
export async function updateDocumentCategories(documentId: string, categories: string[]): Promise<void> {
  try {
    await updateDocumentCategoriesService(documentId, categories);
  } catch (error) {
    console.error("Update categories error:", error);
    throw new Error("カテゴリの更新に失敗しました");
  }
}

// ドキュメントの説明を更新
export async function updateDocumentDescription(documentId: string, description: string): Promise<void> {
  try {
    await updateDocumentDescriptionService(documentId, description);
  } catch (error) {
    console.error("Update description error:", error);
    throw new Error("説明の更新に失敗しました");
  }
} 