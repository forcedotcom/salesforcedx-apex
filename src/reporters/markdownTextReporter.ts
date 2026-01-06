/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TestResult, ApexTestResultData } from '../tests/types';
import {
  ReportData,
  renderMarkdownReport,
  FailureTest,
  WarningTest,
  TestTableRow,
  CoverageTableRow
} from './markdownReportTemplate';

export type OutputFormat = 'markdown' | 'text';
export type TestSortOrder = 'runtime' | 'coverage' | 'severity';

export interface MarkdownTextReporterOptions {
  /**
   * Output format: 'markdown' or 'text'
   */
  format?: OutputFormat;
  /**
   * Sort order for tests: 'runtime', 'coverage', or 'severity'
   */
  sortOrder?: TestSortOrder;
  /**
   * Performance threshold in milliseconds. Tests exceeding this will be flagged as poorly performing.
   */
  performanceThresholdMs?: number;
  /**
   * Coverage threshold as a percentage. Tests below this will be flagged as poorly covered.
   */
  coverageThresholdPercent?: number;
  /**
   * Whether to include code coverage information in the report
   */
  codeCoverage?: boolean;
  /**
   * Timestamp for the test run. If not provided, current time will be used.
   */
  timestamp?: Date;
}

/** Escapes markdown special characters */
const escapeMarkdown = (text: string): string =>
  text.replaceAll(/[\\`*_{}[\]()#+\-!]/g, '\\$&');

/** Formats duration in milliseconds to a human-readable string */
const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

/** Checks if a test is poorly performing (takes too long) */
const isPoorlyPerforming = (
  runTime: number | undefined,
  thresholdMs: number
): boolean => runTime !== undefined && runTime > thresholdMs;

/** Checks if a test has poor coverage */
const hasPoorCoverage = (
  coverage: string | number | undefined,
  thresholdPercent: number
): boolean => {
  if (coverage === undefined || coverage === 'N/A') {
    return false;
  }
  if (typeof coverage === 'string') {
    const numericValue = parseFloat(coverage.replace('%', ''));
    return !isNaN(numericValue) && numericValue < thresholdPercent;
  }
  return coverage < thresholdPercent;
};

/** Extracts numeric coverage percentage from coverage value */
const getCoveragePercentage = (coverage?: string | number): number | null => {
  if (coverage === undefined || coverage === 'N/A') {
    return null;
  }
  if (typeof coverage === 'string') {
    const numericValue = parseFloat(coverage.replace('%', ''));
    return isNaN(numericValue) ? null : numericValue;
  }
  return coverage;
};

/** Extracts test name information from a test */
const getTestNameInfo = (test: ApexTestResultData) => {
  const className = test.apexClass?.name ?? 'Unknown';
  const namespacePrefix = test.apexClass?.namespacePrefix;
  const fullClassName = namespacePrefix
    ? `${namespacePrefix}.${className}`
    : className;
  const methodName = test.methodName ?? 'Unknown';
  const testName = `${fullClassName}.${methodName}`;
  return { className, namespacePrefix, fullClassName, methodName, testName };
};

/** Formats timestamp to a string */
const formatTimestamp = (timestamp: Date): string =>
  timestamp.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

/** Extracts summary information from test result */
const getSummaryInfo = (summary: TestResult['summary']) => {
  const passed = summary?.passing ?? 0;
  const failed = summary?.failing ?? 0;
  const skipped = summary?.skipped ?? 0;
  const total = summary?.testsRan ?? 0;
  const duration =
    summary?.outcome === 'Passed' || summary?.outcome === 'Failed'
      ? (summary?.testExecutionTimeInMs ?? 0)
      : 0;
  return { passed, failed, skipped, total, duration };
};

/** Calculates a severity score for sorting (higher = worse) */
const getSeverityScore = (
  test: ApexTestResultData,
  codeCoverage: boolean,
  performanceThresholdMs: number,
  coverageThresholdPercent: number
): number => {
  let score = 0;

  // Both issues = highest priority (score 10000+)
  const isSlow = isPoorlyPerforming(test.runTime, performanceThresholdMs);
  const hasLowCoverage =
    codeCoverage &&
    hasPoorCoverage(
      test.perClassCoverage?.[0]?.percentage,
      coverageThresholdPercent
    );

  if (isSlow && hasLowCoverage) {
    score += 10_000;
  } else if (isSlow) {
    score += 5000;
  } else if (hasLowCoverage) {
    score += 5000;
  }

  // Add runtime (longer = worse, but only if it's a problem)
  if (test.runTime !== undefined) {
    score += test.runTime;
  }

  // Subtract coverage (lower = worse, but only if it's a problem)
  if (codeCoverage && hasLowCoverage) {
    const coverage = getCoveragePercentage(
      test.perClassCoverage?.[0]?.percentage
    );
    if (coverage !== null) {
      score += (100 - coverage) * 100; // Lower coverage = higher score
    }
  }

  return score;
};

/**
 * Reporter class for generating markdown and text format test reports
 */
export class MarkdownTextReporter {
  private readonly outputFormat: OutputFormat;
  private readonly sortOrder: TestSortOrder;
  private readonly performanceThresholdMs: number;
  private readonly coverageThresholdPercent: number;
  private readonly codeCoverage: boolean;
  private readonly timestamp: Date;

  constructor(options: MarkdownTextReporterOptions = {}) {
    this.outputFormat = options.format ?? 'markdown';
    this.sortOrder = options.sortOrder ?? 'runtime';
    this.performanceThresholdMs = options.performanceThresholdMs ?? 5000;
    this.coverageThresholdPercent = options.coverageThresholdPercent ?? 75;
    this.codeCoverage = options.codeCoverage ?? false;
    this.timestamp = options.timestamp ?? new Date();
  }

  /**
   * Generates a report from test results
   */
  public format(testResult: TestResult): string {
    if (this.outputFormat === 'markdown') {
      return this.generateMarkdownReport(testResult);
    } else {
      return this.generateTextReport(testResult);
    }
  }

  /**
   * Generates a markdown report from test results
   */
  private generateMarkdownReport(result: TestResult): string {
    const { passed, failed, skipped, total, duration } = getSummaryInfo(
      result.summary
    );
    const timestampStr = formatTimestamp(this.timestamp);

    // Helper function to sort tests based on sort order
    const sortTests = (tests: ApexTestResultData[]): ApexTestResultData[] => {
      if (!tests) {
        return tests;
      }
      return [...tests].sort((a: ApexTestResultData, b: ApexTestResultData) => {
        const runtimeA = a.runTime ?? 0;
        const runtimeB = b.runTime ?? 0;
        const coverageA = this.codeCoverage
          ? (getCoveragePercentage(a.perClassCoverage?.[0]?.percentage) ?? 100)
          : 100;
        const coverageB = this.codeCoverage
          ? (getCoveragePercentage(b.perClassCoverage?.[0]?.percentage) ?? 100)
          : 100;

        if (this.sortOrder === 'runtime') {
          return runtimeB !== runtimeA
            ? runtimeB - runtimeA
            : coverageA - coverageB;
        } else if (this.sortOrder === 'coverage') {
          return coverageA !== coverageB
            ? coverageA - coverageB
            : runtimeB - runtimeA;
        } else {
          const scoreA = getSeverityScore(
            a,
            this.codeCoverage,
            this.performanceThresholdMs,
            this.coverageThresholdPercent
          );
          const scoreB = getSeverityScore(
            b,
            this.codeCoverage,
            this.performanceThresholdMs,
            this.coverageThresholdPercent
          );
          return scoreB - scoreA;
        }
      });
    };

    // Build data structures using spread operators
    const failedTests =
      result.tests?.filter((test) => test.outcome?.toString() === 'Fail') ?? [];
    const passedTests =
      result.tests?.filter((test) => test.outcome?.toString() === 'Pass') ?? [];
    const skippedTests =
      result.tests?.filter((test) => test.outcome?.toString() === 'Skip') ?? [];

    // Build failures data
    const failures: FailureTest[] = failedTests.map((test) => {
      const { testName } = getTestNameInfo(test);
      return {
        testName: escapeMarkdown(testName),
        ...(test.runTime !== undefined && {
          duration: formatDuration(test.runTime)
        }),
        ...(test.message && { message: test.message }),
        ...(test.stackTrace && { stackTrace: test.stackTrace })
      };
    });

    // Identify poorly performing and poorly covered tests
    const poorlyPerformingTests =
      result.tests?.filter((test) =>
        isPoorlyPerforming(test.runTime, this.performanceThresholdMs)
      ) ?? [];
    const poorlyCoveredTests = this.codeCoverage
      ? (result.tests?.filter((test) =>
          hasPoorCoverage(
            test.perClassCoverage?.[0]?.percentage,
            this.coverageThresholdPercent
          )
        ) ?? [])
      : [];

    // Build warnings data
    const poorlyPerformingWarnings: WarningTest[] = [...poorlyPerformingTests]
      .sort((a, b) => (b.runTime ?? 0) - (a.runTime ?? 0))
      .map((test) => {
        const { testName } = getTestNameInfo(test);
        return {
          testName: escapeMarkdown(testName),
          value:
            test.runTime !== undefined ? formatDuration(test.runTime) : 'N/A',
          type: 'performance' as const
        };
      });

    const poorlyCoveredWarnings: WarningTest[] = [...poorlyCoveredTests]
      .sort((a, b) => {
        const coverageA =
          getCoveragePercentage(a.perClassCoverage?.[0]?.percentage) ?? 0;
        const coverageB =
          getCoveragePercentage(b.perClassCoverage?.[0]?.percentage) ?? 0;
        return coverageA - coverageB;
      })
      .map((test) => {
        const { testName } = getTestNameInfo(test);
        const coverage = test.perClassCoverage?.[0]?.percentage ?? 'N/A';
        return {
          testName: escapeMarkdown(testName),
          value: typeof coverage === 'string' ? coverage : String(coverage),
          type: 'coverage' as const
        };
      });

    // Build test table data
    const testTableRows: TestTableRow[] =
      this.codeCoverage && result.tests
        ? sortTests(result.tests).map((test) => {
            const { fullClassName, testName } = getTestNameInfo(test);
            const outcome = test.outcome?.toString() ?? 'Unknown';
            const coverage = test.perClassCoverage?.[0]?.percentage ?? 'N/A';
            const coverageStr = typeof coverage === 'string' ? coverage : 'N/A';
            const runtime =
              test.runTime !== undefined ? formatDuration(test.runTime) : 'N/A';
            const outcomeEmoji =
              outcome === 'Pass' ? '✅' : outcome === 'Fail' ? '❌' : '⏭️';
            const isSlow = isPoorlyPerforming(
              test.runTime,
              this.performanceThresholdMs
            );
            const hasLowCoverage = hasPoorCoverage(
              coverage,
              this.coverageThresholdPercent
            );

            return {
              testName: escapeMarkdown(testName),
              className: escapeMarkdown(fullClassName),
              outcome,
              outcomeEmoji,
              coverage: coverageStr,
              runtime,
              hasWarning: isSlow || hasLowCoverage
            };
          })
        : [];

    // Build passed tests data
    const passedTestsData = sortTests(passedTests).map((test) => {
      const { testName } = getTestNameInfo(test);
      const isSlow = isPoorlyPerforming(
        test.runTime,
        this.performanceThresholdMs
      );
      const hasLowCoverage =
        this.codeCoverage &&
        hasPoorCoverage(
          test.perClassCoverage?.[0]?.percentage,
          this.coverageThresholdPercent
        );

      return {
        testName: escapeMarkdown(testName),
        ...(test.runTime !== undefined && {
          runtime: formatDuration(test.runTime)
        }),
        ...(this.codeCoverage &&
          test.perClassCoverage?.[0]?.percentage && {
            coverage: String(test.perClassCoverage[0].percentage)
          }),
        isSlow,
        hasLowCoverage
      };
    });

    // Build skipped tests data
    const skippedTestsData = skippedTests.map((test) => {
      const { testName } = getTestNameInfo(test);
      return { testName: escapeMarkdown(testName) };
    });

    // Build coverage table data
    const coverageTableRows: CoverageTableRow[] =
      this.codeCoverage && result.codecoverage
        ? [...result.codecoverage]
            .sort((a, b) => {
              const percentageA = getCoveragePercentage(a.percentage) ?? 0;
              const percentageB = getCoveragePercentage(b.percentage) ?? 0;
              return percentageA - percentageB;
            })
            .map((coverageItem) => {
              const className = coverageItem.name ?? 'Unknown';
              const percentage = coverageItem.percentage ?? '0%';
              const uncoveredLines = coverageItem.uncoveredLines ?? [];
              return {
                className: escapeMarkdown(className),
                percentage,
                uncoveredLines:
                  uncoveredLines.length > 0 ? uncoveredLines.join(', ') : 'None'
              };
            })
        : [];

    // Build report data object
    const reportData: ReportData = {
      timestamp: timestampStr,
      summary: {
        total,
        passed,
        failed,
        skipped,
        duration: formatDuration(duration)
      },
      failures,
      warnings: {
        poorlyPerforming: poorlyPerformingWarnings,
        poorlyCovered: poorlyCoveredWarnings
      },
      ...(testTableRows.length > 0 && {
        testTable: {
          rows: testTableRows,
          note: 'Note: Coverage shown is per-test coverage for the class being tested. Overall class coverage is shown in the "Code Coverage by Class" section below.'
        }
      }),
      passedTests: passedTestsData,
      skippedTests: skippedTestsData,
      ...(coverageTableRows.length > 0 && {
        coverageTable: {
          rows: coverageTableRows,
          note: 'This section shows the overall code coverage for each class after all tests have run. This may differ from per-test coverage shown in the table above.'
        }
      })
    };

    return renderMarkdownReport(reportData);
  }

  /**
   * Generates a plain text report from test results
   */
  private generateTextReport(result: TestResult): string {
    const { passed, failed, skipped, total, duration } = getSummaryInfo(
      result.summary
    );
    const timestampStr = formatTimestamp(this.timestamp);

    let report = 'Apex Test Results\n';
    report += '==================\n\n';
    report += `Run completed: ${timestampStr}\n\n`;

    // Summary
    report += 'Summary:\n';
    report += `  Passed:  ${passed}\n`;
    report += `  Failed:  ${failed}\n`;
    report += `  Skipped: ${skipped}\n`;
    report += `  Total:   ${total}\n`;
    report += `  Duration: ${formatDuration(duration)}\n\n`;

    // Failures section
    const failedTests =
      result.tests?.filter((test) => test.outcome?.toString() === 'Fail') ?? [];
    if (failedTests.length > 0) {
      report += 'Failures:\n';
      report += '=========\n\n';
      for (const test of failedTests) {
        const { testName } = getTestNameInfo(test);

        report += `${testName}\n`;
        report += `${'-'.repeat(testName.length)}\n`;
        if (test.message) {
          report += `Error:\n${test.message}\n\n`;
        }
        if (test.stackTrace) {
          report += `Stack Trace:\n${test.stackTrace}\n\n`;
        }
        if (test.runTime !== undefined) {
          report += `Duration: ${formatDuration(test.runTime)}\n\n`;
        }
        report += '\n';
      }
    }

    // Passed tests section
    const passedTests =
      result.tests?.filter((test) => test.outcome?.toString() === 'Pass') ?? [];
    if (passedTests.length > 0) {
      report += 'Passed Tests:\n';
      report += '==============\n\n';
      for (const test of passedTests) {
        const { testName } = getTestNameInfo(test);

        report += `  - ${testName}`;
        if (test.runTime !== undefined) {
          report += ` (${formatDuration(test.runTime)})`;
        }
        report += '\n';
      }
      report += '\n';
    }

    // Skipped tests section
    const skippedTests =
      result.tests?.filter((test) => test.outcome?.toString() === 'Skip') ?? [];
    if (skippedTests.length > 0) {
      report += 'Skipped Tests:\n';
      report += '===============\n\n';
      for (const test of skippedTests) {
        const { testName } = getTestNameInfo(test);

        report += `  - ${testName}\n`;
      }
      report += '\n';
    }

    // Code coverage by class section
    if (
      this.codeCoverage &&
      result.codecoverage &&
      result.codecoverage.length > 0
    ) {
      report += 'Code Coverage by Class:\n';
      report += '=======================\n\n';
      for (const coverageItem of result.codecoverage) {
        const className = coverageItem.name ?? 'Unknown';
        const percentage = coverageItem.percentage ?? '0%';
        const uncoveredLines = coverageItem.uncoveredLines ?? [];
        const uncoveredStr =
          uncoveredLines.length > 0 ? uncoveredLines.join(', ') : 'None';
        report += `  ${className}: ${percentage} (Uncovered: ${uncoveredStr})\n`;
      }
      report += '\n';
    }

    return report;
  }
}
