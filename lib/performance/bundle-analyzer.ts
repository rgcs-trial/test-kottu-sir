/**
 * Bundle size analysis and optimization utilities
 * Analyzes JavaScript bundles, identifies optimization opportunities, and monitors bundle size
 */

export interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  modules: ModuleInfo[];
  chunks: ChunkInfo[];
  duplicates: DuplicateInfo[];
  optimizations: OptimizationSuggestion[];
  performance: PerformanceMetrics;
}

export interface ModuleInfo {
  id: string;
  name: string;
  size: number;
  gzippedSize: number;
  chunks: string[];
  imports: string[];
  exports: string[];
  isVendor: boolean;
  treeshakeable: boolean;
  sideEffects: boolean;
}

export interface ChunkInfo {
  id: string;
  name: string;
  size: number;
  gzippedSize: number;
  modules: string[];
  parents: string[];
  children: string[];
  isInitial: boolean;
  isAsync: boolean;
}

export interface DuplicateInfo {
  module: string;
  instances: Array<{
    chunk: string;
    size: number;
    version?: string;
  }>;
  totalWaste: number;
  suggestion: string;
}

export interface OptimizationSuggestion {
  type: 'duplicate' | 'large-module' | 'unused-code' | 'split-chunk' | 'dynamic-import';
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: number; // Estimated size reduction in bytes
  implementation: string;
}

export interface PerformanceMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
  speedIndex: number;
}

export interface BundleConfig {
  maxChunkSize: number;
  maxModuleSize: number;
  duplicateThreshold: number;
  performanceBudget: {
    maxSize: number;
    maxGzippedSize: number;
    maxInitialSize: number;
  };
  excludePatterns: RegExp[];
  vendorChunkPatterns: RegExp[];
}

class BundleAnalyzer {
  private config: BundleConfig;
  private analysisHistory: BundleAnalysis[] = [];
  private maxHistoryLength = 50;

  constructor(config: BundleConfig) {
    this.config = config;
  }

  /**
   * Analyze bundle from webpack stats
   */
  async analyzeBundleFromStats(stats: any): Promise<BundleAnalysis> {
    const modules = this.extractModules(stats);
    const chunks = this.extractChunks(stats);
    const duplicates = this.findDuplicates(modules);
    const optimizations = this.generateOptimizations(modules, chunks, duplicates);
    const performance = await this.calculatePerformanceMetrics(chunks);

    const analysis: BundleAnalysis = {
      totalSize: this.calculateTotalSize(chunks),
      gzippedSize: this.calculateGzippedSize(chunks),
      modules,
      chunks,
      duplicates,
      optimizations,
      performance
    };

    this.saveAnalysis(analysis);
    return analysis;
  }

  /**
   * Extract module information from webpack stats
   */
  private extractModules(stats: any): ModuleInfo[] {
    const modules: ModuleInfo[] = [];

    if (!stats.modules) return modules;

    for (const module of stats.modules) {
      if (this.shouldExcludeModule(module.name)) {
        continue;
      }

      const moduleInfo: ModuleInfo = {
        id: module.id || module.identifier,
        name: this.normalizeModuleName(module.name),
        size: module.size || 0,
        gzippedSize: this.estimateGzippedSize(module.size || 0),
        chunks: module.chunks || [],
        imports: this.extractImports(module),
        exports: this.extractExports(module),
        isVendor: this.isVendorModule(module.name),
        treeshakeable: this.isTreeshakeable(module),
        sideEffects: this.hasSideEffects(module)
      };

      modules.push(moduleInfo);
    }

    return modules.sort((a, b) => b.size - a.size);
  }

  /**
   * Extract chunk information from webpack stats
   */
  private extractChunks(stats: any): ChunkInfo[] {
    const chunks: ChunkInfo[] = [];

    if (!stats.chunks) return chunks;

    for (const chunk of stats.chunks) {
      const chunkInfo: ChunkInfo = {
        id: chunk.id.toString(),
        name: chunk.names?.[0] || `chunk-${chunk.id}`,
        size: chunk.size || 0,
        gzippedSize: this.estimateGzippedSize(chunk.size || 0),
        modules: chunk.modules?.map((m: any) => m.id || m.identifier) || [],
        parents: chunk.parents || [],
        children: chunk.children || [],
        isInitial: chunk.initial || false,
        isAsync: !chunk.initial
      };

      chunks.push(chunkInfo);
    }

    return chunks.sort((a, b) => b.size - a.size);
  }

