#!/bin/bash

echo "🚀 VARCO vLLM 서버를 시작합니다..."

# vLLM 서버 시작
vllm serve "NCSOFT/VARCO-VISION-2.0-14B" \
  --host 0.0.0.0 \
  --port 8000 \
  --max-model-len 4096 \
  --gpu-memory-utilization 0.8

echo "✅ vLLM 서버가 포트 8000에서 실행 중입니다."