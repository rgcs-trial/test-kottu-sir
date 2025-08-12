/**
 * Optimized image component with lazy loading, responsive sizing, and Cloudflare Images integration
 * Implements advanced performance optimizations for restaurant SaaS platform
 */

'use client';

import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { imageOptimizer, ImageTransform, ResponsiveImageConfig } from '@/lib/performance/image-optimization';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';

export interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  priority?: boolean;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png' | 'auto';
  placeholder?: 'blur' | 'shimmer' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  breakpoints?: number[];
  transform?: ImageTransform;
  lazy?: boolean;
  onLoad?: () => void;
  onError?: (error: Event) => void;
  fadeIn?: boolean;
  fallbackSrc?: string;
  className?: string;
  containerClassName?: string;
  overlayClassName?: string;
  enableWebP?: boolean;
  enableAVIF?: boolean;
}

const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({
    src,
    alt,
    width,
    height,
    aspectRatio,
    priority = false,
    quality = 80,
    format = 'auto',
    placeholder = 'blur',
    blurDataURL,
    sizes,
    breakpoints,
    transform,
    lazy = true,
    onLoad,
    onError,
    fadeIn = true,
    fallbackSrc,
    className = '',
    containerClassName = '',
    overlayClassName = '',
    enableWebP = true,
    enableAVIF = true,
    style,
    ...props
  }, ref) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState<string>('');
    const [isVisible, setIsVisible] = useState(!lazy || priority);
    
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Use intersection observer for lazy loading
    const isIntersecting = useIntersectionObserver(containerRef, {
      threshold: 0.1,
      rootMargin: '50px',
      enabled: lazy && !priority && !isVisible
    });

    // Update visibility based on intersection
    useEffect(() => {
      if (isIntersecting && !isVisible) {
        setIsVisible(true);
      }
    }, [isIntersecting, isVisible]);

    // Calculate responsive image configuration
    const imageConfig: ResponsiveImageConfig = {
      src,
      alt,
      sizes: sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
      breakpoints: breakpoints || [640, 768, 1024, 1280, 1536],
      aspectRatio,
      priority,
      placeholder,
      blurDataURL,
      transform: {
        quality,
        format,
        width,
        height,
        ...transform
      }
    };

    // Generate optimized image URLs
    const optimizedConfig = imageOptimizer.optimizeForResponsive(imageConfig);
    const srcSet = imageOptimizer.generateSrcSet(src, optimizedConfig.transform);
    const primarySrc = imageOptimizer.generateCloudflareImageUrl(src, {
      ...optimizedConfig.transform,
      width: width || 800
    });

    // Handle image loading
    useEffect(() => {
      if (!isVisible) return;

      setIsLoading(true);
      setHasError(false);

      // Preload the image
      const img = new Image();
      
      img.onload = () => {
        setCurrentSrc(primarySrc);
        setIsLoaded(true);
        setIsLoading(false);
        onLoad?.();
      };

      img.onerror = (error) => {
        setIsLoading(false);
        setHasError(true);
        
        // Try fallback source
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            setIsLoaded(true);
            setHasError(false);
          };
          fallbackImg.onerror = () => {
            setHasError(true);
            onError?.(error);
          };
          fallbackImg.src = fallbackSrc;
        } else {
          onError?.(error);
        }
      };

      img.src = primarySrc;
    }, [isVisible, primarySrc, fallbackSrc, onLoad, onError]);

    // Generate placeholder
    const placeholderSrc = (() => {
      if (blurDataURL) return blurDataURL;
      
      if (placeholder === 'blur') {
        return imageOptimizer.generateBlurPlaceholder(src);
      }
      
      if (placeholder === 'shimmer') {
        return imageOptimizer.generateShimmerPlaceholder(width || 400, height || 300);
      }
      
      return undefined;
    })();

    // Calculate container style
    const containerStyle: React.CSSProperties = {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#f3f4f6',
      ...style
    };

    // Add aspect ratio if specified
    if (aspectRatio && !height) {
      containerStyle.aspectRatio = aspectRatio.toString();
    } else if (width && height) {
      containerStyle.aspectRatio = `${width} / ${height}`;
    }

    // Image style with transitions
    const imageStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transition: fadeIn ? 'opacity 0.3s ease-in-out' : undefined,
      opacity: isLoaded ? 1 : 0
    };

    // Placeholder style
    const placeholderStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      opacity: isLoaded ? 0 : 1,
      transition: fadeIn ? 'opacity 0.3s ease-in-out' : undefined
    };

    // Loading overlay style
    const loadingOverlayStyle: React.CSSProperties = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      opacity: isLoading ? 1 : 0,
      transition: 'opacity 0.2s ease-in-out',
      pointerEvents: 'none'
    };

    // Error state
    if (hasError && !fallbackSrc) {
      return (
        <div 
          ref={containerRef}
          className={`flex items-center justify-center bg-gray-200 ${containerClassName}`}
          style={containerStyle}
        >
          <div className="text-gray-500 text-center p-4">
            <svg 
              className="w-8 h-8 mx-auto mb-2 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      );
    }

    return (
      <div 
        ref={containerRef}
        className={`relative ${containerClassName}`}
        style={containerStyle}
      >
        {/* Placeholder image */}
        {placeholderSrc && (
          <img
            src={placeholderSrc}
            alt=""
            style={placeholderStyle}
            className="absolute inset-0"
            aria-hidden="true"
          />
        )}

        {/* Main image */}
        {isVisible && currentSrc && (
          <picture>
            {enableAVIF && (
              <source
                srcSet={imageOptimizer.generateSrcSet(src, { ...optimizedConfig.transform, format: 'avif' })}
                sizes={optimizedConfig.sizes}
                type="image/avif"
              />
            )}
            {enableWebP && (
              <source
                srcSet={imageOptimizer.generateSrcSet(src, { ...optimizedConfig.transform, format: 'webp' })}
                sizes={optimizedConfig.sizes}
                type="image/webp"
              />
            )}
            <img
              ref={(el) => {
                imgRef.current = el;
                if (typeof ref === 'function') {
                  ref(el);
                } else if (ref) {
                  ref.current = el;
                }
              }}
              src={currentSrc}
              srcSet={srcSet}
              sizes={optimizedConfig.sizes}
              alt={alt}
              style={imageStyle}
              className={className}
              loading={priority ? 'eager' : 'lazy'}
              decoding={priority ? 'sync' : 'async'}
              {...props}
            />
          </picture>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div style={loadingOverlayStyle} className={overlayClassName}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Shimmer effect for placeholder === 'shimmer' */}
        {placeholder === 'shimmer' && !isLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer"></div>
          </div>
        )}
      </div>
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';

// Preload utility for critical images
export const preloadImage = (src: string, options?: { 
  width?: number; 
  height?: number; 
  quality?: number; 
  format?: string 
}) => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = imageOptimizer.generateCloudflareImageUrl(src, options);
  document.head.appendChild(link);
};

// Batch preload utility
export const preloadImages = async (
  images: Array<{ src: string; options?: ImageTransform }>,
  concurrent = 3
) => {
  return imageOptimizer.preloadImages(
    images.map(img => ({ src: img.src, transform: img.options })),
    concurrent
  );
};

// Export the optimized image component
export default OptimizedImage;

// Additional utility components
export const OptimizedAvatar: React.FC<{
  src: string;
  alt: string;
  size?: number;
  className?: string;
}> = ({ src, alt, size = 40, className = '' }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    width={size}
    height={size}
    aspectRatio={1}
    className={`rounded-full ${className}`}
    transform={{
      fit: 'cover',
      gravity: 'center'
    }}
    priority={size <= 50} // Prioritize small avatars
  />
);

export const OptimizedHero: React.FC<{
  src: string;
  alt: string;
  className?: string;
  overlayContent?: React.ReactNode;
}> = ({ src, alt, className = '', overlayContent }) => (
  <div className={`relative ${className}`}>
    <OptimizedImage
      src={src}
      alt={alt}
      priority
      aspectRatio={16/9}
      sizes="100vw"
      transform={{
        fit: 'cover',
        gravity: 'center'
      }}
      className="w-full h-full"
    />
    {overlayContent && (
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
        {overlayContent}
      </div>
    )}
  </div>
);

export const OptimizedGallery: React.FC<{
  images: Array<{ src: string; alt: string; caption?: string }>;
  columns?: number;
  gap?: number;
  className?: string;
}> = ({ images, columns = 3, gap = 4, className = '' }) => {
  const gridClassName = `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns} gap-${gap} ${className}`;
  
  return (
    <div className={gridClassName}>
      {images.map((image, index) => (
        <div key={`${image.src}-${index}`} className="relative group">
          <OptimizedImage
            src={image.src}
            alt={image.alt}
            aspectRatio={1}
            className="w-full h-full transition-transform duration-300 group-hover:scale-105"
            transform={{
              fit: 'cover',
              gravity: 'center'
            }}
            lazy={index > 6} // Prioritize first 6 images
          />
          {image.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {image.caption}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};