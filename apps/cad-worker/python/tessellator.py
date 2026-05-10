"""Apply BRepMesh_IncrementalMesh tessellation to all shapes in XDE document."""
from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool


def tessellate(
    doc,
    linear_deflection: float = 0.1,
    angular_deflection: float = 0.5,
) -> None:
    """Tessellate all free shapes in the XDE document in-place."""
    shape_tool = XCAFDoc_DocumentTool.ShapeTool(doc.Main())
    free_shapes = shape_tool.GetFreeShapes()
    total = free_shapes.Size()

    for i in range(1, total + 1):
        shape = shape_tool.GetShape(free_shapes.Value(i))
        mesh = BRepMesh_IncrementalMesh(
            shape, linear_deflection, False, angular_deflection, True
        )
        mesh.Perform()
        progress = int(30 + (i / total) * 40)
        print(f'PROGRESS:{progress}', flush=True)
