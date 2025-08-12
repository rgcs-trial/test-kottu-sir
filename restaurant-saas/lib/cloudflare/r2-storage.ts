/**
 * Cloudflare R2 Storage Utilities
 * Provides file upload, management, and optimization for restaurant assets
 */

import type { CloudflareEnv } from '../../env';

export interface R2Bucket {
  get(key: string, options?: R2GetOptions): Promise<R2Object | null>;
  put(key: string, value: ArrayBuffer | ArrayBufferView | string | null | ReadableStream, options?: R2PutOptions): Promise<R2Object>;
  delete(key: string | string[]): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
  head(key: string): Promise<R2Object | null>;
  createMultipartUpload(key: string, options?: R2CreateMultipartUploadOptions): Promise<R2MultipartUpload>;
}

interface R2GetOptions {
  onlyIf?: R2Conditional;
  range?: R2Range;
}

interface R2PutOptions {
  onlyIf?: R2Conditional;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  md5?: ArrayBuffer;
  sha1?: ArrayBuffer;
  sha256?: ArrayBuffer;
  sha384?: ArrayBuffer;
  sha512?: ArrayBuffer;
}

interface R2ListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
  delimiter?: string;
  startAfter?: string;
  include?: ('httpMetadata' | 'customMetadata')[];
}

interface R2Object {
  key: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  checksums: R2Checksums;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  range?: R2Range;
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T>(): Promise<T>;
  blob(): Promise<Blob>;
}

interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes: string[];
}

/**
 * File Upload and Management for Restaurant Assets
 */
export class R2FileManager {
  private uploads: R2Bucket;
  private assets: R2Bucket;
  private cache: R2Bucket;
  private baseUrl: string;

  constructor(env: CloudflareEnv) {
    this.uploads = env.UPLOADS_BUCKET;
    this.assets = env.ASSETS_BUCKET;
    this.cache = env.CACHE_BUCKET;
    this.baseUrl = env.CDN_URL || 'https://cdn.restaurantsaas.com';
  }

  /**
   * Upload file to R2 with automatic optimization
   */
  async uploadFile(
    file: File | ArrayBuffer | ReadableStream,
    key: string,
    options: {
      bucket?: 'uploads' | 'assets' | 'cache';
      contentType?: string;
      metadata?: Record<string, string>;
      optimize?: boolean;
      resize?: { width?: number; height?: number; quality?: number };
    } = {}
  ): Promise<{ url: string; key: string; size: number }> {
    const bucket = this.getBucket(options.bucket || 'uploads');
    
    // Prepare file data
    let fileData: ArrayBuffer | ReadableStream;
    let contentType = options.contentType;
    
    if (file instanceof File) {
      fileData = await file.arrayBuffer();
      contentType = contentType || file.type;
    } else {
      fileData = file;
    }

    // Optimize image if requested
    if (options.optimize && this.isImage(contentType)) {
      fileData = await this.optimizeImage(fileData as ArrayBuffer, options.resize);
    }

    // Generate unique key if not provided
    const finalKey = key.includes('/') ? key : `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${key}`;

    // Upload to R2
    const result = await bucket.put(finalKey, fileData, {
      httpMetadata: {
        contentType: contentType || 'application/octet-stream',
        cacheControl: 'public, max-age=31536000',
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        originalName: file instanceof File ? file.name : key,
        ...options.metadata,
      },
    });

    return {
      url: `${this.baseUrl}/${finalKey}`,
      key: finalKey,
      size: result.size,
    };
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: Array<{ file: File | ArrayBuffer; key: string; options?: any }>,
    bucketType: 'uploads' | 'assets' | 'cache' = 'uploads'
  ): Promise<Array<{ url: string; key: string; size: number }>> {
    const results = await Promise.all(
      files.map(({ file, key, options = {} }) =>
        this.uploadFile(file, key, { ...options, bucket: bucketType })
      )
    );
    return results;
  }

  /**
   * Get file from R2
   */
  async getFile(
    key: string,
    bucket: 'uploads' | 'assets' | 'cache' = 'uploads'
  ): Promise<R2Object | null> {
    const r2Bucket = this.getBucket(bucket);
    return await r2Bucket.get(key);
  }

  /**
   * Delete file from R2
   */
  async deleteFile(
    key: string | string[],
    bucket: 'uploads' | 'assets' | 'cache' = 'uploads'
  ): Promise<void> {
    const r2Bucket = this.getBucket(bucket);
    await r2Bucket.delete(key);
  }