  /**
   * Find duplicate modules across chunks
   */
  private findDuplicates(modules: ModuleInfo[]): DuplicateInfo[] {
    const moduleGroups = new Map<string, ModuleInfo[]>();

    // Group modules by normalized name
    for (const module of modules) {
      const normalizedName = this.getNormalizedModuleName(module.name);
      if (!moduleGroups.has(normalizedName)) {
        moduleGroups.set(normalizedName, []);
      }
      moduleGroups.get(normalizedName)!.push(module);
    }

    const duplicates: DuplicateInfo[] = [];

    for (const [moduleName, instances] of moduleGroups) {
      if (instances.length > 1) {
        const totalWaste = instances.reduce((sum, instance) => sum + instance.size, 0) - 
                          Math.max(...instances.map(i => i.size));

        if (totalWaste > this.config.duplicateThreshold) {
          duplicates.push({
            module: moduleName,
            instances: instances.map(instance => ({
              chunk: instance.chunks[0] || 'unknown',
              size: instance.size,
              version: this.extractVersion(instance.name)
            })),
            totalWaste,
            suggestion: this.generateDuplicateSuggestion(moduleName, instances)
          });
        }
      }
    }

    return duplicates.sort((a, b) => b.totalWaste - a.totalWaste);
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizations(
    modules: ModuleInfo[],
    chunks: ChunkInfo[],
    duplicates: DuplicateInfo[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Large module suggestions
    for (const module of modules) {
      if (module.size > this.config.maxModuleSize) {
        suggestions.push({
          type: 'large-module',
          severity: module.size > this.config.maxModuleSize * 2 ? 'high' : 'medium',
          description: `Large module detected: ${module.name} (${this.formatSize(module.size)})`,
          impact: module.size * 0.3, // Estimated 30% reduction with optimization
          implementation: this.getLargeModuleSuggestion(module)
        });
      }
    }

    // Large chunk suggestions
    for (const chunk of chunks) {
      if (chunk.size > this.config.maxChunkSize) {
        suggestions.push({
          type: 'split-chunk',
          severity: chunk.size > this.config.maxChunkSize * 2 ? 'high' : 'medium',
          description: `Large chunk detected: ${chunk.name} (${this.formatSize(chunk.size)})`,
          impact: chunk.size * 0.4, // Estimated 40% improvement with splitting
          implementation: this.getChunkSplittingSuggestion(chunk)
        });
      }
    }

    // Duplicate module suggestions
    for (const duplicate of duplicates) {
      suggestions.push({
        type: 'duplicate',
        severity: duplicate.totalWaste > this.config.duplicateThreshold * 3 ? 'high' : 'medium',
        description: `Duplicate module: ${duplicate.module} (${this.formatSize(duplicate.totalWaste)} waste)`,
        impact: duplicate.totalWaste,
        implementation: duplicate.suggestion
      });
    }

    // Dynamic import suggestions
    const heavyVendorModules = modules.filter(m => 
      m.isVendor && m.size > 50000 && m.chunks.length === 1
    );

    for (const module of heavyVendorModules) {
      suggestions.push({
        type: 'dynamic-import',
        severity: 'medium',
        description: `Consider dynamic import for: ${module.name}`,
        impact: module.size * 0.5,
        implementation: `Use dynamic import() for non-critical vendor module`
      });
    }

    return suggestions.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Calculate performance metrics from bundle analysis
   */
  private async calculatePerformanceMetrics(chunks: ChunkInfo[]): Promise<PerformanceMetrics> {
    const initialChunks = chunks.filter(c => c.isInitial);
    const totalInitialSize = initialChunks.reduce((sum, chunk) => sum + chunk.size, 0);

    // Simplified performance calculations
    // In a real implementation, you'd use actual performance data
    return {
      firstContentfulPaint: this.estimateFCP(totalInitialSize),
      largestContentfulPaint: this.estimateLCP(totalInitialSize),
      totalBlockingTime: this.estimateTBT(totalInitialSize),
      cumulativeLayoutShift: 0.1, // Would need actual measurement
      timeToInteractive: this.estimateTTI(totalInitialSize),
      speedIndex: this.estimateSpeedIndex(totalInitialSize)
    };
  }

  /**
   * Helper methods for calculations
   */
  private calculateTotalSize(chunks: ChunkInfo[]): number {
    return chunks.reduce((sum, chunk) => sum + chunk.size, 0);
  }

  private calculateGzippedSize(chunks: ChunkInfo[]): number {
    return chunks.reduce((sum, chunk) => sum + chunk.gzippedSize, 0);
  }

  private estimateGzippedSize(size: number): number {
    // Typical gzip compression ratio for JavaScript is 70-80%
    return Math.round(size * 0.25);
  }

  private shouldExcludeModule(name: string): boolean {
    return this.config.excludePatterns.some(pattern => pattern.test(name));
  }

  private normalizeModuleName(name: string): string {
    return name.replace(/\\/g, '/').replace(/^\.\//g, '');
  }

  private isVendorModule(name: string): boolean {
    return this.config.vendorChunkPatterns.some(pattern => pattern.test(name));
  }

  private isTreeshakeable(module: any): boolean {
    // Check if module supports tree shaking
    return !module.providedExports || module.providedExports.length > 0;
  }

  private hasSideEffects(module: any): boolean {
    // Check if module has side effects
    return module.reasons?.some((reason: any) => reason.type === 'side-effect') || false;
  }

  private extractImports(module: any): string[] {
    return module.reasons?.map((reason: any) => reason.module) || [];
  }

  private extractExports(module: any): string[] {
    return module.providedExports || [];
  }

  private getNormalizedModuleName(name: string): string {
    // Remove version numbers and paths
    return name.replace(/@[\d.]+/, '').replace(/\/[^/]*$/, '');
  }

  private extractVersion(name: string): string | undefined {
    const match = name.match(/@([\d.]+)/);
    return match ? match[1] : undefined;
  }

  private generateDuplicateSuggestion(moduleName: string, instances: ModuleInfo[]): string {
    if (instances.some(i => i.isVendor)) {
      return `Move ${moduleName} to a shared vendor chunk`;
    }
    return `Ensure ${moduleName} is only imported once and shared across chunks`;
  }

  private getLargeModuleSuggestion(module: ModuleInfo): string {
    if (module.isVendor) {
      return `Consider code splitting or finding lighter alternatives for ${module.name}`;
    }
    return `Split ${module.name} into smaller modules or use dynamic imports`;
  }

  private getChunkSplittingSuggestion(chunk: ChunkInfo): string {
    return `Split ${chunk.name} into smaller chunks using SplitChunksPlugin or dynamic imports`;
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  // Performance estimation methods (simplified)
  private estimateFCP(size: number): number {
    return Math.max(800, size / 1000 + 500);
  }

  private estimateLCP(size: number): number {
    return Math.max(1200, size / 800 + 800);
  }

  private estimateTBT(size: number): number {
    return Math.max(50, size / 2000);
  }

  private estimateTTI(size: number): number {
    return Math.max(1500, size / 600 + 1000);
  }

  private estimateSpeedIndex(size: number): number {
    return Math.max(1000, size / 500 + 800);
  }

  /**
   * Save analysis to history
   */
  private saveAnalysis(analysis: BundleAnalysis): void {
    this.analysisHistory.push({
      ...analysis,
      // Add timestamp
      timestamp: Date.now()
    } as any);

    if (this.analysisHistory.length > this.maxHistoryLength) {
      this.analysisHistory.shift();
    }
  }

  /**
   * Get bundle size trends
   */
  getBundleTrends(): {
    sizeTrend: number[];
    gzippedTrend: number[];
    optimizationImpact: number[];
  } {
    return {
      sizeTrend: this.analysisHistory.map(a => a.totalSize),
      gzippedTrend: this.analysisHistory.map(a => a.gzippedSize),
      optimizationImpact: this.analysisHistory.map(a => 
        a.optimizations.reduce((sum, opt) => sum + opt.impact, 0)
      )
    };
  }

  /**
   * Check if bundle meets performance budget
   */
  checkPerformanceBudget(analysis: BundleAnalysis): {
    passes: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    if (analysis.totalSize > this.config.performanceBudget.maxSize) {
      violations.push(`Total size ${this.formatSize(analysis.totalSize)} exceeds budget ${this.formatSize(this.config.performanceBudget.maxSize)}`);
    }

    if (analysis.gzippedSize > this.config.performanceBudget.maxGzippedSize) {
      violations.push(`Gzipped size ${this.formatSize(analysis.gzippedSize)} exceeds budget ${this.formatSize(this.config.performanceBudget.maxGzippedSize)}`);
    }

    const initialSize = analysis.chunks
      .filter(c => c.isInitial)
      .reduce((sum, chunk) => sum + chunk.size, 0);

    if (initialSize > this.config.performanceBudget.maxInitialSize) {
      violations.push(`Initial bundle size ${this.formatSize(initialSize)} exceeds budget ${this.formatSize(this.config.performanceBudget.maxInitialSize)}`);
    }

    return {
      passes: violations.length === 0,
      violations
    };
  }

  /**
   * Generate optimization report
   */
  generateReport(analysis: BundleAnalysis): string {
    const budget = this.checkPerformanceBudget(analysis);
    
    let report = `Bundle Analysis Report\n`;
    report += `========================\n\n`;
    report += `Total Size: ${this.formatSize(analysis.totalSize)}\n`;
    report += `Gzipped Size: ${this.formatSize(analysis.gzippedSize)}\n`;
    report += `Chunks: ${analysis.chunks.length}\n`;
    report += `Modules: ${analysis.modules.length}\n\n`;

    if (!budget.passes) {
      report += `⚠️  Performance Budget Violations:\n`;
      budget.violations.forEach(violation => {
        report += `   - ${violation}\n`;
      });
      report += `\n`;
    }

    if (analysis.duplicates.length > 0) {
      report += `🔄 Duplicate Modules (${analysis.duplicates.length}):\n`;
      analysis.duplicates.slice(0, 5).forEach(dup => {
        report += `   - ${dup.module}: ${this.formatSize(dup.totalWaste)} wasted\n`;
      });
      report += `\n`;
    }

    if (analysis.optimizations.length > 0) {
      report += `🚀 Optimization Suggestions:\n`;
      analysis.optimizations.slice(0, 10).forEach(opt => {
        report += `   - [${opt.severity.toUpperCase()}] ${opt.description}\n`;
        report += `     Impact: ${this.formatSize(opt.impact)}\n`;
        report += `     Action: ${opt.implementation}\n\n`;
      });
    }

    return report;
  }
}

// Default configuration for restaurant SaaS
const defaultConfig: BundleConfig = {
  maxChunkSize: 250 * 1024, // 250KB
  maxModuleSize: 100 * 1024, // 100KB
  duplicateThreshold: 10 * 1024, // 10KB
  performanceBudget: {
    maxSize: 1024 * 1024, // 1MB
    maxGzippedSize: 300 * 1024, // 300KB
    maxInitialSize: 500 * 1024 // 500KB
  },
  excludePatterns: [
    /node_modules.*\.map$/,
    /\.css$/,
    /\.svg$/,
    /\.png$/,
    /\.jpg$/,
    /\.gif$/
  ],
  vendorChunkPatterns: [
    /node_modules/,
    /@.*\//
  ]
};

// Export singleton instance
export const bundleAnalyzer = new BundleAnalyzer(defaultConfig);

// Export utility functions
export const analyzeBundle = (stats: any) => bundleAnalyzer.analyzeBundleFromStats(stats);
export const checkBudget = (analysis: BundleAnalysis) => bundleAnalyzer.checkPerformanceBudget(analysis);
export const generateBundleReport = (analysis: BundleAnalysis) => bundleAnalyzer.generateReport(analysis);

// Export types and classes
export { BundleAnalyzer };
export type { 
  BundleAnalysis, 
  ModuleInfo, 
  ChunkInfo, 
  DuplicateInfo, 
  OptimizationSuggestion,
  PerformanceMetrics,
  BundleConfig 
};