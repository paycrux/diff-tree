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

<img width="578" alt="스크린샷 2024-11-07 오전 10 54 54" src="https://github.com/user-attachments/assets/04e406d0-cf21-486a-a467-b2d7858b072d">

안녕하세요. 새로운 기능을 만들어보고 싶습니다.

cli tool을 개발하고 있고 기존에 사용하던 저의 output은 이렇게 생겼습니다. (첨부파일 확인)

하지만, 사용하는 입장에서 어떤 폴더에서 얼만큼 바뀌었는지 확인이 어렵다고 하여 table내에서도 폴더구조가 잘 보이게끔 수정하고 싶습니다.

어떻게 하면 사용자가 더 잘 사용할 수 있을까요?

우선, 이 프로덕트의 목적을 안내해드리겠습니다.

- Git diff 분석기 CLI 인터페이스 구현

왜 만드는가?

- 모노레포 환경에서의 배포 프로세스 개선 방안
- VD/BankPOS와 KSNET 프로젝트 간의 코드 동기화 이슈
- 모노레포 환경에서 VD/BankPOS는 동시 배포되며, KSNET은 1-2개월 지연 배포됨
- Git diff 분석 도구를 통해 태그 간 변경사항을 체계적으로 분석하고, KSNET에 반영할 변경사항을 추출하고자 함
- 추후 변경사항에 대한 자동화까지 생각하고 있으며, 전체 자동화는 위험할 수 있으니 하나의 파일별로 변경사항을 추출하여 적용시키고, 사용자가 직접 확인하고 적용할 수 있도록 하는 것이 목표
