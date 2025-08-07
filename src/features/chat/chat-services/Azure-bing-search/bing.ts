export class GoogleSearchResult {
  async SearchWeb(searchText: string) {
    const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
    
    if (!apiKey || !searchEngineId) {
      throw new Error('Google Custom Search API設定が不完全です。API_KEYとSEARCH_ENGINE_IDを設定してください。');
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchText)}&num=10&lr=lang_ja`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Google Custom Search API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Bing APIと同じ形式に変換
      return {
        webPages: {
          value: data.items?.map((item: any, index: number) => ({
            name: item.title || `検索結果 ${index + 1}`,
            snippet: item.snippet || '',
            url: item.link || '',
            sortOrder: index
          })) || []
        }
      };
    } catch (err) {
      console.error('Google Custom Search API Error:', err);
      throw err;
    }
  }
}

// Azure AI Projects SDK経由でのWeb検索
export class BingSearchResult {
  async SearchWeb(searchText: string) {
    const projectEndpoint = process.env.AZURE_AI_PROJECT_ENDPOINT || "https://tutorialjbdemoai3fkg2gu-resource.services.ai.azure.com/api/projects/tutorialjbdemoai3fkg2gu-project";
    const agentId = process.env.AZURE_AI_FOUNDRY_AGENT_ID || "asst_MCLyvD44JpMKO8WZIHeWnRyZ";
    
    if (!projectEndpoint || !agentId) {
      console.error('Missing Azure AI Project configuration:', {
        projectEndpoint: projectEndpoint ? 'set' : 'missing',
        agentId: agentId ? 'set' : 'missing'
      });
      
      // 環境変数の詳細なデバッグ情報
      console.log('Debug - Environment variables:');
      console.log('AZURE_AI_PROJECT_ENDPOINT:', process.env.AZURE_AI_PROJECT_ENDPOINT);
      console.log('AZURE_AI_FOUNDRY_AGENT_ID:', process.env.AZURE_AI_FOUNDRY_AGENT_ID);
      
      throw new Error('Azure AI Project configuration is missing');
    }

    try {
      // Azure AI Projects SDKを使用してWeb検索を実行
      console.log('Debug - Azure AI Project configuration:');
      console.log('Project Endpoint:', projectEndpoint);
      console.log('Agent ID:', agentId);
      console.log('Search Text:', searchText);

      // Azure AI Projects SDKの動的インポート
      const { AIProjectClient } = await import("@azure/ai-projects");
      const { DefaultAzureCredential } = await import("@azure/identity");

      console.log('Using Entra authentication with Azure CLI...');
      const project = new AIProjectClient(projectEndpoint, new DefaultAzureCredential());
      
      // エージェントを取得
      const agent = await project.agents.getAgent(agentId);
      console.log(`Retrieved agent: ${agent.name}`);

      // スレッドを作成
      const thread = await project.agents.threads.create();
      console.log(`Created thread, ID: ${thread.id}`);

      // メッセージを作成
      const message = await project.agents.messages.create(thread.id, "user", searchText);
      console.log(`Created message, ID: ${message.id}`);

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
          
          // アシスタントの応答を検索結果として構造化
          searchResults.push({
            name: `${searchText} - AI回答`,
            snippet: textValue,
            url: urls.length > 0 ? urls[0] : '#',
            sortOrder: 0
          });
          
          // 抽出されたURLを個別の検索結果として追加
          urls.forEach((url: string, index: number) => {
            if (index > 0) { // 最初のURLは既に上記で使用済み
              searchResults.push({
                name: `関連リンク ${index + 1}`,
                snippet: `「${searchText}」に関する関連リンクです。`,
                url: url,
                sortOrder: index + 1
              });
            }
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
    } catch (err) {
      console.error('Azure AI Project error:', err);
      
      // フォールバック: 基本的なWeb検索エンジンを使用
      return await this.fallbackSearch(searchText);
    }
  }

  private extractUrls(text: string): string[] {
    // URLを抽出する正規表現
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    return urls;
  }

  private async fallbackSearch(searchText: string) {
    // DuckDuckGo検索をフォールバックとして使用
    console.log('Using DuckDuckGo fallback search for:', searchText);
    
    try {
      const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(searchText)}&format=json&no_html=1&skip_disambig=1`);
      
      if (!response.ok) {
        throw new Error(`DuckDuckGo API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const results = [];
      
      // 抽象的な回答を追加
      if (data.Abstract) {
        results.push({
          name: `${searchText} - 概要`,
          snippet: data.Abstract,
          url: data.AbstractURL || '#',
          sortOrder: 0
        });
      }
      
      // 関連リンクを追加
      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        data.RelatedTopics.slice(0, 5).forEach((topic: any, index: number) => {
          if (topic.FirstURL) {
            results.push({
              name: topic.Text || `関連リンク ${index + 1}`,
              snippet: topic.Text || `「${searchText}」に関する関連情報です。`,
              url: topic.FirstURL,
              sortOrder: index + 1
            });
          }
        });
      }
      
      return {
        webPages: {
          value: results.length > 0 ? results : [
            {
              name: '検索結果',
              snippet: `「${searchText}」についての検索結果が見つかりませんでした。`,
              url: '#',
              sortOrder: 0
            }
          ]
        }
      };
    } catch (error) {
      console.error('DuckDuckGo fallback search error:', error);
      
      return {
        webPages: {
          value: [
            {
              name: '検索結果',
              snippet: `「${searchText}」についての検索結果です。詳細な情報については、別の検索エンジンをご利用ください。`,
              url: '#',
              sortOrder: 0
            }
          ]
        }
      };
    }
  }
}
