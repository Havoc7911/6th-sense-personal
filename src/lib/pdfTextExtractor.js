/**
 * pdfTextExtractor.js
 * Client-side PDF text extraction and file handling utility.
 * Decodes PDF streams using browser-native DecompressionStream and extracts text strings.
 */

/**
 * Extracts plain text from an uploaded PDF File or Blob.
 */
export async function extractTextFromPdf(file) {
  if (!file) return '';

  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const latin1String = new TextDecoder('latin1').decode(bytes);

    // Look for stream ... endstream blocks
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;
    const extractedBlocks = [];

    while ((match = streamRegex.exec(latin1String)) !== null) {
      const streamContent = match[1];
      const streamStart = match.index;
      // Look back for dictionary before the stream
      const dictChunk = latin1String.slice(Math.max(0, streamStart - 400), streamStart);

      // Check if compressed with FlateDecode
      const isFlate = /\/FlateDecode/.test(dictChunk);

      if (isFlate) {
        try {
          const rawBytes = new Uint8Array(streamContent.length);
          for (let i = 0; i < streamContent.length; i++) {
            rawBytes[i] = streamContent.charCodeAt(i) & 0xff;
          }

          if (typeof DecompressionStream !== 'undefined') {
            const ds = new DecompressionStream('deflate');
            const writer = ds.writable.getWriter();
            writer.write(rawBytes);
            writer.close();
            const decompressedBuffer = await new Response(ds.readable).arrayBuffer();
            const decompressedText = new TextDecoder('latin1').decode(decompressedBuffer);
            const textLines = extractTextFromPdfStream(decompressedText);
            if (textLines) extractedBlocks.push(textLines);
          }
        } catch {
          // If stream decompression fails for an image/font stream, ignore silently
        }
      } else {
        const textLines = extractTextFromPdfStream(streamContent);
        if (textLines) extractedBlocks.push(textLines);
      }
    }

    if (extractedBlocks.length > 0) {
      return extractedBlocks.join('\n\n');
    }

    // Fallback: extract literal string tokens (text in parentheses)
    const fallbackMatches = latin1String.match(/\(([^()]{3,})\)/g) || [];
    const cleanTokens = fallbackMatches
      .map(m => m.slice(1, -1).replace(/\\[rntbf]/g, ' ').trim())
      .filter(t => t.length > 2 && !/^[\x00-\x1f]+$/.test(t) && /[a-zA-Z0-9]/.test(t));

    return cleanTokens.join(' ');
  } catch (err) {
    console.warn('PDF extraction notice:', err);
    return '';
  }
}

/**
 * Extracts strings from inside a PDF content stream (between BT and ET).
 */
function extractTextFromPdfStream(streamText) {
  const btEtRegex = /BT[\r\n]+([\s\S]*?)[\r\n]+ET/g;
  let blockMatch;
  const lines = [];

  while ((blockMatch = btEtRegex.exec(streamText)) !== null) {
    const textChunk = blockMatch[1];
    // Find strings in ( ... ) or [ ... ]
    const tjMatch = textChunk.match(/\((.*?)\)\s*T[jJ]|\((.*?)\)\s*['"]/g);
    if (tjMatch) {
      tjMatch.forEach(m => {
        const inner = m.replace(/^\(/, '').replace(/\)\s*.*$/, '');
        if (inner && inner.length > 0) {
          lines.push(inner.replace(/\\([()\\])/g, '$1').replace(/\\[rnt]/g, ' '));
        }
      });
    }

    // Also match array of strings: [(...) ... (...)] TJ
    const arrayMatch = textChunk.match(/\[([\s\S]*?)\]\s*TJ/g);
    if (arrayMatch) {
      arrayMatch.forEach(arr => {
        const parts = arr.match(/\((.*?)\)/g);
        if (parts) {
          const joined = parts.map(p => p.slice(1, -1).replace(/\\([()\\])/g, '$1')).join('');
          if (joined) lines.push(joined);
        }
      });
    }
  }

  return lines.join(' ');
}

/**
 * Reads a File into a base64 Data URL for persistent storage and in-browser preview.
 */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
