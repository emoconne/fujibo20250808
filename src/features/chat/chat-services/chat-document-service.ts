"use server";

import { userHashedId } from "@/features/auth/helpers";
import { CosmosDBContainer } from "@/features/common/cosmos";

import { uniqueId } from "@/features/common/util";
import {
  AzureKeyCredential,
  DocumentAnalysisClient,
} from "@azure/ai-form-recognizer";
import { SqlQuerySpec } from "@azure/cosmos";
import {
  AzureCogDocumentIndex,
  ensureIndexIsCreated,
  indexDocuments,
} from "./azure-cog-search/azure-cog-vector-store";
import {
  CHAT_DOCUMENT_ATTRIBUTE,
  ChatDocumentModel,
  ServerActionResponse,
} from "./models";
import { chunkDocumentWithOverlap } from "./text-chunk";
import { isNotNullOrEmpty } from "./utils";

const MAX_DOCUMENT_SIZE = 20000000;

export const UploadDocument = async (
  formData: FormData
): Promise<ServerActionResponse<string[]>> => {
  try {
    console.log('=== UploadDocument START ===');
    await ensureSearchIsConfigured();

    const { docs } = await LoadFile(formData);
    console.log('LoadFile completed, docs count:', docs.length);
    
    const splitDocuments = chunkDocumentWithOverlap(docs.join("\n"));
    console.log('Chunking completed, chunks count:', splitDocuments.length);

    return {
      success: true,
      error: "",
      response: splitDocuments,
    };
  } catch (e) {
    console.error('UploadDocument error:', e);
    return {
      success: false,
      error: (e as Error).message,
      response: [],
    };
  }
};

const LoadFile = async (formData: FormData) => {
  try {
    console.log('=== LoadFile START ===');
    const file: File | null = formData.get("file") as unknown as File;

    if (!file) {
      throw new Error('ファイルが選択されていません');
    }

    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // ファイル形式のチェック
    const supportedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.heic', '.heif', '.webp', '.gif'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!supportedExtensions.includes(extension)) {
      throw new Error(`サポートされていないファイル形式です: ${extension}`);
    }

    console.log('File format check passed:', extension);

    if (file.size < MAX_DOCUMENT_SIZE) {
      const client = await initDocumentIntelligence();

      const blob = new Blob([file], { type: file.type });

      const poller = await client.beginAnalyzeDocument(
        "prebuilt-document",
        await blob.arrayBuffer()
      );
      const { paragraphs } = await poller.pollUntilDone();

      const docs: Array<string> = [];

      if (paragraphs) {
        for (const paragraph of paragraphs) {
          docs.push(paragraph.content);
        }
      }

      return { docs };
    }
  } catch (e) {
    const error = e as any;
    console.error('Document Intelligence error:', error);

    if (error.details) {
      if (error.details.length > 0) {
        throw new Error(error.details[0].message);
      } else if (error.details.error?.innererror?.message) {
        throw new Error(error.details.error.innererror.message);
      }
    }

    // より詳細なエラーメッセージを提供
    if (error.message) {
      if (error.message.includes('401')) {
        throw new Error('認証エラー: Document Intelligenceの認証情報を確認してください');
      } else if (error.message.includes('413')) {
        throw new Error('ファイルサイズが大きすぎます');
      } else if (error.message.includes('415')) {
        throw new Error('サポートされていないファイル形式です');
      } else if (error.message.includes('429')) {
        throw new Error('レート制限に達しました。しばらく待ってから再試行してください');
      } else if (error.message.includes('500')) {
        throw new Error('サーバーエラーが発生しました。しばらく待ってから再試行してください');
      } else {
        throw new Error(`Document Intelligence エラー: ${error.message}`);
      }
    }

    throw new Error('ファイルの処理中にエラーが発生しました');
  }

  throw new Error(`ファイルサイズが大きすぎます。最大${MAX_DOCUMENT_SIZE / 1024 / 1024}MBまでサポートされています。`);
};

