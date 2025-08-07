# Azure AI Foundry Agent 設定手順

Azure Bing Search APIの停止に伴い、Azure AI Foundry Agent経由でのWeb検索機能に移行しました。

## 前提条件

- Azure AI Foundryリソース
- Bing Search API Key（まだ利用可能な場合）
- Azure AI Foundry Agentの設定権限

## 設定手順

### 1. Azure AI Foundryリソースの作成

1. **Azure Portalにアクセス**
   - [https://portal.azure.com](https://portal.azure.com) にアクセス
   - Azure AI Foundryリソースを作成

2. **AI Foundryリソースの設定**
   - **リソース名**: `your-ai-foundry-name`
   - **リージョン**: 最寄りのリージョンを選択
   - **SKU**: 適切なSKUを選択

### 2. Agentの作成と設定

1. **Agentの作成**
   - AI Foundryリソース内で **Agents** → **作成**
   - **Agent名**: `BingSearchAgent`
   - **説明**: `Web検索を実行するエージェント`

2. **Tools の設定**
   - **Tools** セクションで **Add Tool** をクリック
   - **Bing Search** を選択
   - 以下の設定を追加：

```json
{
  "type": "bing_search",
  "name": "web_search",
  "description": "Web検索を実行するツール",
  "parameters": {
    "query": {
      "type": "string",
      "description": "検索クエリ"
    },
    "count": {
      "type": "integer",
      "default": 10,
      "description": "検索結果数"
    }
  }
}
```

3. **API Keyの設定**
   - Bing Search API Keyを設定
   - または、Azure Key Vaultから参照するように設定

### 3. Agentのプロンプト設定

**System Message**:
```
あなたはWeb検索エージェントです。ユーザーの質問に対して、Bing検索を使用して最新の情報を取得し、正確で有用な回答を提供してください。

検索結果は以下の形式で返してください：
- タイトル: [検索結果のタイトル]
- URL: [検索結果のURL]
- 説明: [検索結果の説明]

複数の検索結果がある場合は、それぞれを上記の形式で列挙してください。
```

**Instructions**:
- ユーザーの質問を分析し、適切な検索クエリを生成する
- 検索結果を基に、正確で最新の情報を提供する
- 検索結果の出典を明記する
- 日本語で回答する

### 4. 環境変数の設定

`.env.local` ファイルに以下の値を設定：

```bash
# Azure AI Foundry Agent設定
AZURE_AI_FOUNDRY_ENDPOINT=https://your-ai-foundry-name.azurewebsites.net
AZURE_AI_FOUNDRY_API_KEY=your-api-key
AZURE_AI_FOUNDRY_AGENT_ID=your-agent-id
```

### 5. Agent IDの取得

1. **Agentの詳細ページにアクセス**
   - 作成したAgentをクリック
   - **Overview** タブで **Agent ID** をコピー

2. **API Keyの取得**
   - **Keys** セクションで **API Key** をコピー

### 6. Azure Key Vaultでの設定（本番環境）

本番環境では、シークレットをAzure Key Vaultに保存します：

```bash
# Key Vaultにシークレットを保存
az keyvault secret set --vault-name your-keyvault-name --name "AZURE-AI-FOUNDRY-ENDPOINT" --value "https://your-ai-foundry-name.azurewebsites.net"
az keyvault secret set --vault-name your-keyvault-name --name "AZURE-AI-FOUNDRY-API-KEY" --value "your-api-key"
az keyvault secret set --vault-name your-keyvault-name --name "AZURE-AI-FOUNDRY-AGENT-ID" --value "your-agent-id"
```

## 動作確認

1. **Agentのテスト**
   - Azure AI Foundry StudioでAgentをテスト
   - 簡単な検索クエリで動作確認

2. **アプリケーションのテスト**
   - アプリケーションを起動
   - Web検索機能を使用してテスト
   - 検索結果が正常に表示されることを確認

## トラブルシューティング

### よくある問題

1. **Agent API エラー**
   - Agent IDが正しく設定されているか確認
   - API Keyが有効か確認
   - Agentが正常にデプロイされているか確認

2. **検索結果が取得できない**
   - Bing Search Toolが正しく設定されているか確認
   - API Keyが有効か確認
   - フォールバック検索が動作するか確認

3. **認証エラー**
   - API Keyが正しく設定されているか確認
   - Agentの権限設定を確認

## フォールバック機能

Azure AI Foundry Agentが利用できない場合、DuckDuckGo Instant Answer APIがフォールバックとして動作します。これにより、検索機能の可用性が確保されます。

## 利点

1. **統合されたAI体験**: Azure AI Foundry内でAI機能と検索機能が統合
2. **柔軟な設定**: Agentのプロンプトやツールをカスタマイズ可能
3. **スケーラビリティ**: Azure AI Foundryのスケーリング機能を活用
4. **セキュリティ**: Azureのセキュリティ機能を活用

## 注意事項

- Azure AI Foundry Agentには利用制限があります
- 本番環境では適切なエラーハンドリングとログ記録を実装してください
- 定期的にAgentの動作状況を監視してください
- Bing Search API Keyの有効期限を確認してください 