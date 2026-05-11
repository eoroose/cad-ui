"""
CAD Worker Python pipeline entry point.
Spawned by Node.js BullMQ sidecar for each job.

Progress output format: PROGRESS:{0-100} on stdout.
Errors go to stderr; non-zero exit code signals failure.
"""
import argparse
import pathlib
import sys
import tempfile

from ingestion import download_step
from parser import parse_step
from tessellator import tessellate
from exporter import export_glb
from hierarchy import build_node_list
from scene_writer import write_scene_json
from uploader import upload_results


def _backfill_names(db_nodes, glb_nodes, glb_node_idx, db_parent_id=None, visited=None):
    """Recursively map GLB node names onto DB nodes by matching traversal order."""
    if visited is None:
        visited = set()
    glb_node = glb_nodes[glb_node_idx]
    candidates = [n for n in db_nodes if n['parentId'] == db_parent_id and n['id'] not in visited]
    if not candidates:
        return
    db_node = candidates[0]
    visited.add(db_node['id'])
    if glb_node.name:
        db_node['name'] = glb_node.name
    for child_glb_idx in (glb_node.children or []):
        _backfill_names(db_nodes, glb_nodes, child_glb_idx, db_node['id'], visited)


def main():
    parser = argparse.ArgumentParser(description='CAD processing pipeline')
    parser.add_argument('--job-id', required=True)
    parser.add_argument('--scene-id', required=True)
    parser.add_argument('--s3-key', required=True)
    parser.add_argument('--user-id', required=True)
    args = parser.parse_args()

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = pathlib.Path(tmpdir)
        step_path = tmp / 'input.step'
        glb_path = tmp / 'merged.glb'
        json_path = tmp / 'scene.json'

        print('PROGRESS:0', flush=True)

        # 1. Download STEP from MinIO
        download_step(args.s3_key, step_path)  # emits PROGRESS:10

        # 2. Parse STEP → XDE Document
        doc = parse_step(str(step_path))  # emits PROGRESS:20

        # 3. Tessellate
        tessellate(doc)  # emits PROGRESS:30..70

        # 4. Export to GLB
        export_glb(doc, glb_path)  # emits PROGRESS:80

        # 5. Build node hierarchy
        nodes = build_node_list(doc)

        # 5b. Backfill real names from GLB — TDataStd_Name.Get() is not exposed in this
        # pythonocc binding. RWGltf_CafWriter already resolved names in C++, so read them back.
        try:
            import pygltflib
            gltf = pygltflib.GLTF2().load(str(glb_path))
            if gltf.scenes and gltf.nodes and nodes:
                root_idx = gltf.scenes[0].nodes[0] if gltf.scenes[0].nodes else 0
                _backfill_names(nodes, gltf.nodes, root_idx)
        except Exception as e:
            print(f'WARNING: could not backfill names from GLB: {e}', file=sys.stderr)

        # 6. Write scene.json
        write_scene_json(args.scene_id, nodes, json_path)  # emits PROGRESS:90

        # 7. Upload results + update DB
        upload_results(args.scene_id, args.job_id, glb_path, json_path, nodes)  # emits PROGRESS:100


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'ERROR: {e}', file=sys.stderr)
        sys.exit(1)
