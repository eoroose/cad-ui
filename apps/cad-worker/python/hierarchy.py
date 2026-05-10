"""XDE label traversal to produce flat node list with parent links and transforms."""
import json
import uuid
from typing import Optional
from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool
from OCC.Core.TDF import TDF_LabelSequence, TDF_AttributeIterator
from OCC.Core.TDataStd import TDataStd_Name
from OCC.Core.XCAFDoc import XCAFDoc_Location
from OCC.Core.gp import gp_Trsf


def _trsf_to_matrix16(trsf: gp_Trsf) -> list:
    """Convert OCC gp_Trsf to row-major 4x4 matrix as flat list of 16 floats."""
    m = trsf.IsNegative()
    matrix = []
    for row in range(1, 5):
        for col in range(1, 5):
            if row == 4:
                val = 1.0 if col == 4 else 0.0
            elif col == 4:
                val = trsf.TranslationPart().Coord(row)
            else:
                val = trsf.Value(row, col)
            matrix.append(float(val))
    return matrix


def _get_name(label) -> Optional[str]:
    """Read TDataStd_Name from label via attribute iterator (FindAttribute not usable — TDataStd_Name
    is not a TDF_Attribute subclass in this pythonocc binding)."""
    name_guid = TDataStd_Name.GetID()
    it = TDF_AttributeIterator(label)
    while it.More():
        attr = it.Value()
        if attr.ID() == name_guid:
            # Iterator returns actual subtype via SWIG polymorphic dispatch
            if hasattr(attr, 'Get'):
                return attr.Get().ToCString()
            # Fallback: DownCast from handle<Standard_Transient>
            try:
                name_attr = TDataStd_Name.DownCast(attr)
                if name_attr is not None:
                    return name_attr.Get().ToCString()
            except Exception:
                pass
        it.Next()
    return None


def _get_transform_matrix(label) -> list:
    """Read XCAFDoc_Location from label as flat 16-float row-major matrix."""
    loc_attr = XCAFDoc_Location()
    if label.FindAttribute(XCAFDoc_Location.GetID(), loc_attr):
        top_loc = loc_attr.Get()
        if not top_loc.IsIdentity():
            return _trsf_to_matrix16(top_loc.Transformation())
    return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]


def build_node_list(doc) -> list:
    """
    Traverse XDE document label tree and produce a flat list of node dicts.
    
    Each node:
      id: str (cuid-style uuid)
      externalId: str (label entry index as string)
      name: str (TDataStd_Name or "Node_{i}" fallback)
      parentId: str | null
      transformMatrix: list[float] (16 elements, row-major 4x4)
    """
    shape_tool = XCAFDoc_DocumentTool.ShapeTool(doc.Main())
    nodes = []
    node_index = [0]
    label_to_id = {}

    def visit(label, parent_id: Optional[str]):
        node_index[0] += 1
        idx = node_index[0]
        node_id = str(uuid.uuid4())
        external_id = str(label.EntryDumpToString() if hasattr(label, 'EntryDumpToString') else idx)
        label_to_id[label.Tag()] = node_id

        name = _get_name(label) or f'Node_{idx}'

        # Build identity matrix as default
        transform_matrix = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]
        loc_attr = XCAFDoc_Location()
        if label.FindAttribute(XCAFDoc_Location.GetID(), loc_attr):
            top_loc = loc_attr.Get()
            if not top_loc.IsIdentity():
                transform_matrix = _trsf_to_matrix16(top_loc.Transformation())

        nodes.append({
            'id': node_id,
            'externalId': str(idx),
            'name': name,
            'parentId': parent_id,
            'transformMatrix': transform_matrix,
        })

        # Recurse into components
        components = TDF_LabelSequence()
        shape_tool.GetComponents(label, components, False)
        for i in range(1, components.Size() + 1):
            visit(components.Value(i), node_id)

    free_shapes = TDF_LabelSequence()
    shape_tool.GetFreeShapes(free_shapes)
    for i in range(1, free_shapes.Size() + 1):
        visit(free_shapes.Value(i), None)

    return nodes
