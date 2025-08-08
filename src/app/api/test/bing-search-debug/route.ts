import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { BingSearchResult } from '@/features/chat/chat-services/Azure-bing-search/bing';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Bing Search Debug API ===');
    
    // 環境変数の確認
    const foundryEndpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT;
    const agentId = process.env.AZURE_AI_FOUNDRY_AGENT_ID;
    const apiKey = process.env.AZURE_AI_FOUNDRY_API_KEY;
    
    console.log('Azure AI Foundry environment variables:', {
      hasFoundryEndpoint: !!foundryEndpoint,
      hasAgentId: !!agentId,
      hasApiKey: !!apiKey,
      foundryEndpoint: foundryEndpoint,
      agentId: agentId
    });

    if (!foundryEndpoint || !agentId) {
      return NextResponse.json({
        error: 'Azure AI Foundryの環境変数が設定されていません',
        missing: {
          foundryEndpoint: !foundryEndpoint,
          agentId: !agentId,
          apiKey: !apiKey
        }
      }, { status: 400 });
    }

    // テスト検索を実行
    const bing = new BingSearchResult();
    const testQuery = "JBCCの本社所在地";
    
    console.log('Testing Bing search with query:', testQuery);
    
    try {
      const searchResult = await bing.SearchWeb(testQuery);
      
      console.log('Search result:', searchResult);
      
      return NextResponse.json({
        success: true,
        environment: {
          foundryEndpoint: foundryEndpoint,
          agentId: agentId,
          hasApiKey: !!apiKey
        },
        testQuery: testQuery,
        searchResult: searchResult
      });
    } catch (searchError) {
      console.error('Search execution error:', searchError);
      console.error('Error stack:', searchError instanceof Error ? searchError.stack : 'No stack trace');
      
      return NextResponse.json({
        success: false,
        error: '検索実行中にエラーが発生しました',
        searchError: {
          message: searchError instanceof Error ? searchError.message : 'Unknown error',
          stack: searchError instanceof Error ? searchError.stack : undefined,
          name: searchError instanceof Error ? searchError.name : 'Unknown'
        },
        environment: {
          foundryEndpoint: foundryEndpoint,
          agentId: agentId,
          hasApiKey: !!apiKey
        },
        testQuery: testQuery
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Bing Search Debug API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
