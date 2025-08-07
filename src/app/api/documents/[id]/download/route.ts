import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { downloadDocument } from "@/features/documents/document-management-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const documentId = params.id;

    if (!documentId) {
      return NextResponse.json({ error: "ドキュメントIDが必要です" }, { status: 400 });
    }

    const downloadResult = await downloadDocument(documentId);

    return new NextResponse(downloadResult.data, {
      status: 200,
      headers: {
        'Content-Type': downloadResult.contentType,
        'Content-Disposition': `attachment; filename="${downloadResult.fileName}"`
      }
    });

  } catch (error) {
    console.error("ドキュメントダウンロードエラー:", error);
    return NextResponse.json(
      { error: "ドキュメントのダウンロードに失敗しました" },
      { status: 500 }
    );
  }
} 