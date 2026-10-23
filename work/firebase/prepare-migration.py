"""Convert the owner-exported WorkshopDesk_Data workbook to a local JSON import.
The output contains private workshop records. Keep it out of Git.
"""
import argparse, collections, json
from pathlib import Path
from openpyxl import load_workbook

def convert(source: Path):
    sheet = load_workbook(source, read_only=True, data_only=True)['WorkshopDesk_Data']
    rows = iter(sheet.values)
    header = next(rows)
    if header[:4] != ('Collection', 'Record ID', 'Chunk', 'Revision'):
        raise ValueError('Unexpected WorkshopDesk_Data format')
    groups = collections.defaultdict(dict)
    revisions = set()
    for row in rows:
        if not row[0]:
            continue
        collection, record_id, chunk, revision, data = row[:5]
        revisions.add(int(revision))
        parts = groups[(collection, record_id)]
        if int(chunk) in parts:
            raise ValueError(f'Duplicate chunk for {collection}/{record_id}')
        parts[int(chunk)] = str(data)
    if len(revisions) != 1:
        raise ValueError('Sheet contains multiple revisions')
    result = {k: [] for k in ('employees','customers','jobs','inventory','requests','attendance','invoices')}
    for (collection, record_id), parts in groups.items():
        if sorted(parts) != list(range(len(parts))):
            raise ValueError(f'Missing chunk for {collection}/{record_id}')
        value = json.loads(''.join(parts[i] for i in range(len(parts))))
        if collection in ('settings','admin'):
            result[collection] = value
        elif collection in result:
            value.pop('passwordHash', None)
            result[collection].append(value)
    if 'settings' not in result or 'admin' not in result:
        raise ValueError('Missing workshop settings or admin profile')
    return result, next(iter(revisions))

if __name__ == '__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('workbook',type=Path)
    ap.add_argument('output',type=Path)
    args=ap.parse_args()
    data,revision=convert(args.workbook)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print('Legacy revision:',revision)
    print('Record counts:',{k:len(v) for k,v in data.items() if isinstance(v,list)})
    print('Employees needing email login:',sum(not e.get('email') for e in data['employees']))
