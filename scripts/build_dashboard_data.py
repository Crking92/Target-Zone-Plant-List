from pathlib import Path
import zipfile, xml.etree.ElementTree as ET, json, csv, re
from collections import Counter

SOURCE = Path("data/raw/Master_Plant_Database.xlsx")
OUT = Path("data/processed")
OUT.mkdir(parents=True, exist_ok=True)
NS = {'main':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','rel':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}

def col_to_index(col):
    n=0
    for ch in col:
        n=n*26+(ord(ch.upper())-64)
    return n-1

def cell_ref_to_rc(ref):
    m=re.match(r'([A-Za-z]+)([0-9]+)', ref or '')
    return (int(m.group(2))-1, col_to_index(m.group(1))) if m else (None, None)

def text_from_rich_node(node):
    return ''.join([(t.text or '') for t in node.iter('{%s}t'%NS['main'])]) if node is not None else ''

def load_shared_strings(z):
    try: root=ET.fromstring(z.read('xl/sharedStrings.xml'))
    except KeyError: return []
    return [text_from_rich_node(si) for si in root.findall('main:si', NS)]

def sheet_path(z):
    wb=ET.fromstring(z.read('xl/workbook.xml'))
    rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    lookup={rel.attrib.get('Id'): rel.attrib.get('Target') for rel in rels}
    s=wb.find('main:sheets/main:sheet', NS)
    rid=s.attrib.get('{%s}id'%NS['rel'])
    target=lookup[rid]
    if target.startswith('/'): target=target.lstrip('/')
    elif not target.startswith('xl/'): target='xl/'+target
    return target

def read_xlsx(path):
    with zipfile.ZipFile(path) as z:
        shared=load_shared_strings(z)
        root=ET.fromstring(z.read(sheet_path(z)))
        rows=[]; max_col=0
        for row in root.findall('main:sheetData/main:row', NS):
            ridx=int(row.attrib.get('r', len(rows)+1))-1
            while len(rows)<=ridx: rows.append([])
            cur=rows[ridx]
            for c in row.findall('main:c', NS):
                _, cidx=cell_ref_to_rc(c.attrib.get('r'))
                if cidx is None: cidx=len(cur)
                while len(cur)<=cidx: cur.append('')
                typ=c.attrib.get('t'); val=''
                if typ=='s':
                    v=c.find('main:v', NS)
                    val=shared[int(v.text)] if v is not None and v.text is not None else ''
                elif typ=='inlineStr':
                    val=text_from_rich_node(c.find('main:is', NS))
                else:
                    v=c.find('main:v', NS)
                    val=v.text if v is not None and v.text is not None else ''
                cur[cidx]=re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', str(val)).strip()
                max_col=max(max_col, cidx+1)
        return [r+['']*(max_col-len(r)) for r in rows if any(str(x).strip() for x in r)]

def unique_headers(headers):
    out=[]; counts=Counter()
    for i,h in enumerate(headers):
        h=str(h).strip() or f'Unnamed_{i+1}'
        counts[h]+=1
        out.append(h if counts[h]==1 else f'{h}_{counts[h]}')
    return out

def split_aliases(text):
    return [p.strip() for p in re.split(r'[,;/]|\band\b', str(text or ''), flags=re.I) if p.strip()]

def norm(s):
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9]+', ' ', str(s or '').lower().replace('×','x'))).strip()

matrix=read_xlsx(SOURCE)
headers=unique_headers(matrix[0])
rows=[]
for raw in matrix[1:]:
    obj={headers[i]: raw[i] if i < len(raw) else '' for i in range(len(headers))}
    sci=str(obj.get('Scientific Name','')).strip()
    if sci:
        obj['Plant_ID']=sci
        rows.append(obj)
aliases=[]; seen=set()
for obj in rows:
    pid=obj['Plant_ID']; sci=obj.get('Scientific Name',''); common=obj.get('Common Name(s)','')
    for alias,typ in [(sci,'scientific'), (sci.replace('×','x'), 'scientific_variant'), (sci.replace('×','x '), 'scientific_variant')]:
        n=norm(alias)
        if alias and (pid,n) not in seen:
            aliases.append({'Plant_ID':pid,'Alias':alias,'Alias_Type':typ,'Normalized_Alias':n}); seen.add((pid,n))
    for alias in split_aliases(common):
        n=norm(alias)
        if (pid,n) not in seen:
            aliases.append({'Plant_ID':pid,'Alias':alias,'Alias_Type':'common_name','Normalized_Alias':n}); seen.add((pid,n))

for filename, data in [('plants.json', rows), ('plant_aliases.json', aliases)]:
    (OUT/filename).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
(OUT/'plants.js').write_text('window.PLANT_DATA = '+json.dumps(rows, ensure_ascii=False)+';\nwindow.PLANT_ALIASES = '+json.dumps(aliases, ensure_ascii=False)+';\nwindow.PLANT_FIELDS = '+json.dumps(['Plant_ID']+headers, ensure_ascii=False)+';\n', encoding='utf-8')
with (OUT/'plants.csv').open('w', newline='', encoding='utf-8-sig') as f:
    w=csv.DictWriter(f, fieldnames=['Plant_ID']+headers); w.writeheader(); w.writerows([{k:r.get(k,'') for k in ['Plant_ID']+headers} for r in rows])
with (OUT/'plant_aliases.csv').open('w', newline='', encoding='utf-8-sig') as f:
    w=csv.DictWriter(f, fieldnames=['Plant_ID','Alias','Alias_Type','Normalized_Alias']); w.writeheader(); w.writerows(aliases)
print(f'Built dashboard data for {len(rows)} plant rows and {len(aliases)} aliases.')
