"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  FileText, 
  Trash2, 
  Download, 
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Tag,
  FolderOpen,
  BarChart3,
  RefreshCw,
  Filter,
  Grid,
  List,
  FileUp,
  Settings,
  Users,
  Calendar
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useGlobalMessageContext } from "@/features/global-message/global-message-context";

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  pages: number;
  confidence: number;
  categories?: string[];
  tags?: string[];
  description?: string;
}

interface DocumentStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalSize: number;
  indexStats: { documentCount: number; storageSize: number };
}

export const DocumentsManagement = () => {
  const { data: session } = useSession();
  const { showSuccess, showError } = useGlobalMessageContext();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [showBatchUpload, setShowBatchUpload] = useState(false);

  // ドキュメント一覧を取得
  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        showError('ドキュメント一覧の取得に失敗しました');
      }
    } catch (error) {
      showError('ドキュメント一覧の取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ファイルアップロード
  const handleFileUpload = async () => {
    if (!selectedFile) {
      showError('ファイルを選択してください');
      return;
    }

    try {
      setIsLoading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        showSuccess('ファイルが正常にアップロードされました');
        setSelectedFile(null);
        fetchDocuments(); // 一覧を更新
      } else {
        const errorData = await response.json();
        showError(errorData.message || 'アップロードに失敗しました');
      }
    } catch (error) {
      showError('アップロード中にエラーが発生しました');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  // ファイル削除
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('このドキュメントを削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSuccess('ドキュメントが削除されました');
        fetchDocuments(); // 一覧を更新
      } else {
        showError('削除に失敗しました');
      }
    } catch (error) {
      showError('削除中にエラーが発生しました');
    }
  };

  // ファイルダウンロード
  const handleDownloadDocument = async (document: Document) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = document.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        showError('ダウンロードに失敗しました');
      }
    } catch (error) {
      showError('ダウンロード中にエラーが発生しました');
    }
  };

  // ファイルサイズを人間が読みやすい形式に変換
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ステータスバッジを取得
  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'uploaded':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />アップロード済み</Badge>;
      case 'processing':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />処理中</Badge>;
      case 'completed':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />完了</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />エラー</Badge>;
      default:
        return <Badge variant="secondary">不明</Badge>;
    }
  };

  // 検索フィルター
  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchDocuments();
  }, []);

  if (!session?.user?.isAdmin) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">アクセス権限がありません</h2>
              <p className="text-muted-foreground">この機能は管理者のみが利用できます。</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">ドキュメント管理</h1>
        <p className="text-muted-foreground">
          AI Searchにアップロードされたドキュメントの管理を行います
        </p>
      </div>

      {/* ファイルアップロードセクション */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            ファイルアップロード
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
              className="flex-1"
            />
            <Button 
              onClick={handleFileUpload}
              disabled={!selectedFile || isLoading}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              アップロード
            </Button>
          </div>
          {selectedFile && (
            <div className="text-sm text-muted-foreground">
              選択されたファイル: {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </div>
          )}
        </CardContent>
      </Card>

      {/* ドキュメント一覧セクション */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              アップロード済みドキュメント
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="ドキュメントを検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button 
                onClick={fetchDocuments}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                更新
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">読み込み中...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? '検索条件に一致するドキュメントが見つかりません' : 'アップロードされたドキュメントがありません'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ファイル名</TableHead>
                  <TableHead>サイズ</TableHead>
                  <TableHead>アップロード日時</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        {document.name}
                      </div>
                    </TableCell>
                    <TableCell>{formatFileSize(document.size)}</TableCell>
                    <TableCell>
                      {new Date(document.uploadDate).toLocaleDateString('ja-JP')}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(document.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadDocument(document)}
                          disabled={document.status !== 'completed'}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteDocument(document.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 