/**
 * Advanced intersection observer hook with performance optimizations
 * Supports dynamic thresholds, multiple targets, and efficient state management
 */

'use client';

import { useEffect, useRef, useState, RefObject, useCallback } from 'react';

export interface IntersectionObserverOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  enabled?: boolean;
  triggerOnce?: boolean;
  freezeOnceVisible?: boolean;
  trackVisibility?: boolean;
  delay?: number;
}

export interface IntersectionObserverEntry {
  isIntersecting: boolean;
  intersectionRatio: number;
  boundingClientRect: DOMRect;
  intersectionRect: DOMRect;
  rootBounds: DOMRect | null;
  target: Element;
  time: number;
  isVisible?: boolean;
}

/**
 * Primary intersection observer hook
 */
export const useIntersectionObserver = (
  elementRef: RefObject<Element>,
  options: IntersectionObserverOptions = {}
): boolean => {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    enabled = true,
    triggerOnce = false,
    freezeOnceVisible = false,
    trackVisibility = false,
    delay = 0
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Create intersection observer
  const createObserver = useCallback(() => {
    if (!enabled || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return null;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isCurrentlyIntersecting = entry.isIntersecting;
          
          if (delay > 0) {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            
            timeoutRef.current = setTimeout(() => {
              updateIntersectionState(isCurrentlyIntersecting, entry);
            }, delay);
          } else {
            updateIntersectionState(isCurrentlyIntersecting, entry);
          }
        });
      },
      {
        root,
        rootMargin,
        threshold
      }
    );

    return observer;
  }, [root, rootMargin, threshold, enabled, delay]);

  // Update intersection state
  const updateIntersectionState = useCallback((isCurrentlyIntersecting: boolean, entry: globalThis.IntersectionObserverEntry) => {
    // Track visibility if enabled
    let isVisible = isCurrentlyIntersecting;
    if (trackVisibility && 'isVisible' in entry) {
      isVisible = (entry as any).isVisible;
    }

    setIsIntersecting((prevIntersecting) => {
      // If freezeOnceVisible is true and element was already visible, don't change state
      if (freezeOnceVisible && hasBeenVisible) {
        return prevIntersecting;
      }

      // If triggerOnce is true and element is intersecting, mark as having been visible
      if (triggerOnce && isCurrentlyIntersecting) {
        setHasBeenVisible(true);
      }

      return isCurrentlyIntersecting;
    });

    // Mark as having been visible if it's intersecting
    if (isCurrentlyIntersecting && !hasBeenVisible) {
      setHasBeenVisible(true);
    }
  }, [freezeOnceVisible, hasBeenVisible, triggerOnce, trackVisibility]);

  // Set up observer
  useEffect(() => {
    const element = elementRef.current;
    
    if (!element || !enabled) {
      return;
    }

    // If triggerOnce and already been visible, don't observe
    if (triggerOnce && hasBeenVisible) {
      return;
    }

    observerRef.current = createObserver();
    
    if (observerRef.current) {
      observerRef.current.observe(element);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [elementRef, enabled, createObserver, triggerOnce, hasBeenVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return isIntersecting;
};

/**
 * Enhanced intersection observer hook with detailed entry information
 */
export const useIntersectionObserverEntry = (
  elementRef: RefObject<Element>,
  options: IntersectionObserverOptions = {}
): IntersectionObserverEntry | null => {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    enabled = true,
    trackVisibility = false
  } = options;

  useEffect(() => {
    const element = elementRef.current;
    
    if (!element || !enabled || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [observerEntry] = entries;
        
        const enhancedEntry: IntersectionObserverEntry = {
          isIntersecting: observerEntry.isIntersecting,
          intersectionRatio: observerEntry.intersectionRatio,
          boundingClientRect: observerEntry.boundingClientRect,
          intersectionRect: observerEntry.intersectionRect,
          rootBounds: observerEntry.rootBounds,
          target: observerEntry.target,
          time: observerEntry.time
        };

        // Add visibility information if available
        if (trackVisibility && 'isVisible' in observerEntry) {
          enhancedEntry.isVisible = (observerEntry as any).isVisible;
        }

        setEntry(enhancedEntry);
      },
      {
        root,
        rootMargin,
        threshold,
        ...(trackVisibility && { trackVisibility: true, delay: 100 })
      }
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [elementRef, root, rootMargin, threshold, enabled, trackVisibility]);

  return entry;
};

/**
 * Multiple elements intersection observer hook
 */
export const useMultipleIntersectionObserver = (
  elementRefs: RefObject<Element>[],
  options: IntersectionObserverOptions = {}
): Record<string, boolean> => {
  const [intersections, setIntersections] = useState<Record<string, boolean>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    enabled = true
  } = options;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const elements = elementRefs
      .map(ref => ref.current)
      .filter((element): element is Element => element !== null);

    if (elements.length === 0) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        setIntersections(prev => {
          const updated = { ...prev };
          entries.forEach(entry => {
            const elementId = (entry.target as HTMLElement).id || 
                            (entry.target as HTMLElement).dataset.observerId ||
                            entry.target.tagName + Math.random().toString(36).substr(2, 9);
            updated[elementId] = entry.isIntersecting;
          });
          return updated;
        });
      },
      {
        root,
        rootMargin,
        threshold
      }
    );

    elements.forEach(element => {
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [elementRefs, root, rootMargin, threshold, enabled]);

  return intersections;
};

/**
 * Intersection observer hook for infinite scrolling
 */
export const useInfiniteScroll = (
  elementRef: RefObject<Element>,
  callback: () => void | Promise<void>,
  options: IntersectionObserverOptions & {
    hasNextPage?: boolean;
    isLoading?: boolean;
    rootMargin?: string;
  } = {}
): void => {
  const {
    hasNextPage = true,
    isLoading = false,
    enabled = true,
    rootMargin = '100px',
    threshold = 0.1,
    ...observerOptions
  } = options;

  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const isIntersecting = useIntersectionObserver(elementRef, {
    ...observerOptions,
    enabled: enabled && hasNextPage && !isLoading,
    rootMargin,
    threshold
  });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isLoading) {
      callbackRef.current();
    }
  }, [isIntersecting, hasNextPage, isLoading]);
};

