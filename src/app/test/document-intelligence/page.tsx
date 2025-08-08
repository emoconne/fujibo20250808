"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, CheckCircle, XCircle, Upload } from 'lucide-react';

interface TestResult {
  success: boolean;
  fileName?: string;
  fileSize?: number;
  extraction?: {
    pages: number;
    confidence: number;
    wordCount: number;
    processingTime: number;
    contentLength: number;
  };
  chunking?: {
    totalChunks: number;
    averageChunkSize: number;
    totalWords: number;
  };
  sampleContent?: string;
  message?: string;
  error?: string;
}

export default function DocumentIntelligenceTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleTest = async () => {
    if (!file) return;

    setIsLoading(true);
    setProgress(0);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      setProgress(25);

      const response = await fetch('/api/test/document-intelligence', {
        method: 'POST',
        body: formData,
      });

      setProgress(75);

      const data = await response.json();
      setResult(data);

      setProgress(100);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'テストの実行中にエラーが発生しました'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Document Intelligence テスト</h1>
        <p className="text-muted-foreground">
          Azure Document Intelligenceの処理をテストできます。PDF、画像ファイルなどをアップロードしてテキスト抽出の結果を確認してください。
        </p>
      </div>

      <div className="grid gap-6">
        {/* ファイルアップロード */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              ファイル選択
            </CardTitle>
            <CardDescription>
              テストしたいファイルを選択してください（PDF、画像ファイル対応）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.bmp,.tiff,.tif,.heic,.heif,.webp,.gif"
                  onChange={handleFileChange}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleTest} 
                  disabled={!file || isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      テスト中...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      テスト実行
                    </>
                  )}
                </Button>
              </div>

              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>選択されたファイル:</span>
                  <Badge variant="outline">{file.name}</Badge>
                  <Badge variant="secondary">{formatFileSize(file.size)}</Badge>
                </div>
              )}

              {isLoading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>処理中...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 結果表示 */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                テスト結果
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.success ? (
                <div className="space-y-6">
                  {/* 基本情報 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">ファイル情報</h3>
                      <div className="space-y-1 text-sm">
                        <div>ファイル名: {result.fileName}</div>
                        <div>サイズ: {result.fileSize && formatFileSize(result.fileSize)}</div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">抽出結果</h3>
                      <div className="space-y-1 text-sm">
                        <div>ページ数: {result.extraction?.pages}</div>
                        <div>信頼度: {(result.extraction?.confidence || 0) * 100}%</div>
                        <div>ワード数: {result.extraction?.wordCount}</div>
                        <div>処理時間: {result.extraction?.processingTime && formatTime(result.extraction.processingTime)}</div>
                      </div>
                    </div>
                  </div>

                  {/* チャンク分割情報 */}
                  {result.chunking && (
                    <div>
                      <h3 className="font-semibold mb-2">チャンク分割</h3>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>総チャンク数: {result.chunking.totalChunks}</div>
                        <div>平均チャンクサイズ: {result.chunking.averageChunkSize}文字</div>
                        <div>総ワード数: {result.chunking.totalWords}</div>
                      </div>
                    </div>
                  )}

                  {/* サンプルコンテンツ */}
                  {result.sampleContent && (
                    <div>
                      <h3 className="font-semibold mb-2">抽出されたテキスト（サンプル）</h3>
                      <div className="bg-muted p-4 rounded-md text-sm max-h-40 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">{result.sampleContent}</pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {result.message || result.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
