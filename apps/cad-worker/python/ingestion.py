"""Download STEP file from MinIO and validate it."""
import boto3
import os
import pathlib
from botocore.config import Config


def get_s3_client():
    return boto3.client(
        's3',
        endpoint_url=os.environ['S3_ENDPOINT'],
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        config=Config(s3={'addressing_style': 'path'}),
        region_name=os.environ.get('AWS_REGION', 'us-east-1'),
    )


def download_step(s3_key: str, dest_path: pathlib.Path) -> None:
    """Download STEP file from S3/MinIO to dest_path and validate magic bytes."""
    s3 = get_s3_client()
    bucket = os.environ['S3_BUCKET']
    s3.download_file(bucket, s3_key, str(dest_path))

    # Validate STEP file magic bytes
    with open(dest_path, 'rb') as f:
        header = f.read(12)
    if not header.startswith(b'ISO-10303-21'):
        raise ValueError(f'Not a valid STEP file (bad magic bytes): {dest_path}')
    print('PROGRESS:10', flush=True)