/**
 * Intersection observer hook for lazy loading with preloading
 */
export const useLazyLoad = (
  elementRef: RefObject<Element>,
  options: IntersectionObserverOptions & {
    preloadMargin?: string;
    onPreload?: () => void;
    onLoad?: () => void;
  } = {}
) => {
  const {
    preloadMargin = '200px',
    onPreload,
    onLoad,
    rootMargin = '50px',
    ...observerOptions
  } = options;

  const [isPreloaded, setIsPreloaded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Preload observer with larger margin
  const isPreloadIntersecting = useIntersectionObserver(elementRef, {
    ...observerOptions,
    rootMargin: preloadMargin,
    triggerOnce: true
  });

  // Load observer with normal margin
  const isLoadIntersecting = useIntersectionObserver(elementRef, {
    ...observerOptions,
    rootMargin,
    triggerOnce: true
  });

  // Handle preload
  useEffect(() => {
    if (isPreloadIntersecting && !isPreloaded) {
      setIsPreloaded(true);
      onPreload?.();
    }
  }, [isPreloadIntersecting, isPreloaded, onPreload]);

  // Handle load
  useEffect(() => {
    if (isLoadIntersecting && !isLoaded) {
      setIsLoaded(true);
      onLoad?.();
    }
  }, [isLoadIntersecting, isLoaded, onLoad]);

  return {
    isPreloaded,
    isLoaded,
    isPreloadIntersecting,
    isLoadIntersecting
  };
};

/**
 * Intersection observer hook for viewport-based animations
 */
export const useViewportAnimation = (
  elementRef: RefObject<Element>,
  options: IntersectionObserverOptions & {
    animationClass?: string;
    animationDelay?: number;
  } = {}
) => {
  const {
    animationClass = 'animate-fade-in',
    animationDelay = 0,
    threshold = 0.1,
    triggerOnce = true,
    ...observerOptions
  } = options;

  const [shouldAnimate, setShouldAnimate] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const isIntersecting = useIntersectionObserver(elementRef, {
    ...observerOptions,
    threshold,
    triggerOnce
  });

  useEffect(() => {
    if (isIntersecting && !shouldAnimate) {
      if (animationDelay > 0) {
        timeoutRef.current = setTimeout(() => {
          setShouldAnimate(true);
        }, animationDelay);
      } else {
        setShouldAnimate(true);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isIntersecting, shouldAnimate, animationDelay]);

  return {
    isIntersecting,
    shouldAnimate,
    animationClass: shouldAnimate ? animationClass : ''
  };
};

/**
 * Intersection observer hook for performance monitoring
 */
export const useIntersectionPerformance = (
  elementRef: RefObject<Element>,
  options: IntersectionObserverOptions = {}
) => {
  const [metrics, setMetrics] = useState<{
    firstIntersection: number | null;
    lastIntersection: number | null;
    intersectionCount: number;
    totalVisibleTime: number;
    averageVisibleTime: number;
  }>({
    firstIntersection: null,
    lastIntersection: null,
    intersectionCount: 0,
    totalVisibleTime: 0,
    averageVisibleTime: 0
  });

  const entry = useIntersectionObserverEntry(elementRef, options);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!entry) return;

    const now = performance.now();

    setMetrics(prev => {
      const newMetrics = { ...prev };

      if (entry.isIntersecting) {
        // Element became visible
        if (!prev.firstIntersection) {
          newMetrics.firstIntersection = now;
        }
        newMetrics.lastIntersection = now;
        startTimeRef.current = now;
      } else if (startTimeRef.current) {
        // Element became invisible
        const visibleDuration = now - startTimeRef.current;
        newMetrics.totalVisibleTime += visibleDuration;
        newMetrics.intersectionCount += 1;
        newMetrics.averageVisibleTime = newMetrics.totalVisibleTime / newMetrics.intersectionCount;
        startTimeRef.current = null;
      }

      return newMetrics;
    });
  }, [entry]);

  return metrics;
};

export default useIntersectionObserver;