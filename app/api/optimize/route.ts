import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

const MAX_FILE_SIZE = 75 * 1024 * 1024; // 75 MB

// Detect input format from buffer
function detectFormat(buffer: Buffer): string {
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  // WebP: RIFF....WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'webp';
  // GIF: GIF89a or GIF87a
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'gif';
  // BMP: BM
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) return 'bmp';
  // AVIF: ....ftypavif or ....ftypavis
  if (buffer.length > 11) {
    const ftypSlice = buffer.slice(4, 12).toString('ascii');
    if (ftypSlice.startsWith('ftyp') && (ftypSlice.includes('avif') || ftypSlice.includes('avis'))) return 'avif';
  }
  return 'jpeg'; // fallback
}

function mimeForFormat(fmt: string): string {
  const map: Record<string, string> = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif',
    bmp: 'image/bmp',
  };
  return map[fmt] || 'application/octet-stream';
}

async function compressImage(inputBuffer: Buffer, inputFormat: string, outputFormat: string): Promise<Buffer> {
  let pipeline = sharp(inputBuffer);

  // For formats that don't support transparency converting to JPEG, flatten with white bg
  if (outputFormat === 'jpeg' && (inputFormat === 'png' || inputFormat === 'webp' || inputFormat === 'avif' || inputFormat === 'gif')) {
    pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
  }

  switch (outputFormat) {
    case 'png':
      // Palette quantization -- the key setting that matches TinyPNG
      return pipeline.png({ compressionLevel: 9, palette: true, quality: 100 }).toBuffer();
    case 'jpeg':
      // MozJPEG encoder at Q78 -- matches TinyPNG Q75-80 range
      return pipeline.jpeg({ quality: 78, mozjpeg: true }).toBuffer();
    case 'webp':
      // libwebp at Q78
      return pipeline.webp({ quality: 78 }).toBuffer();
    case 'avif':
      // AVIF Q60 is visually equivalent to JPEG Q78
      return pipeline.avif({ quality: 60 }).toBuffer();
    default:
      // For GIF/BMP input with "original" format, convert to PNG with palette
      return pipeline.png({ compressionLevel: 9, palette: true, quality: 100 }).toBuffer();
  }
}

function resolveOutputFormat(inputFormat: string, requestedFormat: string): string {
  if (requestedFormat && requestedFormat !== 'original') {
    return requestedFormat;
  }
  // Keep original format, but for GIF/BMP default to PNG optimization
  if (inputFormat === 'gif' || inputFormat === 'bmp') return 'png';
  return inputFormat;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let inputBuffer: Buffer;
    let requestedFormat = 'original';

    if (contentType.includes('multipart/form-data')) {
      // Browser upload mode -- no API key required (same-origin)
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File exceeds 75 MB limit' }, { status: 413 });
      }
      requestedFormat = (formData.get('format') as string) || 'original';
      inputBuffer = Buffer.from(await file.arrayBuffer());

    } else {
      // Agent/programmatic JSON mode -- API key required
      const apiKey = request.headers.get('x-api-key');
      const expectedKey = process.env.OPTIMIZER_API_KEY;
      const trimmedExpected = expectedKey?.trim();
      const trimmedApi = apiKey?.trim();
      console.log('ENV_CHECK len:', expectedKey?.length, 'api_len:', apiKey?.length, 'trimMatch:', trimmedApi === trimmedExpected);
      if (!expectedKey || apiKey !== expectedKey) {
        return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
      }

      let body: { url?: string; format?: string };
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }

      if (!body.url) {
        return NextResponse.json({ error: 'URL required for programmatic access' }, { status: 400 });
      }

      // Fetch image from URL
      const res = await fetch(body.url);
      if (!res.ok) {
        return NextResponse.json({ error: `Failed to fetch image: ${res.status}` }, { status: 400 });
      }
      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File exceeds 75 MB limit' }, { status: 413 });
      }
      inputBuffer = Buffer.from(arrayBuffer);
      requestedFormat = body.format || 'original';
    }

    // Detect input format
    const inputFormat = detectFormat(inputBuffer);
    const outputFormat = resolveOutputFormat(inputFormat, requestedFormat);

    // Validate output format
    const validFormats = ['png', 'jpeg', 'webp', 'avif'];
    if (!validFormats.includes(outputFormat)) {
      return NextResponse.json({ error: `Unsupported output format: ${outputFormat}` }, { status: 415 });
    }

    // Compress
    const originalSize = inputBuffer.length;
    const compressedBuffer = await compressImage(inputBuffer, inputFormat, outputFormat);
    const compressedSize = compressedBuffer.length;

    // If compressed is larger than original and same format, return original
    const finalBuffer = (compressedSize >= originalSize && outputFormat === inputFormat) ? inputBuffer : compressedBuffer;
    const finalSize = finalBuffer.length;
    const savingsPct = Math.max(0, Math.round((1 - finalSize / originalSize) * 100));

    return new NextResponse(new Uint8Array(finalBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeForFormat(outputFormat),
        'X-Original-Size': String(originalSize),
        'X-Compressed-Size': String(finalSize),
        'X-Savings-Pct': String(savingsPct),
        'X-Output-Format': outputFormat,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Optimization error:', err);
    return NextResponse.json(
      { error: 'Processing failed', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
