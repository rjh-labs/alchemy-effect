import type { Capability } from "../../capability.ts";
import type { Input } from "../../input.ts";
import { Runtime, type RuntimeProps } from "../../runtime.ts";
import type * as IAM from "../iam/index.ts";
import type { AccountID } from "../account.ts";
import type { RegionID } from "../region.ts";
import type { SecurityGroupId } from "./security-group.ts";
import type { SubnetId } from "./subnet.ts";

export type InstanceId<ID extends string = string> = `i-${ID}`;
export const InstanceId = <ID extends string>(id: ID): InstanceId<ID> =>
  `i-${id}` as InstanceId<ID>;

export type InstanceArn<
  InstanceID extends InstanceId = InstanceId,
> = `arn:aws:ec2:${RegionID}:${AccountID}:instance/${InstanceID}`;

export interface InstanceProps<Req = unknown>
  extends RuntimeProps<Instance, Req> {
  /**
   * The TypeScript file containing the handler to run on the instance.
   * The handler will be bundled and deployed to the instance.
   */
  main: string;

  /**
   * The name of the export to use as the handler.
   * @default "default"
   */
  handler?: string;

  /**
   * The subnet to launch the instance in.
   * Must be in a VPC with internet access for code download.
   */
  subnetId: Input<SubnetId>;

  /**
   * The security groups to attach to the instance.
   */
  securityGroupIds: Input<SecurityGroupId>[];

  /**
   * The EC2 instance type.
   * @default "t3.micro"
   */
  instanceType?: string;

  /**
   * The AMI ID to use for the instance.
   * @default Latest Amazon Linux 2023 AMI
   */
  ami?: string;

  /**
   * The name of an existing key pair for SSH access.
   */
  keyName?: string;

  /**
   * Root volume configuration.
   */
  rootVolume?: {
    /**
     * Size in GB.
     * @default 8
     */
    size?: number;
    /**
     * Volume type.
     * @default "gp3"
     */
    type?: "gp3" | "gp2" | "io1" | "io2";
    /**
     * IOPS for io1/io2/gp3 volumes.
     */
    iops?: number;
    /**
     * Throughput in MiB/s for gp3 volumes.
     */
    throughput?: number;
  };

  /**
   * Node.js version to install on the instance.
   * @default "22"
   */
  nodeVersion?: "20" | "22";

  /**
   * Tags to apply to the instance and associated resources.
   */
  tags?: Record<string, Input<string>>;
}

export declare namespace InstanceProps {
  export type Simplified<Req> = InstanceProps<
    Capability.Simplify<Extract<Req, Capability>>
  >;
}

export type InstanceState =
  | "pending"
  | "running"
  | "stopping"
  | "stopped"
  | "shutting-down"
  | "terminated";

export interface InstanceAttrs {
  /**
   * The ID of the EC2 instance.
   */
  instanceId: InstanceId;

  /**
   * The ARN of the EC2 instance.
   */
  instanceArn: string;

  /**
   * The public IP address of the instance (if assigned).
   */
  publicIpAddress?: string;

  /**
   * The private IP address of the instance.
   */
  privateIpAddress: string;

  /**
   * The public DNS name of the instance (if assigned).
   */
  publicDnsName?: string;

  /**
   * The private DNS name of the instance.
   */
  privateDnsName: string;

  /**
   * The name of the IAM role attached to the instance.
   */
  roleName: string;

  /**
   * The ARN of the IAM role attached to the instance.
   */
  roleArn: string;

  /**
   * The name of the IAM instance profile.
   */
  instanceProfileName: string;

  /**
   * The ARN of the IAM instance profile.
   */
  instanceProfileArn: string;

  /**
   * The S3 bucket where the code bundle is stored.
   */
  codeBucket: string;

  /**
   * The S3 key of the code bundle.
   */
  codeKey: string;

  /**
   * The hash of the code bundle for change detection.
   */
  codeHash: string;

  /**
   * The current state of the instance.
   */
  state: InstanceState;

  /**
   * The subnet ID the instance is launched in.
   */
  subnetId: SubnetId;
}

/**
 * Binding configuration for EC2 instances.
 * Provides environment variables and IAM policy statements.
 */
export interface InstanceBinding {
  /**
   * Environment variables to set on the instance.
   */
  env?: {
    [key: string]: string;
  };
  /**
   * IAM policy statements to attach to the instance role.
   */
  policyStatements?: IAM.PolicyStatement[];
}

export interface Instance extends Runtime<"AWS.EC2.Instance"> {
  props: InstanceProps<any>;
  attr: InstanceAttrs;
  binding: InstanceBinding;
  base: Instance;
}

export const Instance = Runtime("AWS.EC2.Instance")<Instance>();
