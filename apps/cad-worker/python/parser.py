"""Parse STEP file using STEPCAFControl_Reader (XDE) to preserve assembly hierarchy."""
from OCC.Core.STEPCAFControl import STEPCAFControl_Reader
from OCC.Core.TDocStd import TDocStd_Document
from OCC.Core.IFSelect import IFSelect_RetDone
from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool


class HierarchyLossError(Exception):
    pass


def parse_step(step_path: str) -> TDocStd_Document:
    """
    Parse STEP using XDE (STEPCAFControl_Reader) to preserve assembly hierarchy.
    
    CRITICAL: STEPCAFControl_Reader (not STEPControl_Reader) is required.
    STEPControl_Reader gives only flat geometry without assembly structure.
    """
    doc = TDocStd_Document('BinXCAF')
    reader = STEPCAFControl_Reader()
    reader.SetColorMode(True)
    reader.SetNameMode(True)
    reader.SetLayerMode(True)

    status = reader.ReadFile(step_path)
    if status != IFSelect_RetDone:
        raise RuntimeError(f'STEPCAFControl_Reader failed with status={status}')

    reader.Transfer(doc)

    # Validate that we got assembly hierarchy
    shape_tool = XCAFDoc_DocumentTool.ShapeTool(doc.Main())
    free_shapes = shape_tool.GetFreeShapes()
    if free_shapes.Size() == 0:
        raise HierarchyLossError('XDE returned 0 free shapes — STEP may lack hierarchy')

    print('PROGRESS:20', flush=True)
    return doc
