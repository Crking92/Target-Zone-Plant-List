from pathlib import Path
import zipfile, xml.etree.ElementTree as ET, json, csv, re
from collections import Counter, OrderedDict

SOURCE = Path("data/raw/Master_Plant_Database.xlsx")
MICROREGION_SOURCE = Path("data/raw/hays_county_microregion.csv")
FAMILY_SOURCE = Path("data/raw/Plant_Families_Cleaned.xlsx")
PROPAGATION_SOURCE = Path("data/raw/Propagation_NPSOT_Blackland_and_Edwards_Plants.csv")
BIRD_SOURCE = Path("data/raw/City_of_Kyle_TPWD_Bird_Plant_Use_Check_Master8.xlsx")
OUT = Path("data/processed")
OUT.mkdir(parents=True, exist_ok=True)

# Public release policy
# ---------------------
# The dashboard is designed to publish structured facts, short source-attributed
# summaries, and links back to source pages. It intentionally excludes long
# scraped/source prose, image URLs, page boilerplate, full propagation protocols,
# and raw source exports from browser-delivered data files.
PUBLIC_ROW_FIELDS = [
    'Plant_ID', 'Scientific Name', 'Common Name(s)', 'Common Name', 'Common Names', 'Family',
    'Duration', 'Deciduous/ Evergreen (green in winter)', 'Growth Habitat', 'Habit',
    'Sun/Shade Requirements', 'Light Requirement', 'Light Requirements',
    'Water Req.', 'Water Use', 'Water Requirement', 'Water Requirements',
    'Avg Height (ft)', 'Avg Width (ft)', 'Size Notes', 'Leaf', 'Soil Moisture',
    'Bloom Time', 'Bloom Color', 'Bloom Colour', 'Attracts', 'Larval Host', 'Nectar Source',
    'Birds Using This Plant', 'Bird Use Sources',
    'Microregion Group', 'Primary Microregion', 'Secondary Microregions', 'Fine Habitat Tags',
    'Fine Habitat Summary', 'Microregion Moisture / Water / Light', 'Wetland Status Summary',
    'Microregion Confidence', 'Microregion Review Needed', 'Microregion Public Status',
    'Microregion Publication Note', 'Microregion Source Note', 'Microregion Dataset Version',
    'Microregion Last Updated', 'Microregion Online Slug',
    'LBJ URL', 'LBJ Manual URL', 'Microregion LBJ Profile URL', 'USDA Plants URL',
    'FNA Search URL', 'Wetland Plant List URL', 'NRCS Web Soil Survey URL', 'EPA Ecoregions URL',
    'TPWD EMS URL',
    'NPSOT Propagation Common Name', 'NPSOT Propagation Materials',
    'NPSOT Propagation Treatment Tags', 'NPSOT Propagation Public Note',
    'NPSOT Propagation Source URL', 'NPSOT Propagation References',
    'Public Data Note'
]

PUBLIC_DATA_NOTE = (
    'Public dashboard field. Long source prose, photos, image URLs, full source protocols, '
    'and page boilerplate are intentionally excluded from public data files. Use linked '
    'source pages for full context.'
)

def extract_urls(text):
    urls=[]; seen=set()
    for url in re.findall(r'https?://[^\s|,;\)\]<>]+', str(text or '')):
        url=url.rstrip(".\"'")
        if url and url not in seen:
            urls.append(url); seen.add(url)
    return urls

def safe_join(values, sep=' | '):
    out=[]; seen=set()
    for value in values:
        value=clean(value)
        if not value:
            continue
        n=norm(value)
        if n and n not in seen:
            out.append(value); seen.add(n)
    return sep.join(out)


def clean_public_value(value):
    value=clean(value)
    if not value:
        return ''
    parts=[part.strip() for part in value.split('|')]
    filtered=[]
    for part in parts:
        if re.search(r'LBJ\s+(fields scraped|scrape status|match type|match score|resolve note|scraped at|scrape error)', part, re.I):
            continue
        filtered.append(part)
    return ' | '.join(p for p in filtered if p)

def make_public_row(row):
    public={}
    for key in PUBLIC_ROW_FIELDS:
        val=clean_public_value(row.get(key,''))
        if val:
            public[key]=val
    public['Public Data Note']=PUBLIC_DATA_NOTE
    return public

