#!/usr/bin/env python3
import argparse, json, os
from datetime import datetime
import boto3
from botocore.client import Config
from pymongo import MongoClient

def simple_embedding(text):
    h = sum(ord(c) for c in text) % 1000
    return [(h + i) / 1000.0 for i in range(128)]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--id", required=True)
    parser.add_argument("--sigil", required=True)
    args = parser.parse_args()

    # read blob
    with open(args.file, "rb") as f:
        content = f.read()

    object_key = f"objects/{args.id}_v1.json"

    s3 = boto3.client("s3",
        endpoint_url=os.environ.get("S3_ENDPOINT"),
        aws_access_key_id=os.environ.get("S3_ACCESS_KEY"),
        aws_secret_access_key=os.environ.get("S3_SECRET_KEY"),
        region_name=os.environ.get("S3_REGION"),
        config=Config(s3={'addressing_style': 'path'})
    )

    bucket = os.environ.get("S3_BUCKET", "aetherium-blobs")
    try:
        s3.head_bucket(Bucket=bucket)
    except:
        s3.create_bucket(Bucket=bucket)

    s3.put_object(Bucket=bucket, Key=object_key, Body=content,
                  Metadata={"sigil_anchor": args.sigil,
                            "uploaded_at": datetime.utcnow().isoformat()})

    embedding = simple_embedding(content.decode("utf-8", errors="ignore"))

    client = MongoClient(os.environ.get("MONGODB_URI"))
    db = client.get_default_database()
    coll = db["memories"]

    doc = {
        "id": args.id,
        "object_key": object_key,
        "bucket": bucket,
        "sigil_anchor": args.sigil,
        "embedding": embedding,
        "metadata": {
            "type": "seed_blob",
            "source": "seed_script",
            "timestamp": datetime.utcnow().isoformat(),
            "identity_score": 0.95
        },
        "version": 1,
        "content_preview": content.decode("utf-8", errors="ignore")[:512]
    }

    coll.update_one({"id": args.id}, {"$set": doc}, upsert=True)
    print(f"Upserted memory doc id={args.id}")

if __name__ == "__main__":
    main()
