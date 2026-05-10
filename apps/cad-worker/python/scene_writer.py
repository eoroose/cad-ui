"""Generate scene.json from node list."""
import json
import pathlib


def write_scene_json(scene_id: str, nodes: list, out_path: pathlib.Path) -> None:
    """Write scene.json to out_path."""
    scene = {
        'schemaVersion': '1.0',
        'sceneId': scene_id,
        'nodeCount': len(nodes),
        'nodes': nodes,
    }
    out_path.write_text(json.dumps(scene, indent=2), encoding='utf-8')
    print('PROGRESS:90', flush=True)