NS = {
    'main':'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    'rel':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
}

def clean(value):
    return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', str(value or '')).strip()

def norm(s):
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9]+', ' ', str(s or '').lower().replace('×','x'))).strip()
PUBLIC_MICROREGION_FIELDS = [
    'Plant_ID', 'Scientific Name', 'recordID', 'scientificName', 'acceptedName', 'commonName',
    'regionGroup', 'primaryMicroregion', 'secondaryMicroregions', 'fineHabitatTags',
    'fineHabitatSummary', 'moistureWaterLight', 'wetlandStatusSummary', 'confidence',
    'reviewNeeded', 'publicStatus', 'publicationNote', 'sourceUseNote', 'datasetVersion',
    'lastUpdated', 'onlineSlug', 'lbjProfileURL', 'usdaPlantsURL', 'fnaSearchURL',
    'fnaDirectCandidateURL', 'wetlandPlantListURL', 'nrcsWebSoilSurveyURL', 'nrcsEDITURL',
    'epaEcoregionsURL', 'tpwdEMSURL'
]

def make_public_microregion_row(row):
    public={}
    for key in PUBLIC_MICROREGION_FIELDS:
        val=clean_public_value(row.get(key,''))
        if val:
            public[key]=val
    return public


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
    try:
        root=ET.fromstring(z.read('xl/sharedStrings.xml'))
    except KeyError:
        return []
    return [text_from_rich_node(si) for si in root.findall('main:si', NS)]

def workbook_sheets(z):
    wb=ET.fromstring(z.read('xl/workbook.xml'))
    rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    lookup={rel.attrib.get('Id'): rel.attrib.get('Target') for rel in rels}
    sheets=[]
    for s in wb.findall('main:sheets/main:sheet', NS):
        name=s.attrib.get('name')
        rid=s.attrib.get('{%s}id'%NS['rel'])
        target=lookup.get(rid)
        if not target:
            continue
        if target.startswith('/'):
            target=target.lstrip('/')
        elif not target.startswith('xl/'):
            target='xl/'+target
        sheets.append((name, target))
    return sheets

def sheet_path(z, sheet_name=None):
    sheets=workbook_sheets(z)
    if not sheets:
        raise ValueError('Workbook has no visible sheets.')
    if sheet_name:
        for name, target in sheets:
            if name == sheet_name:
                return target
        available=', '.join(name for name, _ in sheets)
        raise ValueError(f"Sheet '{sheet_name}' not found. Available sheets: {available}")
    return sheets[0][1]

def read_xlsx(path, sheet_name=None):
    with zipfile.ZipFile(path) as z:
        shared=load_shared_strings(z)
        root=ET.fromstring(z.read(sheet_path(z, sheet_name=sheet_name)))
        rows=[]; max_col=0
        for row in root.findall('main:sheetData/main:row', NS):
            ridx=int(row.attrib.get('r', len(rows)+1))-1
            while len(rows)<=ridx:
                rows.append([])
            cur=rows[ridx]
            for c in row.findall('main:c', NS):
                _, cidx=cell_ref_to_rc(c.attrib.get('r'))
                if cidx is None:
                    cidx=len(cur)
                while len(cur)<=cidx:
                    cur.append('')
                typ=c.attrib.get('t'); val=''
                if typ=='s':
                    v=c.find('main:v', NS)
                    val=shared[int(v.text)] if v is not None and v.text is not None else ''
                elif typ=='inlineStr':
                    val=text_from_rich_node(c.find('main:is', NS))
                else:
                    v=c.find('main:v', NS)
                    val=v.text if v is not None and v.text is not None else ''
                cur[cidx]=clean(val)
                max_col=max(max_col, cidx+1)
        return [r+['']*(max_col-len(r)) for r in rows if any(str(x).strip() for x in r)]

def unique_headers(headers):
    out=[]; counts=Counter()
    for i,h in enumerate(headers):
        h=clean(h) or f'Unnamed_{i+1}'
        counts[h]+=1
        out.append(h if counts[h]==1 else f'{h}_{counts[h]}')
    return out

def split_aliases(text):
    return [p.strip() for p in re.split(r'[,;/]|\band\b', str(text or ''), flags=re.I) if p.strip()]

