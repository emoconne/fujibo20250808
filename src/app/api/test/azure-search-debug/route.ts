import { NextResponse } from 'next/server';
import { ensureIndexIsCreated } from '@/features/chat/chat-services/azure-cog-search/azure-cog-vector-store';

export async function GET() {
  try {
    console.log('=== Azure Search Debug API ===');
    
    // 環境変数の確認
    const searchName = process.env.AZURE_SEARCH_NAME;
    const searchIndexName = process.env.AZURE_SEARCH_INDEX_NAME;
    const searchApiKey = process.env.AZURE_SEARCH_API_KEY;
    const searchApiVersion = process.env.AZURE_SEARCH_API_VERSION;
    
    console.log('Azure Search environment variables:', {
      hasSearchName: !!searchName,
      hasSearchIndexName: !!searchIndexName,
      hasSearchApiKey: !!searchApiKey,
      hasSearchApiVersion: !!searchApiVersion,
      searchName: searchName,
      searchIndexName: searchIndexName,
      searchApiVersion: searchApiVersion
    });

    if (!searchName || !searchIndexName || !searchApiKey || !searchApiVersion) {
      return NextResponse.json({
        error: 'Azure Cognitive Searchの環境変数が設定されていません',
        missing: {
          searchName: !searchName,
          searchIndexName: !searchIndexName,
          searchApiKey: !searchApiKey,
          searchApiVersion: !searchApiVersion
        }
      }, { status: 400 });
    }

    // インデックスの存在確認と作成
    try {
      console.log('Checking/creating Azure Search index...');
      await ensureIndexIsCreated();
      console.log('Azure Search index is ready');
      
      return NextResponse.json({
        success: true,
        message: 'Azure Cognitive Searchの設定が正常です',
        config: {
          searchName: searchName,
          searchIndexName: searchIndexName,
          searchApiVersion: searchApiVersion
        }
      });

    } catch (indexError) {
      console.error('Index creation error:', indexError);
      return NextResponse.json({
        error: 'Azure Cognitive Searchインデックスの作成に失敗しました',
        details: indexError instanceof Error ? indexError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Azure Search Debug API error:', error);
    return NextResponse.json({
      error: 'Azure Cognitive Searchのデバッグ処理中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
