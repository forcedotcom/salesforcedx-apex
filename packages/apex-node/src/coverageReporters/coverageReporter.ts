/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {
  ApexCodeCoverage,
  ApexCodeCoverageAggregate,
  ApexCodeCoverageAggregateRecord,
  ApexCodeCoverageRecord
} from '../tests/types';
import * as libReport from 'istanbul-lib-report';
import * as reports from 'istanbul-reports';
import * as libCoverage from 'istanbul-lib-coverage';
import * as path from 'path';
import { glob } from 'glob';
import * as fs from 'fs';

const startOfSource = (source: string): number => {
  if (source) {
    return source.search(/\S/) || 0;
  }
  return 0;
};
const endOfSource = (source: string): number => {
  if (source) {
    return source.search(/\S$/) || 0;
  }
  return 0;
};

export type CoverageReportFormats = reports.ReportType;

export const DefaultWatermarks: libReport.Watermarks = {
  statements: [50, 75],
  functions: [50, 75],
  branches: [50, 75],
  lines: [50, 75]
};

export const DefaultReportOptions: Partial<reports.ReportOptions> = {
  clover: { file: 'clover.xml', projectRoot: '.' },
  cobertura: { file: 'cobertura.xml', projectRoot: '.' },
  'html-spa': {
    verbose: false,
    skipEmpty: false,
    subdir: 'html-spa',
    linkMapper: undefined,
    metricsToShow: ['lines', 'statements', 'branches']
  },
  html: {
    verbose: false,
    skipEmpty: false,
    subdir: 'html',
    linkMapper: undefined
  },
  json: { file: 'coverage.json' },
  'json-summary': { file: 'coverage-summary.json' },
  lcovonly: { file: 'lcovonly.info', projectRoot: '.' },
  none: {} as never,
  teamcity: { file: 'teamcity.txt', blockName: 'coverage' },
  text: { file: 'text.txt', maxCols: 160, skipEmpty: false, skipFull: false },
  'text-summary': { file: 'text-summary.txt' }
};

export interface CoverageReporterOptions {
  reportFormats?: CoverageReportFormats[];
  reportOptions?: Partial<typeof DefaultReportOptions>;
  watermark?: typeof DefaultWatermarks;
}

export class CoverageReporter {
  private readonly coverageMap: libCoverage.CoverageMap;
  constructor(
    private readonly coverage: ApexCodeCoverageAggregate | ApexCodeCoverage,
    private readonly reportDir: string,
    private readonly sourceDir: string,
    private readonly options?: CoverageReporterOptions
  ) {
    this.coverageMap = this.buildCoverageMap();
  }

  public generateReports(): void {
    const context = libReport.createContext({
      dir: this.reportDir,
      defaultSummarizer: 'nested',
      watermarks: this.options?.watermark || DefaultWatermarks,
      coverageMap: this.coverageMap
    });
    const formats = this.options?.reportFormats || ['text-summary'];
    formats.forEach(format => {
      const report = reports.create(
        format,
        this.options?.reportOptions[format] || DefaultReportOptions[format]
      );
      report.execute(context);
    });
  }

  private buildCoverageMap(): libCoverage.CoverageMap {
    const coverageMap = libCoverage.createCoverageMap();
    this.coverage.records.forEach(
      (record: ApexCodeCoverageRecord | ApexCodeCoverageAggregateRecord) => {
        const fileCoverageData: libCoverage.FileCoverageData = {} as libCoverage.FileCoverageData;
        fileCoverageData.fnMap = {};
        fileCoverageData.branchMap = {};
        fileCoverageData.path = path.join(
          this.sourceDir,
          this.findFullPathToClass(record.ApexClassOrTrigger.Name)
        );
        fileCoverageData.f = {};
        fileCoverageData.b = {};
        fileCoverageData.s = [
          ...record.Coverage.coveredLines.map(line => [line, 1]),
          ...record.Coverage.uncoveredLines.map(line => [line, 0])
        ]
          .map(([line, covered]) => [Number(line).toString(10), covered])
          .reduce((acc, [line, value]) => {
            return Object.assign(acc, { [line]: value });
          }, {});
        let sourceLines: string[] = [];
        try {
          sourceLines = fs
            .readFileSync(fileCoverageData.path, 'utf8')
            .split('\n');
        } catch {
          // file not found
        }
        fileCoverageData.statementMap = [
          ...record.Coverage.coveredLines,
          ...record.Coverage.uncoveredLines
        ]
          .sort()
          .map(line => {
            const statement: libCoverage.Range = {
              start: {
                line,
                column: startOfSource(sourceLines[line - 1])
              },
              end: {
                line,
                column: endOfSource(sourceLines[line - 1])
              }
            };

            return [Number(line).toString(10), statement];
          })
          .reduce((acc, [line, value]) => {
            return Object.assign(acc, { [Number(line).toString()]: value });
          }, {});
        coverageMap.addFileCoverage(fileCoverageData);
      }
    );
    return coverageMap;
  }

  private findFullPathToClass(classOrTriggerName: string): string {
    const searchPattern = `**/${classOrTriggerName}.{cls,trigger}`;
    const files = glob.sync(searchPattern, { cwd: this.sourceDir });
    return files[0] ? files[0] : classOrTriggerName;
  }
}