def choose_best_duplicate(rows):
    return max(rows, key=lambda r: sum(1 for v in r.values() if clean(v)))

def merge_rows(base, extras, headers):
    merged=dict(base)
    for extra in extras:
        for h in headers:
            if not clean(merged.get(h,'')) and clean(extra.get(h,'')):
                merged[h]=extra[h]
    return merged

def read_microregions(path):
    if not path.exists():
        return [], []
    with path.open(newline='', encoding='utf-8-sig') as f:
        reader=csv.DictReader(f)
        raw=[{k:clean(v) for k,v in row.items()} for row in reader]
    by_sci=OrderedDict()
    for row in raw:
        sci=clean(row.get('scientificName') or row.get('acceptedName') or row.get('Scientific Name'))
        if not sci:
            continue
        by_sci.setdefault(sci, []).append(row)

    out_rows=[]
    for sci, items in by_sci.items():
        merged={'Plant_ID': sci, 'Scientific Name': sci}
        all_keys=list(items[0].keys())
        for key in all_keys:
            vals=[]; seen=set()
            for item in items:
                val=clean(item.get(key,''))
                n=norm(val)
                if val and n not in seen:
                    vals.append(val); seen.add(n)
            if vals:
                merged[key]= ' | '.join(vals)
        out_rows.append(merged)
    return raw, out_rows

def read_families(path):
    if not path.exists():
        return [], {}
    matrix = read_xlsx(path)
    if not matrix:
        return [], {}
    headers = unique_headers(matrix[0])
    raw=[]
    fam_by_norm={}
    for row in matrix[1:]:
        obj={headers[i]: row[i] if i < len(row) else '' for i in range(len(headers))}
        sci=clean(obj.get('Scientific Name') or obj.get('scientific_name') or obj.get('Latin Name') or obj.get('Plant_ID'))
        fam=clean(obj.get('Family') or obj.get('Plant Family') or obj.get('family'))
        if sci:
            raw.append(obj)
        if sci and fam:
            fam_by_norm[norm(sci)] = fam
    return raw, fam_by_norm

def read_propagation(path):
    """Read NPSOT propagation records and export public-safe summary tags.

    Full propagation-method prose is intentionally not copied into browser-delivered
    files. The public dashboard gets materials, treatment tags, source URLs, and a
    standard note directing readers to the source pages for full instructions.
    """
    if not path.exists():
        return [], []
    with path.open(newline='', encoding='utf-8-sig') as f:
        reader=csv.DictReader(f)
        raw=[{k:clean(v) for k,v in row.items()} for row in reader]

    by_sci=OrderedDict()
    for row in raw:
        sci=clean(row.get('scientific_name') or row.get('Scientific Name') or row.get('Plant_ID'))
        if not sci:
            continue
        by_sci.setdefault(sci, []).append(row)

    out=[]
    for sci, items in by_sci.items():
        materials=[]; treatments=[]; source_urls=[]; ref_urls=[]
        common_names=[]

        for item in items:
            common=clean(item.get('common_name'))
            if common:
                common_names.append(common)

            mat=clean(item.get('Material'))
            treatment=clean(item.get('Treatment'))
            if mat:
                materials.append(mat)
            if treatment:
                treatments.append(treatment)

            url=clean(item.get('plant_url') or item.get('Plant URL') or item.get('NPSOT URL'))
            if url:
                source_urls.append(url)

            for source_field in ['References', 'Reference', 'references', 'Source URL', 'source_url']:
                for ref_url in extract_urls(item.get(source_field,'')):
                    ref_urls.append(ref_url)

        row={
            'Plant_ID': sci,
            'Scientific Name': sci,
        }
        common=safe_join(common_names)
        mats=safe_join(materials)
        treat=safe_join(treatments)
        urls=safe_join(source_urls)
        refs=safe_join(ref_urls)
        if common:
            row['NPSOT Propagation Common Name'] = common
        if mats:
            row['NPSOT Propagation Materials'] = mats
        if treat:
            row['NPSOT Propagation Treatment Tags'] = treat
        note_parts=[]
        if mats:
            note_parts.append(f"Materials listed: {mats}.")
        if treat:
            note_parts.append(f"Treatment tags listed: {treat}.")
        note_parts.append('Full propagation instructions are not reproduced in this public dataset; use the linked NPSOT/source pages for complete protocols.')
        row['NPSOT Propagation Public Note'] = ' '.join(note_parts)
        if urls:
            row['NPSOT Propagation Source URL'] = urls
        if refs:
            row['NPSOT Propagation References'] = refs
        out.append(row)
    return raw, out

