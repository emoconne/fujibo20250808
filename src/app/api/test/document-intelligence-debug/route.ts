import { NextResponse } from 'next/server';
import { createDocumentIntelligenceClient } from '@/features/documents/azure-document-intelligence-service';

export async function GET() {
  try {
    console.log('=== Document Intelligence Debug API ===');
    
    // 環境変数の確認
    const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
    
    console.log('Environment variables check:', {
      hasEndpoint: !!endpoint,
      hasKey: !!key,
      endpointLength: endpoint?.length || 0,
      keyLength: key?.length || 0
    });

    if (!endpoint || !key) {
      return NextResponse.json({
        error: '環境変数が設定されていません',
        missing: {
          endpoint: !endpoint,
          key: !key
        }
      }, { status: 400 });
    }

    // クライアントの作成をテスト
    try {
      const client = await createDocumentIntelligenceClient();
      
      // クライアントのメソッドを確認
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(client));
      const analyzeMethods = methods.filter(name => 
        name.includes('analyze') || name.includes('begin')
      );
      
      console.log('Client created successfully');
      console.log('Available methods:', methods);
      console.log('Analyze methods:', analyzeMethods);

      return NextResponse.json({
        success: true,
        message: 'Document Intelligence クライアントが正常に作成されました',
        clientInfo: {
          hasBeginAnalyzeDocument: typeof client.beginAnalyzeDocument === 'function',
          availableMethods: analyzeMethods,
          totalMethods: methods.length
        },
        config: {
          endpoint: endpoint.substring(0, 20) + '...',
          keyProvided: !!key
        }
      });

    } catch (clientError) {
      console.error('Client creation error:', clientError);
      return NextResponse.json({
        error: 'クライアントの作成に失敗しました',
        details: clientError instanceof Error ? clientError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      error: 'デバッグ処理中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
