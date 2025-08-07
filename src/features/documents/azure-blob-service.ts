"use server";

import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

export interface BlobFile {
  name: string;
  url: string;
  size: number;
  lastModified: Date;
  contentType: string;
}

// サービスインスタンスを作成
function createBlobService() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'documents';

  if (!connectionString) {
    throw new Error('Azure Storage connection string is not configured');
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  
  return { blobServiceClient, containerClient };
}

// ファイルをアップロード
export async function uploadFile(file: File, userId: string): Promise<{ url: string; blobName: string }> {
  const { containerClient } = createBlobService();
  const timestamp = Date.now();
  const blobName = `${userId}/${timestamp}_${file.name}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const arrayBuffer = await file.arrayBuffer();
  await blockBlobClient.upload(arrayBuffer, arrayBuffer.byteLength, {
    blobHTTPHeaders: {
      blobContentType: file.type,
    },
    metadata: {
      originalName: file.name,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      fileSize: file.size.toString(),
    },
  });

  return {
    url: blockBlobClient.url,
    blobName: blobName,
  };
}

// ファイルをダウンロード
export async function downloadFile(blobName: string): Promise<{ data: ArrayBuffer; contentType: string; originalName: string }> {
  const { containerClient } = createBlobService();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const downloadResponse = await blockBlobClient.download();
  
  if (!downloadResponse.readableStreamBody) {
    throw new Error('File not found');
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of downloadResponse.readableStreamBody) {
    chunks.push(chunk);
  }

  const data = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.length;
  }

  const properties = await blockBlobClient.getProperties();
  const originalName = properties.metadata?.originalName || blobName.split('/').pop() || 'unknown';

  return {
    data: data.buffer,
    contentType: properties.contentType || 'application/octet-stream',
    originalName,
  };
}

// ファイルを削除
export async function deleteFile(blobName: string): Promise<void> {
  const { containerClient } = createBlobService();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.delete();
}

// ユーザーのファイル一覧を取得
export async function listUserFiles(userId: string): Promise<BlobFile[]> {
  const { containerClient } = createBlobService();
  const files: BlobFile[] = [];
  
  for await (const blob of containerClient.listBlobsFlat({ prefix: `${userId}/` })) {
    if (blob.metadata) {
      files.push({
        name: blob.metadata.originalName || blob.name,
        url: `${containerClient.url}/${blob.name}`,
        size: blob.properties.contentLength || 0,
        lastModified: blob.properties.lastModified || new Date(),
        contentType: blob.properties.contentType || 'application/octet-stream',
      });
    }
  }

  return files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}

// 全ファイル一覧を取得（管理者用）
export async function listAllFiles(): Promise<BlobFile[]> {
  const { containerClient } = createBlobService();
  const files: BlobFile[] = [];
  
  for await (const blob of containerClient.listBlobsFlat()) {
    if (blob.metadata) {
      files.push({
        name: blob.metadata.originalName || blob.name,
        url: `${containerClient.url}/${blob.name}`,
        size: blob.properties.contentLength || 0,
        lastModified: blob.properties.lastModified || new Date(),
        contentType: blob.properties.contentType || 'application/octet-stream',
      });
    }
  }

  return files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}

// ファイルの存在確認
export async function fileExists(blobName: string): Promise<boolean> {
  const { containerClient } = createBlobService();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  return await blockBlobClient.exists();
} 