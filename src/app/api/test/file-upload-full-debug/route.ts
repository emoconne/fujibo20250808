import { NextRequest, NextResponse } from 'next/server';
import { UploadDocument } from '@/features/chat/chat-services/chat-document-service';
import { IndexDocuments } from '@/features/chat/chat-services/chat-document-service';
import { ensureIndexIsCreated } from '@/features/chat/chat-services/azure-cog-search/azure-cog-vector-store';

export async function POST(request: NextRequest) {
  const debugLog: string[] = [];
  
  try {
    debugLog.push('=== File Upload Full Debug API START ===');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが提供されていません' },
        { status: 400 }
      );
    }

    debugLog.push(`File details: ${file.name}, ${file.type}, ${file.size} bytes`);

    // ステップ1: インデックスの確認
    debugLog.push('Step 1: Checking Azure Search index...');
    try {
      await ensureIndexIsCreated();
      debugLog.push('✓ Azure Search index is ready');
    } catch (indexError) {
      debugLog.push(`✗ Index creation failed: ${indexError}`);
      return NextResponse.json({
        error: 'Azure Search index creation failed',
        details: indexError instanceof Error ? indexError.message : 'Unknown error',
        debugLog
      }, { status: 500 });
    }

    // ステップ2: ファイルアップロード処理
    debugLog.push('Step 2: Processing file upload...');
    let uploadResponse;
    try {
      uploadResponse = await UploadDocument(formData);
      debugLog.push(`✓ Upload response: success=${uploadResponse.success}, chunks=${uploadResponse.response.length}`);
      
      if (!uploadResponse.success) {
        debugLog.push(`✗ Upload failed: ${uploadResponse.error}`);
        return NextResponse.json({
          error: 'ファイルアップロード処理に失敗しました',
          details: uploadResponse.error,
          debugLog
        }, { status: 400 });
      }
    } catch (uploadError) {
      debugLog.push(`✗ Upload error: ${uploadError}`);
      return NextResponse.json({
        error: 'ファイルアップロード処理中にエラーが発生しました',
        details: uploadError instanceof Error ? uploadError.message : 'Unknown error',
        debugLog
      }, { status: 500 });
    }

    // ステップ3: インデックス作成処理
    debugLog.push('Step 3: Testing index creation...');
    const testChatThreadId = 'test-thread-' + Date.now();
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < Math.min(5, uploadResponse.response.length); i++) {
      const doc = uploadResponse.response[i];
      debugLog.push(`Indexing chunk ${i + 1}/${Math.min(5, uploadResponse.response.length)}`);
      
      try {
        const indexResponse = await IndexDocuments(
          file.name,
          [doc],
          testChatThreadId
        );

        if (!indexResponse.success) {
          const errorMsg = `Chunk ${i + 1} failed: ${indexResponse.error}`;
          debugLog.push(`✗ ${errorMsg}`);
          errors.push(errorMsg);
          errorCount++;
        } else {
          debugLog.push(`✓ Chunk ${i + 1} indexed successfully`);
          successCount++;
        }
      } catch (indexError) {
        const errorMsg = `Chunk ${i + 1} error: ${indexError}`;
        debugLog.push(`✗ ${errorMsg}`);
        errors.push(errorMsg);
        errorCount++;
      }
    }

    debugLog.push(`Indexing summary: ${successCount} success, ${errorCount} errors`);

    if (successCount > 0) {
      return NextResponse.json({
        success: true,
        message: 'ファイルアップロードとインデックス作成のテストが成功しました',
        results: {
          uploadSuccess: uploadResponse.success,
          chunksProcessed: Math.min(5, uploadResponse.response.length),
          totalChunks: uploadResponse.response.length,
          successCount,
          errorCount,
          testChatThreadId,
          errors
        },
        debugLog
      });
    } else {
      return NextResponse.json({
        error: 'すべてのインデックス作成に失敗しました',
        details: errors.join('; '),
        debugLog
      }, { status: 500 });
    }

  } catch (error) {
    debugLog.push(`✗ Unexpected error: ${error}`);
    return NextResponse.json({
      error: '予期しないエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      debugLog
    }, { status: 500 });
  }
}
