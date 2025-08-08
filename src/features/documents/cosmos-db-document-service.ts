"use server";

import { Container, CosmosClient } from "@azure/cosmos";
import { SqlQuerySpec } from "@azure/cosmos";

// ドキュメント管理用のCosmosDB設定
const DOCS_DB_NAME = "documents";
const DOCS_CONTAINER_NAME = "documents";

export interface DocumentMetadata {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  blobUrl: string;
  blobName: string;
  searchIndexId?: string;
  pages: number;
  confidence: number;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  categories?: string[];
  tags?: string[];
  description?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ドキュメント管理用のコンテナインスタンスを取得するヘルパー関数
async function getContainer() {
  const endpoint = process.env.AZURE_COSMOSDB_URI;
  const key = process.env.AZURE_COSMOSDB_KEY;

  if (!endpoint || !key) {
    throw new Error('Azure CosmosDB configuration is missing');
  }

  const client = new CosmosClient({ endpoint, key });

  const databaseResponse = await client.databases.createIfNotExists({
    id: DOCS_DB_NAME,
  });

  const containerResponse = await databaseResponse.database.containers.createIfNotExists({
    id: DOCS_CONTAINER_NAME,
    partitionKey: {
      paths: ["/uploadedBy"],
    },
  });

  return containerResponse.container;
}

// ドキュメントメタデータを保存
export async function saveDocument(document: Omit<DocumentMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const container = await getContainer();
  
  const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  
  const documentToSave = {
    ...document,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await container.items.create(documentToSave);
  return id;
}

// ドキュメントメタデータを更新
export async function updateDocument(id: string, updates: Partial<DocumentMetadata>): Promise<void> {
  const container = await getContainer();
  
  const { resource: existingDoc } = await container.item(id).read();
  if (!existingDoc) {
    throw new Error(`Document with id ${id} not found`);
  }

  const updatedDoc = {
    ...existingDoc,
    ...updates,
    updatedAt: new Date(),
  };

  await container.item(id).replace(updatedDoc);
}

// ドキュメントメタデータを削除（論理削除）
export async function deleteDocument(id: string): Promise<void> {
  const container = await getContainer();
  
  const { resource: existingDoc } = await container.item(id).read();
  if (!existingDoc) {
    throw new Error(`Document with id ${id} not found`);
  }

  existingDoc.isDeleted = true;
  existingDoc.updatedAt = new Date();

  await container.item(id).replace(existingDoc);
}

// 全ドキュメントを取得（削除されていないもの）
export async function getAllDocuments(): Promise<DocumentMetadata[]> {
  const container = await getContainer();
  
  const querySpec: SqlQuerySpec = {
    query: "SELECT * FROM c WHERE c.isDeleted = @isDeleted ORDER BY c.uploadedAt DESC",
    parameters: [
      {
        name: "@isDeleted",
        value: false,
      },
    ],
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources;
}

// ユーザーのドキュメントを取得
export async function getUserDocuments(userId: string): Promise<DocumentMetadata[]> {
  const container = await getContainer();
  
  const querySpec: SqlQuerySpec = {
    query: "SELECT * FROM c WHERE c.uploadedBy = @userId AND c.isDeleted = @isDeleted ORDER BY c.uploadedAt DESC",
    parameters: [
      {
        name: "@userId",
        value: userId,
      },
      {
        name: "@isDeleted",
        value: false,
      },
    ],
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources;
}

// 特定のドキュメントを取得
export async function getDocument(id: string): Promise<DocumentMetadata | null> {
  const container = await getContainer();
  
  try {
    const { resource } = await container.item(id).read();
    return resource && !resource.isDeleted ? resource : null;
  } catch (error) {
    return null;
  }
}

// ファイル名でドキュメントを検索
export async function searchDocumentsByFileName(fileName: string): Promise<DocumentMetadata[]> {
  const container = await getContainer();
  
  const querySpec: SqlQuerySpec = {
    query: "SELECT * FROM c WHERE CONTAINS(c.fileName, @fileName, true) AND c.isDeleted = @isDeleted ORDER BY c.uploadedAt DESC",
    parameters: [
      {
        name: "@fileName",
        value: fileName,
      },
      {
        name: "@isDeleted",
        value: false,
      },
    ],
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources;
}

// ファイルタイプでドキュメントを取得
export async function getDocumentsByType(fileType: string): Promise<DocumentMetadata[]> {
  const container = await getContainer();
  
  const querySpec: SqlQuerySpec = {
    query: "SELECT * FROM c WHERE c.fileType = @fileType AND c.isDeleted = @isDeleted ORDER BY c.uploadedAt DESC",
    parameters: [
      {
        name: "@fileType",
        value: fileType,
      },
      {
        name: "@isDeleted",
        value: false,
      },
    ],
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources;
}

// ステータスでドキュメントを取得
export async function getDocumentsByStatus(status: DocumentMetadata['status']): Promise<DocumentMetadata[]> {
  const container = await getContainer();
  
  const querySpec: SqlQuerySpec = {
    query: "SELECT * FROM c WHERE c.status = @status AND c.isDeleted = @isDeleted ORDER BY c.uploadedAt DESC",
    parameters: [
      {
        name: "@status",
        value: status,
      },
      {
        name: "@isDeleted",
        value: false,
      },
    ],
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources;
}

// ドキュメント統計を取得
export async function getDocumentStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalSize: number;
}> {
  const container = await getContainer();
  
  const querySpec: SqlQuerySpec = {
    query: "SELECT * FROM c WHERE c.isDeleted = @isDeleted",
    parameters: [
      {
        name: "@isDeleted",
        value: false,
      },
    ],
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  
  const stats = {
    total: resources.length,
    byStatus: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    totalSize: 0,
  };

  resources.forEach((doc: DocumentMetadata) => {
    // ステータス別カウント
    stats.byStatus[doc.status] = (stats.byStatus[doc.status] || 0) + 1;
    
    // タイプ別カウント
    stats.byType[doc.fileType] = (stats.byType[doc.fileType] || 0) + 1;
    
    // 合計サイズ
    stats.totalSize += doc.fileSize;
  });

  return stats;
}

// ドキュメントタグを更新
export async function updateDocumentTags(id: string, tags: string[]): Promise<void> {
  await updateDocument(id, { tags });
}

// ドキュメントカテゴリを更新
export async function updateDocumentCategories(id: string, categories: string[]): Promise<void> {
  await updateDocument(id, { categories });
}

// ドキュメント説明を更新
export async function updateDocumentDescription(id: string, description: string): Promise<void> {
  await updateDocument(id, { description });
} 