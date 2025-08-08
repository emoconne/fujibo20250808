#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// 環境変数を読み込み
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function testDocumentIntelligence(filePath) {
  try {
    console.log('=== Document Intelligence Test Script ===');
    console.log(`Testing file: ${filePath}`);

    // ファイルの存在確認
    if (!fs.existsSync(filePath)) {
      console.error('❌ ファイルが見つかりません:', filePath);
      process.exit(1);
    }

    // ファイル情報を取得
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    
    console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`File name: ${fileName}`);

    // ファイルを読み込み
    const fileBuffer = fs.readFileSync(filePath);
    
    // FormDataを作成
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: getContentType(fileName)
    });

    console.log('🚀 Document Intelligence APIにリクエストを送信中...');

    // APIにリクエストを送信
    const response = await fetch('http://localhost:3000/api/test/document-intelligence', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API エラー:', response.status, errorText);
      process.exit(1);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ テスト成功!');
      console.log('\n📊 結果サマリー:');
      console.log(`   ファイル名: ${result.fileName}`);
      console.log(`   ファイルサイズ: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   ページ数: ${result.extraction.pages}`);
      console.log(`   信頼度: ${(result.extraction.confidence * 100).toFixed(1)}%`);
      console.log(`   ワード数: ${result.extraction.wordCount}`);
      console.log(`   処理時間: ${result.extraction.processingTime}ms`);
      console.log(`   チャンク数: ${result.chunking.totalChunks}`);
      console.log(`   平均チャンクサイズ: ${result.chunking.averageChunkSize}文字`);
      
      console.log('\n📝 抽出されたテキスト（サンプル）:');
      console.log('─'.repeat(50));
      console.log(result.sampleContent);
      console.log('─'.repeat(50));
    } else {
      console.error('❌ テスト失敗:', result.message || result.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ スクリプトエラー:', error.message);
    process.exit(1);
  }
}

function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const contentTypes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

// コマンドライン引数を処理
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('使用方法: node scripts/test-document-intelligence.js <ファイルパス>');
  console.log('例: node scripts/test-document-intelligence.js ./test-files/sample.pdf');
  process.exit(1);
}

const filePath = args[0];

// サーバーが起動しているかチェック
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/test/document-intelligence');
    if (response.ok) {
      return true;
    }
  } catch (error) {
    // サーバーが起動していない
  }
  return false;
}

async function main() {
  console.log('🔍 サーバーの起動を確認中...');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('❌ サーバーが起動していません。先に `npm run dev` を実行してください。');
    process.exit(1);
  }
  
  console.log('✅ サーバーが起動しています');
  
  await testDocumentIntelligence(filePath);
}

main();