def read_bird_use(path):
    if not path.exists():
        return [], []
    try:
        matrix = read_xlsx(path, sheet_name='Matched_Interactions')
    except Exception:
        matrix = read_xlsx(path)
    if not matrix:
        return [], []
    headers = unique_headers(matrix[0])
    raw=[]
    for row in matrix[1:]:
        obj={headers[i]: row[i] if i < len(row) else '' for i in range(len(headers))}
        sci=clean(obj.get('Plant Scientific Name') or obj.get('Scientific Name') or obj.get('Plant_ID'))
        bird_common=clean(obj.get('Bird Common Name'))
        if sci and bird_common:
            raw.append(obj)

    by_sci=OrderedDict()
    for row in raw:
        sci=clean(row.get('Plant Scientific Name') or row.get('Scientific Name') or row.get('Plant_ID'))
        if sci:
            by_sci.setdefault(sci, []).append(row)

    out=[]
    for sci, items in by_sci.items():
        birds=[]; seen_birds=set()
        sources=[]; seen_sources=set()
        for item in items:
            bird_common=clean(item.get('Bird Common Name'))
            bird_sci=clean(item.get('Bird Scientific Name'))
            if bird_common and bird_sci:
                bird=f'{bird_common} ({bird_sci})'
            else:
                bird=bird_common or bird_sci
            bird_key=norm(bird)
            if bird and bird_key not in seen_birds:
                birds.append(bird); seen_birds.add(bird_key)

            title=clean(item.get('Source Title'))
            url=clean(item.get('Source URL'))
            if title and url:
                source=f'{title}: {url}'
            else:
                source=url or title
            if source and source not in seen_sources:
                sources.append(source); seen_sources.add(source)

        if birds:
            out.append({
                'Plant_ID': sci,
                'Scientific Name': sci,
                'Birds Using This Plant': '; '.join(birds),
                'Bird Use Sources': ' | '.join(sources),
            })
    return raw, out

# 1. Read master workbook.
if not SOURCE.exists():
    raise FileNotFoundError(f"Missing source workbook: {SOURCE}")

matrix=read_xlsx(SOURCE)
headers=unique_headers(matrix[0])
raw_rows=[]
for raw in matrix[1:]:
    obj={headers[i]: raw[i] if i < len(raw) else '' for i in range(len(headers))}
    sci=clean(obj.get('Scientific Name',''))
    if sci:
        obj['Plant_ID']=sci
        raw_rows.append(obj)

# 2. De-duplicate dashboard plant rows by Scientific Name.
# This does NOT edit the source workbook; it only prevents duplicate search results in the dashboard.
by_sci=OrderedDict()
for obj in raw_rows:
    by_sci.setdefault(obj['Plant_ID'], []).append(obj)
rows=[]
for sci, group in by_sci.items():
    best=choose_best_duplicate(group)
    rows.append(merge_rows(best, group, headers))

# 3. Optional plant-family lookup.
raw_families, fam_by_norm = read_families(FAMILY_SOURCE)
for obj in rows:
    fam=fam_by_norm.get(norm(obj['Plant_ID']))
    if fam:
        obj['Family']=fam

# 4. Read microregion table and merge it into matching plant rows.
raw_micro, micro_rows = read_microregions(MICROREGION_SOURCE)
micro_by_id={r['Plant_ID']: r for r in micro_rows}
micro_by_norm={norm(r['Plant_ID']): r for r in micro_rows}

