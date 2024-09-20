# Deployment

## Initialize and Deploy

Clone this repo:
```bash
git clone https://github.com/Pablo-Wynistorf/url-restream.git
cd url-restream
```

### Automatic Deployment:
```bash
chmod +x deploy.sh
./deploy.sh
```


### Manual Deployment:
Install node modules:
```bash
npm install --prefix ./src
```


Deploy the application using SAM:
Note: Keep in mind that npm, aws cli and samcli has to be installed on your system
```bash
sam build

# Set variables
AWS_DEFAULT_REGION="us-east-1"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
RANDOM_STRING=$(openssl rand -base64 6 | tr -dc 'a-z0-9' | head -c 6)
S3_BUCKET_NAME="url-restream-$ACCOUNT_ID-${AWS_DEFAULT_REGION//-/}-$RANDOM_STRING"

# Create the S3 bucket
aws s3 mb s3://$S3_BUCKET_NAME --region $AWS_DEFAULT_REGION

# Deploy the SAM application
sam deploy --template-file template.yml --stack-name urlRestreamStack --capabilities CAPABILITY_IAM --s3-bucket "$S3_BUCKET_NAME" --region $AWS_DEFAULT_REGION
```

## Cleanup

Just run these two commands:

```bash
# Set variables
AWS_DEFAULT_REGION="us-east-1"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
S3_BUCKET_NAME=$(aws s3api list-buckets --query "Buckets[?starts_with(Name, \`url-restream-${ACCOUNT_ID}-${AWS_DEFAULT_REGION//-/}-\`)].Name" --output text)

# Delete SAM Stack
aws cloudformation delete-stack --stack-name urlRestreamStack --region $AWS_DEFAULT_REGION

# Delete S3 Bucket
aws s3 rb s3://$S3_BUCKET_NAME --force --region $AWS_DEFAULT_REGION
```
