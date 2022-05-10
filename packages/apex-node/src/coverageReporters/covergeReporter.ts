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

interface coverageReporterOptions {
  reportFormats?: reports.ReportType[];
  reportOptions?: reports.ReportOptions;
  watermark?: libReport.Watermarks;
}

const defaultWatermarks: libReport.Watermarks = {
  statements: [50, 75],
  functions: [50, 75],
  branches: [50, 75],
  lines: [50, 75]
};

export class CoverageReporter {
  private readonly coverageMap: libCoverage.CoverageMap;
  constructor(
    private readonly coverage: ApexCodeCoverageAggregate | ApexCodeCoverage,
    private readonly reportDir: string,
    private readonly sourceDir: string,
    private readonly options?: coverageReporterOptions
  ) {
    this.coverageMap = this.buildCoverageMap();
  }

  public async generateReports(): Promise<void> {
    const context = libReport.createContext({
      dir: this.reportDir,
      defaultSummarizer: 'nested',
      watermarks: this.options?.watermark || defaultWatermarks,
      coverageMap: this.coverageMap
    });
    const formats = this.options?.reportFormats || ['text-summary'];
    this.options?.reportFormats.forEach(format => {
      const report = reports.create(format, this.options?.reportOptions[format]);
      report.execute(context);
    });
  }

  private buildCoverageMap() {
    const coverageMap = libCoverage.createCoverageMap();
    this.coverage.records.forEach((record: ApexCodeCoverageRecord | ApexCodeCoverageAggregateRecord) => {
      const fileCoverageData: libCoverage.FileCoverageData = {} as libCoverage.FileCoverageData;
      const classOrTriggerSuffix = record.ApexClassOrTrigger.Id.startsWith('01p') ? '.cls' : '.trigger';
      fileCoverageData.fnMap = {};
      fileCoverageData.branchMap = {};
      fileCoverageData.path = path.join(this.sourceDir, this.findFullPathToClass(record.ApexClassOrTrigger.Name));
      fileCoverageData.s = record.Coverage.coveredLines
        .map(line => [new Number(line).toString(10), 1])
        .reduce((acc, [line, value]) => {
          return Object.assign(acc, { [line]: value });
        }, {});
      // what happens if source file cannot be read?
      const sourceLines = fs.readFileSync(fileCoverageData.path, 'utf8').split('\n');
      fileCoverageData.statementMap = [...record.Coverage.coveredLines, ...record.Coverage.uncoveredLines]
        .sort()
        .map(line => {
          const startColumn = sourceLines[line - 1] || 0;
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

          return [new Number(line).toString(10), statement];
        })
        .reduce((acc, [line, value]) => {
          return Object.assign(acc, { [new Number(line).toString()]: value });
        }, {});
      coverageMap.addFileCoverage(fileCoverageData);
    });
    return coverageMap;
  }

  private findFullPathToClass(classOrTriggerName: string): string {
    const searchPattern = `**/${classOrTriggerName}.{cls,trigger}`;
    const files = glob.sync(searchPattern, { cwd: this.sourceDir });
    return files[0] ? files[0] : classOrTriggerName;
  }
}
