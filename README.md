## i8i EFS Creator Stack

- Usage:
  ```
  cdk deploy --json --context defaultAwsAccount=AWS_ACCOUNT_ID --context defaultRegion=AWS_REGION  \
    --context vpcName=i8iVpc \
    --context securityGroupName=i8iStorageSG \
    --context count=3 \
    --context performanceMode  \
    --context throughputMode  \
    --context provisionedThroughputInMibps  \
    --context automaticBackup
  ```
