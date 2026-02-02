import { Parameter } from "../tool/parameter.ts";
import { Tool } from "../tool/tool.ts";
import { Issues } from "./issue-service.ts";
import { Issue, IssueId } from "./issue.ts";

export class title extends Parameter("title")`
The title of the Issue.` {}

export class description extends Parameter(
  "description",
)`The description of the Issue.` {}

export class issueId extends Parameter(
  "issueId",
  IssueId,
)`The ID of the Issue.` {}

export class readIssue extends Tool("readIssue")`
Read an ${Issue} in the Thread with its ${issueId}.
`(({ issueId }) => Issues.readIssue(issueId)) {}

export class createIssue extends Tool("createIssue")`
Create an Issue in the Thread with a ${title} and ${description}.
`(Issues.createIssue) {}

export class updateIssue extends Tool("updateIssue")`
Update an ${Issue}'s ${title} and/or ${description} referenced by its ${issueId}.
`(Issues.updateIssue) {}

export class closeIssue extends Tool("closeIssue")`
Close an Issue in the Thread referenced by its ${issueId}.
`(({ issueId }) => Issues.closeIssue(issueId)) {}
