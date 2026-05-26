#!/bin/bash
# Runs tests after editing src/ files. Receives tool call JSON on stdin.

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

# Only trigger on src/ changes
if echo "$FILE_PATH" | grep -qE '/src/'; then
  echo ">>> 偵測到 src/ 變更，執行測試..."
  cd "$(dirname "$FILE_PATH")"
  # Find project root (has package.json)
  while [ ! -f package.json ] && [ "$(pwd)" != "/" ]; do
    cd ..
  done
  npm test 2>&1 | tail -30
fi

exit 0