export const IndexDocuments = async (
  fileName: string,
  docs: string[],
  chatThreadId: string
): Promise<ServerActionResponse<AzureCogDocumentIndex[]>> => {
  try {
    console.log('=== IndexDocuments START ===');
    console.log('Indexing documents:', { fileName, docsCount: docs.length, chatThreadId });
    
    const documentsToIndex: AzureCogDocumentIndex[] = [];

    for (const doc of docs) {
      console.log('Processing doc:', doc);
      console.log('Doc type:', typeof doc);
      console.log('Doc is array:', Array.isArray(doc));
      console.log('Doc is object:', doc && typeof doc === 'object');
      
      // docを文字列に変換
      let pageContent: string;
      if (typeof doc === 'string') {
        pageContent = doc;
      } else if (Array.isArray(doc)) {
        pageContent = doc.join(' ');
      } else if (doc && typeof doc === 'object') {
        pageContent = JSON.stringify(doc);
      } else {
        pageContent = String(doc || '');
      }
      
      console.log('Converted pageContent:', pageContent);
      
      const docToAdd: AzureCogDocumentIndex = {
        id: uniqueId(),
        chatThreadId,
        user: await userHashedId(),
        pageContent: pageContent,
        metadata: fileName,
        chatType: "data",
        deptName: "",
        embedding: [],
      };

      documentsToIndex.push(docToAdd);
    }

    console.log('Documents prepared for indexing:', documentsToIndex.length);
    await indexDocuments(documentsToIndex);
    console.log('Documents indexed successfully');

    await UpsertChatDocument(fileName, chatThreadId);
    console.log('Chat document upserted successfully');
    
    return {
      success: true,
      error: "",
      response: documentsToIndex,
    };
  } catch (e) {
    console.error('IndexDocuments error:', e);
    return {
      success: false,
      error: (e as Error).message,
      response: [],
    };
  }
};

export const initDocumentIntelligence = async () => {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  if (!endpoint || !key) {
    throw new Error('Azure Document Intelligence configuration is missing');
  }

  const client = new DocumentAnalysisClient(
    endpoint,
    new AzureKeyCredential(key)
  );

  return client;
};

export const FindAllChatDocuments = async (chatThreadID: string) => {
  const container = await CosmosDBContainer.getInstance().getContainer();

  const querySpec: SqlQuerySpec = {
    query:
      "SELECT * FROM root r WHERE r.type=@type AND r.chatThreadId = @threadId AND r.isDeleted=@isDeleted",
    parameters: [
      {
        name: "@type",
        value: CHAT_DOCUMENT_ATTRIBUTE,
      },
      {
        name: "@threadId",
        value: chatThreadID,
      },
      {
        name: "@isDeleted",
        value: false,
      },
    ],
  };

  const { resources } = await container.items
    .query<ChatDocumentModel>(querySpec)
    .fetchAll();

  return resources;
};

export const UpsertChatDocument = async (
  fileName: string,
  chatThreadID: string
) => {
  const modelToSave: ChatDocumentModel = {
    chatThreadId: chatThreadID,
    id: uniqueId(),
    userId: await userHashedId(),
    createdAt: new Date(),
    type: CHAT_DOCUMENT_ATTRIBUTE,
    isDeleted: false,
    name: fileName,
  };

  const container = await CosmosDBContainer.getInstance().getContainer();
  await container.items.upsert(modelToSave);
};

export const ensureSearchIsConfigured = async () => {
  var isSearchConfigured =
    isNotNullOrEmpty(process.env.AZURE_SEARCH_NAME) &&
    isNotNullOrEmpty(process.env.AZURE_SEARCH_API_KEY) &&
    isNotNullOrEmpty(process.env.AZURE_SEARCH_INDEX_NAME) &&
    isNotNullOrEmpty(process.env.AZURE_SEARCH_API_VERSION);

  if (!isSearchConfigured) {
    throw new Error("Azure search environment variables are not configured.");
  }

  var isDocumentIntelligenceConfigured =
    isNotNullOrEmpty(process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT) &&
    isNotNullOrEmpty(process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY);

  if (!isDocumentIntelligenceConfigured) {
    throw new Error(
      "Azure document intelligence environment variables are not configured."
    );
  }

  var isEmbeddingsConfigured = isNotNullOrEmpty(
    process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME
  );

  if (!isEmbeddingsConfigured) {
    throw new Error("Azure openai embedding variables are not configured.");
  }

  await ensureIndexIsCreated();
};