  /**
   * List files in bucket
   */
  async listFiles(options: {
    bucket?: 'uploads' | 'assets' | 'cache';
    prefix?: string;
    limit?: number;
    cursor?: string;
  } = {}): Promise<R2Objects> {
    const bucket = this.getBucket(options.bucket || 'uploads');
    return await bucket.list({
      prefix: options.prefix,
      limit: options.limit || 100,
      cursor: options.cursor,
      include: ['httpMetadata', 'customMetadata'],
    });
  }

  /**
   * Generate signed URL for private files
   */
  async getSignedUrl(
    key: string,
    expirationMinutes = 60,
    bucket: 'uploads' | 'assets' | 'cache' = 'uploads'
  ): Promise<string> {
    // Note: R2 doesn't have built-in signed URLs like S3
    // This would need to be implemented with a custom signing mechanism
    // For now, return the direct URL
    return `${this.baseUrl}/${key}`;
  }

  /**
   * Copy file between buckets
   */
  async copyFile(
    sourceKey: string,
    destinationKey: string,
    sourceBucket: 'uploads' | 'assets' | 'cache' = 'uploads',
    destinationBucket: 'uploads' | 'assets' | 'cache' = 'assets'
  ): Promise<void> {
    const source = this.getBucket(sourceBucket);
    const destination = this.getBucket(destinationBucket);

    const file = await source.get(sourceKey);
    if (!file) {
      throw new Error(`File not found: ${sourceKey}`);
    }

    await destination.put(destinationKey, file.body, {
      httpMetadata: file.httpMetadata,
      customMetadata: file.customMetadata,
    });
  }

  /**
   * Optimize image using Cloudflare Image Resizing
   */
  private async optimizeImage(
    imageData: ArrayBuffer,
    resize?: { width?: number; height?: number; quality?: number }
  ): Promise<ArrayBuffer> {
    // For now, return original data
    // In a real implementation, you would use Cloudflare Image Resizing API
    // or integrate with a service like Cloudflare Images
    return imageData;
  }

  /**
   * Check if content type is an image
   */
  private isImage(contentType?: string): boolean {
    if (!contentType) return false;
    return contentType.startsWith('image/');
  }

  /**
   * Get R2 bucket by type
   */
  private getBucket(type: 'uploads' | 'assets' | 'cache'): R2Bucket {
    switch (type) {
      case 'uploads':
        return this.uploads;
      case 'assets':
        return this.assets;
      case 'cache':
        return this.cache;
      default:
        throw new Error(`Unknown bucket type: ${type}`);
    }
  }
}

/**
 * Menu Image Manager
 * Specialized for handling restaurant menu images
 */
export class MenuImageManager extends R2FileManager {
  constructor(env: CloudflareEnv) {
    super(env);
  }

  /**
   * Upload menu item image with automatic optimization
   */
  async uploadMenuImage(
    image: File,
    restaurantId: string,
    itemId: string
  ): Promise<{ url: string; thumbnailUrl: string; key: string }> {
    const timestamp = Date.now();
    const extension = image.name.split('.').pop() || 'jpg';
    const baseKey = `menu/${restaurantId}/${itemId}/${timestamp}`;

    // Upload original image
    const originalResult = await this.uploadFile(
      image,
      `${baseKey}.${extension}`,
      {
        bucket: 'uploads',
        optimize: true,
        resize: { width: 1200, height: 800, quality: 85 },
        metadata: {
          restaurantId,
          itemId,
          type: 'menu-image',
        },
      }
    );

    // Create thumbnail
    const thumbnailResult = await this.uploadFile(
      image,
      `${baseKey}-thumb.${extension}`,
      {
        bucket: 'uploads',
        optimize: true,
        resize: { width: 300, height: 200, quality: 80 },
        metadata: {
          restaurantId,
          itemId,
          type: 'menu-thumbnail',
        },
      }
    );

    return {
      url: originalResult.url,
      thumbnailUrl: thumbnailResult.url,
      key: originalResult.key,
    };
  }

  /**
   * Delete menu images (original and thumbnail)
   */
  async deleteMenuImage(restaurantId: string, itemId: string): Promise<void> {
    const prefix = `menu/${restaurantId}/${itemId}/`;
    const files = await this.listFiles({ prefix, bucket: 'uploads' });
    
    const keys = files.objects.map(obj => obj.key);
    if (keys.length > 0) {
      await this.deleteFile(keys, 'uploads');
    }
  }

