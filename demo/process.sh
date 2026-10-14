#!/usr/bin/env bash
set -euo pipefail

project="${1:-Signal Lab}"
output="./results"
mkdir -p "$output"

report() {
  local frequency="$1"
  printf 'Processing %s at %s Hz\n' "$project" "$frequency"
}

for frequency in 1 2 4; do
  report "$frequency"
done

cat <<EOF
Project: $project
Output:  $output
Ready to compare the results.
EOF
