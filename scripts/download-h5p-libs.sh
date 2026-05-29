#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIB_DIR="$ROOT_DIR/public/h5p-libraries"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$LIB_DIR"

CONTENT_TYPES=(
  "H5P.InteractiveVideo"
  "H5P.CoursePresentation"
  "H5P.MultiChoice"
  "H5P.QuestionSet"
  "H5P.TrueFalse"
  "H5P.Blanks"
  "H5P.DragQuestion"
)

for machine_name in "${CONTENT_TYPES[@]}"; do
  archive="$TMP_DIR/${machine_name}.h5p"
  extract_dir="$TMP_DIR/${machine_name}"

  echo "Downloading ${machine_name}"
  curl -fsSL "https://api.h5p.org/v1/content-types/${machine_name}" -o "$archive"
  mkdir -p "$extract_dir"
  unzip -q "$archive" -d "$extract_dir"

  while IFS= read -r library_json; do
    library_root="$(dirname "$library_json")"
    library_name="$(basename "$library_root")"

    if [[ "$library_name" == content || "$library_name" == "." ]]; then
      continue
    fi
    if [[ "$library_name" == H5PEditor.* || "$library_name" == H5P.CKEditor-* ]]; then
      continue
    fi

    rm -rf "$LIB_DIR/$library_name"
    cp -R "$library_root" "$LIB_DIR/$library_name"
  done < <(find "$extract_dir" -mindepth 2 -maxdepth 2 -name library.json -type f)
done

echo "H5P libraries installed in $LIB_DIR"
