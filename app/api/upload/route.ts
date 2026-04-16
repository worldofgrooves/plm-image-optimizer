import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            'image/png',
            'image/jpeg',
            'image/webp',
            'image/avif',
            'image/gif',
            'image/bmp',
          ],
          maximumSizeInBytes: 75 * 1024 * 1024, // 75 MB
        };
      },
      onUploadCompleted: async () => {
        // No-op -- blob cleanup happens after optimization
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
