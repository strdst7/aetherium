#!/usr/bin/env python3
"""Seed memory documents into MongoDB from JSON fixtures with S3 storage and embeddings."""

import argparse
import json
import os
import sys
from datetime import datetime

try:
    import boto3
    from botocore.client import Config
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

def simple_embedding(text):
    """Generate a simple embedding based on text hash."""
    h = sum(ord(c) for c in text) % 1000
    return [(h + i) / 1000.0 for i in range(128)]

def upload_to_s3(file_path, object_key, sigil):
    """Upload file to S3 if boto3 is available."""
    if not HAS_BOTO3:
        return None
    
    try:
        with open(file_path, "rb") as f:
            content = f.read()
        
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
                      Metadata={"sigil_anchor": sigil,
                                "uploaded_at": datetime.utcnow().isoformat()})
        return {"object_key": object_key, "bucket": bucket}
    except Exception as e:
        print(f"⚠️  S3 upload skipped: {e}", file=sys.stderr)
        return None

def main():
    parser = argparse.ArgumentParser(description='Seed memory documents into MongoDB')
    parser.add_argument("--file", required=True, help='Path to JSON fixture file')
    parser.add_argument("--id", help='ID prefix for documents')
    parser.add_argument("--sigil", help='Sigil to tag documents')
    parser.add_argument("--mongo-uri", default=os.environ.get("MONGODB_URI", "mongodb://localhost:27017/aetherium"),
                       help='MongoDB connection URI')
    parser.add_argument("--db", default='aetherium', help='Database name')
    args = parser.parse_args()
    
    # Load fixture file
    try:
        with open(args.file, 'r') as f:
            documents = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: File not found: {args.file}", file=sys.stderr)
        return False
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in {args.file}: {e}", file=sys.stderr)
        return False
    
    if not isinstance(documents, list):
        documents = [documents]
    
    # Connect to MongoDB
    try:
        client = MongoClient(args.mongo_uri, serverSelectionTimeoutMS=5000)
        client.server_info()
    except ConnectionFailure as e:
        print(f"❌ Error: Could not connect to MongoDB: {e}", file=sys.stderr)
        return False
    
    try:
        db = client[args.db]
        coll = db["memory"]
        
        inserted_count = 0
        for doc in documents:
            doc_id = doc.get('id', args.id or f"mem_{datetime.utcnow().timestamp()}")
            
            # Add embedding from content
            if 'embedding' not in doc and 'content' in doc:
                doc['embedding'] = simple_embedding(doc['content'])
            
            # Add metadata
            doc['_id'] = doc_id
            doc['sigil'] = args.sigil
            doc['createdAt'] = datetime.utcnow()
            doc['updatedAt'] = datetime.utcnow()
            
            # Try S3 upload if applicable
            if args.sigil and isinstance(doc.get('content'), str):
                object_key = f"objects/{doc_id}_v1.json"
                s3_info = upload_to_s3(args.file, object_key, args.sigil)
                if s3_info:
                    doc['object_key'] = s3_info['object_key']
                    doc['bucket'] = s3_info['bucket']
            
            # Upsert into MongoDB
            result = coll.update_one({"_id": doc_id}, {"$set": doc}, upsert=True)
            inserted_count += result.upserted_id is not None or result.modified_count > 0
            print(f"✅ Upserted memory doc id={doc_id}")
        
        print(f"\n✅ Seeded {inserted_count} document(s) into {args.db}.memory")
        return True
        
    except Exception as e:
        print(f"❌ Error: Database operation failed: {e}", file=sys.stderr)
        return False
    finally:
        client.close()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
