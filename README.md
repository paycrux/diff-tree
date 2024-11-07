# git-diff-analyzer

프론트엔드 KSNET 배포가 행복해지는 그날을 위해...

## 주요 기능

- 브랜치, 태그, 커밋 간 차이점 분석
- 파일 타입별 변경사항 통계
- 대화형 모드
- 변경 이력 분석
- 자동으로 변경점을 넣어주는.. 기능을 만들고 싶다... 🥲

## Installation

1. Clone the repository

```bash
git clone git@github.com:paycrux/frontend-autocat.git
cd git-diff-analyzer
```

2. Install dependencies

```bash
pnpm install
```

3. Build the project

```bash
pnpm build
```

4. Link the package globally (패키지로 배포하지 않은 상태이므로 로컬에서 global link해주세요)

```bash
pnpm link --global
```

## Usage

패키지를 전역으로 연결한 후에는 어느 디렉토리에서나 사용할 수 있습니다:

```bash
git-diff-analyzer [options]

Usage: git-diff-analyzer [options] [command]

Options:
  -V, --version      output the version number
  -h, --help         display help for command

Commands:
  analyze [options]  Analyze differences between git references
  help [command]     display help for command
```

For example:

```bash
$ git-diff-analyzer analyze -i
✔ Enter the starting reference: master:apps/@bankpos/
✔ Enter the ending reference: master:apps/@ksnet
✔ Do you want to filter files by pattern? yes
✔ Enter file pattern (e.g., "*.ts"): src/*
✔ Analysis complete
```
