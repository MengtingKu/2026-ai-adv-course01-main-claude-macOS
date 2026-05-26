#!/bin/bash
# Blocks edits to sensitive files. Receives tool call JSON on stdin.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except:
    print('')
" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

if echo "$FILE_PATH" | grep -qE '(\.env$|\.env\.|database\.sqlite$|database\.sqlite-shm$|database\.sqlite-wal$|package-lock\.json$|\.lock$)'; then
  echo "BLOCKED: 禁止編輯敏感檔案: $FILE_PATH" >&2
  echo "如需修改 .env，請直接用文字編輯器操作。" >&2
  exit 2
fi

exit 0
