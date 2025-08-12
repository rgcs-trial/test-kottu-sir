/**
 * Advanced lazy loading wrapper component with intersection observer
 * Supports various loading strategies and performance optimizations
 */

'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';

export interface LazyLoadProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: ReactNode;
  fallback?: ReactNode;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
  height?: number | string;
  minHeight?: number | string;
  fadeIn?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
  preload?: boolean;
  loading?: 'lazy' | 'eager';
  strategy?: 'viewport' | 'idle' | 'hover' | 'manual';
  timeout?: number;
}

const LazyLoad: React.FC<LazyLoadProps> = ({
  children,
  className = '',
  style,
  placeholder,
  fallback,
  threshold = 0.1,
  rootMargin = '50px',
  triggerOnce = true,
  delay = 0,
  height,
  minHeight,
  fadeIn = true,
  onLoad,
  onError,
  enabled = true,
  preload = false,
  loading = 'lazy',
  strategy = 'viewport',
  timeout = 10000
}) => {
  const [isLoaded, setIsLoaded] = useState(!enabled || preload || loading === 'eager');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!enabled || preload || loading === 'eager');
  
  const elementRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const loadTimeoutRef = useRef<NodeJS.Timeout>();

  // Intersection observer for viewport-based loading
  const isIntersecting = useIntersectionObserver(elementRef, {
    threshold,
    rootMargin,
    enabled: enabled && strategy === 'viewport' && !shouldLoad
  });

  // Handle different loading strategies
  useEffect(() => {
    if (!enabled || shouldLoad) return;

    switch (strategy) {
      case 'viewport':
        if (isIntersecting) {
          if (delay > 0) {
            timeoutRef.current = setTimeout(() => {
              setShouldLoad(true);
            }, delay);
          } else {
            setShouldLoad(true);
          }
        }
        break;

      case 'idle':
        // Load when browser is idle
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            setShouldLoad(true);
          });
        } else {
          // Fallback for browsers that don't support requestIdleCallback
          setTimeout(() => {
            setShouldLoad(true);
          }, 100);
        }
        break;

      case 'manual':
        // Manual loading - controlled externally
        break;

      default:
        setShouldLoad(true);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, shouldLoad, strategy, isIntersecting, delay]);

  // Handle hover strategy
  const handleMouseEnter = () => {
    if (strategy === 'hover' && !shouldLoad) {
      setShouldLoad(true);
    }
  };

  // Load content when shouldLoad becomes true
  useEffect(() => {
    if (!shouldLoad || isLoaded) return;

    setIsLoading(true);
    setIsVisible(true);

    // Set loading timeout
    loadTimeoutRef.current = setTimeout(() => {
      if (isLoading) {
        setHasError(true);
        setIsLoading(false);
        onError?.(new Error('Loading timeout'));
      }
    }, timeout);

    // Simulate loading completion
    // In a real implementation, this would be triggered by the actual content loading
    const loadingDelay = delay > 0 ? delay : 50;
    
    setTimeout(() => {
      try {
        setIsLoaded(true);
        setIsLoading(false);
        onLoad?.();
      } catch (error) {
        setHasError(true);
        setIsLoading(false);
        onError?.(error as Error);
      }
    }, loadingDelay);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [shouldLoad, isLoaded, delay, timeout, onLoad, onError, isLoading]);

  // Container styles
  const containerStyle: React.CSSProperties = {
    minHeight: minHeight || (height ? height : isLoaded ? 'auto' : '200px'),
    height: height,
    position: 'relative',
    overflow: 'hidden',
    ...style
  };

  // Content styles with fade-in animation
  const contentStyle: React.CSSProperties = {
    opacity: fadeIn ? (isLoaded ? 1 : 0) : 1,
    transition: fadeIn ? 'opacity 0.3s ease-in-out' : undefined,
    width: '100%',
    height: '100%'
  };

  // Loading placeholder styles
  const placeholderStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    opacity: isLoaded ? 0 : 1,
    transition: fadeIn ? 'opacity 0.3s ease-in-out' : undefined,
    pointerEvents: isLoaded ? 'none' : 'auto'
  };

  // Default loading placeholder
  const defaultPlaceholder = (
    <div className="flex flex-col items-center justify-center p-8 text-gray-500">
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-sm">Loading content...</p>
        </>
      ) : (
        <>
          <div className="w-12 h-12 bg-gray-300 rounded-lg mb-4 animate-pulse"></div>
          <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
        </>
      )}
    </div>
  );

  // Error state
  if (hasError && fallback) {
    return (
      <div className={className} style={containerStyle}>
        {fallback}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`${className} flex items-center justify-center bg-red-50 border border-red-200 rounded-lg`} style={containerStyle}>
        <div className="text-center p-4">
          <div className="text-red-500 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.966-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-700 text-sm">Failed to load content</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={elementRef}
      className={className}
      style={containerStyle}
      onMouseEnter={handleMouseEnter}
    >
      {/* Placeholder */}
      {!isLoaded && (
        <div style={placeholderStyle}>
          {placeholder || defaultPlaceholder}
        </div>
      )}

      {/* Content */}
      {(shouldLoad || isVisible) && (
        <div style={contentStyle}>
          {children}
        </div>
      )}
    </div>
  );
};

