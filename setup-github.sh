#!/bin/bash
# ============================================================
# Lumina → GitHub 푸시 스크립트
# 사용법: cd lumina-lang && bash setup-github.sh
# ============================================================

set -e

echo "🌟 Lumina → GitHub 설정 시작"
echo ""

# 1. Git 초기화 (이미 되어있으면 스킵)
if [ ! -d ".git" ] || [ -z "$(git log --oneline 2>/dev/null | head -1)" ]; then
  echo "📁 Git 저장소 초기화..."
  rm -rf .git
  git init -b main
  git add -A
  git commit -m "Initial commit: Lumina language prototype v0.1

- Lexer (tokenizer) for Lumina syntax
- Parser (AST generator) with recursive descent
- Code generator (transpiler to JS/HTML/CSS)
- CLI tool for compilation
- Counter and Todo App examples
- Language specification document

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
  echo "✅ 초기 커밋 완료"
else
  echo "✅ Git 저장소 이미 초기화됨"
fi

# 2. GitHub remote 추가
echo ""
echo "🔗 GitHub remote 설정..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/Richard-JHLee/lumina.git
echo "✅ Remote 설정 완료: https://github.com/Richard-JHLee/lumina.git"

# 3. 푸시
echo ""
echo "🚀 GitHub에 푸시..."
git branch -M main
git push -u origin main

echo ""
echo "============================================================"
echo "✅ 완료! https://github.com/Richard-JHLee/lumina 에서 확인하세요"
echo "============================================================"
