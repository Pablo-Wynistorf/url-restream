#!/bin/bash

HAS_DEPENDENCIES="y"

# Check if the AWS CLI is installed
if ! [ -x "$(command -v aws --version)" ]; then
  HAS_DEPENDENCIES="n"
fi

# Check if the SAM CLI is installed
if ! [ -x "$(command -v sam)" ]; then
  HAS_DEPENDENCIES="n"
fi

# Check if npm is installed
if ! [ -x "$(command -v npm)" ]; then
  HAS_DEPENDENCIES="n"
fi


if [ "$HAS_DEPENDENCIES" != "y" ]; then
  echo "Please install the AWS CLI, SAM CLI, and npm before running this script."
  exit 1
fi

read -p "Enter your AWS region (default: us-east-1): " AWS_DEFAULT_REGION
AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}

# Install node modules
echo "Installing Node.js dependencies..."
npm install --prefix ./src

# Set variables
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
RANDOM_STRING=$(openssl rand -base64 6 | tr -dc 'a-z0-9' | head -c 6)
S3_BUCKET_NAME="url-restream-$ACCOUNT_ID-${AWS_DEFAULT_REGION//-/}-$RANDOM_STRING"

# Create the S3 bucket
echo "Creating S3 bucket: $S3_BUCKET_NAME"
aws s3 mb s3://$S3_BUCKET_NAME --region $AWS_DEFAULT_REGION

# Build and Deploy the SAM Application
echo "Building SAM application..."
sam build

echo "Deploying SAM application..."
sam deploy --template-file template.yml \
  --stack-name url-restream \
  --capabilities CAPABILITY_IAM \
  --s3-bucket "$S3_BUCKET_NAME" \
  --region "$AWS_DEFAULT_REGION"