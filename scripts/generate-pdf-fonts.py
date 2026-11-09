from pathlib import Path
import sys
import tempfile
from fontTools.ttLib import TTFont
from fontTools.ttLib.scaleUpem import scale_upem
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.merge import Merger, Options

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(sys.argv[1])
OUT = ROOT / 'assets/fonts'
TEMP = tempfile.TemporaryDirectory(prefix='fbg-pdf-fonts-')
WORK = Path(TEMP.name)
INTER = ROOT / 'node_modules/@fontsource-variable/inter/files'
SOURCES = [INTER/'inter-latin-wght-normal.woff2', INTER/'inter-latin-ext-wght-normal.woff2', SOURCE/'noto-sans-sc-chinese-simplified-400-normal.woff2', SOURCE/'noto-emoji-emoji-400-normal.woff2']

for style, weight in [('Regular', 400), ('Bold', 700)]:
    paths = []
    for i, source in enumerate(SOURCES):
        font = TTFont(source)
        if 'fvar' in font:
            font = instantiateVariableFont(font, {'wght': weight}, inplace=True)
        if font['head'].unitsPerEm != 2048:
            scale_upem(font, 2048)
        font.flavor = None
        path = WORK/f'input-{i}-{style}.ttf'
        font.save(path)
        paths.append(str(path))
    font = Merger(Options(drop_tables=['STAT', 'BASE', 'vhea', 'vmtx'])).merge(paths)
    for record in font['name'].names:
        if record.nameID in {1, 2, 3, 4, 6, 16, 17}:
            value = {1:'Feedback Sans', 2:style, 3:f'Feedback Sans {style} 1.0', 4:f'Feedback Sans {style}', 6:f'FeedbackSans-{style}', 16:'Feedback Sans', 17:style}[record.nameID]
            record.string = value.encode(record.getEncoding())
    font['name'].setName('Derived from Inter (Copyright 2016 The Inter Project Authors), Noto Sans SC (Google Inc.) and Noto Emoji (Copyright 2013 Google LLC). Licensed under SIL Open Font License 1.1.', 0, 3, 1, 0x409)
    font['head'].modified = font['head'].created
    font.recalcTimestamp = False
    font['OS/2'].usWeightClass = weight
    assert all(ord(character) in font.getBestCmap() for character in 'Łukasz 王 \U0001f642 äéçñ Œ œ ĳ — €')
    font.flavor = None
    extension = 'ttf'
    path = OUT/f'FeedbackSans-{style}.{extension}'
    font.save(path)
    print(path, path.stat().st_size, len(font.getBestCmap()))

TEMP.cleanup()
