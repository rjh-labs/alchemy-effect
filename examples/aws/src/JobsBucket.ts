import * as S3 from "alchemy-effect/AWS/S3";

export class JobsBucket extends S3.Bucket("Jobs") {}
