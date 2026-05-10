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
