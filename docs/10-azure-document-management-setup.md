# Azure統合ドキュメント管理システム 設定手順

完全なAzure統合ドキュメント管理システムの設定手順をご説明します。

## 前提条件

- Azure サブスクリプション
- Azure Storage Account
- Azure Cognitive Search
- Azure Document Intelligence
- Azure OpenAI Service
- Cosmos DB

## 1. Azure Storage Account の設定

### 1.1 Storage Account の作成

1. **Azure PortalでStorage Accountを作成**
   - [https://portal.azure.com](https://portal.azure.com) にアクセス
   - **Storage accounts** → **作成**
   - 以下の設定を入力：

```yaml
基本設定:
  - サブスクリプション: [選択]
  - リソースグループ: [選択]
  - Storage account name: yourstorageaccount
  - リージョン: Japan East
  - パフォーマンス: Standard
  - 冗長性: LRS

詳細設定:
  - セキュリティ: 有効
  - ネットワーク: パブリックエンドポイント
  - データ保護: 有効
```

### 1.2 Blob Container の作成

1. **Storage Account内でContainerを作成**
   - **Containers** → **+ Container**
   - 名前: `documents`
   - パブリックアクセスレベル: Private

### 1.3 アクセスキーの取得

1. **Access keys** セクションで **key1** をコピー
2. 接続文字列を生成：
   ```
   DefaultEndpointsProtocol=https;AccountName=yourstorageaccount;AccountKey=yourkey;EndpointSuffix=core.windows.net
   ```

## 2. Azure Cognitive Search の設定

### 2.1 Search Service の作成

1. **Azure PortalでSearch Serviceを作成**
   - **Search services** → **作成**
   - 以下の設定を入力：

```yaml
基本設定:
  - サブスクリプション: [選択]
  - リソースグループ: [選択]
  - Service name: yoursearchservice
  - リージョン: Japan East
  - Pricing tier: Standard

詳細設定:
  - Replica count: 1
  - Partition count: 1
  - Hosting mode: Default
```

### 2.2 検索インデックスの作成

1. **Search Service内でインデックスを作成**
   - **Indexes** → **+ Add index**
   - 名前: `documents`

2. **フィールドの定義**：

```json
{
  "name": "id",
  "type": "Edm.String",
  "key": true,
  "searchable": false,
  "filterable": false,
  "sortable": false,
  "facetable": false
},
{
  "name": "fileName",
  "type": "Edm.String",
  "searchable": true,
  "filterable": true,
  "sortable": true,
  "facetable": true
},
{
  "name": "content",
  "type": "Edm.String",
  "searchable": true,
  "filterable": false,
  "sortable": false,
  "facetable": false
},
{
  "name": "contentVector",
  "type": "Collection(Edm.Single)",
  "searchable": false,
  "filterable": false,
  "sortable": false,
  "facetable": false,
  "dimensions": 1536
},
{
  "name": "fileType",
  "type": "Edm.String",
  "searchable": false,
  "filterable": true,
  "sortable": true,
  "facetable": true
},
{
  "name": "fileSize",
  "type": "Edm.Int64",
  "searchable": false,
  "filterable": true,
  "sortable": true,
  "facetable": true
},
{
  "name": "uploadedBy",
  "type": "Edm.String",
  "searchable": false,
  "filterable": true,
  "sortable": true,
  "facetable": true
},
{
  "name": "uploadedAt",
  "type": "Edm.DateTimeOffset",
  "searchable": false,
  "filterable": true,
  "sortable": true,
  "facetable": true
},
{
  "name": "blobUrl",
  "type": "Edm.String",
  "searchable": false,
  "filterable": false,
  "sortable": false,
  "facetable": false
},
{
  "name": "pages",
  "type": "Edm.Int32",
  "searchable": false,
  "filterable": true,
  "sortable": true,
  "facetable": true
},
{
  "name": "confidence",
  "type": "Edm.Double",
  "searchable": false,
  "filterable": true,
  "sortable": true,
  "facetable": true
},
{
  "name": "categories",
  "type": "Collection(Edm.String)",
  "searchable": true,
  "filterable": true,
  "sortable": false,
  "facetable": true
},
{
  "name": "tags",
  "type": "Collection(Edm.String)",
  "searchable": true,
  "filterable": true,
  "sortable": false,
  "facetable": true
}
```

### 2.3 セマンティック検索の設定

1. **Semantic ranker** を有効化
2. **Semantic configurations** で日本語を追加

### 2.4 アクセスキーの取得

1. **Keys** セクションで **Primary admin key** をコピー

## 3. Azure Document Intelligence の設定

### 3.1 Document Intelligence リソースの作成

1. **Azure PortalでDocument Intelligenceを作成**
   - **Document Intelligence** → **作成**
   - 以下の設定を入力：

```yaml
基本設定:
  - サブスクリプション: [選択]
  - リソースグループ: [選択]
  - Region: Japan East
  - Name: yourdocumentintelligence
  - Pricing tier: S0
```

### 3.2 アクセスキーの取得

1. **Keys and Endpoint** セクションで以下を取得：
   - **Endpoint URL**
   - **Key 1**

## 4. Azure OpenAI Service の設定

### 4.1 OpenAI Service の作成

1. **Azure PortalでOpenAI Serviceを作成**
   - **Azure OpenAI** → **作成**
   - 以下の設定を入力：

```yaml
基本設定:
  - サブスクリプション: [選択]
  - リソースグループ: [選択]
  - Region: Japan East
  - Name: youropenaiservice
  - Pricing tier: S0
```

### 4.2 モデルのデプロイ

1. **Azure OpenAI Studio** にアクセス
2. **Deployments** → **Create new deployment**
3. 以下のモデルをデプロイ：
   - **text-embedding-ada-002** (Embeddings用)
   - **gpt-4** または **gpt-35-turbo** (Chat用)

### 4.3 アクセスキーの取得

1. **Keys and Endpoint** セクションで以下を取得：
   - **Endpoint URL**
   - **Key 1**

## 5. 環境変数の設定

### 5.1 ローカル環境での設定

`.env.local` ファイルに以下を設定：

```bash
# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=yourstorageaccount;AccountKey=yourkey;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=documents

# Azure Cognitive Search
AZURE_SEARCH_ENDPOINT=https://yoursearchservice.search.windows.net
AZURE_SEARCH_API_KEY=yoursearchapikey
AZURE_SEARCH_INDEX_NAME=documents

# Azure Document Intelligence
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://yourdocumentintelligence.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=yourdocumentintelligencekey

# Azure OpenAI
AZURE_OPENAI_API_INSTANCE_NAME=youropenaiservice
AZURE_OPENAI_API_DEPLOYMENT_NAME=gpt-4
AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME=text-embedding-ada-002
AZURE_OPENAI_API_VERSION=2023-05-15
OPENAI_API_KEY=youropenaikey
```

### 5.2 本番環境での設定

Azure Key Vaultにシークレットを保存：

```bash
# Key Vaultにシークレットを保存
az keyvault secret set --vault-name your-keyvault-name --name "AZURE-STORAGE-CONNECTION-STRING" --value "your-connection-string"
az keyvault secret set --vault-name your-keyvault-name --name "AZURE-SEARCH-ENDPOINT" --value "your-search-endpoint"
az keyvault secret set --vault-name your-keyvault-name --name "AZURE-SEARCH-API-KEY" --value "your-search-api-key"
az keyvault secret set --vault-name your-keyvault-name --name "AZURE-DOCUMENT-INTELLIGENCE-ENDPOINT" --value "your-document-intelligence-endpoint"
az keyvault secret set --vault-name your-keyvault-name --name "AZURE-DOCUMENT-INTELLIGENCE-KEY" --value "your-document-intelligence-key"
az keyvault secret set --vault-name your-keyvault-name --name "AZURE-OPENAI-API-KEY" --value "your-openai-key"
```

## 6. アプリケーションの設定

### 6.1 必要なパッケージのインストール

```bash
npm install @azure/storage-blob @azure/ai-form-recognizer @azure/search-documents
```

### 6.2 アプリケーションの起動

```bash
npm run dev
```

## 7. 動作確認

### 7.1 ドキュメント管理機能のテスト

1. **ドキュメント管理ページにアクセス**
   - `/documents` にアクセス
   - 管理者権限でログイン

2. **ファイルアップロードのテスト**
   - PDFファイルをアップロード
   - 処理状況を確認

3. **検索機能のテスト**
   - アップロードしたドキュメントを検索
   - 検索結果を確認

### 7.2 統合機能の確認

1. **Azure Blob Storage**でのファイル保存
2. **Document Intelligence**でのテキスト抽出
3. **Cognitive Search**でのインデックス作成
4. **Cosmos DB**でのメタデータ管理

## 8. トラブルシューティング

### よくある問題

1. **認証エラー**
   - アクセスキーが正しく設定されているか確認
   - 権限設定を確認

2. **ファイルアップロードエラー**
   - ファイルサイズ制限を確認
   - サポートされているファイル形式を確認

3. **検索エラー**
   - インデックスが正しく作成されているか確認
   - 埋め込みベクトルの生成を確認

4. **テキスト抽出エラー**
   - Document Intelligenceの設定を確認
   - ファイル形式のサポートを確認

## 9. パフォーマンス最適化

### 9.1 スケーリング設定

1. **Azure Cognitive Search**
   - 必要に応じてReplica数を増加
   - Partition数を調整

2. **Azure Storage**
   - Premium Storageの使用を検討
   - CDNの設定を検討

### 9.2 キャッシュ設定

1. **Redis Cache**の導入を検討
2. **Application Insights**での監視設定

## 10. セキュリティ設定

### 10.1 ネットワークセキュリティ

1. **Private Endpoints**の設定
2. **Network Security Groups**の設定
3. **Firewall Rules**の設定

### 10.2 アクセス制御

1. **Azure AD**での認証設定
2. **Role-Based Access Control (RBAC)**の設定
3. **Managed Identities**の使用

この設定により、完全なAzure統合ドキュメント管理システムが利用できるようになります。 