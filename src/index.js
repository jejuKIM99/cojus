#!/usr/bin/env node
// src/index.js (ESM 모드로 __dirname 구현 및 삭제 대화형 필터링)

import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, execSync } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';

// ESM 환경에서 __dirname 생성
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 데이터 파일 경로
const DATA_PATH = path.resolve(__dirname, '../data/api_posts.json');

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

program
  .name('cojus')
  .description('문서 번호로 API 설치 및 삭제를 도와주는 CLI 툴')
  .version('0.1.5', '-v, --version', '버전 정보 출력')
  .allowUnknownOption(true);

program.parse(process.argv);
const args = process.argv.slice(2);

(async () => {
  const data = loadData(); // [{id, npm_command, title}, ...]
  const mapById = new Map(data.map(item => [item.id, item]));

  // 삭제 모드
  if (args.includes('-del')) {
    // 현재 프로젝트에 설치된 패키지 목록 조회
    let installedNames = [];
    try {
      const json = execSync('npm list --depth=0 --json').toString();
      const parsed = JSON.parse(json);
      installedNames = parsed.dependencies ? Object.keys(parsed.dependencies) : [];
    } catch {
      console.error(chalk.red('Error: 설치된 패키지 목록을 불러올 수 없습니다.'));
      process.exit(1);
    }
    // 설치된 항목 중 JSON에 정의된 패키지만 필터링
    const installedItems = data.filter(item => installedNames.includes(item.title));
    if (installedItems.length === 0) {
      console.log(chalk.yellow('설치된 라이브러리가 없습니다.'));
      process.exit(0);
    }
    const choices = installedItems.map(item => ({ name: item.title, value: item.title }));
    choices.unshift({ name: 'all', value: 'all' });

    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'toRemove',
        message: '삭제할 라이브러리를 선택하세요 (스페이스바로 선택 후 엔터)',
        choices,
        validate: sel => sel.length > 0 || '최소 한 개 이상 선택해야 합니다.',
      },
    ]);

    let targets = answers.toRemove;
    if (targets.includes('all')) {
      targets = installedItems.map(item => item.title);
    }

    for (const pkg of targets) {
      console.log(chalk.cyan(`→ ${pkg} 삭제 중...`));
      await new Promise(resolve => {
        exec(`npm uninstall ${pkg}`, { shell: true }, (err, stdout, stderr) => {
          if (err) {
            console.error(chalk.red(`${pkg} 삭제 실패: ${err.message}`));
          } else {
            if (stdout) console.log(chalk.green(stdout));
            if (stderr) console.error(chalk.yellow(stderr));
            console.log(chalk.magenta(`${pkg} 삭제 완료.`));
          }
          resolve();
        });
      });
    }
    console.log(chalk.green('\n삭제 작업이 모두 완료되었습니다.'));
    process.exit(0);
  }

  // 설치 모드
  if (args.length === 0) {
    console.error(chalk.yellow('사용법: cojus -<문서번호> [-<문서번호> ...] 형식으로 입력하세요.'));
    process.exit(1);
  }

  const docIds = args
    .map(arg => arg.startsWith('-') ? parseInt(arg.substring(1), 10) : null)
    .filter(x => x !== null);

  if (docIds.length === 0) {
    console.error(chalk.red('잘못된 입력입니다. 예: cojus -101 -102'));
    process.exit(1);
  }

  for (const id of docIds) {
    const item = mapById.get(id);
    if (!item) {
      console.error(chalk.red(`Error: ID ${id}에 해당하는 데이터가 없습니다.`));
      continue;
    }
    const { npm_command, title } = item;
    console.log(chalk.cyan(`→ [ID ${id} | ${title}] 설치 명령어: ${npm_command}`));

    try {
      await new Promise((resolve, reject) => {
        exec(npm_command, { shell: true }, (error, stdout, stderr) => {
          if (error) {
            console.error(chalk.red(`(ID ${id}) 설치 실패: ${error.message}`));
            return reject(error);
          }
          if (stdout) console.log(chalk.green(stdout));
          if (stderr) console.error(chalk.yellow(stderr));
          resolve();
        });
      });
    } catch {
      console.error(chalk.red(`ID ${id} 설치 중 오류가 발생했습니다. 계속 진행합니다...`));
    }
  }

  console.log(chalk.magenta('\n모든 작업이 완료되었습니다.'));
})();