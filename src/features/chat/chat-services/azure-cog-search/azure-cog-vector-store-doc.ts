import { OpenAIEmbeddingInstance } from "@/features/common/openai";

export interface AzureCogDocumentIndex_doc {
  id: string;
  pageContent: string;
  embedding?: number[];
  user: string;
  chatThreadId: string;
  metadata: string;
  chatType: string;
  deptName: string;
}

interface DocumentSearchResponseModel<TModel> {
  value: TModel[];
}

type DocumentSearchModel = {
  "@search.score": number;
};

type DocumentDeleteModel = {
  id: string;
  "@search.action": "delete";
};

export interface AzureCogDocument_doc {}

type AzureCogVectorField = {
  value: number[];
  fields: string;
  k: number;
};

type AzureCogFilter = {
  search?: string;
  facets?: string[];
  filter?: string;
  top?: number;
};

type AzureCogRequestObject = {
  search: string;
  facets: string[];
  filter: string;
  vectors: AzureCogVectorField[];
  top: number;
};

export const simpleSearch_doc = async (
  filter?: AzureCogFilter
): Promise<Array<AzureCogDocumentIndex_doc & DocumentSearchModel>> => {
  const url = `${baseIndexUrl()}/docs/search?api-version=${
    process.env.AZURE_SEARCH_API_VERSION
  }`;
  const searchBody: AzureCogRequestObject = {
    search: filter?.search || "*",
    facets: filter?.facets || [],
    filter: filter?.filter || "",
    vectors: [],
    top: filter?.top || 10,
  };

  const resultDocuments = (await fetcher(url, {
    method: "POST",
    body: JSON.stringify(searchBody),
  })) as DocumentSearchResponseModel<
    AzureCogDocumentIndex_doc & DocumentSearchModel
  >;

  return resultDocuments.value;
};

export const similaritySearchVectorWithScore_doc = async (
  query: string,
  k: number,
  filter?: AzureCogFilter
): Promise<Array<AzureCogDocumentIndex_doc & DocumentSearchModel>> => {
  const openai = OpenAIEmbeddingInstance();

  // クエリの検証
  if (!query || query.trim().length === 0) {
    console.log('Empty query provided, returning empty results');
    return [];
  }

  // 制御文字や無効な文字をチェック
  const hasInvalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(query);
  if (hasInvalidChars) {
    console.log('Query contains invalid characters, returning empty results');
    return [];
  }

  const cleanQuery = query.trim();

  const embeddings = await openai.embeddings.create({
    input: cleanQuery,
    model: process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME,
  });
  const url = `${baseIndexUrl()}/docs/search?api-version=${
    process.env.AZURE_SEARCH_API_VERSION
  }`;

  const searchBody: AzureCogRequestObject = {
    search: filter?.search || "*",
    facets: filter?.facets || [],
    filter: filter?.filter || "",
    vectors: [
      { value: embeddings.data[0].embedding, fields: "embedding", k: k },
    ],
    top: filter?.top || k,
  };

  const resultDocuments = (await fetcher(url, {
    method: "POST",
    body: JSON.stringify(searchBody),
  })) as DocumentSearchResponseModel<
    AzureCogDocumentIndex_doc & DocumentSearchModel
  >;

  return resultDocuments.value;
};

export const indexDocuments_doc = async (
  documents: Array<AzureCogDocumentIndex_doc>
): Promise<void> => {
   
  const url = `${baseIndexUrl()}/docs/index?api-version=${
    process.env.AZURE_SEARCH_API_VERSION
  }`;

  await embedDocuments_doc(documents);
  const documentIndexRequest: DocumentSearchResponseModel<AzureCogDocumentIndex_doc> =
    {
      value: documents,
    };

  await fetcher(url, {
    method: "POST",
    body: JSON.stringify(documentIndexRequest),
  });
};

