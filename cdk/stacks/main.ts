import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { ManagedPolicy } from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { SecurityGroup } from "aws-cdk-lib/aws-ec2";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Runtime, FileSystem as lfs } from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import {
  AccessPoint,
  FileSystem,
  PerformanceMode,
  ThroughputMode,
} from "aws-cdk-lib/aws-efs";

interface EfsStackProps extends cdk.StackProps {
  performanceMode: string;
  throughputMode: string;
  automaticBackup: boolean;
  count: number;
  provisionedThroughputInMibps?: any;
  vpcName?: string;
  securityGroupName: string;
}

export class EfsStack extends Stack {
  constructor(construct: Construct, id: string, props: EfsStackProps) {
    super(construct, id, props);

    const performanceMode = props.performanceMode;
    const throughputMode = props.throughputMode;
    const automaticBackup = props.automaticBackup;
    const count = props.count;
    const provisionedThroughputInMibps = props.provisionedThroughputInMibps;
    const vpcName = props.vpcName;
    const securityGroupName = props.securityGroupName;

    const i8iVpc = ec2.Vpc.fromLookup(this, "i8iVpc", {
      vpcName,
    });
    const efsSecurityGroup = SecurityGroup.fromLookupByName(
      this,
      "i8iStorageSG",
      securityGroupName,
      i8iVpc
    );
    const s3CodeBucket = Bucket.fromBucketName(
      this,
      "s3CodeBucket",
      "i8i-content"
    );
    for (let i = 0; i < count; i++) {
      const efs = new FileSystem(this, `i8iEfs-${i}`, {
        vpc: i8iVpc,
        encrypted: true,
        vpcSubnets: {
          onePerAz: true,
        },
        enableAutomaticBackups: automaticBackup,
        provisionedThroughputPerSecond: provisionedThroughputInMibps,
        throughputMode: throughputMode as ThroughputMode,
        performanceMode: performanceMode as PerformanceMode,
        securityGroup: efsSecurityGroup,
        fileSystemName: `i8i`,
        removalPolicy: RemovalPolicy.DESTROY,
      });

      const efsAccess = new AccessPoint(this, `i8iEfsAp-${i}`, {
        fileSystem: efs,
        createAcl: {
          ownerGid: "0",
          ownerUid: "0",
          permissions: "777",
        },
        posixUser: {
          uid: "0",
          gid: "0",
        },
        path: "/i8i",
      });

      const i8iEfsControllerLambda = new lambda.Function(
        this,
        `i8iEfsControllerLambda-${i}`,
        {
          handler: "index.handler",
          functionName: `i8iEfsController-${efs.fileSystemId}`,
          code: lambda.Code.fromBucket(
            s3CodeBucket,
            "code/i8iEfsController.zip"
          ),
          memorySize: 512,
          vpc: i8iVpc,
          securityGroups: [efsSecurityGroup],
          timeout: Duration.seconds(60),
          runtime: Runtime.PYTHON_3_12,
          allowPublicSubnet: true,
          filesystem: lfs.fromEfsAccessPoint(efsAccess, "/mnt/i8i"),
          environment: {
            EFS_ID: efs.fileSystemId,
          },
        }
      );
      i8iEfsControllerLambda.role?.addManagedPolicy(
        ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonElasticFileSystemClientFullAccess"
        )
      );
      i8iEfsControllerLambda.role?.addManagedPolicy(
        ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess")
      );
    }
  }
}
