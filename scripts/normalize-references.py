#!/usr/bin/env python3
"""Convert bundled reference documents into inert, readable text (idempotent)."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path


class ReferenceText(HTMLParser):
    blocks = {'div', 'p', 'section', 'article', 'h1', 'h2', 'h3', 'h4',
              'h5', 'h6', 'ul', 'ol', 'li', 'tr', 'blockquote'}
    ignored = {'head', 'script', 'style', 'iframe', 'object'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.skip = []

    def handle_starttag(self, tag, attrs):
        if tag in self.ignored:
            self.skip.append(tag)
        if not self.skip and (tag in self.blocks or tag == 'br'):
            self.parts.append('\n')
        if not self.skip and tag == 'td':
            self.parts.append('　')

    def handle_endtag(self, tag):
        if self.skip:
            if tag == self.skip[-1]:
                self.skip.pop()
            return
        if tag in self.blocks:
            self.parts.append('\n')

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)

    def text(self):
        lines = [re.sub(r'[\t \u00a0]+', ' ', line).strip()
                 for line in ''.join(self.parts).splitlines()]
        return re.sub(r'\n{3,}', '\n\n', '\n'.join(lines)).strip()


def normalize(text):
    if not re.search(r'<(?:!doctype|html|body|div|p|br|h[1-6])\b', text, re.I):
        return text
    parser = ReferenceText()
    parser.feed(text)
    return parser.text()


if __name__ == '__main__':
    path = Path(__file__).resolve().parents[1] / 'src/glossary.json'
    entries = json.loads(path.read_text())
    changed = 0
    for entry in entries:
        text = normalize(entry['text'])
        changed += text != entry['text']
        entry['text'] = text
    path.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + '\n')
    print(f'Normalized {changed} of {len(entries)} reference entries.')
