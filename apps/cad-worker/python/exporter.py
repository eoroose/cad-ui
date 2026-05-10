"""Export XDE document to merged GLB using RWGltf_CafWriter."""
import pathlib
import pygltflib
from OCC.Core.RWGltf import RWGltf_CafWriter
from OCC.Core.TColStd import TColStd_IndexedDataMapOfStringString
from OCC.Core.Message import Message_ProgressRange


def export_glb(doc, out_path: pathlib.Path) -> None:
    """Export XDE document to binary GLB format."""
    writer = RWGltf_CafWriter(str(out_path), True)  # True = binary GLB

    meta = TColStd_IndexedDataMapOfStringString()
    progress = Message_ProgressRange()
    ok = writer.Perform(doc, meta, progress)
    if not ok:
        raise RuntimeError('RWGltf_CafWriter.Perform() returned False')

    # Validate output
    data = out_path.read_bytes()
    if data[:4] != b'glTF':
        raise RuntimeError('Export produced invalid GLB (bad magic bytes)')

    gltf = pygltflib.GLTF2().load(str(out_path))
    if not gltf.meshes:
        raise RuntimeError('Export produced GLB with 0 meshes (silent failure)')

    print('PROGRESS:80', flush=True)
