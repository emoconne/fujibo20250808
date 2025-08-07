"use server";

import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import { OpenAIEmbeddingInstance } from "@/features/common/openai";

export interface SearchDocument {
  id: string;
  fileName: string;
  content: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  blobUrl: string;
  pages: number;
  confidence: number;
  categories?: string[];
  tags?: string[];
}

export interface SearchResult {
  id: string;
  fileName: string;
  content: string;
  score: number;
  highlights?: string[];
  metadata: {
    fileType: string;
    uploadedBy: string;
    uploadedAt: string;
    pages: number;
    confidence: number;
  };
}

// サービスインスタンスを作成
function createSearchService() {
  const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const key = process.env.AZURE_SEARCH_API_KEY;
  const indexName = process.env.AZURE_SEARCH_INDEX_NAME || 'documents';

  if (!endpoint || !key) {
    throw new Error('Azure Cognitive Search configuration is missing');
  }

  const searchClient = new SearchClient(
    `${endpoint}/indexes/${indexName}`,
    new AzureKeyCredential(key)
  );

  const embeddingClient = OpenAIEmbeddingInstance();
  
  return { searchClient, embeddingClient };
}

// テキストの埋め込みベクトルを生成
async function generateEmbedding(text: string): Promise<number[]> {
  const { embeddingClient } = createSearchService();
  try {
    const response = await embeddingClient.embeddings.create({
      input: text,
      model: process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw new Error(`埋め込みベクトルの生成に失敗しました: ${error}`);
  }
}

// ドキュメントをインデックスに追加
export async function indexDocument(document: SearchDocument): Promise<void> {
  const { searchClient } = createSearchService();
  try {
    // テキストの埋め込みベクトルを生成
    const embedding = await generateEmbedding(document.content);
    
    const searchDocument = {
      id: document.id,
      fileName: document.fileName,
      content: document.content,
      contentVector: embedding,
      fileType: document.fileType,
      fileSize: document.fileSize,
      uploadedBy: document.uploadedBy,
      uploadedAt: document.uploadedAt,
      blobUrl: document.blobUrl,
      pages: document.pages,
      confidence: document.confidence,
      categories: document.categories || [],
      tags: document.tags || [],
    };

    await searchClient.uploadDocuments([searchDocument]);
    console.log(`Document indexed successfully: ${document.fileName}`);
  } catch (error) {
    console.error('Indexing error:', error);
    throw new Error(`ドキュメントのインデックス作成に失敗しました: ${error}`);
  }
}

// ドキュメントをインデックスから削除
export async function deleteDocument(documentId: string): Promise<void> {
  const { searchClient } = createSearchService();
  try {
    await searchClient.deleteDocuments([{ id: documentId }]);
    console.log(`Document deleted from index: ${documentId}`);
  } catch (error) {
    console.error('Delete error:', error);
    throw new Error(`ドキュメントの削除に失敗しました: ${error}`);
  }
}

// ドキュメントを検索
export async function searchDocuments(query: string, filters?: string, top: number = 10): Promise<SearchResult[]> {
  const { searchClient } = createSearchService();
  try {
    // クエリの埋め込みベクトルを生成
    const queryEmbedding = await generateEmbedding(query);

    const searchResults = await searchClient.search(query, {
      vector: {
        value: queryEmbedding,
        fields: ['contentVector'],
        k: top,
      },
      select: ['id', 'fileName', 'content', 'fileType', 'uploadedBy', 'uploadedAt', 'pages', 'confidence'],
      highlight: ['content'],
      filter: filters,
      top: top,
      orderBy: ['@search.score desc'],
    });

    const results: SearchResult[] = [];
    for await (const result of searchResults.results) {
      results.push({
        id: result.document.id,
        fileName: result.document.fileName,
        content: result.document.content,
        score: result.score || 0,
        highlights: result.highlights?.content,
        metadata: {
          fileType: result.document.fileType,
          uploadedBy: result.document.uploadedBy,
          uploadedAt: result.document.uploadedAt,
          pages: result.document.pages,
          confidence: result.document.confidence,
        },
      });
    }

    return results;
  } catch (error) {
    console.error('Search error:', error);
    throw new Error(`検索に失敗しました: ${error}`);
  }
}

// 全ドキュメントを取得
export async function getAllDocuments(): Promise<SearchDocument[]> {
  const { searchClient } = createSearchService();
  try {
    const searchResults = await searchClient.search('*', {
      select: ['id', 'fileName', 'content', 'fileType', 'fileSize', 'uploadedBy', 'uploadedAt', 'blobUrl', 'pages', 'confidence'],
      top: 1000, // 最大1000件
    });

    const documents: SearchDocument[] = [];
    for await (const result of searchResults.results) {
      documents.push({
        id: result.document.id,
        fileName: result.document.fileName,
        content: result.document.content,
        fileType: result.document.fileType,
        fileSize: result.document.fileSize,
        uploadedBy: result.document.uploadedBy,
        uploadedAt: result.document.uploadedAt,
        blobUrl: result.document.blobUrl,
        pages: result.document.pages,
        confidence: result.document.confidence,
      });
    }

    return documents;
  } catch (error) {
    console.error('Get all documents error:', error);
    throw new Error(`ドキュメント一覧の取得に失敗しました: ${error}`);
  }
}

// 特定のドキュメントを取得
export async function getDocument(documentId: string): Promise<SearchDocument | null> {
  const { searchClient } = createSearchService();
  try {
    const result = await searchClient.getDocument(documentId);
    return {
      id: result.id,
      fileName: result.fileName,
      content: result.content,
      fileType: result.fileType,
      fileSize: result.fileSize,
      uploadedBy: result.uploadedBy,
      uploadedAt: result.uploadedAt,
      blobUrl: result.blobUrl,
      pages: result.pages,
      confidence: result.confidence,
    };
  } catch (error) {
    console.error('Get document error:', error);
    return null;
  }
}

// インデックスの統計情報を取得
export async function getIndexStats(): Promise<{ documentCount: number; storageSize: number }> {
  const { searchClient } = createSearchService();
  try {
    const stats = await searchClient.getDocumentCount();
    return {
      documentCount: stats,
      storageSize: 0, // Azure Cognitive Searchでは直接取得できないため0を返す
    };
  } catch (error) {
    console.error('Get index stats error:', error);
    throw new Error(`インデックス統計の取得に失敗しました: ${error}`);
  }
} 