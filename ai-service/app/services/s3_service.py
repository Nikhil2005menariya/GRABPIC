import boto3
import os
from botocore.exceptions import BotoCoreError, ClientError

AWS_REGION = os.getenv("AWS_REGION")
AWS_BUCKET = os.getenv("AWS_S3_BUCKET")  # 🔥 correct name
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

if not AWS_BUCKET:
    raise Exception("AWS_S3_BUCKET not configured in environment")

s3 = boto3.client(
    "s3",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
)

def download_image(s3_key: str, local_path: str):
    if not s3_key:
        raise Exception("Invalid S3 key")

    try:
        s3.download_file(AWS_BUCKET, s3_key, local_path)
    except (BotoCoreError, ClientError) as e:
        raise Exception(f"S3 download failed: {str(e)}")