  /**
   * Get all menu images for a restaurant
   */
  async getRestaurantMenuImages(restaurantId: string): Promise<Array<{
    itemId: string;
    url: string;
    thumbnailUrl: string;
    uploadedAt: string;
  }>> {
    const prefix = `menu/${restaurantId}/`;
    const files = await this.listFiles({ prefix, bucket: 'uploads' });
    
    const imageMap = new Map();
    
    for (const file of files.objects) {
      const pathParts = file.key.split('/');
      const itemId = pathParts[2];
      const filename = pathParts[4];
      
      if (!imageMap.has(itemId)) {
        imageMap.set(itemId, { itemId });
      }
      
      const item = imageMap.get(itemId);
      
      if (filename.includes('-thumb.')) {
        item.thumbnailUrl = `${this.baseUrl}/${file.key}`;
      } else {
        item.url = `${this.baseUrl}/${file.key}`;
      }
      
      item.uploadedAt = file.customMetadata?.uploadedAt || file.uploaded.toISOString();
    }
    
    return Array.from(imageMap.values()).filter(item => item.url);
  }
}

/**
 * Restaurant Asset Manager
 * Handles logos, banners, and other restaurant assets
 */
export class RestaurantAssetManager extends R2FileManager {
  constructor(env: CloudflareEnv) {
    super(env);
  }

  /**
   * Upload restaurant logo
   */
  async uploadLogo(
    logo: File,
    restaurantId: string
  ): Promise<{ url: string; key: string }> {
    const extension = logo.name.split('.').pop() || 'jpg';
    const key = `restaurants/${restaurantId}/logo.${extension}`;

    // Delete existing logo first
    try {
      await this.deleteFile(key, 'assets');
    } catch {
      // Ignore if doesn't exist
    }

    const result = await this.uploadFile(logo, key, {
      bucket: 'assets',
      optimize: true,
      resize: { width: 400, height: 400, quality: 90 },
      metadata: {
        restaurantId,
        type: 'logo',
      },
    });

    return result;
  }

  /**
   * Upload restaurant banner
   */
  async uploadBanner(
    banner: File,
    restaurantId: string
  ): Promise<{ url: string; key: string }> {
    const extension = banner.name.split('.').pop() || 'jpg';
    const key = `restaurants/${restaurantId}/banner.${extension}`;

    // Delete existing banner first
    try {
      await this.deleteFile(key, 'assets');
    } catch {
      // Ignore if doesn't exist
    }

    const result = await this.uploadFile(banner, key, {
      bucket: 'assets',
      optimize: true,
      resize: { width: 1920, height: 600, quality: 85 },
      metadata: {
        restaurantId,
        type: 'banner',
      },
    });

    return result;
  }

  /**
   * Get restaurant assets
   */
  async getRestaurantAssets(restaurantId: string): Promise<{
    logo?: string;
    banner?: string;
  }> {
    const prefix = `restaurants/${restaurantId}/`;
    const files = await this.listFiles({ prefix, bucket: 'assets' });
    
    const assets: { logo?: string; banner?: string } = {};
    
    for (const file of files.objects) {
      const filename = file.key.split('/').pop() || '';
      
      if (filename.startsWith('logo.')) {
        assets.logo = `${this.baseUrl}/${file.key}`;
      } else if (filename.startsWith('banner.')) {
        assets.banner = `${this.baseUrl}/${file.key}`;
      }
    }
    
    return assets;
  }

  /**
   * Delete all restaurant assets
   */
  async deleteRestaurantAssets(restaurantId: string): Promise<void> {
    const prefix = `restaurants/${restaurantId}/`;
    const files = await this.listFiles({ prefix, bucket: 'assets' });
    
    const keys = files.objects.map(obj => obj.key);
    if (keys.length > 0) {
      await this.deleteFile(keys, 'assets');
    }
  }
}

/**
 * R2 utilities factory
 */
export function createR2Utils(env: CloudflareEnv) {
  return {
    fileManager: new R2FileManager(env),
    menuImages: new MenuImageManager(env),
    restaurantAssets: new RestaurantAssetManager(env),
  };
}

/**
 * Helper function to handle file uploads in API routes
 */
export async function handleFileUpload(
  request: Request,
  env: CloudflareEnv,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    bucket?: 'uploads' | 'assets' | 'cache';
  } = {}
): Promise<{ url: string; key: string; size: number }> {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    throw new Error('No file provided');
  }

  // Validate file size
  const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size: ${maxSize} bytes`);
  }

  // Validate file type
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    throw new Error(`File type not allowed. Allowed types: ${options.allowedTypes.join(', ')}`);
  }

  const fileManager = new R2FileManager(env);
  const key = `${crypto.randomUUID()}-${file.name}`;
  
  return await fileManager.uploadFile(file, key, {
    bucket: options.bucket || 'uploads',
    optimize: file.type.startsWith('image/'),
  });
}