#!/bin/bash
# Scans Mangas/ subfolders for .cbz/.cbr/.cbt files and generates Mangas/library.json
# Run this after adding new comic files to update the library manifest.
#
# Usage: ./generate-library.sh

MANGAS_DIR="Mangas"
OUTPUT="$MANGAS_DIR/library.json"

echo "{" > "$OUTPUT"
echo '  "series": [' >> "$OUTPUT"

first_series=true

for dir in "$MANGAS_DIR"/*/; do
    [ -d "$dir" ] || continue
    series_name=$(basename "$dir")

    chapters=()
    while IFS= read -r -d '' file; do
        chapters+=("$(basename "$file")")
    done < <(find "$dir" -maxdepth 1 -type f \( -iname '*.cbz' -o -iname '*.cbr' -o -iname '*.cbt' \) -print0 | sort -z)

    if [ ${#chapters[@]} -eq 0 ]; then
        continue
    fi

    if [ "$first_series" = true ]; then
        first_series=false
    else
        echo "," >> "$OUTPUT"
    fi

    echo '    {' >> "$OUTPUT"
    echo "      \"title\": \"$series_name\"," >> "$OUTPUT"
    echo "      \"folder\": \"$series_name\"," >> "$OUTPUT"
    echo -n '      "chapters": [' >> "$OUTPUT"

    first_ch=true
    for ch in "${chapters[@]}"; do
        if [ "$first_ch" = true ]; then
            first_ch=false
        else
            echo -n ", " >> "$OUTPUT"
        fi
        echo -n "\"$ch\"" >> "$OUTPUT"
    done

    echo ']' >> "$OUTPUT"
    echo -n '    }' >> "$OUTPUT"
done

echo "" >> "$OUTPUT"
echo '  ]' >> "$OUTPUT"
echo "}" >> "$OUTPUT"

echo "Generated $OUTPUT"
cat "$OUTPUT"
