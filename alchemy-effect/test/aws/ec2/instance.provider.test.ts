import { $ } from "@/index";
import * as AWS from "@/aws";
import * as EC2 from "@/aws/ec2";
import { apply, destroy } from "@/index";
import { test } from "@/test";
import { expect } from "@effect/vitest";
import * as ec2 from "distilled-aws/ec2";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Logger from "effect/Logger";
import * as Schedule from "effect/Schedule";
import { LogLevel } from "effect";
import path from "pathe";

const logLevel = Logger.withMinimumLogLevel(
  process.env.DEBUG ? LogLevel.Debug : LogLevel.Info,
);

const main = path.resolve(import.meta.dirname, "..", "..", "handler.ts");

test(
  "create, update, delete instance",
  { timeout: 600_000 }, // 10 minutes for EC2 operations
  Effect.gen(function* () {
    // First create VPC infrastructure
    class TestVpc extends EC2.Vpc("TestVpc", {
      cidrBlock: "10.0.0.0/16",
      enableDnsSupport: true,
      enableDnsHostnames: true,
    }) {}

    class TestSubnet extends EC2.Subnet("TestSubnet", {
      vpcId: TestVpc.attr.vpcId,
      cidrBlock: "10.0.1.0/24",
      mapPublicIpOnLaunch: true,
    }) {}

    class TestIgw extends EC2.InternetGateway("TestIgw", {
      vpcId: TestVpc.attr.vpcId,
    }) {}

    class TestRouteTable extends EC2.RouteTable("TestRouteTable", {
      vpcId: TestVpc.attr.vpcId,
    }) {}

    class TestRoute extends EC2.Route("TestRoute", {
      routeTableId: TestRouteTable.attr.routeTableId,
      destinationCidrBlock: "0.0.0.0/0",
      gatewayId: TestIgw.attr.internetGatewayId,
    }) {}

    class TestRtaAssoc extends EC2.RouteTableAssociation("TestRtaAssoc", {
      routeTableId: TestRouteTable.attr.routeTableId,
      subnetId: TestSubnet.attr.subnetId,
    }) {}

    class TestSg extends EC2.SecurityGroup("TestSg", {
      vpcId: TestVpc.attr.vpcId,
      groupName: "test-instance-sg",
      groupDescription: "Security group for test EC2 instance",
    }) {}

    class TestSgIngressRule extends EC2.SecurityGroupRule("TestSgIngressRule", {
      securityGroupId: TestSg.attr.groupId,
      ipProtocol: "-1",
      cidrIpv4: "0.0.0.0/0",
      isEgress: false,
    }) {}

    class TestSgEgressRule extends EC2.SecurityGroupRule("TestSgEgressRule", {
      securityGroupId: TestSg.attr.groupId,
      ipProtocol: "-1",
      cidrIpv4: "0.0.0.0/0",
      isEgress: true,
    }) {}

    // Create the EC2 instance with a simple process handler
    class TestInstance extends EC2.Instance("TestInstance", {
      handle: () =>
        Effect.gen(function* () {
          console.log("Test instance started");
          yield* Effect.never; // Run forever
        }),
    })({
      main,
      subnetId: TestSubnet.attr.subnetId,
      securityGroupIds: [TestSg.attr.groupId],
      instanceType: "t3.micro",
      bindings: $(),
    }) {}

    const stack = yield* apply(
      TestVpc,
      TestSubnet,
      TestIgw,
      TestRouteTable,
      TestRoute,
      TestRtaAssoc,
      TestSg,
      TestSgIngressRule,
      TestSgEgressRule,
      TestInstance,
    );

    // Verify instance was created
    expect(stack.TestInstance.instanceId).toMatch(/^i-/);
    expect(stack.TestInstance.state).toEqual("running");
    expect(stack.TestInstance.privateIpAddress).toBeTruthy();
    expect(stack.TestInstance.roleName).toBeTruthy();
    expect(stack.TestInstance.instanceProfileName).toBeTruthy();
    expect(stack.TestInstance.codeHash).toBeTruthy();

    // Verify instance exists in AWS
    const instanceResult = yield* ec2.describeInstances({
      InstanceIds: [stack.TestInstance.instanceId],
    });
    const instance = instanceResult.Reservations?.[0]?.Instances?.[0];
    expect(instance).toBeTruthy();
    expect(instance?.InstanceId).toEqual(stack.TestInstance.instanceId);
    expect(instance?.State?.Name).toEqual("running");
    expect(instance?.InstanceType).toEqual("t3.micro");

    // Clean up
    yield* destroy();

    // Verify instance was terminated
    yield* assertInstanceTerminated(stack.TestInstance.instanceId);
  }).pipe(Effect.provide(AWS.providers()), logLevel),
);

class InstanceStillExists extends Data.TaggedError("InstanceStillExists") {}

const assertInstanceTerminated = Effect.fn(function* (instanceId: string) {
  yield* ec2
    .describeInstances({
      InstanceIds: [instanceId],
    })
    .pipe(
      Effect.flatMap((result) => {
        const instance = result.Reservations?.[0]?.Instances?.[0];
        if (!instance || instance.State?.Name === "terminated") {
          return Effect.void;
        }
        return Effect.fail(new InstanceStillExists());
      }),
      Effect.retry({
        while: (e) => e._tag === "InstanceStillExists",
        schedule: Schedule.exponential(1000).pipe(
          Schedule.intersect(Schedule.recurs(30)),
        ),
      }),
      Effect.catchTag("InvalidInstanceID.NotFound", () => Effect.void),
    );
});
