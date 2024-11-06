// src/analyzer/__tests__/git.test.ts
import { exec } from "child_process";
import { GitAnalyzer } from "../git";
import * as childProcess from "child_process";
import { GitDiffError } from "../../types";

// exec 모듈을 모킹
jest.mock("child_process", () => ({
  exec: jest.fn(),
}));

// Mock 타입을 명시적으로 지정
const mockedExec = exec as unknown as jest.Mock;

describe("GitAnalyzer", () => {
  let analyzer: GitAnalyzer;

  beforeEach(() => {
    analyzer = new GitAnalyzer("/test/repo/path");
    jest.clearAllMocks();
  });

  it("should analyze basic diff between two refs", async () => {
    // Mock 구현
    mockedExec.mockImplementation(
      (command: string, options: any, callback: any) => {
        const response = {
          stdout: command.includes("diff --numstat")
            ? "1\t2\tsrc/test.ts\n"
            : "valid-hash\n",
          stderr: "",
        };

        process.nextTick(() => callback(null, response));
        return undefined;
      }
    );

    const analysis = await analyzer.analyzeDiff({
      fromRef: "main",
      toRef: "feature",
    });

    // 결과 검증
    expect(analysis.stats.filesChanged).toBe(1);
    expect(analysis.stats.insertions).toBe(1);
    expect(analysis.stats.deletions).toBe(2);
    expect(analysis.changes[0].path).toBe("src/test.ts");
  });

  it("should analyze changes across multiple files", async () => {
    const mockDiffOutput = [
      "10\t5\tsrc/components/Button.tsx",
      "0\t3\tsrc/utils/helper.ts",
      "7\t0\tsrc/styles/main.css",
      "2\t1\tpackage.json",
    ].join("\n");

    mockedExec.mockImplementation(
      (command: string, options: any, callback: any) => {
        const response = {
          stdout: command.includes("diff --numstat")
            ? mockDiffOutput
            : "valid-hash\n",
          stderr: "",
        };

        process.nextTick(() => callback(null, response));
        return undefined;
      }
    );

    const analysis = await analyzer.analyzeDiff({
      fromRef: "main",
      toRef: "feature",
    });

    // 전체 통계 검증
    expect(analysis.stats.filesChanged).toBe(4);
    expect(analysis.stats.insertions).toBe(19); // 10 + 0 + 7 + 2
    expect(analysis.stats.deletions).toBe(9); // 5 + 3 + 0 + 1

    // 파일 타입별 통계 검증
    expect(analysis.byFileType[".tsx"].count).toBe(1);
    expect(analysis.byFileType[".ts"].count).toBe(1);
    expect(analysis.byFileType[".css"].count).toBe(1);
    expect(analysis.byFileType[".json"].count).toBe(1);

    // 개별 파일 변경사항 검증
    const buttonChange = analysis.changes.find(
      (c) => c.path === "src/components/Button.tsx"
    );
    expect(buttonChange).toBeDefined();
    expect(buttonChange?.type).toBe("modified");
    expect(buttonChange?.insertions).toBe(10);
    expect(buttonChange?.deletions).toBe(5);

    const helperChange = analysis.changes.find(
      (c) => c.path === "src/utils/helper.ts"
    );
    expect(helperChange).toBeDefined();
    expect(helperChange?.type).toBe("deleted");
    expect(helperChange?.insertions).toBe(0);
    expect(helperChange?.deletions).toBe(3);

    const styleChange = analysis.changes.find(
      (c) => c.path === "src/styles/main.css"
    );
    expect(styleChange).toBeDefined();
    expect(styleChange?.type).toBe("added");
    expect(styleChange?.insertions).toBe(7);
    expect(styleChange?.deletions).toBe(0);
  });

  describe("error handling", () => {
    it("should throw error for invalid git reference", async () => {
      mockedExec.mockImplementation(
        (command: string, options: any, callback: any) => {
          const error = new Error("fatal: bad revision 'invalid-branch'");
          process.nextTick(() =>
            callback(error, { stdout: "", stderr: error.message })
          );
          return undefined;
        }
      );

      await expect(
        analyzer.analyzeDiff({
          fromRef: "main",
          toRef: "invalid-branch",
        })
      ).rejects.toThrow(GitDiffError);
    });

    it("should throw error when git command fails", async () => {
      mockedExec.mockImplementation(
        (command: string, options: any, callback: any) => {
          const error = new Error("fatal: not a git repository");
          process.nextTick(() =>
            callback(error, { stdout: "", stderr: error.message })
          );
          return undefined;
        }
      );

      await expect(
        analyzer.analyzeDiff({
          fromRef: "main",
          toRef: "feature",
        })
      ).rejects.toThrow("Invalid git reference provided");
    });

    it("should handle empty diff result", async () => {
      mockedExec.mockImplementation(
        (command: string, options: any, callback: any) => {
          const response = {
            stdout: "",
            stderr: "",
          };
          process.nextTick(() => callback(null, response));
          return undefined;
        }
      );

      const analysis = await analyzer.analyzeDiff({
        fromRef: "main",
        toRef: "feature",
      });

      expect(analysis.stats.filesChanged).toBe(0);
      expect(analysis.stats.insertions).toBe(0);
      expect(analysis.stats.deletions).toBe(0);
      expect(analysis.changes).toHaveLength(0);
    });
  });

  describe("tag analysis", () => {
    it("should analyze changes between two tags", async () => {
      const mockDiffOutput = [
        "15\t5\tsrc/index.ts",
        "20\t10\tREADME.md",
        "7\t3\tpackage.json",
      ].join("\n");

      mockedExec.mockImplementation(
        (command: string, options: any, callback: any) => {
          const response = {
            stdout: command.includes("diff --numstat")
              ? mockDiffOutput
              : "valid-hash\n",
            stderr: "",
          };
          process.nextTick(() => callback(null, response));
          return undefined;
        }
      );

      const analysis = await analyzer.analyzeTagRange("v1.0.0", "v1.1.0");

      expect(analysis.stats.filesChanged).toBe(3);
      expect(analysis.stats.insertions).toBe(42); // 15 + 20 + 7
      expect(analysis.stats.deletions).toBe(18); // 5 + 10 + 3

      // 파일 타입별 검증
      expect(analysis.byFileType[".ts"].count).toBe(1);
      expect(analysis.byFileType[".md"].count).toBe(1);
      expect(analysis.byFileType[".json"].count).toBe(1);
    });

    it("should handle release tag pattern analysis", async () => {
      const mockDiffOutput = [
        "100\t50\tCHANGELOG.md",
        "30\t20\tsrc/version.ts",
      ].join("\n");

      mockedExec.mockImplementation(
        (command: string, options: any, callback: any) => {
          // release 태그 패턴 (v1.0.0 -> v2.0.0) 확인
          if (command.includes("v1.0.0") && command.includes("v2.0.0")) {
            const response = {
              stdout: command.includes("diff --numstat")
                ? mockDiffOutput
                : "valid-hash\n",
              stderr: "",
            };
            process.nextTick(() => callback(null, response));
          }
          return undefined;
        }
      );

      const analysis = await analyzer.analyzeTagRange("v1.0.0", "v2.0.0");

      // 메이저 버전 업데이트에 대한 검증
      expect(analysis.stats.filesChanged).toBe(2);
      expect(
        analysis.changes.find((c) => c.path === "CHANGELOG.md")
      ).toBeDefined();
      expect(
        analysis.changes.find((c) => c.path === "src/version.ts")
      ).toBeDefined();

      // 변경 크기 검증
      const changelog = analysis.changes.find((c) => c.path === "CHANGELOG.md");
      expect(changelog?.insertions).toBe(100); // 메이저 버전 업데이트는 큰 변경사항
      expect(changelog?.deletions).toBe(50);
    });
  });
});
