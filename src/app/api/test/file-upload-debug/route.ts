import { NextRequest, NextResponse } from 'next/server';
import { UploadDocument } from '@/features/chat/chat-services/chat-document-service';
import { IndexDocuments } from '@/features/chat/chat-services/chat-document-service';

export async function POST(request: NextRequest) {
  try {
    console.log('=== File Upload Debug API ===');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが提供されていません' },
        { status: 400 }
      );
    }

    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // ステップ1: ファイルアップロード処理のテスト
    console.log('Step 1: Testing file upload processing...');
    try {
      const uploadResponse = await UploadDocument(formData);
      console.log('Upload response:', uploadResponse);

      if (!uploadResponse.success) {
        return NextResponse.json({
          error: 'ファイルアップロード処理に失敗しました',
          details: uploadResponse.error
        }, { status: 400 });
      }

      // ステップ2: インデックス作成処理のテスト
      console.log('Step 2: Testing index creation...');
      const testChatThreadId = 'test-thread-' + Date.now();
      
      for (let i = 0; i < Math.min(3, uploadResponse.response.length); i++) {
        const doc = uploadResponse.response[i];
        console.log(`Indexing chunk ${i + 1}/${Math.min(3, uploadResponse.response.length)}`);
        
        try {
          const indexResponse = await IndexDocuments(
            file.name,
            [doc],
            testChatThreadId
          );

          if (!indexResponse.success) {
            return NextResponse.json({
              error: 'インデックス作成に失敗しました',
              step: 'indexing',
              chunkIndex: i,
              details: indexResponse.error
            }, { status: 400 });
          }
          
          console.log(`Chunk ${i + 1} indexed successfully`);
        } catch (indexError) {
          return NextResponse.json({
            error: 'インデックス作成中にエラーが発生しました',
            step: 'indexing',
            chunkIndex: i,
            details: indexError instanceof Error ? indexError.message : 'Unknown error'
          }, { status: 500 });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'ファイルアップロードとインデックス作成のテストが成功しました',
        results: {
          uploadSuccess: uploadResponse.success,
          chunksProcessed: Math.min(3, uploadResponse.response.length),
          totalChunks: uploadResponse.response.length,
          testChatThreadId: testChatThreadId
        }
      });

    } catch (uploadError) {
      console.error('Upload processing error:', uploadError);
      return NextResponse.json({
        error: 'ファイルアップロード処理中にエラーが発生しました',
        step: 'upload',
        details: uploadError instanceof Error ? uploadError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('File Upload Debug API error:', error);
    return NextResponse.json({
      error: 'ファイルアップロードデバッグ処理中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
