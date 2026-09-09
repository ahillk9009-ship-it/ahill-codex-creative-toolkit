"""Local curated work memory: SQLite source of truth + rebuildable Mem0 index."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import sys
from contextlib import closing
from datetime import datetime, timezone
import uuid

os.environ['MEM0_TELEMETRY'] = 'false'
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
os.environ['DO_NOT_TRACK'] = '1'
os.environ['HF_HUB_OFFLINE'] = '1'
ROOT = Path(os.environ.get('CODEX_WORK_MEMORY_DIR', str(Path.home() / '.codex' / 'ahill-work-memory')))
CACHE = Path(os.environ.get('AHILL_MEMORY_MODEL_CACHE', str(Path.home() / '.cache' / 'ahill-memory-models')))
os.environ['FASTEMBED_CACHE_PATH'] = str(CACHE)
MODEL = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'


def now():
    return datetime.now(timezone.utc).isoformat()


def connect():
    ROOT.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(ROOT / 'records.sqlite3', timeout=30)
    db.row_factory = sqlite3.Row
    db.execute('''CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY, project TEXT NOT NULL, key TEXT NOT NULL,
        text TEXT NOT NULL, source TEXT NOT NULL, updated TEXT NOT NULL,
        vector_id TEXT, indexed_hash TEXT, UNIQUE(project, key))''')
    db.execute('''CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY, memory_id TEXT, text TEXT, source TEXT, updated TEXT)''')
    db.commit()
    return db


def public(row):
    return {k: row[k] for k in ('id', 'project', 'key', 'text', 'source', 'updated')}


def export(db):
    payload = [public(r) for r in db.execute('SELECT * FROM memories ORDER BY project,key')]
    tmp = ROOT / 'memories.json.tmp'
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    os.replace(tmp, ROOT / 'memories.json')
    return payload


def backup(db):
    folder = ROOT / 'backups'
    folder.mkdir(exist_ok=True)
    target = folder / (datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S') + '-' + uuid.uuid4().hex[:8] + '.sqlite3')
    with closing(sqlite3.connect(target)) as destination:
        db.backup(destination)
    return str(target)


def engine():
    if os.environ.get('AHILL_MEMORY_SEMANTIC') != '1' or os.environ.get('WORK_MEMORY_LEXICAL_ONLY') == '1':
        raise RuntimeError('Semantic index disabled; lexical fallback requested.')
    from mem0 import Memory
    from functools import partial
    from fastembed import TextEmbedding
    import mem0.embeddings.fastembed as adapter
    adapter.TextEmbedding = partial(TextEmbedding, cache_dir=str(CACHE), local_files_only=True)
    m = Memory.from_config({
        'embedder': {'provider': 'fastembed', 'config': {'model': MODEL, 'embedding_dims': 384}},
        'vector_store': {'provider': 'qdrant', 'config': {
            'path': str(ROOT / 'vectors'), 'collection_name': 'codex_work_memory_v1',
            'embedding_model_dims': 384}},
        # Mem0 requires an LLM object at construction. No LLM is called: add uses
        # infer=False, and this guard makes accidental inference fail locally.
        'llm': {'provider': 'ollama', 'config': {'model': 'unused', 'ollama_base_url': 'http://127.0.0.1:11434'}},
        'history_db_path': str(ROOT / 'mem0-history.sqlite3'),
    })
    def no_inference(*args, **kwargs):
        raise RuntimeError('This store accepts curated facts only; inference is disabled.')
    m.llm.generate_response = no_inference
    return m


def close_engine(m):
    m.close()
    m.vector_store.client.close()


def digest(row):
    return hashlib.sha256((row['text'] + '\n' + row['source']).encode()).hexdigest()


def sync(db, m):
    count = 0
    for row in db.execute('SELECT * FROM memories').fetchall():
        checksum = digest(row)
        if row['indexed_hash'] == checksum:
            continue
        metadata = {'record_id': row['id'], 'project': row['project'], 'source': row['source']}
        vector_id = row['vector_id']
        if vector_id and m.get(vector_id):
            m.update(vector_id, row['text'], metadata=metadata)
        else:
            result = m.add(row['text'], user_id='codex:' + row['project'], metadata=metadata, infer=False)
            vector_id = result['results'][0]['id']
        db.execute('UPDATE memories SET vector_id=?, indexed_hash=? WHERE id=?',
                   (vector_id, checksum, row['id']))
        db.commit()
        count += 1
    return count


def reindex(db):
    backup_path = backup(db)
    vectors = (ROOT / 'vectors').resolve()
    if vectors.parent != ROOT.resolve():
        raise ValueError('Vector directory escaped the memory store')
    if vectors.exists():
        vectors.rename(ROOT / ('vectors-archived-' + uuid.uuid4().hex[:12]))
    with db:
        db.execute('UPDATE memories SET vector_id=NULL,indexed_hash=NULL')
    m = engine()
    try:
        return {'indexed': sync(db, m), 'backup': backup_path}
    finally:
        close_engine(m)


def save(db, project, key, text, source):
    if not all(s.strip() for s in (project, key, text, source)):
        raise ValueError('project, key, text, and source must be non-empty')
    if not re.fullmatch(r'[A-Za-z0-9_.-]+', project):
        raise ValueError('project must be a stable ASCII slug')
    if len(text) > 4000:
        raise ValueError('Store concise facts (max 4000 characters); keep full documents at source.')
    existing = db.execute('SELECT * FROM memories WHERE project=? AND key=?', (project, key)).fetchone()
    if existing and existing['text'] == text and existing['source'] == source:
        return {'id': existing['id'], 'changed': False}
    backup_path = backup(db)
    stamp = now()
    with db:
        if existing:
            db.execute('INSERT INTO history(memory_id,text,source,updated) VALUES(?,?,?,?)',
                       (existing['id'], existing['text'], existing['source'], existing['updated']))
            db.execute('UPDATE memories SET text=?,source=?,updated=? WHERE id=?',
                       (text, source, stamp, existing['id']))
            record_id = existing['id']
        else:
            record_id = str(uuid.uuid4())
            db.execute('INSERT INTO memories(id,project,key,text,source,updated) VALUES(?,?,?,?,?,?)',
                       (record_id, project, key, text, source, stamp))
    export(db)
    return {'id': record_id, 'changed': True, 'backup': backup_path}


def search(db, query, project, limit):
    rows = db.execute('SELECT * FROM memories WHERE project IN (?,?)', (project, 'global')).fetchall()
    by_id = {r['id']: r for r in rows}
    tokens = re.findall(r'\w+', query.casefold())
    ranks = {}
    for row in rows:
        haystack = (row['key'] + ' ' + row['text']).casefold()
        hits = sum(t in haystack for t in tokens)
        if hits:
            ranks[row['id']] = hits / max(len(tokens), 1)
    warning = None
    m = None
    try:
        m = engine()
        sync(db, m)
        for scope in sorted({project, 'global'}):
            results = m.search(query, filters={'user_id': 'codex:' + scope}, top_k=limit, threshold=0.2)
            for hit in results['results']:
                record_id = hit.get('metadata', {}).get('record_id')
                if record_id in by_id:
                    ranks[record_id] = max(ranks.get(record_id, 0), float(hit.get('score', 0)))
    except Exception as exc:
        warning = str(exc)
    finally:
        if m is not None:
            close_engine(m)
    ordered = sorted(ranks, key=lambda rid: (ranks[rid], by_id[rid]['updated']), reverse=True)[:limit]
    return {'mode': 'lexical-fallback' if warning else 'semantic+lexical', 'warning': warning,
            'results': [{**public(by_id[rid]), 'score': round(ranks[rid], 4)} for rid in ordered]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    add = sub.add_parser('save')
    add.add_argument('--project', required=True)
    add.add_argument('--key', required=True)
    add.add_argument('--text', required=True)
    add.add_argument('--source', required=True)
    find = sub.add_parser('search')
    find.add_argument('query')
    find.add_argument('--project', required=True)
    find.add_argument('--limit', type=int, default=8, choices=range(1, 51))
    for name in ('status', 'sync', 'reindex', 'export', 'backup'):
        sub.add_parser(name)
    listing = sub.add_parser('list')
    listing.add_argument('--project', required=True)
    args = parser.parse_args()
    from locking import FileLock
    ROOT.mkdir(parents=True, exist_ok=True)
    with FileLock(str(ROOT / '.operation.lock'), timeout=60):
        db = connect()
        try:
            if args.command == 'save':
                result = save(db, args.project, args.key, args.text, args.source)
                result['index'] = 'pending; run sync or search'
            elif args.command == 'search':
                result = search(db, args.query, args.project, args.limit)
            elif args.command == 'sync':
                m = engine()
                try:
                    result = {'indexed': sync(db, m)}
                finally:
                    close_engine(m)
            elif args.command == 'reindex':
                result = reindex(db)
            elif args.command == 'list':
                result = [public(r) for r in db.execute('SELECT * FROM memories WHERE project IN (?,?) ORDER BY updated DESC', (args.project, 'global'))]
            elif args.command == 'backup':
                result = {'backup': backup(db)}
            elif args.command == 'export':
                result = {'count': len(export(db)), 'path': str(ROOT / 'memories.json')}
            else:
                rows = db.execute('SELECT * FROM memories').fetchall()
                result = {'store': str(ROOT), 'records': len(rows), 'pending': sum(r['indexed_hash'] != digest(r) for r in rows),
                          'integrity': db.execute('PRAGMA integrity_check').fetchone()[0], 'model': MODEL,
                          'storage': 'local', 'telemetry': False, 'cloud_auth_required': False}
            print(json.dumps(result, ensure_ascii=False, indent=2))
        finally:
            db.close()


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    main()
