"""Upload results to MinIO and update database atomically."""
import os
import pathlib
import psycopg2
from psycopg2.extras import execute_values
from ingestion import get_s3_client


def upload_results(
    scene_id: str,
    job_id: str,
    glb_path: pathlib.Path,
    json_path: pathlib.Path,
    nodes: list,
) -> None:
    """Upload merged.glb and scene.json to MinIO, then update DB atomically."""
    s3 = get_s3_client()
    bucket = os.environ['S3_BUCKET']

    glb_key = f'scenes/{scene_id}/merged.glb'
    json_key = f'scenes/{scene_id}/scene.json'

    s3.upload_file(
        str(glb_path), bucket, glb_key,
        ExtraArgs={'ContentType': 'model/gltf-binary'},
    )
    s3.upload_file(
        str(json_path), bucket, json_key,
        ExtraArgs={'ContentType': 'application/json'},
    )

    # DB update via psycopg2 (Prisma not available in Python)
    db_url = os.environ['DATABASE_URL']
    # Convert prisma URL format (postgresql://) to psycopg2-compatible
    conn = psycopg2.connect(db_url)
    node_count = len(nodes)

    try:
        with conn:
            with conn.cursor() as cur:
                # Update scene to READY
                cur.execute(
                    """
                    UPDATE scenes
                    SET status = 'READY',
                        "mergedGlbKey" = %s,
                        "sceneJsonKey" = %s,
                        "nodeCount" = %s,
                        "updatedAt" = now()
                    WHERE id = %s
                    """,
                    (glb_key, json_key, node_count, scene_id),
                )

                # Bulk insert scene nodes
                if nodes:
                    node_rows = [
                        (
                            node['id'],
                            scene_id,
                            node['externalId'],
                            node['name'],
                            node.get('parentId'),
                            node['transformMatrix'],
                            [],  # jointAxis default
                        )
                        for node in nodes
                    ]
                    execute_values(
                        cur,
                        """
                        INSERT INTO scene_nodes
                            (id, "sceneId", "externalId", name, "parentId", "transformMatrix", "jointAxis", "createdAt", "updatedAt")
                        VALUES %s
                        ON CONFLICT ("sceneId", "externalId") DO NOTHING
                        """,
                        [
                            (r[0], r[1], r[2], r[3], r[4], r[5], r[6], 'now()', 'now()')
                            for r in node_rows
                        ],
                        template="(%s, %s, %s, %s, %s, %s::float[], %s::float[], %s, %s)",
                    )

                # Update job to COMPLETED
                cur.execute(
                    """
                    UPDATE jobs
                    SET status = 'COMPLETED',
                        progress = 100,
                        "completedAt" = now(),
                        "updatedAt" = now()
                    WHERE "bullJobId" = %s
                    """,
                    (job_id,),
                )
    finally:
        conn.close()

    print('PROGRESS:100', flush=True)
