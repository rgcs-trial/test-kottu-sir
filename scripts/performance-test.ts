#!/usr/bin/env node

/**
 * Performance testing script for restaurant SaaS platform
 * Tests Core Web Vitals, load times, and real-world scenarios
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

interface PerformanceMetrics {
  url: string;
  timestamp: string;
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  totalBlockingTime: number;
  speedIndex: number;
  timeToInteractive: number;
  resourceCount: number;
  totalTransferSize: number;
  totalResourceSize: number;
  cacheHitRatio: number;
  renderBlockingResources: number;
  unusedJavaScript: number;
  unusedCSS: number;
  imageOptimization: number;
}

interface TestScenario {
  name: string;
  url: string;
  viewport: { width: number; height: number };
  networkCondition: 'fast3g' | 'slow3g' | 'offline' | 'wifi';
  deviceType: 'desktop' | 'mobile' | 'tablet';
  userAgent?: string;
  cookies?: Array<{ name: string; value: string; domain: string }>;
  interactions?: Array<{
    type: 'click' | 'scroll' | 'type' | 'hover' | 'wait';
    selector?: string;
    value?: string;
    delay?: number;
  }>;
}

interface PerformanceReport {
  testId: string;
  timestamp: string;
  environment: {
    url: string;
    userAgent: string;
    viewport: { width: number; height: number };
    networkCondition: string;
  };
  scenarios: Array<{
    scenario: TestScenario;
    metrics: PerformanceMetrics;
    lighthouse?: any;
    recommendations: string[];
  }>;
  summary: {
    averageLoadTime: number;
    averageFCP: number;
    averageLCP: number;
    averageCLS: number;
    averageTBT: number;
    performanceScore: number;
    optimization: {
      totalSavings: number;
      criticalIssues: number;
      warnings: number;
    };
  };
}

class PerformanceTester {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl: string;
  private reportDir: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    this.reportDir = path.join(process.cwd(), 'reports', 'performance');
  }

  /**
   * Initialize browser and page
   */
  async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--enable-features=NetworkService',
        '--disable-features=TranslateUI',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--mute-audio',
        '--no-default-browser-check',
        '--autoplay-policy=user-gesture-required',
        '--disable-background-networking',
        '--disable-background-sync',
        '--disable-client-side-phishing-detection',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--enable-automation',
        '--password-store=basic',
        '--use-mock-keychain'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Enable performance monitoring
    await this.page.setCacheEnabled(true);
    await this.page.setJavaScriptEnabled(true);
  }

  /**
   * Run complete performance test suite
   */
  async runTests(): Promise<PerformanceReport> {
    if (!this.browser || !this.page) {
      throw new Error('Browser not initialized. Call init() first.');
    }

    console.log('🚀 Starting performance tests...\n');

    // Ensure report directory exists
    await fs.mkdir(this.reportDir, { recursive: true });

    // Define test scenarios
    const scenarios: TestScenario[] = [
      {
        name: 'Homepage - Desktop Fast',
        url: this.baseUrl,
        viewport: { width: 1920, height: 1080 },
        networkCondition: 'wifi',
        deviceType: 'desktop'
      },
      {
        name: 'Homepage - Mobile Slow',
        url: this.baseUrl,
        viewport: { width: 375, height: 667 },
        networkCondition: 'slow3g',
        deviceType: 'mobile',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      {
        name: 'Menu Page - Desktop',
        url: `${this.baseUrl}/demo-restaurant/menu`,
        viewport: { width: 1920, height: 1080 },
        networkCondition: 'fast3g',
        deviceType: 'desktop'
      },
      {
        name: 'Order Flow - Mobile',
        url: `${this.baseUrl}/demo-restaurant`,
        viewport: { width: 375, height: 667 },
        networkCondition: 'fast3g',
        deviceType: 'mobile',
        interactions: [
          { type: 'click', selector: '[data-testid="menu-item"]', delay: 1000 },
          { type: 'click', selector: '[data-testid="add-to-cart"]', delay: 500 },
          { type: 'click', selector: '[data-testid="cart-button"]', delay: 500 },
          { type: 'scroll', value: '500', delay: 500 }
        ]
      }
    ];

    const testId = `perf-${Date.now()}`;
    const testResults: PerformanceReport['scenarios'] = [];

    // Run each scenario
    for (const scenario of scenarios) {
      console.log(`📊 Testing: ${scenario.name}`);
      
      try {
        const metrics = await this.runScenario(scenario);
        const recommendations = this.generateRecommendations(metrics);
        
        testResults.push({
          scenario,
          metrics,
          recommendations
        });
        
        console.log(`✓ Completed: ${scenario.name} (${metrics.loadTime}ms)`);
      } catch (error) {
        console.error(`❌ Failed: ${scenario.name}`, error);
      }
    }

    // Generate summary
    const summary = this.generateSummary(testResults);

    const report: PerformanceReport = {
      testId,
      timestamp: new Date().toISOString(),
      environment: {
        url: this.baseUrl,
        userAgent: await this.page.evaluate(() => navigator.userAgent),
        viewport: await this.page.viewport() || { width: 1920, height: 1080 },
        networkCondition: 'variable'
      },
      scenarios: testResults,
      summary
    };

    // Save report
    await this.saveReport(report);

    return report;
  }

  /**
   * Run individual test scenario
   */
  private async runScenario(scenario: TestScenario): Promise<PerformanceMetrics> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    // Set viewport and user agent
    await this.page.setViewport(scenario.viewport);
    if (scenario.userAgent) {
      await this.page.setUserAgent(scenario.userAgent);
    }

    // Set network conditions
    await this.setNetworkConditions(scenario.networkCondition);

    // Set cookies if provided
    if (scenario.cookies) {
      await this.page.setCookie(...scenario.cookies);
    }

    // Start performance tracking
    const startTime = Date.now();
    const client = await this.page.target().createCDPSession();
    
    await client.send('Performance.enable');
    await client.send('Runtime.enable');

    // Navigate to page
    const response = await this.page.goto(scenario.url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    if (!response || !response.ok()) {
      throw new Error(`Failed to load ${scenario.url}: ${response?.status()}`);
    }

    // Execute interactions if provided
    if (scenario.interactions) {
      for (const interaction of scenario.interactions) {
        await this.executeInteraction(interaction);
      }
    }

    // Collect metrics
    const metrics = await this.collectMetrics(scenario.url, startTime, client);

    await client.detach();
    return metrics;
  }

  /**
   * Set network conditions
   */
  private async setNetworkConditions(condition: TestScenario['networkCondition']): Promise<void> {
    if (!this.page) return;

    const client = await this.page.target().createCDPSession();

    const conditions = {
      wifi: { downloadThroughput: -1, uploadThroughput: -1, latency: 0 },
      fast3g: { downloadThroughput: 1638400, uploadThroughput: 768000, latency: 562.5 },
      slow3g: { downloadThroughput: 390000, uploadThroughput: 390000, latency: 2000 },
      offline: { downloadThroughput: 0, uploadThroughput: 0, latency: 0 }
    };

    const config = conditions[condition];
    await client.send('Network.emulateNetworkConditions', {
      offline: condition === 'offline',
      ...config
    });

    await client.detach();
  }

  /**
   * Execute user interaction
   */
  private async executeInteraction(interaction: TestScenario['interactions'][0]): Promise<void> {
    if (!this.page) return;

    try {
      switch (interaction.type) {
        case 'click':
          if (interaction.selector) {
            await this.page.waitForSelector(interaction.selector, { timeout: 5000 });
            await this.page.click(interaction.selector);
          }
          break;

        case 'scroll':
          await this.page.evaluate((value) => {
            window.scrollBy(0, parseInt(value || '0', 10));
          }, interaction.value);
          break;

        case 'type':
          if (interaction.selector && interaction.value) {
            await this.page.waitForSelector(interaction.selector, { timeout: 5000 });
            await this.page.type(interaction.selector, interaction.value);
          }
          break;

        case 'hover':
          if (interaction.selector) {
            await this.page.waitForSelector(interaction.selector, { timeout: 5000 });
            await this.page.hover(interaction.selector);
          }
          break;

        case 'wait':
          await this.page.waitForTimeout(interaction.delay || 1000);
          break;
      }

      if (interaction.delay) {
        await this.page.waitForTimeout(interaction.delay);
      }
    } catch (error) {
      console.warn(`Interaction failed: ${interaction.type}`, error);
    }
  }

  /**
   * Collect performance metrics
   */
  private async collectMetrics(
    url: string,
    startTime: number,
    client: any
  ): Promise<PerformanceMetrics> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const loadTime = Date.now() - startTime;

    // Get navigation timing
    const navigationTiming = await this.page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: nav.domContentLoadedEventEnd - nav.navigationStart,
        loadComplete: nav.loadEventEnd - nav.navigationStart,
        firstByte: nav.responseStart - nav.navigationStart,
        domInteractive: nav.domInteractive - nav.navigationStart
      };
    });

    // Get Core Web Vitals
    const coreWebVitals = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};
        
        // FCP
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          vitals.fcp = entries[0]?.startTime || 0;
        }).observe({ entryTypes: ['paint'] });

        // LCP
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry?.startTime || 0;
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // CLS
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          vitals.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });

        // FID would be captured during actual user interaction
        vitals.fid = 0;

        setTimeout(() => resolve(vitals), 3000);
      });
    });

    // Get resource metrics
    const resourceMetrics = await this.page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      const totalSize = resources.reduce((sum, resource: any) => {
        return sum + (resource.transferSize || 0);
      }, 0);
      
      const totalResourceSize = resources.reduce((sum, resource: any) => {
        return sum + (resource.decodedBodySize || 0);
      }, 0);

      const cacheHits = resources.filter((resource: any) => 
        resource.transferSize === 0 && resource.decodedBodySize > 0
      ).length;

      return {
        resourceCount: resources.length,
        totalTransferSize: totalSize,
        totalResourceSize,
        cacheHitRatio: resources.length > 0 ? (cacheHits / resources.length) * 100 : 0
      };
    });

    // Calculate additional metrics
    const metrics: PerformanceMetrics = {
      url,
      timestamp: new Date().toISOString(),
      loadTime,
      domContentLoaded: navigationTiming.domContentLoaded,
      firstContentfulPaint: (coreWebVitals as any).fcp || 0,
      largestContentfulPaint: (coreWebVitals as any).lcp || 0,
      firstInputDelay: (coreWebVitals as any).fid || 0,
      cumulativeLayoutShift: (coreWebVitals as any).cls || 0,
      totalBlockingTime: 0, // Would need specific measurement
      speedIndex: 0, // Would need specific measurement
      timeToInteractive: navigationTiming.domInteractive,
      ...resourceMetrics,
      renderBlockingResources: 0, // Would need specific analysis
      unusedJavaScript: 0, // Would need coverage analysis
      unusedCSS: 0, // Would need coverage analysis
      imageOptimization: 0 // Would need specific analysis
    };

    return metrics;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    // Load time recommendations
    if (metrics.loadTime > 3000) {
      recommendations.push('Page load time exceeds 3 seconds - consider optimizing critical resources');
    }

    // FCP recommendations
    if (metrics.firstContentfulPaint > 1800) {
      recommendations.push('First Contentful Paint is slow - optimize critical rendering path');
    }

    // LCP recommendations
    if (metrics.largestContentfulPaint > 2500) {
      recommendations.push('Largest Contentful Paint is slow - optimize main content loading');
    }

    // CLS recommendations
    if (metrics.cumulativeLayoutShift > 0.1) {
      recommendations.push('Cumulative Layout Shift is high - stabilize layout during loading');
    }

    // Resource recommendations
    if (metrics.resourceCount > 100) {
      recommendations.push('High number of resources - consider bundling and reducing requests');
    }

    // Cache recommendations
    if (metrics.cacheHitRatio < 50) {
      recommendations.push('Low cache hit ratio - implement better caching strategy');
    }

    // Transfer size recommendations
    if (metrics.totalTransferSize > 2 * 1024 * 1024) { // 2MB
      recommendations.push('Large transfer size - implement compression and optimize assets');
    }

    return recommendations;
  }

  /**
   * Generate test summary
   */
  private generateSummary(results: PerformanceReport['scenarios']): PerformanceReport['summary'] {
    if (results.length === 0) {
      return {
        averageLoadTime: 0,
        averageFCP: 0,
        averageLCP: 0,
        averageCLS: 0,
        averageTBT: 0,
        performanceScore: 0,
        optimization: {
          totalSavings: 0,
          criticalIssues: 0,
          warnings: 0
        }
      };
    }

    const metrics = results.map(r => r.metrics);
    
    const averageLoadTime = metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length;
    const averageFCP = metrics.reduce((sum, m) => sum + m.firstContentfulPaint, 0) / metrics.length;
    const averageLCP = metrics.reduce((sum, m) => sum + m.largestContentfulPaint, 0) / metrics.length;
    const averageCLS = metrics.reduce((sum, m) => sum + m.cumulativeLayoutShift, 0) / metrics.length;
    const averageTBT = metrics.reduce((sum, m) => sum + m.totalBlockingTime, 0) / metrics.length;

    // Calculate performance score (0-100)
    let score = 100;
    if (averageLoadTime > 3000) score -= 20;
    if (averageFCP > 1800) score -= 15;
    if (averageLCP > 2500) score -= 20;
    if (averageCLS > 0.1) score -= 15;
    if (averageTBT > 300) score -= 10;

    // Count issues
    const allRecommendations = results.flatMap(r => r.recommendations);
    const criticalIssues = allRecommendations.filter(rec => 
      rec.includes('exceeds') || rec.includes('slow') || rec.includes('high')
    ).length;
    
    const warnings = allRecommendations.length - criticalIssues;

    return {
      averageLoadTime,
      averageFCP,
      averageLCP,
      averageCLS,
      averageTBT,
      performanceScore: Math.max(0, score),
      optimization: {
        totalSavings: 0, // Would calculate based on optimization opportunities
        criticalIssues,
        warnings
      }
    };
  }

  /**
   * Save performance report
   */
  private async saveReport(report: PerformanceReport): Promise<void> {
    const reportPath = path.join(this.reportDir, `performance-${report.testId}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(report);
    const htmlPath = path.join(this.reportDir, `performance-${report.testId}.html`);
    await fs.writeFile(htmlPath, htmlReport);

    console.log(`\n📊 Performance report saved:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlPath}`);
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(report: PerformanceReport): string {
    const { summary, scenarios } = report;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Test Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
    .header { text-align: center; margin-bottom: 30px; }
    .score { font-size: 48px; font-weight: bold; color: ${summary.performanceScore >= 80 ? '#4CAF50' : summary.performanceScore >= 60 ? '#FF9800' : '#F44336'}; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .metric-card { padding: 20px; background: #f9f9f9; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 24px; font-weight: bold; color: #333; }
    .metric-label { color: #666; margin-top: 5px; }
    .scenario { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    .scenario h3 { margin: 0 0 15px 0; color: #333; }
    .recommendations { margin-top: 15px; }
    .recommendations ul { margin: 0; padding-left: 20px; }
    .recommendations li { margin: 5px 0; color: #666; }
    .chart-container { margin: 30px 0; height: 400px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Performance Test Report</h1>
      <div class="score">${summary.performanceScore}/100</div>
      <p>Generated on ${new Date(report.timestamp).toLocaleString()}</p>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">${summary.averageLoadTime.toFixed(0)}ms</div>
        <div class="metric-label">Avg Load Time</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${summary.averageFCP.toFixed(0)}ms</div>
        <div class="metric-label">Avg FCP</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${summary.averageLCP.toFixed(0)}ms</div>
        <div class="metric-label">Avg LCP</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${(summary.averageCLS * 1000).toFixed(1)}</div>
        <div class="metric-label">Avg CLS (×1000)</div>
      </div>
    </div>

    <div class="chart-container">
      <canvas id="performanceChart"></canvas>
    </div>

    <h2>Test Scenarios</h2>
    ${scenarios.map((scenario, index) => `
      <div class="scenario">
        <h3>${scenario.scenario.name}</h3>
        <p><strong>URL:</strong> ${scenario.metrics.url}</p>
        <p><strong>Load Time:</strong> ${scenario.metrics.loadTime}ms</p>
        <p><strong>FCP:</strong> ${scenario.metrics.firstContentfulPaint}ms</p>
        <p><strong>LCP:</strong> ${scenario.metrics.largestContentfulPaint}ms</p>
        <p><strong>CLS:</strong> ${scenario.metrics.cumulativeLayoutShift.toFixed(3)}</p>
        <p><strong>Resources:</strong> ${scenario.metrics.resourceCount}</p>
        <p><strong>Transfer Size:</strong> ${(scenario.metrics.totalTransferSize / 1024).toFixed(1)}KB</p>
        
        ${scenario.recommendations.length > 0 ? `
          <div class="recommendations">
            <strong>Recommendations:</strong>
            <ul>
              ${scenario.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>

  <script>
    const ctx = document.getElementById('performanceChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(scenarios.map(s => s.scenario.name))},
        datasets: [{
          label: 'Load Time (ms)',
          data: ${JSON.stringify(scenarios.map(s => s.metrics.loadTime))},
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }, {
          label: 'FCP (ms)',
          data: ${JSON.stringify(scenarios.map(s => s.metrics.firstContentfulPaint))},
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  </script>
</body>
</html>
    `.trim();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Display test summary
   */
  displaySummary(report: PerformanceReport): void {
    console.log('\n📊 Performance Test Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Performance Score: ${report.summary.performanceScore}/100`);
    console.log(`Average Load Time: ${report.summary.averageLoadTime.toFixed(0)}ms`);
    console.log(`Average FCP: ${report.summary.averageFCP.toFixed(0)}ms`);
    console.log(`Average LCP: ${report.summary.averageLCP.toFixed(0)}ms`);
    console.log(`Average CLS: ${report.summary.averageCLS.toFixed(3)}`);
    console.log(`Critical Issues: ${report.summary.optimization.criticalIssues}`);
    console.log(`Warnings: ${report.summary.optimization.warnings}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args.find(arg => arg.startsWith('--url='))?.split('=')[1];
  
  const tester = new PerformanceTester(baseUrl);

  try {
    console.log('🔧 Initializing performance tester...');
    await tester.init();

    const report = await tester.runTests();
    tester.displaySummary(report);

    console.log('\n✅ Performance testing completed successfully!');
  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { PerformanceTester };
export default PerformanceTester;