export const deleteDocuments_doc = async (chatThreadId: string): Promise<void> => {
  // find all documents for chat thread

  const documentsInChat = await simpleSearch_doc({
    filter: `chatThreadId eq '${chatThreadId}'`,
  });

  const documentsToDelete: DocumentDeleteModel[] = [];

  documentsInChat.forEach(async (document: { id: string }) => {
    const doc: DocumentDeleteModel = {
      "@search.action": "delete",
      id: document.id,
    };
    documentsToDelete.push(doc);
  });

  // delete the documents
  await fetcher(
    `${baseIndexUrl()}/docs/index?api-version=${
      process.env.AZURE_SEARCH_API_VERSION
    }`,
    {
      method: "POST",
      body: JSON.stringify({ value: documentsToDelete }),
    }
  );
};

export const embedDocuments_doc = async (
  documents: Array<AzureCogDocumentIndex_doc>
) => {
  const openai = OpenAIEmbeddingInstance();

  try {
    console.log('=== embedDocuments_doc START ===');
    console.log('Documents to embed:', documents.length);
    
    // 各ドキュメントのpageContentの型と内容をログ出力
    documents.forEach((doc, index) => {
      console.log(`Document ${index}:`);
      console.log('  - pageContent type:', typeof doc.pageContent);
      console.log('  - pageContent is array:', Array.isArray(doc.pageContent));
      console.log('  - pageContent is object:', doc.pageContent && typeof doc.pageContent === 'object');
      console.log('  - pageContent value:', doc.pageContent);
      console.log('  - pageContent length:', doc.pageContent?.length);
      console.log('  - pageContent keys (if object):', doc.pageContent && typeof doc.pageContent === 'object' ? Object.keys(doc.pageContent) : 'N/A');
    });

    // 空のテキストや無効な文字をフィルタリング
    const contentsToEmbed = documents
      .map((d, index) => {
        console.log(`Processing document ${index} pageContent:`, d.pageContent);
        return d.pageContent;
      })
      .filter((content: any, index) => {
        console.log(`Filtering content ${index}:`, content);
        console.log(`Content type:`, typeof content);
        console.log(`Content is array:`, Array.isArray(content));
        
        // 型チェック: 文字列でない場合は文字列に変換
        let contentStr = content;
        if (typeof content !== 'string') {
          console.log(`Converting non-string content ${index} to string`);
          if (Array.isArray(content)) {
            contentStr = content.join(' ');
            console.log(`Converted array to string:`, contentStr);
          } else if (content && typeof content === 'object') {
            contentStr = JSON.stringify(content);
            console.log(`Converted object to string:`, contentStr);
          } else {
            contentStr = String(content || '');
            console.log(`Converted other type to string:`, contentStr);
          }
        }

        // 空の文字列、null、undefinedを除外
        if (!contentStr || contentStr.trim().length === 0) {
          console.log(`Filtering out empty content ${index}`);
          return false;
        }
        
        // 制御文字や無効な文字をチェック
        const hasInvalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(contentStr);
        if (hasInvalidChars) {
          console.log(`Filtering out content ${index} with invalid characters`);
          return false;
        }
        
        console.log(`Content ${index} passed filter`);
        return true;
      })
      .map((content: any, index) => {
        console.log(`Mapping content ${index}:`, content);
        // 型チェック: 文字列でない場合は文字列に変換
        let contentStr = content;
        if (typeof content !== 'string') {
          console.log(`Converting non-string content ${index} to string in map`);
          if (Array.isArray(content)) {
            contentStr = content.join(' ');
          } else if (content && typeof content === 'object') {
            contentStr = JSON.stringify(content);
          } else {
            contentStr = String(content || '');
          }
        }
        const trimmed = contentStr.trim();
        console.log(`Mapped content ${index} result:`, trimmed);
        return trimmed; // 前後の空白を削除
      });

    console.log('Valid contents to embed:', contentsToEmbed.length);

    // 有効なコンテンツがない場合は早期リターン
    if (contentsToEmbed.length === 0) {
      console.log('No valid content to embed');
      return;
    }

    const embeddings = await openai.embeddings.create({
      input: contentsToEmbed,
      model: process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME,
    });

    // embeddingsを対応するドキュメントに割り当て
    let embeddingIndex = 0;
    documents.forEach((document, index) => {
      console.log(`Assigning embedding to document ${index}`);
      let content: any = document.pageContent;
      
      // 型チェック: 文字列でない場合は文字列に変換
      if (typeof content !== 'string') {
        console.log(`Converting document ${index} content to string`);
        if (Array.isArray(content)) {
          content = content.join(' ');
        } else if (content && typeof content === 'object') {
          content = JSON.stringify(content);
        } else {
          content = String(content || '');
        }
      }
      
      const contentStr = content.trim();
      console.log(`Document ${index} content after trim:`, contentStr);
      // 有効なコンテンツの場合のみembeddingを割り当て
      if (contentStr && contentStr.length > 0 && !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(contentStr)) {
        if (embeddingIndex < embeddings.data.length) {
          document.embedding = embeddings.data[embeddingIndex].embedding;
          console.log(`Assigned embedding ${embeddingIndex} to document ${index}`);
          embeddingIndex++;
        }
      } else {
        console.log(`Skipped embedding assignment for document ${index}`);
      }
    });
  } catch (e) {
    console.error('EmbedDocuments_doc error:', e);
    console.error('Error stack:', e instanceof Error ? e.stack : 'No stack trace');
    console.log(e);
    const error = e as any;
    throw new Error(`${e} with code ${error.status}`);
  }
};

