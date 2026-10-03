#!/usr/bin/env python3
"""Converts ../lingua-datasets/singlish_origins.md into data/singlish.json (re-run after editing the markdown)."""
import json, re, pathlib
here = pathlib.Path(__file__).parent
md = (here.parent / 'lingua-datasets' / 'singlish_origins.md').read_text(encoding='utf-8')
sections, cur = [], None
for line in md.splitlines():
    if line.startswith('## '):
        cur = {'name': line[3:].strip(), 'entries': []}; sections.append(cur)
    elif cur is not None and line.startswith('|') and not re.match(r'^\|\s*(Word|-+)', line):
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) >= 4 and cells[0]:
            cells = cells[:4]
            cur['entries'].append({'w': cells[0], 'o': cells[1], 'm': cells[2], 'x': cells[3].strip('"') if cells[3] else ''})
out = {
    'source': 'Wikipedia, "Singlish vocabulary"',
    'url': 'https://en.wikipedia.org/wiki/Singlish_vocabulary',
    'license': 'CC BY-SA 4.0',
    'note': 'Origins and meanings are as stated on that page; examples are only given where the page had one.',
    'sections': [s for s in sections if s['entries']],
}
(here / 'data' / 'singlish.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
print(sum(len(s['entries']) for s in out['sections']), 'entries in', len(out['sections']), 'sections')
