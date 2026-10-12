/**
 * src/shared/lib/image/compressor.ts
 * Клиентское сжатие фотоотчетов перед отправкой в Firebase Storage
 */

export interface ImageCompressionOptions {
  /** Максимальный размер большей стороны в пикселях (по умолчанию 1280) */
  maxDimension?: number;
  /** Качество сжатия от 0.0 до 1.0 (по умолчанию 0.8) */
  quality?: number;
  /** Предпочтительный MIME-тип ('image/webp' или 'image/jpeg') */
  mimeType?: 'image/webp' | 'image/jpeg';
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  compressionRatio: number;
}

/**
 * Сжимает изображение на клиенте с помощью HTML5 Canvas
 * @param source Исходный файл или Blob
 * @param options Настройки масштабирования и качества
 * @returns Промис с оптимизированным объектом File
 */
export const compressImage = async (
  source: File | Blob,
  options: ImageCompressionOptions = {}
): Promise<File> => {
  const {
    maxDimension = 1280,
    quality = 0.8,
    mimeType = 'image/webp'
  } = options;

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Сжатие изображений доступно только в браузерном окружении'));
      return;
    }

    const objectUrl = URL.createObjectURL(source);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Пропорциональный пересчет размеров
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Не удалось инициализировать 2D-контекст Canvas'));
        return;
      }

      // Качественная интерполяция при сжатии
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Сжатие в Blob с fallback
      const outputMimeType = mimeType;
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            // Если WebP не поддерживается, пробуем стандартный JPEG
            canvas.toBlob(
              (fallbackBlob) => {
                if (!fallbackBlob) {
                  reject(new Error('Ошибка генерации сжатого Blob'));
                  return;
                }
                const originalName = source instanceof File ? source.name : 'photo.jpg';
                const finalName = originalName.replace(/\.[^/.]+$/, '') + '.jpg';
                const resultFile = new File([fallbackBlob], finalName, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(resultFile);
              },
              'image/jpeg',
              quality
            );
            return;
          }

          const originalName = source instanceof File ? source.name : 'photo.webp';
          const extension = outputMimeType === 'image/webp' ? '.webp' : '.jpg';
          const finalName = originalName.replace(/\.[^/.]+$/, '') + extension;

          const resultFile = new File([blob], finalName, {
            type: outputMimeType,
            lastModified: Date.now()
          });

          resolve(resultFile);
        },
        outputMimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Не удалось прочитать исходное изображение'));
    };

    img.src = objectUrl;
  });
};

/**
 * Хелпер для сжатия с получением подробной статистики (размеры, степень сжатия)
 */
export const compressImageWithStats = async (
  source: File | Blob,
  options?: ImageCompressionOptions
): Promise<CompressionResult> => {
  const originalSize = source.size;
  const compressedFile = await compressImage(source, options);
  const compressedSize = compressedFile.size;
  const compressionRatio = originalSize > 0 ? Number(((1 - compressedSize / originalSize) * 100).toFixed(1)) : 0;

  // Определение итоговых габаритов
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(compressedFile);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        file: compressedFile,
        originalSize,
        compressedSize,
        width: img.width,
        height: img.height,
        compressionRatio
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        file: compressedFile,
        originalSize,
        compressedSize,
        width: 0,
        height: 0,
        compressionRatio
      });
    };
    img.src = objectUrl;
  });
};
