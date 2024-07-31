import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { EfsStack } from "../cdk/stacks/main";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";
import { Aspects } from "aws-cdk-lib";

const app = new cdk.App();
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
const getContext = (contextKey: string, defaultValue: any) => {
  const val = app.node.tryGetContext(contextKey);
  return val && val !== "undefined" ? val : defaultValue;
};
const defaultAwsAccount = app.node.tryGetContext("defaultAwsAccount");
const defaultRegion = app.node.tryGetContext("defaultRegion");
const vpcName = getContext("vpcName", "i8iVpc");
const securityGroupName = getContext("securityGroupName", "i8iStorageSG");
const count = getContext("count", 1);
const performanceMode = getContext("performanceMode", "generalPurpose");
const throughputMode = getContext("throughputMode", "elastic");
const automaticBackup = getContext("automaticBackup", false);
const provisionedThroughputInMibps = getContext(
  "provisionedThroughputInMibps",
  undefined
);
const STACK_NAME = "i8iEfsCreation";
const stack = new EfsStack(app, STACK_NAME, {
  performanceMode,
  throughputMode,
  automaticBackup,
  count,
  provisionedThroughputInMibps,
  vpcName,
  securityGroupName,
  env: { account: defaultAwsAccount, region: defaultRegion },
});

NagSuppressions.addStackSuppressions(stack, [
  {
    id: "AwsSolutions-S1",
    reason: "Overkill for the stack",
  },
  {
    id: "AwsSolutions-IAM4",
    reason: "Managed policies are sufficient for a sample of this size",
  },
  {
    id: "AwsSolutions-IAM5",
    reason:
      "Some dynamic wildcard permissions are required for several service actions",
  },
]);
