#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import chalk from 'chalk';


// data/api_posts.json 경로 해석
const DATA_PATH = path.resolve(__dirname, '../data/api_posts.json');

/**
 * JSON 파일을 동기적으로 읽어와 배열 형태 반환
 * @returns {Array<{id: number, npm_command: string}>}
 */
function loadData() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error(chalk.red('Error: data/api_posts.json 파일을 찾을 수 없습니다.'));
    process.exit(1);
  }
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) throw new Error('Invalid JSON 구조');
    return arr;
  } catch (err) {
    console.error(chalk.red(`Error: JSON 파싱 실패 → ${err.message}`));
    process.exit(1);
  }
}

// 프로그램 메타 데이터
program
  .name('cojus')
  .description('문서 번호를 입력하면 해당 API의 npm 설치 명령어를 실행해주는 CLI 툴')
  .version('0.1.0', '-v, --version', '버전 정보 출력');

// “-<number>” 형태 옵션을 파싱하기 위해, unknownOption 처리
program.allowUnknownOption(true);

// parse 후 로직을 직접 처리
program.parse(process.argv);
const rawOpts = program.opts(); // commander 내부 옵션 (여기서는 사용하지 않음)

// argv에 남은 순수 플래그를 직접 수집
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(chalk.yellow('사용법: cojus -<문서번호> [-<문서번호> ...] 형식으로 입력하세요.'));
  process.exit(1);
}

// “-100” → parseInt 결과가 NaN이 아닌 숫자만 필터
const docIds = args
  .map(arg => {
    // 앞에 '-'가 붙은 문자열에서 숫자만 뽑기
    if (arg.startsWith('-')) {
      const num = parseInt(arg.substring(1), 10);
      return isNaN(num) ? null : num;
    }
    return null;
  })
  .filter(x => x !== null);
if (docIds.length === 0) {
  console.error(chalk.red('잘못된 입력입니다. 예: cojus -101 -102'));
  process.exit(1);
}

(async () => {
  const data = loadData(); // [{id, npm_command}, ...]
  // 배열을 Map으로 전환하면 검색 속도 향상
  const mapById = new Map(data.map(item => [item.id, item.npm_command]));

  // 순차적으로 실행하기 위해 async/await + 프로미스 체인 사용
  for (const id of docIds) {
    if (!mapById.has(id)) {
      console.error(chalk.red(`Error: ID ${id}에 해당하는 npm_command가 존재하지 않습니다.`));
      continue; // 혹은 process.exit(1)을 할 수도 있음
    }
    const cmd = mapById.get(id);
    console.log(chalk.cyan(`→ [ID ${id}] 실행 명령어: ${cmd}`));

    try {
      await new Promise((resolve, reject) => {
        const child = exec(cmd, { shell: true }, (error, stdout, stderr) => {
          if (error) {
            console.error(chalk.red(`(ID ${id}) 설치 실패: ${error.message}`));
            reject(error);
            return;
          }
          if (stdout) console.log(chalk.green(`[ID ${id}] STDOUT:\n${stdout}`));
          if (stderr) console.error(chalk.yellow(`[ID ${id}] STDERR:\n${stderr}`));
          resolve();
        });

        // 실시간으로 출력 스트림을 보려면 아래 두 줄을 활성화
        // child.stdout.pipe(process.stdout);
        // child.stderr.pipe(process.stderr);
      });
    } catch (e) {
      console.error(chalk.red(`ID ${id} 설치 중 오류가 발생했습니다. 계속 진행합니다...`));
    }
  }

  console.log(chalk.magenta('\n모든 작업이 완료되었습니다.'));
})();
