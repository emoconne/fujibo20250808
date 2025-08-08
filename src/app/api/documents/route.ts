import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { getDocuments, getStats } from "@/features/documents/document-management-service";

export async function GET(request: NextRequest) {
  try {
    console.log('=== Documents API GET START ===');
    
    const session = await getServerSession(authOptions);
    console.log('Session:', { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      isAdmin: session?.user?.isAdmin 
    });
    
    if (!session?.user) {
      console.log('Authentication required');
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      console.log('Admin permission required');
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    console.log('Fetching documents...');
    const documents = await getDocuments();
    console.log('Documents fetched:', documents.length);
    
    console.log('Fetching stats...');
    const stats = await getStats();
    console.log('Stats fetched:', stats);
    
    return NextResponse.json({
      documents,
      stats,
      total: documents.length
    });

  } catch (error) {
    console.error("=== Documents API ERROR ===");
    console.error("ドキュメント一覧取得エラー:", {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    });
    return NextResponse.json(
      { error: "ドキュメント一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
} 