#!/usr/bin/env node
// scripts/fetch-api-post-versions.js
// Supabase에서 api_post_versions 테이블을 조회하여 data/versions/{post_id}.json 파일 생성·갱신

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase 정보 읽기
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: SUPABASE_URL 및 SUPABASE_ANON_KEY를 설정해야 합니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const OUT_DIR = path.resolve(process.cwd(), 'data/versions');

async function main() {
  // 출력 디렉터리 생성
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // 테이블 전체 조회
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

  // 파일 생성
  for (const [postId, versions] of Object.entries(grouped)) {
    const filePath = path.join(OUT_DIR, `${postId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(versions, null, 2), 'utf-8');
    console.log(`Generated ${filePath}`);
  }
}

main();