micro_field_map = OrderedDict([
    ('regionGroup', 'Microregion Group'),
    ('primaryMicroregion', 'Primary Microregion'),
    ('secondaryMicroregions', 'Secondary Microregions'),
    ('fineHabitatTags', 'Fine Habitat Tags'),
    ('fineHabitatSummary', 'Fine Habitat Summary'),
    ('nativeHabitat', 'Microregion Native Habitat'),
    ('soilDescription', 'Microregion Soil Description'),
    ('moistureWaterLight', 'Microregion Moisture / Water / Light'),
    ('wetlandStatusSummary', 'Wetland Status Summary'),
    ('confidence', 'Microregion Confidence'),
    ('reviewNeeded', 'Microregion Review Needed'),
    ('publicStatus', 'Microregion Public Status'),
    ('publicationNote', 'Microregion Publication Note'),
    ('sourceUseNote', 'Microregion Source Note'),
    ('datasetVersion', 'Microregion Dataset Version'),
    ('lastUpdated', 'Microregion Last Updated'),
    ('onlineSlug', 'Microregion Online Slug'),
    ('lbjProfileURL', 'Microregion LBJ Profile URL'),
    ('usdaPlantsURL', 'USDA Plants URL'),
    ('fnaSearchURL', 'FNA Search URL'),
    ('wetlandPlantListURL', 'Wetland Plant List URL'),
    ('nrcsWebSoilSurveyURL', 'NRCS Web Soil Survey URL'),
    ('epaEcoregionsURL', 'EPA Ecoregions URL'),
    ('tpwdEMSURL', 'TPWD EMS URL'),
])
for obj in rows:
    micro=micro_by_id.get(obj['Plant_ID']) or micro_by_norm.get(norm(obj['Plant_ID']))
    if not micro:
        continue
    for src_key, dest_key in micro_field_map.items():
        val=clean(micro.get(src_key,''))
        if val:
            obj[dest_key]=val

# 5. Read NPSOT propagation table and merge it into matching plant rows.
raw_prop, propagation_rows = read_propagation(PROPAGATION_SOURCE)
prop_by_norm={norm(r['Plant_ID']): r for r in propagation_rows}
for obj in rows:
    prop=prop_by_norm.get(norm(obj['Plant_ID']))
    if not prop:
        continue
    for key in [
        'NPSOT Propagation Common Name',
        'NPSOT Propagation Materials',
        'NPSOT Propagation Treatment Tags',
        'NPSOT Propagation Public Note',
        'NPSOT Propagation Source URL',
        'NPSOT Propagation References'
    ]:
        val=clean(prop.get(key,''))
        if val:
            obj[key]=val

# 6. Read bird-use workbook and merge species-level bird lists/sources into matching plant rows.
raw_bird, bird_rows = read_bird_use(BIRD_SOURCE)
bird_by_norm={norm(r['Plant_ID']): r for r in bird_rows}
for obj in rows:
    bird=bird_by_norm.get(norm(obj['Plant_ID']))
    if not bird:
        continue
    for key in ['Birds Using This Plant', 'Bird Use Sources']:
        val=clean(bird.get(key,''))
        if val:
            obj[key]=val

# Sort public plant rows alphabetically by Scientific Name before building aliases and exports.
# This keeps the dashboard table, processed CSV/JSON/JS data, and basic download list alphabetical.
def alpha_key(row):
    sci = clean(row.get('Scientific Name') or row.get('Plant_ID'))
    common = clean(row.get('Common Name(s)') or row.get('Common Name') or row.get('Common Names'))
    return (norm(sci), norm(common))

rows.sort(key=alpha_key)

# 6. Build aliases.
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
    micro=micro_by_norm.get(norm(pid))
    if micro:
        for alias in split_aliases(micro.get('commonName','')):
            n=norm(alias)
            if (pid,n) not in seen:
                aliases.append({'Plant_ID':pid,'Alias':alias,'Alias_Type':'microregion_common_name','Normalized_Alias':n}); seen.add((pid,n))
    prop=prop_by_norm.get(norm(pid))
    if prop:
        for alias in split_aliases(prop.get('NPSOT Propagation Common Name','')):
            n=norm(alias)
            if (pid,n) not in seen:
                aliases.append({'Plant_ID':pid,'Alias':alias,'Alias_Type':'npsot_common_name','Normalized_Alias':n}); seen.add((pid,n))

# 7. Strip browser-delivered plant records down to public-safe fields.
rows = [make_public_row(r) for r in rows]

# 8. Export data.
micro_rows_public = [make_public_microregion_row(r) for r in micro_rows]
all_fields=[]
for r in rows:
    for k in r.keys():
        if k not in all_fields:
            all_fields.append(k)

