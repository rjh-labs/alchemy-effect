import crypto from "node:crypto";
import path from "node:path";

import { FileSystem } from "@effect/platform";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";

import type { ScopedPlanStatusSession } from "../../cli/service.ts";
import { somePropsAreDifferent } from "../../diff.ts";
import { createInternalTags, createTagsList, hasTags } from "../../tags.ts";
import { createPhysicalName } from "../../physical-name.ts";
import { DotAlchemy } from "../../dot-alchemy.ts";
import { App } from "../../app.ts";
import { Account } from "../account.ts";
import { Region } from "distilled-aws/Region";
import * as ec2 from "distilled-aws/ec2";
import * as iam from "distilled-aws/iam";
import * as s3 from "distilled-aws/s3";
import * as ssm from "distilled-aws/ssm";
import * as IAM from "../iam/index.ts";
import {
  Instance,
  type InstanceAttrs,
  type InstanceId,
  type InstanceProps,
} from "./instance.ts";
import type { SubnetId } from "./subnet.ts";

export const instanceProvider = () =>
  Instance.provider.effect(
    Effect.gen(function* () {
      const app = yield* App;
      const accountId = yield* Account;
      const region = yield* Region;
      const dotAlchemy = yield* DotAlchemy;
      const fs = yield* FileSystem.FileSystem;

      const createRoleName = (id: string) =>
        createPhysicalName({ id, maxLength: 64 });

      const createInstanceProfileName = (id: string) =>
        createPhysicalName({ id, maxLength: 128 });

      const createPolicyName = (id: string) =>
        createPhysicalName({ id, maxLength: 128 });

      const createNames = (id: string) =>
        Effect.gen(function* () {
          const roleName = yield* createRoleName(id);
          const instanceProfileName = yield* createInstanceProfileName(id);
          const policyName = yield* createPolicyName(id);
          return {
            roleName,
            instanceProfileName,
            policyName,
            roleArn: `arn:aws:iam::${accountId}:role/${roleName}`,
            instanceProfileArn: `arn:aws:iam::${accountId}:instance-profile/${instanceProfileName}`,
          };
        });

      const createRoleIfNotExists = Effect.fn(function* ({
        id,
        roleName,
      }: {
        id: string;
        roleName: string;
      }) {
        yield* Effect.logDebug(`creating role ${id}`);
        const tags = yield* createInternalTags(id);
        const role = yield* iam
          .createRole({
            RoleName: roleName,
            AssumeRolePolicyDocument: JSON.stringify({
              Version: "2012-10-17",
              Statement: [
                {
                  Effect: "Allow",
                  Principal: {
                    Service: "ec2.amazonaws.com",
                  },
                  Action: "sts:AssumeRole",
                },
              ],
            }),
            Tags: createTagsList(tags),
          })
          .pipe(
            Effect.catchTag("EntityAlreadyExistsException", () =>
              iam
                .getRole({
                  RoleName: roleName,
                })
                .pipe(
                  Effect.filterOrFail(
                    (role) => hasTags(tags, role.Role?.Tags),
                    () =>
                      new Error(
                        `Role ${roleName} exists but has incorrect tags`,
                      ),
                  ),
                ),
            ),
          );

        yield* Effect.logDebug(`attaching SSM policy ${id}`);
        // Attach SSM managed policy for instance management
        yield* iam
          .attachRolePolicy({
            RoleName: roleName,
            PolicyArn:
              "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
          })
          .pipe(Effect.tapError(Effect.logDebug), Effect.tap(Effect.logDebug));

        yield* Effect.logDebug(`attached policy ${id}`);
        return role;
      });

      const createInstanceProfileIfNotExists = Effect.fn(function* ({
        id,
        instanceProfileName,
        roleName,
      }: {
        id: string;
        instanceProfileName: string;
        roleName: string;
      }) {
        yield* Effect.logDebug(`creating instance profile ${id}`);
        const tags = yield* createInternalTags(id);

        yield* iam
          .createInstanceProfile({
            InstanceProfileName: instanceProfileName,
            Tags: createTagsList(tags),
          })
          .pipe(
            Effect.catchTag("EntityAlreadyExistsException", () =>
              iam.getInstanceProfile({
                InstanceProfileName: instanceProfileName,
              }),
            ),
          );

        yield* Effect.logDebug(`adding role to instance profile ${id}`);
        yield* iam
          .addRoleToInstanceProfile({
            InstanceProfileName: instanceProfileName,
            RoleName: roleName,
          })
          .pipe(
            Effect.catchTag("LimitExceededException", () => Effect.void),
          );

        // Wait for instance profile to propagate (IAM eventual consistency)
        yield* Effect.sleep("10 seconds");

        yield* Effect.logDebug(`instance profile ready ${id}`);
        return {
          instanceProfileArn: `arn:aws:iam::${accountId}:instance-profile/${instanceProfileName}`,
        };
      });

      const ensureAssetsBucket = Effect.fn(function* () {
        const bucketName = `alchemy-${accountId}-${region}-assets`;
        yield* s3
          .createBucket({
            Bucket: bucketName,
          })
          .pipe(
            Effect.catchTag("BucketAlreadyOwnedByYou", () => Effect.void),
            Effect.catchTag("BucketAlreadyExists", () => Effect.void),
          );
        return bucketName;
      });

      const bundleAndUploadCode = Effect.fn(function* (
        id: string,
        props: {
          main: string;
          handler?: string;
        },
      ) {
        const handler = props.handler ?? "default";
        let file = path.relative(process.cwd(), props.main);
        if (!file.startsWith(".")) {
          file = `./${file}`;
        }
        const { bundle } = yield* Effect.promise(() => import("../bundle.ts"));
        const outfile = path.join(
          dotAlchemy,
          "out",
          `${app.name}-${app.stage}-${id}-ec2.mjs`,
        );

        // Bundle with entry point that runs the handler
        yield* bundle({
          stdin: {
            contents: `import handler from "${file}";\nhandler();`,
            resolveDir: process.cwd(),
            loader: "ts",
            sourcefile: "__index.ts",
          },
          bundle: true,
          format: "esm",
          platform: "node",
          target: "node22",
          sourcemap: true,
          treeShaking: true,
          write: true,
          outfile,
          minify: true,
          external: ["@aws-sdk/*", "@smithy/*"],
          logLevel: "error",
        });

        const code = yield* fs
          .readFile(outfile)
          .pipe(Effect.catchAll(Effect.die));
        const hash = crypto.createHash("sha256").update(code).digest("hex");

        // Upload to S3
        const bucketName = yield* ensureAssetsBucket();
        const codeKey = `ec2/${app.name}/${app.stage}/${id}/${hash}/index.mjs`;

        yield* s3.putObject({
          Bucket: bucketName,
          Key: codeKey,
          Body: code,
          ContentType: "application/javascript",
        });

        return {
          codeBucket: bucketName,
          codeKey,
          codeHash: hash,
          codeSize: code.length,
        };
      });

      const generateUserData = ({
        codeBucket,
        codeKey,
        env,
        nodeVersion,
      }: {
        codeBucket: string;
        codeKey: string;
        env: Record<string, string>;
        nodeVersion: string;
      }) => {
        const envExports = Object.entries(env)
          .map(([k, v]) => `export ${k}="${v.replace(/"/g, '\\"')}"`)
          .join("\n");

        const script = `#!/bin/bash
set -e

# Log startup
echo "Starting Alchemy Effect EC2 bootstrap..."

# Install Node.js via NodeSource
curl -fsSL https://rpm.nodesource.com/setup_${nodeVersion}.x | bash -
yum install -y nodejs

# Create app directory
mkdir -p /opt/app
cd /opt/app

# Download code from S3
aws s3 cp s3://${codeBucket}/${codeKey} ./index.mjs

# Write environment file
cat > /opt/app/.env << 'ENVEOF'
${envExports}
ENVEOF

# Create systemd service
cat > /etc/systemd/system/app.service << 'EOF'
[Unit]
Description=Alchemy Effect Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/app
EnvironmentFile=/opt/app/.env
ExecStart=/usr/bin/node /opt/app/index.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Start the service
systemctl daemon-reload
systemctl enable app.service
systemctl start app.service

echo "Alchemy Effect EC2 bootstrap complete!"
`;
        return Buffer.from(script).toString("base64");
      };

      const attachBindings = Effect.fn(function* ({
        roleName,
        policyName,
        codeBucket,
        codeKey,
        bindings,
      }: {
        roleName: string;
        policyName: string;
        codeBucket: string;
        codeKey: string;
        bindings: Instance["binding"][];
      }) {
        const env: Record<string, string> = bindings
          .map((binding) => binding?.env)
          .reduce<Record<string, string>>((acc, env) => ({ ...acc, ...env }), {});

        const policyStatements: IAM.PolicyStatement[] = [
          // Always need S3 access to download code
          {
            Sid: "DownloadCode",
            Effect: "Allow",
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${codeBucket}/${codeKey}`],
          },
          // User-defined statements from bindings
          ...bindings.flatMap(
            (binding) =>
              binding?.policyStatements?.map((stmt: IAM.PolicyStatement) => ({
                ...stmt,
                Sid: stmt.Sid?.replace(/[^A-Za-z0-9]+/gi, ""),
              })) ?? [],
          ),
        ];

        yield* iam.putRolePolicy({
          RoleName: roleName,
          PolicyName: policyName,
          PolicyDocument: JSON.stringify({
            Version: "2012-10-17",
            Statement: policyStatements,
          } satisfies IAM.PolicyDocument),
        });

        return env;
      });

      const getLatestAmazonLinux2023Ami = Effect.fn(function* () {
        const result = yield* ec2.describeImages({
          Owners: ["amazon"],
          Filters: [
            { Name: "name", Values: ["al2023-ami-*-x86_64"] },
            { Name: "state", Values: ["available"] },
            { Name: "architecture", Values: ["x86_64"] },
            { Name: "virtualization-type", Values: ["hvm"] },
          ],
        });

        const images = result.Images ?? [];
        if (images.length === 0) {
          return yield* Effect.fail(
            new Error("No Amazon Linux 2023 AMIs found"),
          );
        }

        // Sort by creation date, return most recent
        images.sort((a, b) =>
          (b.CreationDate ?? "").localeCompare(a.CreationDate ?? ""),
        );

        return images[0].ImageId!;
      });

      const launchInstance = Effect.fn(function* ({
        id,
        props,
        instanceProfileArn,
        userData,
        session,
      }: {
        id: string;
        props: InstanceProps<any>;
        instanceProfileArn: string;
        userData: string;
        session: ScopedPlanStatusSession;
      }) {
        const tags = yield* createInternalTags(id);
        const ami = props.ami ?? (yield* getLatestAmazonLinux2023Ami());

        yield* session.note(`Launching instance with AMI: ${ami}`);

        const result = yield* ec2
          .runInstances({
            ImageId: ami,
            InstanceType: props.instanceType ?? "t3.micro",
            MinCount: 1,
            MaxCount: 1,
            SubnetId: props.subnetId as string,
            SecurityGroupIds: props.securityGroupIds as string[],
            IamInstanceProfile: { Arn: instanceProfileArn },
            UserData: userData,
            KeyName: props.keyName,
            BlockDeviceMappings: props.rootVolume
              ? [
                  {
                    DeviceName: "/dev/xvda",
                    Ebs: {
                      VolumeSize: props.rootVolume.size ?? 8,
                      VolumeType: props.rootVolume.type ?? "gp3",
                      Iops: props.rootVolume.iops,
                      Throughput: props.rootVolume.throughput,
                      DeleteOnTermination: true,
                    },
                  },
                ]
              : undefined,
            TagSpecifications: [
              {
                ResourceType: "instance",
                Tags: createTagsList({ ...tags, ...props.tags, Name: id }),
              },
            ],
          })
          .pipe(
            Effect.retry({
              while: (e: any) =>
                e._tag === "InvalidParameterValue" &&
                String(e.message ?? "").includes("Invalid IAM Instance Profile ARN"),
              schedule: Schedule.exponential(1000).pipe(
                Schedule.intersect(Schedule.recurs(10)),
              ),
            }),
          );

        const instanceId = result.Instances![0].InstanceId! as InstanceId;
        yield* session.note(`Instance launched: ${instanceId}`);

        return instanceId;
      });

      const waitForInstanceRunning = (
        instanceId: string,
        session: ScopedPlanStatusSession,
      ) =>
        Effect.gen(function* () {
          const result = yield* ec2.describeInstances({
            InstanceIds: [instanceId],
          });
          const instance = result.Reservations?.[0]?.Instances?.[0];

          if (!instance) {
            return yield* Effect.fail(
              new Error(`Instance ${instanceId} not found`),
            );
          }

          const state = instance.State?.Name;
          if (state === "running") {
            return instance;
          }

          if (state === "terminated" || state === "shutting-down") {
            return yield* Effect.fail(
              new Error(`Instance ${instanceId} is ${state}`),
            );
          }

          return yield* new InstancePending({ instanceId, state: state ?? "unknown" });
        }).pipe(
          Effect.retry({
            while: (e) => e instanceof InstancePending,
            schedule: Schedule.fixed(5000).pipe(
              Schedule.intersect(Schedule.recurs(60)), // Max 5 minutes
              Schedule.tapOutput(([, attempt]) =>
                session.note(
                  `Waiting for instance to be running... (${(attempt + 1) * 5}s)`,
                ),
              ),
            ),
          }),
        );

      const waitForInstanceTerminated = (
        instanceId: string,
        session: ScopedPlanStatusSession,
      ) =>
        Effect.gen(function* () {
          const result = yield* ec2
            .describeInstances({
              InstanceIds: [instanceId],
            })
            .pipe(
              Effect.catchTag("InvalidInstanceID.NotFound", () =>
                Effect.succeed({ Reservations: [] }),
              ),
            );

          const instance = result.Reservations?.[0]?.Instances?.[0];
          if (!instance || instance.State?.Name === "terminated") {
            return; // Successfully terminated
          }

          return yield* new InstanceStillExists({ instanceId });
        }).pipe(
          Effect.retry({
            while: (e) => e instanceof InstanceStillExists,
            schedule: Schedule.fixed(5000).pipe(
              Schedule.intersect(Schedule.recurs(60)), // Max 5 minutes
              Schedule.tapOutput(([, attempt]) =>
                session.note(
                  `Waiting for instance termination... (${(attempt + 1) * 5}s)`,
                ),
              ),
            ),
          }),
        );

      const updateCodeViaSSM = Effect.fn(function* ({
        instanceId,
        codeBucket,
        codeKey,
        session,
      }: {
        instanceId: string;
        codeBucket: string;
        codeKey: string;
        session: ScopedPlanStatusSession;
      }) {
        yield* session.note(`Updating code via SSM...`);

        const command = yield* ssm.sendCommand({
          InstanceIds: [instanceId],
          DocumentName: "AWS-RunShellScript",
          Parameters: {
            commands: [
              `aws s3 cp s3://${codeBucket}/${codeKey} /opt/app/index.mjs`,
              `systemctl restart app.service`,
            ],
          },
        });

        const commandId = command.Command?.CommandId;
        if (!commandId) {
          return yield* Effect.fail(new Error("Failed to send SSM command"));
        }

        // Wait for command to complete
        yield* waitForSSMCommand(commandId, instanceId, session);
        yield* session.note(`Code updated successfully`);
      });

      const waitForSSMCommand = (
        commandId: string,
        instanceId: string,
        session: ScopedPlanStatusSession,
      ) =>
        Effect.gen(function* () {
          const result = yield* ssm.getCommandInvocation({
            CommandId: commandId,
            InstanceId: instanceId,
          });

          const status = result.Status;
          if (status === "Success") {
            return;
          }
          if (status === "Failed" || status === "Cancelled" || status === "TimedOut") {
            return yield* Effect.fail(
              new Error(`SSM command ${status}: ${result.StandardErrorContent}`),
            );
          }

          return yield* new SSMCommandPending({ commandId, status: status ?? "unknown" });
        }).pipe(
          Effect.retry({
            while: (e) => e instanceof SSMCommandPending,
            schedule: Schedule.fixed(2000).pipe(
              Schedule.intersect(Schedule.recurs(30)), // Max 60 seconds
              Schedule.tapOutput(([, attempt]) =>
                session.note(`Waiting for SSM command... (${(attempt + 1) * 2}s)`),
              ),
            ),
          }),
        );

      const summary = ({ codeSize }: { codeSize: number }) =>
        `${
          codeSize >= 1024 * 1024
            ? `${(codeSize / (1024 * 1024)).toFixed(2)}MB`
            : codeSize >= 1024
              ? `${(codeSize / 1024).toFixed(2)}KB`
              : `${codeSize}B`
        }`;

      return {
        stables: ["instanceId", "instanceArn", "roleName", "instanceProfileName"],

        diff: Effect.fn(function* ({ id, olds, news, output }) {
          // Infrastructure changes require replacement
          if (
            somePropsAreDifferent(olds, news, [
              "subnetId",
              "instanceType",
              "ami",
              "keyName",
              "rootVolume",
            ])
          ) {
            return { action: "replace" };
          }

          // Security group changes require replacement (simplifies logic)
          const oldSgs = (olds.securityGroupIds ?? []).sort().join(",");
          const newSgs = (news.securityGroupIds ?? []).sort().join(",");
          if (oldSgs !== newSgs) {
            return { action: "replace" };
          }

          // Code changes can be updated in-place
          const newCode = yield* bundleAndUploadCode(id, {
            main: news.main,
            handler: news.handler,
          }).pipe(Effect.orDie);
          if (output.codeHash !== newCode.codeHash) {
            return { action: "update" };
          }
        }),

        precreate: Effect.fn(function* ({ id, news }) {
          const { roleName, instanceProfileName, roleArn, instanceProfileArn, policyName } =
            yield* createNames(id);

          // Create IAM resources
          yield* createRoleIfNotExists({ id, roleName });
          yield* createInstanceProfileIfNotExists({
            id,
            instanceProfileName,
            roleName,
          });

          // Bundle and upload code
          const { codeBucket, codeKey, codeHash } = yield* bundleAndUploadCode(
            id,
            news,
          );

          // Attach initial bindings (just S3 access for code)
          yield* attachBindings({
            roleName,
            policyName,
            codeBucket,
            codeKey,
            bindings: [],
          });

          return {
            instanceId: "i-pending" as InstanceId,
            instanceArn: `arn:aws:ec2:${region}:${accountId}:instance/i-pending`,
            publicIpAddress: undefined,
            privateIpAddress: "0.0.0.0",
            publicDnsName: undefined,
            privateDnsName: "",
            roleName,
            roleArn,
            instanceProfileName,
            instanceProfileArn,
            codeBucket,
            codeKey,
            codeHash,
            state: "pending",
            subnetId: news.subnetId as SubnetId,
          } satisfies InstanceAttrs;
        }),

        create: Effect.fn(function* ({ id, news, bindings, session }) {
          const { roleName, instanceProfileName, roleArn, instanceProfileArn, policyName } =
            yield* createNames(id);

          // Create IAM resources (idempotent)
          yield* createRoleIfNotExists({ id, roleName });
          yield* createInstanceProfileIfNotExists({
            id,
            instanceProfileName,
            roleName,
          });

          // Bundle and upload code
          const { codeBucket, codeKey, codeHash, codeSize } =
            yield* bundleAndUploadCode(id, news);

          // Attach bindings
          const env = yield* attachBindings({
            roleName,
            policyName,
            codeBucket,
            codeKey,
            bindings,
          });

          // Generate user data
          const userData = generateUserData({
            codeBucket,
            codeKey,
            env,
            nodeVersion: news.nodeVersion ?? "22",
          });

          // Launch instance
          const instanceId = yield* launchInstance({
            id,
            props: news,
            instanceProfileArn,
            userData,
            session,
          });

          // Wait for running state
          const instance = yield* waitForInstanceRunning(instanceId, session);

          yield* session.note(summary({ codeSize }));

          return {
            instanceId,
            instanceArn: `arn:aws:ec2:${region}:${accountId}:instance/${instanceId}`,
            publicIpAddress: instance.PublicIpAddress,
            privateIpAddress: instance.PrivateIpAddress!,
            publicDnsName: instance.PublicDnsName,
            privateDnsName: instance.PrivateDnsName!,
            roleName,
            roleArn,
            instanceProfileName,
            instanceProfileArn,
            codeBucket,
            codeKey,
            codeHash,
            state: "running",
            subnetId: news.subnetId as SubnetId,
          } satisfies InstanceAttrs;
        }),

        update: Effect.fn(function* ({ id, news, bindings, output, session }) {
          const { roleName, policyName } = yield* createNames(id);

          // Bundle and upload new code
          const { codeBucket, codeKey, codeHash, codeSize } =
            yield* bundleAndUploadCode(id, news);

          // Update bindings
          const env = yield* attachBindings({
            roleName,
            policyName,
            codeBucket,
            codeKey,
            bindings,
          });

          // Update code via SSM
          yield* updateCodeViaSSM({
            instanceId: output.instanceId,
            codeBucket,
            codeKey,
            session,
          });

          // Update environment file via SSM
          const envExports = Object.entries(env)
            .map(([k, v]) => `export ${k}="${v.replace(/"/g, '\\"')}"`)
            .join("\n");

          yield* ssm.sendCommand({
            InstanceIds: [output.instanceId],
            DocumentName: "AWS-RunShellScript",
            Parameters: {
              commands: [
                `cat > /opt/app/.env << 'ENVEOF'\n${envExports}\nENVEOF`,
                `systemctl restart app.service`,
              ],
            },
          });

          yield* session.note(summary({ codeSize }));

          return {
            ...output,
            codeBucket,
            codeKey,
            codeHash,
          } satisfies InstanceAttrs;
        }),

        delete: Effect.fn(function* ({ output, session }) {
          yield* session.note(`Terminating instance: ${output.instanceId}`);

          // Terminate instance
          yield* ec2
            .terminateInstances({
              InstanceIds: [output.instanceId],
            })
            .pipe(
              Effect.catchTag("InvalidInstanceID.NotFound", () => Effect.void),
            );

          // Wait for termination
          yield* waitForInstanceTerminated(output.instanceId, session);

          // Clean up IAM resources
          yield* session.note(`Cleaning up IAM resources...`);

          // Remove role from instance profile
          yield* iam
            .removeRoleFromInstanceProfile({
              InstanceProfileName: output.instanceProfileName,
              RoleName: output.roleName,
            })
            .pipe(
              Effect.catchTag("NoSuchEntityException", () => Effect.void),
            );

          // Delete instance profile
          yield* iam
            .deleteInstanceProfile({
              InstanceProfileName: output.instanceProfileName,
            })
            .pipe(
              Effect.catchTag("NoSuchEntityException", () => Effect.void),
            );

          // Delete role policies
          yield* iam
            .listRolePolicies({
              RoleName: output.roleName,
            })
            .pipe(
              Effect.flatMap((policies) =>
                Effect.all(
                  (policies.PolicyNames ?? []).map((policyName) =>
                    iam.deleteRolePolicy({
                      RoleName: output.roleName,
                      PolicyName: policyName,
                    }),
                  ),
                ),
              ),
              Effect.catchTag("NoSuchEntityException", () => Effect.void),
            );

          // Detach managed policies
          yield* iam
            .listAttachedRolePolicies({
              RoleName: output.roleName,
            })
            .pipe(
              Effect.flatMap((policies) =>
                Effect.all(
                  (policies.AttachedPolicies ?? []).map((policy) =>
                    iam
                      .detachRolePolicy({
                        RoleName: output.roleName,
                        PolicyArn: policy.PolicyArn!,
                      })
                      .pipe(
                        Effect.catchTag("NoSuchEntityException", () => Effect.void),
                      ),
                  ),
                ),
              ),
              Effect.catchTag("NoSuchEntityException", () => Effect.void),
            );

          // Delete role
          yield* iam
            .deleteRole({
              RoleName: output.roleName,
            })
            .pipe(
              Effect.catchTag("NoSuchEntityException", () => Effect.void),
            );

          yield* session.note(`Instance ${output.instanceId} deleted successfully`);
          return null as any;
        }),
      };
    }),
  );

// Error classes for retry logic
class InstancePending extends Data.TaggedError("InstancePending")<{
  instanceId: string;
  state: string;
}> {}

class InstanceStillExists extends Data.TaggedError("InstanceStillExists")<{
  instanceId: string;
}> {}

class SSMCommandPending extends Data.TaggedError("SSMCommandPending")<{
  commandId: string;
  status: string;
}> {}
