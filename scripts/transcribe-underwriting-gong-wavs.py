#!/usr/bin/env python3
import argparse
import difflib
import json
import re
from pathlib import Path

import whisper


def normalize(value: str) -> str:
    value = value.lower()
    replacements = {
        "dash fi": "dashfi",
        "dash-fi": "dashfi",
        "net one": "net1",
        "net-1": "net1",
        "u c c": "ucc",
        "u.c.c.": "ucc",
        "plaid": "plaid",
        "fico": "fico",
    }
    for source, target in replacements.items():
        value = value.replace(source, target)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def token_overlap(expected: str, actual: str) -> float:
    expected_tokens = set(normalize(expected).split())
    actual_tokens = set(normalize(actual).split())
    if not expected_tokens:
        return 1.0
    return len(expected_tokens & actual_tokens) / len(expected_tokens)


def similarity(expected: str, actual: str) -> float:
    return difflib.SequenceMatcher(None, normalize(expected), normalize(actual)).ratio()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Transcribe exported underwriting Gong WAVs and compare to approved text."
    )
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--model", default="small")
    parser.add_argument("--min-overlap", type=float, default=0.58)
    parser.add_argument("--min-similarity", type=float, default=0.45)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text())
    review_root = args.manifest.parent
    output_dir = review_root / "transcripts"
    output_dir.mkdir(parents=True, exist_ok=True)

    model = whisper.load_model(args.model)
    results = []
    findings = []

    for segment in manifest["embeddedSegments"]:
        wav_path = Path(segment["wavPath"])
        transcript = model.transcribe(str(wav_path), fp16=False, language="en")
        text = transcript["text"].strip()
        overlap = token_overlap(segment.get("approvedText", ""), text)
        ratio = similarity(segment.get("approvedText", ""), text)
        passed = overlap >= args.min_overlap and ratio >= args.min_similarity
        result = {
            "approvedText": segment.get("approvedText", ""),
            "callId": segment.get("callId"),
            "label": segment.get("label"),
            "lessonKey": segment.get("lessonKey"),
            "mediaSrc": segment.get("mediaSrc"),
            "model": args.model,
            "passed": passed,
            "similarity": round(ratio, 3),
            "text": text,
            "tokenOverlap": round(overlap, 3),
            "wavPath": str(wav_path),
        }
        results.append(result)
        if not passed:
            findings.append(result)

    transcript_json = output_dir / "gong-transcripts.json"
    transcript_json.write_text(json.dumps(results, indent=2))

    lines = [
        "# Gong WAV Transcription Audit",
        "",
        f"Model: `{args.model}`",
        f"Files transcribed: {len(results)}",
        f"Findings below threshold: {len(findings)}",
        "",
        "| Lesson | Clip | Token overlap | Similarity | Pass | Transcript |",
        "| --- | --- | ---: | ---: | --- | --- |",
    ]
    for item in results:
        transcript_short = item["text"].replace("|", "\\|")
        label = item["label"].replace("|", "\\|")
        if len(transcript_short) > 240:
            transcript_short = transcript_short[:237] + "..."
        lines.append(
            f"| {item['lessonKey']} | {label} | "
            f"{item['tokenOverlap']:.3f} | {item['similarity']:.3f} | "
            f"{'yes' if item['passed'] else 'no'} | {transcript_short} |"
        )
    if findings:
        lines.extend(["", "## Below Threshold", ""])
        for item in findings:
            lines.append(
                f"- **{item['lessonKey']} · {item['label']}** "
                f"overlap={item['tokenOverlap']:.3f}, similarity={item['similarity']:.3f}"
            )

    transcript_md = output_dir / "gong-transcripts.md"
    transcript_md.write_text("\n".join(lines))
    print(
        json.dumps(
            {
                "findings": len(findings),
                "model": args.model,
                "transcriptJson": str(transcript_json),
                "transcriptMd": str(transcript_md),
                "transcribed": len(results),
            },
            indent=2,
        )
    )
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
