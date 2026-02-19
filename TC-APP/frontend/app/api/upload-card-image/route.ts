import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../utils/supabase/server';
import { processCardImage, ImageProcessingError } from '../../../lib/image-processor';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface ImageUploadResult {
  url: string;
  originalSize: number;
  processedSize: number;
  dimensions: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です。ログインしてください。' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const frontFile = formData.get('front') as File | null;
    const backFile = formData.get('back') as File | null;

    if (!frontFile && !backFile) {
      return NextResponse.json(
        { success: false, error: '画像ファイルが必要です。' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const results: { front?: ImageUploadResult; back?: ImageUploadResult } = {};

    const processAndUpload = async (
      file: File,
      side: 'front' | 'back'
    ): Promise<ImageUploadResult> => {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new ImageProcessingError(
          'ファイル形式が無効です。JPEG、PNG、WebPのみ対応しています。'
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new ImageProcessingError(
          'ファイルサイズが大きすぎます。最大10MBまでです。'
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const originalSize = buffer.length;

      const processed = await processCardImage(buffer, file.name);

      const storagePath = `${user.id}/${timestamp}_${side}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('card-images')
        .upload(storagePath, processed.buffer, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          'アップロードに失敗しました。もう一度お試しください。'
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('card-images').getPublicUrl(storagePath);

      return {
        url: publicUrl,
        originalSize,
        processedSize: processed.metadata.size,
        dimensions: `${processed.metadata.width}x${processed.metadata.height}`,
      };
    };

    if (frontFile) {
      results.front = await processAndUpload(frontFile, 'front');
    }

    if (backFile) {
      results.back = await processAndUpload(backFile, 'back');
    }

    return NextResponse.json({
      success: true,
      images: results,
    });
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    console.error('Upload error:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'アップロードに失敗しました。もう一度お試しください。';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
