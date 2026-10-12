"""Extract the supplied vocabulary PDF without OCR or generative API calls.

Usage: python scripts/import-vocabulary-pdf.py /path/to/source.pdf
Dependencies: pdfplumber, pypdfium2. Run from the repository root.
pdfplumber locates table cells; PDFium decodes ligatures that otherwise become NUL.
"""
import hashlib
import json
from pathlib import Path
import re
import sys

import pdfplumber
import pypdfium2 as pdfium


def extract(source):
    topics = []
    current = None
    document = pdfium.PdfDocument(source)
    with pdfplumber.open(source) as pdf:
        for index, page in enumerate(pdf.pages):
            if index < 6:  # Cover, contents and introduction; vocabulary starts on PDF page 7.
                continue
            textpage = document[index].get_textpage()
            for table in page.find_tables():
                above = page.crop((0, 0, page.width, table.bbox[1])).extract_text(x_tolerance=1) or ""
                headings = re.findall(r"(\d+)\.?\s*Từ vựng về\s*(.+)", above)
                if headings:
                    number, title = headings[-1]
                    number = int(number)
                    if current is None or current["number"] != number:
                        current = {"number": number, "title": title[0].upper() + title[1:], "words": []}
                        topics.append(current)
                assert current is not None, f"Missing topic on page {index + 1}"
                for row in table.rows:
                    assert len(row.cells) == 3 and all(row.cells), f"Unexpected table on page {index + 1}"
                    values = []
                    for x0, y0, x1, y1 in row.cells:
                        value = textpage.get_text_bounded(x0, page.height - y1, x1, page.height - y0)
                        values.append(re.sub(r"\s+", " ", value).strip())
                    if values[0].lower() == "từ vựng":
                        continue
                    en, ipa, vi = values
                    assert en and vi and ipa.startswith("/") and ipa.endswith("/"), values
                    assert not any("\x00" in v or "\ufffd" in v for v in values), values
                    current["words"].append({"en": en, "ipa": ipa, "vi": vi, "page": index + 1})
            textpage.close()
    assert [t["number"] for t in topics] == list(range(1, 51)), "Expected all 50 topics"
    assert sum(len(t["words"]) for t in topics) == 1046, "Source row count changed; review extraction"
    result = {
        "source": "1000 từ vựng tiếng Anh theo chủ đề thông dụng",
        "sourceFile": source.name,
        "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "sourcePages": len(document),
        "topics": topics,
    }
    document.close()
    return result


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/import-vocabulary-pdf.py /path/to/source.pdf")
    result = extract(Path(sys.argv[1]).resolve())
    Path("data/basic-vocabulary-pdf.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Imported 1,046 entries / 50 topics, all with IPA and Vietnamese meanings.")