const baseUrl = (): string => {
  return `https://${process.env.AZURE_SEARCH_NAME}.search.windows.net/indexes`;
};

const baseIndexUrl = (): string => {
  return `https://${process.env.AZURE_SEARCH_NAME}.search.windows.net/indexes/${process.env.AZURE_SEARCH_INDEX_NAME}`;
};

const fetcher = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.AZURE_SEARCH_API_KEY,
    },
  });

  if (!response.ok) {
    if (response.status === 400) {
      const err = await response.json();
      throw new Error(err.error.message);
    } else {
      throw new Error(`Azure Cog Search Error: ${response.statusText}`);
    }
  }

  return await response.json();
};

export const ensureIndexIsCreated_doc = async (): Promise<void> => {
  const url = `${baseIndexUrl()}?api-version=${
    process.env.AZURE_SEARCH_API_VERSION
  }`;

  try {
    await fetcher(url);
  } catch (e) {
    await createCogSearchIndex();
  }
};

const createCogSearchIndex = async (): Promise<void> => {
  const url = `${baseUrl()}?api-version=${
    process.env.AZURE_SEARCH_API_VERSION
  }`;

  await fetcher(url, {
    method: "POST",
    body: JSON.stringify(AZURE_SEARCH_INDEX),
  });
};

const AZURE_SEARCH_INDEX = {
  name: process.env.AZURE_SEARCH_INDEX_NAME,
  fields: [
    {
      name: "id",
      type: "Edm.String",
      key: true,
      filterable: true,
    },
    {
      name: "user",
      type: "Edm.String",
      searchable: true,
      filterable: true,
    },
    {
      name: "chatThreadId",
      type: "Edm.String",
      searchable: true,
      filterable: true,
    },
    {
      name: "pageContent",
      searchable: true,
      type: "Edm.String",
    },
    {
      name: "metadata",
      type: "Edm.String",
    },
    {
      name : "chatType",
      type: "Edm.String",
      searchable: true,
      filterable: true,
    },
    {
      name : "deptName",
      type: "Edm.String",
      searchable: true,
      filterable: true,
    },
    {
      name: "embedding",
      type: "Collection(Edm.Single)",
      searchable: true,
      filterable: false,
      sortable: false,
      facetable: false,
      retrievable: true,
      dimensions: 1536,
      vectorSearchConfiguration: "vectorConfig",
    },
  ],
  vectorSearch: {
    algorithmConfigurations: [
      {
        name: "vectorConfig",
        kind: "hnsw",
      },
    ],
  },
};