for filename, data in [
    ('plants.json', rows),
    ('plant_aliases.json', aliases),
    ('microregions.json', micro_rows_public),
    ('propagation_npsot.json', propagation_rows),
    ('bird_use.json', bird_rows)
]:
    (OUT/filename).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

(OUT/'plants.js').write_text(
    'window.PLANT_DATA = '+json.dumps(rows, ensure_ascii=False)+';\n'+
    'window.PLANT_ALIASES = '+json.dumps(aliases, ensure_ascii=False)+';\n'+
    'window.PLANT_FIELDS = '+json.dumps(all_fields, ensure_ascii=False)+';\n',
    encoding='utf-8'
)
(OUT/'microregions.js').write_text('window.MICROREGION_DATA = '+json.dumps(micro_rows_public, ensure_ascii=False)+';\n', encoding='utf-8')
(OUT/'propagation_npsot.js').write_text('window.PROPAGATION_NPSOT_DATA = '+json.dumps(propagation_rows, ensure_ascii=False)+';\n', encoding='utf-8')

with (OUT/'plants.csv').open('w', newline='', encoding='utf-8-sig') as f:
    w=csv.DictWriter(f, fieldnames=all_fields); w.writeheader(); w.writerows([{k:r.get(k,'') for k in all_fields} for r in rows])
with (OUT/'plant_aliases.csv').open('w', newline='', encoding='utf-8-sig') as f:
    w=csv.DictWriter(f, fieldnames=['Plant_ID','Alias','Alias_Type','Normalized_Alias']); w.writeheader(); w.writerows(aliases)
if micro_rows_public:
    micro_fields=[]
    for r in micro_rows_public:
        for k in r.keys():
            if k not in micro_fields:
                micro_fields.append(k)
    with (OUT/'microregions.csv').open('w', newline='', encoding='utf-8-sig') as f:
        w=csv.DictWriter(f, fieldnames=micro_fields); w.writeheader(); w.writerows([{k:r.get(k,'') for k in micro_fields} for r in micro_rows_public])
if propagation_rows:
    prop_fields=[]
    for r in propagation_rows:
        for k in r.keys():
            if k not in prop_fields:
                prop_fields.append(k)
    with (OUT/'propagation_npsot.csv').open('w', newline='', encoding='utf-8-sig') as f:
        w=csv.DictWriter(f, fieldnames=prop_fields); w.writeheader(); w.writerows([{k:r.get(k,'') for k in prop_fields} for r in propagation_rows])
if bird_rows:
    bird_fields=[]
    for r in bird_rows:
        for k in r.keys():
            if k not in bird_fields:
                bird_fields.append(k)
    with (OUT/'bird_use.csv').open('w', newline='', encoding='utf-8-sig') as f:
        w=csv.DictWriter(f, fieldnames=bird_fields); w.writeheader(); w.writerows([{k:r.get(k,'') for k in bird_fields} for r in bird_rows])
if raw_families:
    fam_fields=[]
    for r in raw_families:
        for k in r.keys():
            if k not in fam_fields:
                fam_fields.append(k)
    with (OUT/'plant_families.csv').open('w', newline='', encoding='utf-8-sig') as f:
        w=csv.DictWriter(f, fieldnames=fam_fields); w.writeheader(); w.writerows([{k:r.get(k,'') for k in fam_fields} for r in raw_families])

print(f'Built dashboard data for {len(rows)} unique plant records and {len(aliases)} aliases.')
print(f'Read {len(raw_micro)} microregion rows; merged {sum(1 for r in rows if norm(r["Plant_ID"]) in micro_by_norm)} plants with microregion data.')
print(f'Read {len(raw_prop)} NPSOT propagation rows; merged {sum(1 for r in rows if norm(r["Plant_ID"]) in prop_by_norm)} plants with NPSOT propagation data.')
print(f'Read {len(raw_bird)} bird interaction rows; merged {sum(1 for r in rows if norm(r["Plant_ID"]) in bird_by_norm)} plants with species-level bird-use data.')
if raw_families:
    print(f'Read {len(raw_families)} family rows; merged {sum(1 for r in rows if clean(r.get("Family","")))} plants with family data.')
print(f'Duplicate source plant rows collapsed for dashboard only: {len(raw_rows) - len(rows)}')
