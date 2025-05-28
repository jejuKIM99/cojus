#!/usr/bin/env node
// scripts/fetch-api-post-versions.js
// → __dirname 기준으로 출력 디렉터리 선언

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// ESM __dirname 생성
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 확인
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: SUPABASE_URL 및 SUPABASE_ANON_KEY를 설정해야 합니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ← 변경: process.cwd()가 아니라 __dirname 기준으로 data/versions
const OUT_DIR = path.resolve(__dirname, '../data/versions');

async function main() {
  // 출력 디렉터리 생성
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Supabase에서 버전 리스트 조회
  const { data, error } = await supabase
    .from('api_post_versions')
    .select('post_id, version_tag, npm_command, is_default')
    .order('post_id', { ascending: true })
    .order('version_tag', { ascending: false });

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }

  // 포스트별 그룹핑
  const grouped = {};
  data.forEach(row => {
    const id = row.post_id;
    if (!grouped[id]) grouped[id] = [];
    grouped[id].push({
      version_tag: row.version_tag,
      npm_command: row.npm_command,
      is_default: row.is_default
    });
  });

  // JSON 파일 생성
  for (const [postId, versions] of Object.entries(grouped)) {
    const filePath = path.join(OUT_DIR, `${postId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(versions, null, 2), 'utf-8');
    console.log(`Generated ${filePath}`);
  }
}

main();
