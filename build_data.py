#!/usr/bin/env python3
"""Convert ../lingua-datasets/*.md into data/<xx>.json for the LinguaBomb website.

Usage:  python3 build_data.py

Output schema: {lang, name, script, source, words:[{w,r,e}], phrases:[{cat,t,r,e,(tr)}], sentences:[{t,r,e,(tr)}]}
A small hand-checked "Essentials" phrase set is ALWAYS prepended to phrases (it is also the
complete fallback if a dataset file is missing).
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "lingua-datasets"))
OUT = os.path.join(HERE, "data")

LANGS = {
    "en": ("English", "english.md", "Latin alphabet"),
    "hi": ("Hindi", "hindi.md", "Devanagari (with Hinglish romanisation)"),
    "es": ("Spanish", "spanish.md", "Latin alphabet"),
    "fr": ("French", "french.md", "Latin alphabet"),
    "zh": ("Mandarin Chinese", "mandarin.md", "Simplified Hanzi (with Pinyin)"),
}

# Hand-verified essentials: key -> {lang: (text, romanisation)}
ESS = [
    ("Hello", {"hi": ("नमस्ते", "namaste"), "es": ("Hola", ""), "fr": ("Bonjour", ""), "zh": ("你好", "nǐ hǎo"), "en": ("Hello", "")}),
    ("Thank you", {"hi": ("धन्यवाद", "dhanyavaad"), "es": ("Gracias", ""), "fr": ("Merci", ""), "zh": ("谢谢", "xièxie"), "en": ("Thank you", "")}),
    ("Please", {"hi": ("कृपया", "kripayaa"), "es": ("Por favor", ""), "fr": ("S'il vous plaît", ""), "zh": ("请", "qǐng"), "en": ("Please", "")}),
    ("Goodbye", {"hi": ("अलविदा", "alvidaa"), "es": ("Adiós", ""), "fr": ("Au revoir", ""), "zh": ("再见", "zàijiàn"), "en": ("Goodbye", "")}),
    ("Yes", {"hi": ("हाँ", "haan"), "es": ("Sí", ""), "fr": ("Oui", ""), "zh": ("是", "shì"), "en": ("Yes", "")}),
    ("No", {"hi": ("नहीं", "nahin"), "es": ("No", ""), "fr": ("Non", ""), "zh": ("不是", "bú shì"), "en": ("No", "")}),
    ("Sorry / excuse me", {"hi": ("माफ़ कीजिए", "maaf keejiye"), "es": ("Lo siento", ""), "fr": ("Désolé", ""), "zh": ("对不起", "duìbuqǐ"), "en": ("Sorry", "")}),
    ("How are you?", {"hi": ("आप कैसे हैं?", "aap kaise hain?"), "es": ("¿Cómo estás?", ""), "fr": ("Comment allez-vous ?", ""), "zh": ("你好吗？", "nǐ hǎo ma?"), "en": ("How are you?", "")}),
    ("My name is ...", {"hi": ("मेरा नाम ... है।", "meraa naam ... hai."), "es": ("Me llamo ...", ""), "fr": ("Je m'appelle ...", ""), "zh": ("我叫……", "wǒ jiào ..."), "en": ("My name is ...", "")}),
    ("Where is the toilet?", {"hi": ("शौचालय कहाँ है?", "shauchaalay kahaan hai?"), "es": ("¿Dónde está el baño?", ""), "fr": ("Où sont les toilettes ?", ""), "zh": ("厕所在哪里？", "cèsuǒ zài nǎlǐ?"), "en": ("Where is the toilet?", "")}),
    ("How much is it?", {"hi": ("यह कितने का है?", "yah kitne kaa hai?"), "es": ("¿Cuánto cuesta?", ""), "fr": ("Combien ça coûte ?", ""), "zh": ("多少钱？", "duōshao qián?"), "en": ("How much is it?", "")}),
    ("I don't understand.", {"hi": ("मुझे समझ नहीं आया।", "mujhe samajh nahin aayaa."), "es": ("No entiendo.", ""), "fr": ("Je ne comprends pas.", ""), "zh": ("我不明白。", "wǒ bù míngbai."), "en": ("I don't understand.", "")}),
]


def essentials(lang):
    out = []
    for en, d in ESS:
        t, r = d[lang]
        item = {"cat": "Essentials", "t": t, "r": r, "e": en}
        if lang == "en":
            item["e"] = d["es"][0]
            item["tr"] = {k: (d[k][0] + (" (%s)" % d[k][1] if d[k][1] else "")) for k in ("hi", "es", "fr", "zh")}
        out.append(item)
    return out


def split_cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def clean_meaning(m):
    m = m.strip()
    if not m or m.endswith(":"):
        return ""
    m = m.split(";")[0].strip()
    if len(m) > 110:
        m = m[:107].rsplit(" ", 1)[0] + "…"
    return m


def parse(path, lang):
    words, phrases, sentences = [], [], []
    section, cat, cols = None, "", []
    with open(path, encoding="utf-8") as f:
        for raw in f:
            line = raw.rstrip("\n")
            if line.startswith("## "):
                h = line.lower()
                section = "words" if "top 100" in h else "phrases" if "everyday" in h else "sentences" if "intermediate" in h else None
                cat = ""
                continue
            if line.startswith("### "):
                cat = line[4:].strip()
                continue
            if section == "words" and line.startswith("|"):
                cells = split_cells(line)
                if cells and cells[0] == "rank":
                    cols = cells
                    continue
                if set(line.replace("|", "").strip()) <= set("-: ") or not cols:
                    continue
                row = dict(zip(cols, cells))
                w = row.get("word", "")
                r = row.get("romanisation", "")
                e = clean_meaning(cells[-1] if len(cells) == len(cols) else "")
                if lang == "en" and len(w) < 4:
                    e = ""  # short WordNet senses (e.g. 'i' = iodine) mislead learners
                if w:
                    words.append({"w": w, "r": r, "e": e})
            elif section in ("phrases", "sentences") and line.startswith("- "):
                parts = [p.strip() for p in line[2:].split(" | ")]
                item = None
                if lang == "en":
                    if len(parts) >= 5:
                        tr = {"hi": parts[1], "es": parts[2], "fr": parts[3], "zh": parts[4]}
                        item = {"t": parts[0], "r": "", "e": parts[2], "tr": tr}
                elif lang in ("hi", "zh"):
                    if len(parts) >= 3:
                        item = {"t": parts[0], "r": parts[1], "e": parts[2]}
                else:
                    if len(parts) >= 2:
                        item = {"t": parts[0], "r": "", "e": parts[1]}
                if item:
                    if section == "phrases":
                        item = dict({"cat": cat or "General"}, **item)
                        phrases.append(item)
                    else:
                        sentences.append(item)
    return words, phrases, sentences


def main():
    os.makedirs(OUT, exist_ok=True)
    report = {}
    for xx, (name, fn, script) in LANGS.items():
        path = os.path.join(SRC, fn)
        words, phrases, sentences = [], [], []
        used = "fallback"
        if os.path.exists(path):
            try:
                words, phrases, sentences = parse(path, xx)
                if words or phrases:
                    used = "dataset"
            except Exception as ex:  # pragma: no cover
                print("!! failed parsing", path, ex, file=sys.stderr)
        ess = essentials(xx)
        seen = {p["t"] for p in ess}
        phrases = ess + [p for p in phrases if p["t"] not in seen]
        data = {"lang": xx, "name": name, "script": script, "source": used,
                "words": words, "phrases": phrases, "sentences": sentences}
        with open(os.path.join(OUT, xx + ".json"), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        usable = sum(1 for w in words if w["e"])
        report[xx] = (used, len(words), usable, len(phrases), len(sentences))
    for xx, (u, w, uw, p, s) in report.items():
        print("%s: %-8s words=%d (with meaning %d) phrases=%d sentences=%d" % (xx, u, w, uw, p, s))


if __name__ == "__main__":
    main()
