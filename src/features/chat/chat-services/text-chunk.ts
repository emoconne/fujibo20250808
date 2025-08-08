const chunkSize = 1000;
const chunkOverlap = 200;

export interface TextChunk {
  content: string;
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
  wordCount: number;
}

export function chunkDocumentWithOverlap(document: string): TextChunk[] {
  const chunks: TextChunk[] = [];

  if (document.length <= chunkSize) {
    // If the document is smaller than the desired chunk size, return it as a single chunk.
    chunks.push({
      content: document,
      startIndex: 0,
      endIndex: document.length,
      chunkIndex: 0,
      wordCount: document.split(/\s+/).length
    });
    return chunks;
  }

  let startIndex = 0;
  let chunkIndex = 0;

  // Split the document into chunks of the desired size, with overlap.
  while (startIndex < document.length) {
    const endIndex = startIndex + chunkSize;
    const chunk = document.substring(startIndex, endIndex);
    
    // 段落の境界を尊重してチャンクを調整
    const adjustedEndIndex = findParagraphBoundary(document, endIndex);
    const adjustedChunk = document.substring(startIndex, adjustedEndIndex);
    
    chunks.push({
      content: adjustedChunk,
      startIndex: startIndex,
      endIndex: adjustedEndIndex,
      chunkIndex: chunkIndex,
      wordCount: adjustedChunk.split(/\s+/).length
    });
    
    startIndex = adjustedEndIndex - chunkOverlap;
    chunkIndex++;
  }

  return chunks;
}

// 段落の境界を見つけるヘルパー関数
function findParagraphBoundary(document: string, targetIndex: number): number {
  // 目標位置から後ろに段落の境界を探す
  for (let i = targetIndex; i < Math.min(targetIndex + 200, document.length); i++) {
    if (document[i] === '\n' && (i + 1 >= document.length || document[i + 1] === '\n')) {
      return i + 1;
    }
  }
  
  // 段落の境界が見つからない場合は、単語の境界を探す
  for (let i = targetIndex; i < Math.min(targetIndex + 100, document.length); i++) {
    if (document[i] === ' ' || document[i] === '\t') {
      return i;
    }
  }
  
  return targetIndex;
}

// Document Intelligenceで抽出されたテキスト用の特別なチャンク分割
export function chunkDocumentIntelligenceText(document: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  
  // セクション（テーブル、キー・値ペア、リスト）で分割
  const sections = splitIntoSections(document);
  
  let globalIndex = 0;
  let chunkIndex = 0;
  
  for (const section of sections) {
    if (section.content.length <= chunkSize) {
      // セクションが小さい場合はそのまま追加
      chunks.push({
        content: section.content,
        startIndex: globalIndex,
        endIndex: globalIndex + section.content.length,
        chunkIndex: chunkIndex,
        wordCount: section.content.split(/\s+/).length
      });
      globalIndex += section.content.length;
      chunkIndex++;
    } else {
      // セクションが大きい場合はさらに分割
      const subChunks = chunkDocumentWithOverlap(section.content);
      for (const subChunk of subChunks) {
        chunks.push({
          content: subChunk.content,
          startIndex: globalIndex + subChunk.startIndex,
          endIndex: globalIndex + subChunk.endIndex,
          chunkIndex: chunkIndex,
          wordCount: subChunk.wordCount
        });
        chunkIndex++;
      }
      globalIndex += section.content.length;
    }
  }
  
  return chunks;
}

// Document Intelligenceの出力をセクションに分割
function splitIntoSections(document: string): Array<{content: string, type: string}> {
  const sections: Array<{content: string, type: string}> = [];
  const lines = document.split('\n');
  
  let currentSection = '';
  let currentType = 'text';
  
  for (const line of lines) {
    if (line.includes('--- テーブル ---')) {
      if (currentSection.trim()) {
        sections.push({ content: currentSection.trim(), type: currentType });
      }
      currentSection = line + '\n';
      currentType = 'table';
    } else if (line.includes('--- キー・値ペア ---')) {
      if (currentSection.trim()) {
        sections.push({ content: currentSection.trim(), type: currentType });
      }
      currentSection = line + '\n';
      currentType = 'keyvalue';
    } else if (line.includes('--- リスト ---')) {
      if (currentSection.trim()) {
        sections.push({ content: currentSection.trim(), type: currentType });
      }
      currentSection = line + '\n';
      currentType = 'list';
    } else {
      currentSection += line + '\n';
    }
  }
  
  // 最後のセクションを追加
  if (currentSection.trim()) {
    sections.push({ content: currentSection.trim(), type: currentType });
  }
  
  return sections;
}
