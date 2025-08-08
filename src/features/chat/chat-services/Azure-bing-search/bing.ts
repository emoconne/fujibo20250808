// Azure AI Projects SDK経由でのWeb検索
export class BingSearchResult {
  async SearchWeb(searchText: string) {
    const projectEndpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT || "https://tutorialjbdemoai3fkg2gu-resource.services.ai.azure.com/api/projects/tutorialjbdemoai3fkg2gu-project";
    const agentId = process.env.AZURE_AI_FOUNDRY_AGENT_ID || "asst_MCLyvD44JpMKO8WZIHeWnRyZ";
    
    if (!projectEndpoint || !agentId) {
      console.error('Missing Azure AI Project configuration:', {
        projectEndpoint: projectEndpoint ? 'set' : 'missing',
        agentId: agentId ? 'set' : 'missing'
      });
      
      // 環境変数の詳細なデバッグ情報
      console.log('Debug - Environment variables:');
      console.log('AZURE_AI_FOUNDRY_ENDPOINT:', process.env.AZURE_AI_FOUNDRY_ENDPOINT);
      console.log('AZURE_AI_FOUNDRY_AGENT_ID:', process.env.AZURE_AI_FOUNDRY_AGENT_ID);
      
      throw new Error('Azure AI Project configuration is missing');
    }

    try {
      // Azure AI Projects SDKを使用してWeb検索を実行
      console.log('Debug - Azure AI Project configuration:');
      console.log('Project Endpoint:', projectEndpoint);
      console.log('Agent ID:', agentId);
      console.log('Search Text:', searchText);

      // タイムアウト付きでAzure AI Projects SDKを実行
      const result = await Promise.race([
        this.executeAzureAISearch(projectEndpoint, agentId, searchText),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Azure AI Projects SDK timeout')), 30000)
        )
      ]);

      return result;
    } catch (err) {
      console.error('Azure AI Project error:', err);
      
      // エラーが発生した場合は基本的な検索結果を返す
      return {
        webPages: {
          value: [
            {
              name: '検索結果',
              snippet: `「${searchText}」についての検索中にエラーが発生しました。しばらく時間をおいて再度お試しください。`,
              url: '#',
              sortOrder: 0
            }
          ]
        }
      };
    }
  }

  private async executeAzureAISearch(projectEndpoint: string, agentId: string, searchText: string) {
    // Azure AI Projects SDKの動的インポート
    const { AIProjectClient } = await import("@azure/ai-projects");
    const { DefaultAzureCredential } = await import("@azure/identity");

    console.log('Attempting to authenticate with Azure AI Foundry...');
    
    let project;
    const apiKey = process.env.AZURE_AI_FOUNDRY_API_KEY;
    
    console.log('Using Entra authentication with Azure CLI...');
    // DefaultAzureCredentialを使用
    project = new AIProjectClient(projectEndpoint, new DefaultAzureCredential());
    
    // エージェントを取得
    const agent = await project.agents.getAgent(agentId);
    console.log(`Retrieved agent: ${agent.name}`);

    // スレッドを作成
    const thread = await project.agents.threads.create();
    console.log(`Created thread, ID: ${thread.id}`);

    // メッセージを作成（プロンプトを工夫して関連URLを含む結果を取得）
    const enhancedPrompt = `以下の検索クエリについて、詳細な情報と関連するURLを含めて回答してください：

検索クエリ: "${searchText}"

回答の形式：
1. 検索クエリに関する詳細な情報を提供してください
2. 関連する信頼できるWebサイトのURLを複数含めてください
3. 各URLについて簡単な説明も添えてください
4. 情報源として引用できる公式サイトや信頼できるニュースサイトを優先してください

URLは以下のような形式で含めてください：
- 公式サイト: https://example.com (公式サイトの説明)
- 関連情報: https://example2.com (関連情報の説明)
- ニュース記事: https://example3.com (ニュース記事の説明)

重要：
- 検索結果には必ず具体的なURLを含めてください
- 各URLには説明文を添えてください
- 信頼できる情報源を優先してください
- 複数の異なる情報源を含めてください`;
    
    const message = await project.agents.messages.create(thread.id, "user", enhancedPrompt);
    console.log(`Created message with enhanced prompt, ID: ${message.id}`);

    // ランを作成
    let run = await project.agents.runs.create(thread.id, agent.id);
    console.log(`Created run, ID: ${run.id}`);

    // ランが完了するまでポーリング
    while (run.status === "queued" || run.status === "in_progress") {
      // 1秒待機
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await project.agents.runs.get(thread.id, run.id);
      console.log(`Run status: ${run.status}`);
    }

    if (run.status === "failed") {
      console.error(`Run failed: `, run.lastError);
      throw new Error(`Agent run failed: ${run.lastError?.message || 'Unknown error'}`);
    }

    console.log(`Run completed with status: ${run.status}`);

    // メッセージを取得
    const messages = await project.agents.messages.list(thread.id, { order: "asc" });

    // メッセージから検索結果を抽出
    const searchResults = [];
    for await (const m of messages) {
      const content = m.content.find((c: any) => c.type === "text" && "text" in c);
      if (content && m.role === "assistant" && "text" in content) {
        const textValue = (content as any).text.value;
        console.log(`Assistant response: ${textValue}`);
        
        // テキストからURLを抽出
        const urls = this.extractUrls(textValue);
        
        // メインのAI回答を検索結果として追加
        searchResults.push({
          name: `${searchText} - AI回答`,
          snippet: textValue,
          url: urls.length > 0 ? urls[0] : '#',
          sortOrder: 0
        });
        
        // 抽出されたURLを個別の検索結果として追加（説明付き）
        urls.forEach((url: string, index: number) => {
          // URLの説明を抽出（URLの前後のテキストから）
          const urlDescription = this.extractUrlDescription(textValue, url);
          
          searchResults.push({
            name: urlDescription || `関連リンク ${index + 1}`,
            snippet: urlDescription || `「${searchText}」に関する関連情報です。`,
            url: url,
            sortOrder: index + 1
          });
        });
      }
    }

    // スレッドを削除（クリーンアップ）
    try {
      await project.agents.threads.delete(thread.id);
      console.log(`Deleted thread: ${thread.id}`);
    } catch (cleanupError) {
      console.warn('Failed to cleanup thread:', cleanupError);
    }
    
    return {
      webPages: {
        value: searchResults.length > 0 ? searchResults : [
          {
            name: '検索結果',
            snippet: '検索結果が見つかりませんでした。',
            url: '#',
            sortOrder: 0
          }
        ]
      }
    };
  }

  private extractUrls(text: string): string[] {
    // URLを抽出する正規表現
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    return urls;
  }

  private extractUrlDescription(text: string, url: string): string {
    // URLの前後のテキストから説明を抽出
    const urlIndex = text.indexOf(url);
    if (urlIndex === -1) return '';
    
    // URLの前後50文字を取得
    const start = Math.max(0, urlIndex - 50);
    const end = Math.min(text.length, urlIndex + url.length + 50);
    const context = text.substring(start, end);
    
    // URLを除去して説明部分を抽出
    const description = context.replace(url, '').trim();
    
    // 説明が短すぎる場合は空文字を返す
    if (description.length < 10) return '';
    
    // 説明を適切な長さに切り詰める
    return description.length > 100 ? description.substring(0, 100) + '...' : description;
  }
}