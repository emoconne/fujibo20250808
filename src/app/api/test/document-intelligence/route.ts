import { NextRequest, NextResponse } from 'next/server';
import { testDocumentIntelligence } from '@/features/documents/document-intelligence-test';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが提供されていません' },
        { status: 400 }
      );
    }

    console.log('Document Intelligence Test API: Received file', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // ファイルをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer();

    // Document Intelligenceのテストを実行
    const result = await testDocumentIntelligence(arrayBuffer, file.name);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }

  } catch (error) {
    console.error('Document Intelligence Test API Error:', error);
    return NextResponse.json(
      { 
        error: 'テストの実行中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Document Intelligence Test API',
    usage: 'POST /api/test/document-intelligence with file in formData',
    supportedFormats: ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.heic', '.heif', '.webp', '.gif'],
    maxFileSize: '500MB'
  });
}
