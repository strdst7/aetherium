#!/bin/bash

# Aetherium Cloud Run Deployment Script
# Usage: ./deploy-cloud-run.sh <PROJECT_ID> <REGION>

PROJECT_ID=$1
REGION=${2:-asia-southeast1}
SERVICE_NAME="aetherium-api"
ATLAS_SERVICE_ACCOUNT="mongodb-atlas-eoyzyacsrllae3dx@p-jdqfjwultfgmvjmxxfyijxr5.iam.gserviceaccount.com"

if [ -z "$PROJECT_ID" ]; then
    echo "Error: PROJECT_ID is required."
    echo "Usage: ./deploy-cloud-run.sh <PROJECT_ID> [REGION]"
    exit 1
fi

echo "🚀 Starting deployment for $SERVICE_NAME in project $PROJECT_ID ($REGION)..."

# 1. Enable necessary services
echo "📦 Enabling Cloud Run and Artifact Registry APIs..."
gcloud services enable run.googleapis.com artifactregistry.googleapis.com --project="$PROJECT_ID"

# 2. Create Artifact Registry if it doesn't exist
REPO_NAME="aetherium-repo"
echo "🏗️ Ensuring Artifact Registry repository '$REPO_NAME' exists..."
gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" --project="$PROJECT_ID" > /dev/null 2>&1 || \
gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Aetherium Docker Repository" \
    --project="$PROJECT_ID"

# 3. Build and Push Image
IMAGE_TAG="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME:latest"
echo "🛠️ Building and pushing image to $IMAGE_TAG..."
gcloud builds submit --tag "$IMAGE_TAG" --project="$PROJECT_ID" .

# 4. Deploy to Cloud Run
# Note: Using the provided Atlas service account for identity-based access
echo "🌐 Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
    --image "$IMAGE_TAG" \
    --platform managed \
    --region "$REGION" \
    --service-account "$ATLAS_SERVICE_ACCOUNT" \
    --allow-unauthenticated \
    --project "$PROJECT_ID" \
    --set-env-vars="NODE_ENV=production,API_PORT=8080"

echo "✅ Deployment complete!"
gcloud run services describe "$SERVICE_NAME" --platform managed --region "$REGION" --project="$PROJECT_ID" --format='value(status.url)'
