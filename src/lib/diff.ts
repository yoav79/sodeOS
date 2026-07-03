export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}

/**
 * Normalizes newlines and splits a string into lines.
 * Treats empty string as having 0 lines.
 */
function getLines(str: string): string[] {
  if (!str) return [];
  return str.replace(/\r\n/g, '\n').split('\n');
}

/**
 * Computes a line-by-line diff between two strings using an iterative LCS algorithm.
 */
export function computeLineDiff(base: string, compare: string): DiffLine[] {
  const baseLines = getLines(base);
  const compareLines = getLines(compare);

  const n = baseLines.length;
  const m = compareLines.length;

  // Initialize DP table of size (n+1) x (m+1)
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  // Fill DP table
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (baseLines[i - 1] === compareLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build the diff list (in reverse)
  const result: DiffLine[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && baseLines[i - 1] === compareLines[j - 1]) {
      result.push({ type: 'unchanged', text: baseLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', text: compareLines[j - 1] });
      j--;
    } else {
      result.push({ type: 'removed', text: baseLines[i - 1] });
      i--;
    }
  }

  // Reverse to get correct order
  return result.reverse();
}
