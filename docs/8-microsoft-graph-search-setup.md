# Microsoft Graph Search API 設定手順

Azure Bing Search APIの停止に伴い、Microsoft Graph Search APIを使用したWeb検索機能に移行しました。

## 前提条件

- Azure ADテナント
- Azure ADアプリケーション登録の権限

## 設定手順

### 1. Azure ADアプリケーションの登録

1. [Azure Portal](https://portal.azure.com) にアクセス
2. **Azure Active Directory** → **アプリの登録** → **新規登録**
3. 以下の情報を入力：
   - **名前**: `YourAppName-GraphSearch`
   - **サポートされているアカウントの種類**: `この組織のディレクトリ内のアカウントのみ`
   - **リダイレクトURI**: `Web` → `https://localhost:3000`

### 2. API権限の設定

1. 登録したアプリケーションを選択
2. **APIのアクセス許可** → **アクセス許可の追加**
3. **Microsoft Graph** を選択
4. **アプリケーションのアクセス許可** を選択
5. 以下の権限を追加：
   - `Search.Read.All`
6. **管理者の同意を与える** をクリック

### 3. クライアントシークレットの作成

1. **証明書とシークレット** → **新しいクライアントシークレット**
2. 説明を入力し、有効期限を設定
3. 生成されたシークレット値をコピー（一度しか表示されません）

### 4. 環境変数の設定

`.env.local` ファイルに以下の値を設定：

```bash
# Microsoft Graph Search API設定
AZURE_AD_CLIENT_ID=your-app-client-id
AZURE_AD_CLIENT_SECRET=your-app-client-secret
AZURE_AD_TENANT_ID=your-tenant-id
```

### 5. Azure Key Vaultでの設定（本番環境）

本番環境では、シークレットをAzure Key Vaultに保存します：

```bash
# Key Vaultにシークレットを保存
az keyvault secret set --vault-name your-keyvault-name --name "AZURE-AD-CLIENT-ID" --value "your-app-client-id"
az keyvault secret set --vault-name your-keyvault-name --name "AZURE-AD-CLIENT-SECRET" --value "your-app-client-secret"
az keyvault secret set --vault-name your-keyvault-name --name "AZURE-AD-TENANT-ID" --value "your-tenant-id"
```

## 動作確認

1. アプリケーションを起動
2. Web検索機能を使用してテスト
3. 検索結果が正常に表示されることを確認

## トラブルシューティング

### よくある問題

1. **権限エラー**
   - Azure ADアプリケーションに適切な権限が設定されているか確認
   - 管理者の同意が与えられているか確認

2. **認証エラー**
   - クライアントID、シークレット、テナントIDが正しく設定されているか確認
   - クライアントシークレットの有効期限を確認

3. **検索結果が取得できない**
   - Microsoft Graph Search APIの制限を確認
   - フォールバック検索が動作するか確認

## フォールバック機能

Microsoft Graph Search APIが利用できない場合、DuckDuckGo Instant Answer APIがフォールバックとして動作します。これにより、検索機能の可用性が確保されます。

## 注意事項

- Microsoft Graph Search APIには利用制限があります
- 本番環境では適切なエラーハンドリングとログ記録を実装してください
- 定期的にAPIの利用状況を監視してください 