// Higher-order component for lazy loading
export const withLazyLoad = <P extends object>(
  Component: React.ComponentType<P>,
  lazyLoadProps?: Partial<LazyLoadProps>
) => {
  const LazyComponent = React.forwardRef<any, P>((props, ref) => (
    <LazyLoad {...lazyLoadProps}>
      <Component {...props} ref={ref} />
    </LazyLoad>
  ));

  LazyComponent.displayName = `withLazyLoad(${Component.displayName || Component.name})`;
  return LazyComponent;
};

// Lazy loading for lists/grids
export const LazyList: React.FC<{
  items: any[];
  renderItem: (item: any, index: number) => ReactNode;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  className?: string;
  itemClassName?: string;
  gap?: number;
  direction?: 'vertical' | 'horizontal';
}> = ({
  items,
  renderItem,
  itemHeight = 100,
  containerHeight = 400,
  overscan = 5,
  className = '',
  itemClassName = '',
  gap = 8,
  direction = 'vertical'
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / (itemHeight + gap)) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);

  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set new timeout
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  };

  // Calculate total height
  const totalHeight = items.length * (itemHeight + gap) - gap;

  // Calculate offset for first visible item
  const offsetY = startIndex * (itemHeight + gap);

  return (
    <div 
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return (
              <div
                key={actualIndex}
                className={itemClassName}
                style={{
                  height: itemHeight,
                  marginBottom: index < visibleItems.length - 1 ? gap : 0
                }}
              >
                <LazyLoad
                  threshold={0.1}
                  triggerOnce={false}
                  enabled={!isScrolling}
                  height={itemHeight}
                  strategy="viewport"
                >
                  {renderItem(item, actualIndex)}
                </LazyLoad>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Lazy loading for images in a grid
export const LazyImageGrid: React.FC<{
  images: Array<{ src: string; alt: string; caption?: string }>;
  columns?: number;
  gap?: number;
  aspectRatio?: number;
  className?: string;
}> = ({
  images,
  columns = 3,
  gap = 4,
  aspectRatio = 1,
  className = ''
}) => {
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: `${gap * 0.25}rem`,
  };

  return (
    <div className={className} style={gridStyle}>
      {images.map((image, index) => (
        <LazyLoad
          key={`${image.src}-${index}`}
          className="group cursor-pointer"
          style={{ aspectRatio }}
          threshold={0.1}
          rootMargin="100px"
          triggerOnce
          loading={index < 6 ? 'eager' : 'lazy'} // Load first 6 images immediately
        >
          <div className="relative w-full h-full overflow-hidden rounded-lg bg-gray-200">
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {image.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {image.caption}
              </div>
            )}
          </div>
        </LazyLoad>
      ))}
    </div>
  );
};

// Manual loading trigger hook
export const useLazyLoad = () => {
  const [shouldLoad, setShouldLoad] = useState(false);
  
  const trigger = () => setShouldLoad(true);
  const reset = () => setShouldLoad(false);
  
  return { shouldLoad, trigger, reset };
};

export default LazyLoad;