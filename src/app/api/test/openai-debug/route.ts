import { NextResponse } from 'next/server';
import { OpenAIEmbeddingInstance } from '@/features/common/openai';

export async function GET() {
  try {
    console.log('=== OpenAI Debug API ===');
    
    // 環境変数の確認
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openaiInstanceName = process.env.AZURE_OPENAI_API_INSTANCE_NAME;
    const openaiEmbeddingsDeployment = process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME;
    const openaiApiVersion = process.env.AZURE_OPENAI_API_VERSION;
    
    console.log('OpenAI environment variables:', {
      hasApiKey: !!openaiApiKey,
      hasInstanceName: !!openaiInstanceName,
      hasEmbeddingsDeployment: !!openaiEmbeddingsDeployment,
      hasApiVersion: !!openaiApiVersion,
      instanceName: openaiInstanceName,
      embeddingsDeployment: openaiEmbeddingsDeployment,
      apiVersion: openaiApiVersion
    });

    if (!openaiApiKey || !openaiInstanceName || !openaiEmbeddingsDeployment || !openaiApiVersion) {
      return NextResponse.json({
        error: 'OpenAI APIの環境変数が設定されていません',
        missing: {
          apiKey: !openaiApiKey,
          instanceName: !openaiInstanceName,
          embeddingsDeployment: !openaiEmbeddingsDeployment,
          apiVersion: !openaiApiVersion
        }
      }, { status: 400 });
    }

    // OpenAI APIのテスト
    try {
      console.log('Testing OpenAI embeddings API...');
      const openai = OpenAIEmbeddingInstance();
      
      const testEmbedding = await openai.embeddings.create({
        input: "This is a test message for embedding generation.",
        model: openaiEmbeddingsDeployment,
      });

      console.log('OpenAI embeddings test successful');
      
      return NextResponse.json({
        success: true,
        message: 'OpenAI APIの設定が正常です',
        testResult: {
          embeddingLength: testEmbedding.data[0].embedding.length,
          model: openaiEmbeddingsDeployment
        },
        config: {
          instanceName: openaiInstanceName,
          embeddingsDeployment: openaiEmbeddingsDeployment,
          apiVersion: openaiApiVersion
        }
      });

    } catch (apiError) {
      console.error('OpenAI API test error:', apiError);
      return NextResponse.json({
        error: 'OpenAI APIのテストに失敗しました',
        details: apiError instanceof Error ? apiError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('OpenAI Debug API error:', error);
    return NextResponse.json({
      error: 'OpenAI APIのデバッグ処理中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
