'use server';

import { runEndToEndLifecycleAudit, type TestResult } from '../../core/tests/e2e-lifecycle-audit.ts';

export async function runE2EAuditAction(): Promise<{
  success: boolean;
  timestamp: string;
  results: TestResult[];
}> {
  const report = await runEndToEndLifecycleAudit();
  return {
    success: report.success,
    timestamp: new Date().toISOString(),
    results: report.results,
  };
}
