/**
 * Converts an Effect Schema to TypeScript type definitions.
 *
 * This module recursively discovers all named types (like S.Class with identifiers)
 * and generates interface definitions for each.
 *
 * @module
 */

import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import type * as Schema from "effect/Schema";
import * as AST from "effect/SchemaAST";

/**
 * The result of generating TypeScript type definitions.
 */
export interface TypeDefinitionResult {
  /**
   * The type expressions for each input schema.
   * Each expression is either an identifier (for named types) or an inline type.
   */
  readonly exprs: string[];

  /**
   * All type definitions as a single string.
   * Contains all recursively discovered named types, separated by newlines.
   * Types are deduplicated - if multiple schemas reference the same type,
   * it will only appear once.
   */
  readonly types: string;
}

/**
 * Generates TypeScript type definitions from one or more schemas.
 *
 * All schemas share a single type environment, so types referenced by
 * multiple schemas are only generated once (deduplication).
 *
 * @example
 * ```typescript
 * import * as S from "effect/Schema";
 * import { make } from "./schema-to-type.js";
 *
 * class Foo extends S.Class<Foo>("Foo")({
 *   key: S.String,
 * }) {}
 *
 * class Bar extends S.Class<Bar>("Bar")({
 *   foo: Foo,
 *   name: S.String,
 * }) {}
 *
 * class Baz extends S.Class<Baz>("Baz")({
 *   foo: Foo,
 *   count: S.Number,
 * }) {}
 *
 * const { exprs, types } = make(Bar, Baz);
 * // exprs === ["Bar", "Baz"]
 * // types contains Foo, Bar, Baz (Foo only once despite being referenced by both)
 * ```
 */
export const schemaToType = <Schemas extends Schema.Schema<any, any, any>[]>(
  ...schemas: Schemas
): TypeDefinitionResult => {
  const typesMap: Record<string, string> = {};
  const processing = new Set<string>();

  // Process all schemas with shared type environment
  const exprs = schemas.map((schema) =>
    go(schema.ast, { types: typesMap, processing }, "handle-identifier"),
  );

  // Convert the types map to a single string
  const types = Object.values(typesMap).join("\n\n");

  return {
    exprs,
    types,
  };
};

interface GoOptions {
  readonly types: Record<string, string>;
  readonly processing: Set<string>;
}

/**
 * Converts an AST node to a TypeScript type reference or inline type.
 * Returns the identifier/type expression and collects named types.
 */
export const fromAST = (
  ast: AST.AST,
  options?: { types?: string[] },
): string => {
  const typesMap: Record<string, string> = {};
  const processing = new Set<string>();
  const result = go(ast, { types: typesMap, processing }, "handle-identifier");

  // If caller wants to collect types, push them to the array
  if (options?.types) {
    for (const def of Object.values(typesMap)) {
      options.types.push(def);
    }
  }

  return result;
};

function getDescription(annotated: AST.Annotated): string | undefined {
  const desc = Option.getOrUndefined(AST.getDescriptionAnnotation(annotated));
  if (desc === undefined) return undefined;

  // Filter out built-in descriptions from primitive keywords
  // Check if annotated is an AST node (has _tag property) before using type guards
  if ("_tag" in annotated) {
    const ast = annotated as AST.AST;
    if (AST.isStringKeyword(ast) && desc === "a string") return undefined;
    if (AST.isNumberKeyword(ast) && desc === "a number") return undefined;
    if (AST.isBooleanKeyword(ast) && desc === "a boolean") return undefined;
    if (AST.isBigIntKeyword(ast) && desc === "a bigint") return undefined;
    if (AST.isSymbolKeyword(ast) && desc === "a symbol") return undefined;
    if (
      AST.isObjectKeyword(ast) &&
      desc === "an object in the TypeScript meaning, i.e. the `object` type"
    )
      return undefined;
  }

  return desc;
}

/**
 * Gets the identifier for a named type.
 * Returns an identifier for:
 * - S.Class types (Transformations with Declaration that has surrogate)
 * - Any schema with an explicit identifier annotation (e.g., named unions)
 * - Suspended types with identifiers
 *
 * Does NOT return identifier for simple transformations like NumberFromString
 * (which have identifier but no user intent to create a named type).
 */
function getIdentifier(ast: AST.AST): string | undefined {
  // For Transformations (like S.Class), check if the "to" side is a Declaration with a surrogate
  // This distinguishes S.Class (which has Declaration with surrogate) from simple transforms
  if (AST.isTransformation(ast)) {
    const toAst = ast.to;
    if (AST.isDeclaration(toAst)) {
      const surrogate = AST.getSurrogateAnnotation(toAst);
      if (Option.isSome(surrogate)) {
        return Option.getOrUndefined(AST.getIdentifierAnnotation(toAst));
      }
    }
    // For simple transformations without surrogate, don't treat as named type
    return undefined;
  }

  // For Declarations with surrogate (direct S.Class reference)
  if (AST.isDeclaration(ast)) {
    const surrogate = AST.getSurrogateAnnotation(ast);
    if (Option.isSome(surrogate)) {
      return Option.getOrUndefined(AST.getIdentifierAnnotation(ast));
    }
    return undefined;
  }

  // For Suspend (recursive types), check the resolved AST
  if (AST.isSuspend(ast)) {
    const id = Option.getOrUndefined(AST.getIdentifierAnnotation(ast));
    if (id !== undefined) {
      return id;
    }
    // Check the resolved type
    const resolved = ast.f();
    return getIdentifier(resolved);
  }

  // For other AST types (Union, TypeLiteral, etc.), check for explicit identifier annotation
  // This supports named unions like: S.Union(...).annotations({ identifier: "MyUnion" })
  return Option.getOrUndefined(AST.getIdentifierAnnotation(ast));
}

function formatComment(
  description: string | undefined,
  indent: string,
): string {
  if (!description) return "";
  const lines = description.split("\n");
  if (lines.length === 1) {
    return `${indent}/** ${description} */\n`;
  }
  return `${indent}/**\n${lines.map((line) => `${indent} * ${line}`).join("\n")}\n${indent} */\n`;
}

function escapePropertyName(name: PropertyKey): string {
  if (typeof name === "symbol") {
    return `[${String(name)}]`;
  }
  const str = String(name);
  // Check if the property name is a valid identifier
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str)) {
    return str;
  }
  // Otherwise, quote it
  return JSON.stringify(str);
}

/**
 * Gets the type body for a named type (S.Class, etc).
 * This navigates through transformations and surrogates to find the actual structure.
 */
function getTypeBody(ast: AST.AST, options: GoOptions): string {
  // For Suspend nodes, resolve them first
  if (AST.isSuspend(ast)) {
    return getTypeBody(ast.f(), options);
  }

  // For Transformations (like S.Class), get the body from the "to" side's surrogate
  if (AST.isTransformation(ast)) {
    const toAst = ast.to;
    // Check for surrogate on the "to" side (Declaration typically has a surrogate)
    const surrogate = AST.getSurrogateAnnotation(toAst);
    if (Option.isSome(surrogate)) {
      return go(surrogate.value, options, "ignore-identifier");
    }
    // Otherwise, use the "to" side directly
    return go(toAst, options, "ignore-identifier");
  }

  // For Declarations, check for surrogate
  if (AST.isDeclaration(ast)) {
    const surrogate = AST.getSurrogateAnnotation(ast);
    if (Option.isSome(surrogate)) {
      return go(surrogate.value, options, "ignore-identifier");
    }
  }

  // Default: get the type ignoring the identifier
  return go(ast, options, "ignore-identifier");
}

function go(
  ast: AST.AST,
  options: GoOptions,
  identifierHandling: "handle-identifier" | "ignore-identifier",
): string {
  // Handle identifier references first
  if (identifierHandling === "handle-identifier") {
    const id = getIdentifier(ast);
    if (id !== undefined) {
      // Check if we're already processing this type (handles recursion)
      if (options.processing.has(id)) {
        return id;
      }

      // Check if we've already fully processed this type
      if (!(id in options.types)) {
        // Mark as processing to handle recursive types
        options.processing.add(id);

        // Get the type body (ignoring the identifier to get the actual structure)
        const typeBody = getTypeBody(ast, options);

        // Generate interface or type definition
        if (typeBody.startsWith("{")) {
          options.types[id] = `interface ${id} ${typeBody}`;
        } else {
          options.types[id] = `type ${id} = ${typeBody};`;
        }

        options.processing.delete(id);
      }
      return id;
    }
  }

  // Check for surrogate annotation (used by S.Class and similar)
  const surrogate = AST.getSurrogateAnnotation(ast);
  if (Option.isSome(surrogate)) {
    return go(surrogate.value, options, identifierHandling);
  }

  switch (ast._tag) {
    case "Declaration": {
      // For declarations, try to use surrogate or fall back to unknown
      const surrogateAst = AST.getSurrogateAnnotation(ast);
      if (Option.isSome(surrogateAst)) {
        return go(surrogateAst.value, options, identifierHandling);
      }
      // Check for type parameters
      if (ast.typeParameters.length > 0) {
        const id = getIdentifier(ast);
        if (id) {
          const params = ast.typeParameters
            .map((p) => go(p, options, "handle-identifier"))
            .join(", ");
          return `${id}<${params}>`;
        }
      }
      return "unknown";
    }

    case "Literal": {
      const literal = ast.literal;
      if (literal === null) {
        return "null";
      }
      if (Predicate.isString(literal)) {
        return JSON.stringify(literal);
      }
      if (Predicate.isNumber(literal)) {
        return String(literal);
      }
      if (Predicate.isBoolean(literal)) {
        return String(literal);
      }
      if (Predicate.isBigInt(literal)) {
        return `${String(literal)}n`;
      }
      return "unknown";
    }

    case "UniqueSymbol":
      return `typeof ${String(ast.symbol)}`;

    case "UndefinedKeyword":
      return "undefined";

    case "VoidKeyword":
      return "void";

    case "NeverKeyword":
      return "never";

    case "UnknownKeyword":
      return "unknown";

    case "AnyKeyword":
      return "any";

    case "StringKeyword":
      return "string";

    case "NumberKeyword":
      return "number";

    case "BooleanKeyword":
      return "boolean";

    case "BigIntKeyword":
      return "bigint";

    case "SymbolKeyword":
      return "symbol";

    case "ObjectKeyword":
      return "object";

    case "Enums": {
      const values = ast.enums.map(([_, value]) =>
        typeof value === "string" ? JSON.stringify(value) : String(value),
      );
      return values.join(" | ");
    }

    case "TemplateLiteral": {
      return formatTemplateLiteral(ast, options);
    }

    case "Refinement":
      // Refinements don't change the type, just add runtime constraints
      return go(ast.from, options, identifierHandling);

    case "TupleType": {
      return formatTupleType(ast, options);
    }

    case "TypeLiteral": {
      return formatTypeLiteral(ast, options);
    }

    case "Union": {
      const members = ast.types.map((t) => go(t, options, "handle-identifier"));
      // Remove duplicates and format
      const unique = [...new Set(members)];
      if (unique.length === 1) {
        return unique[0];
      }
      return unique.join(" | ");
    }

    case "Suspend": {
      const id = getIdentifier(ast);
      if (id !== undefined) {
        // For suspended types, check if already processing
        if (options.processing.has(id)) {
          return id;
        }
        if (!(id in options.types)) {
          options.processing.add(id);
          // Use getTypeBody to properly extract the body from the resolved AST
          const typeBody = getTypeBody(ast, options);
          if (typeBody.startsWith("{")) {
            options.types[id] = `interface ${id} ${typeBody}`;
          } else {
            options.types[id] = `type ${id} = ${typeBody};`;
          }
          options.processing.delete(id);
        }
        return id;
      }
      // If no identifier, try to resolve it
      const resolved = ast.f();
      return go(resolved, options, identifierHandling);
    }

    case "Transformation":
      // For transformations, use the "to" type (the decoded type)
      return go(ast.to, options, identifierHandling);
  }
}

function formatTemplateLiteral(
  ast: AST.TemplateLiteral,
  options: GoOptions,
): string {
  let result = "`" + ast.head;
  for (const span of ast.spans) {
    const spanType = formatTemplateLiteralSpan(span.type, options);
    result += "${" + spanType + "}" + span.literal;
  }
  result += "`";
  return result;
}

function formatTemplateLiteralSpan(type: AST.AST, options: GoOptions): string {
  switch (type._tag) {
    case "StringKeyword":
      return "string";
    case "NumberKeyword":
      return "number";
    case "Literal":
      return typeof type.literal === "string"
        ? JSON.stringify(type.literal)
        : String(type.literal);
    case "TemplateLiteral":
      return formatTemplateLiteral(type, options);
    case "Union":
      return type.types
        .map((t) => formatTemplateLiteralSpan(t, options))
        .join(" | ");
    default:
      return go(type, options, "handle-identifier");
  }
}

function formatTupleType(ast: AST.TupleType, options: GoOptions): string {
  const elements: string[] = [];

  // Add required and optional elements
  for (const element of ast.elements) {
    const typeStr = go(element.type, options, "handle-identifier");
    const description = getDescription(element);
    const comment = description ? `/* ${description} */ ` : "";
    if (element.isOptional) {
      elements.push(`${comment}${typeStr}?`);
    } else {
      elements.push(`${comment}${typeStr}`);
    }
  }

  // Add rest elements
  if (ast.rest.length > 0) {
    const restType = go(ast.rest[0].type, options, "handle-identifier");
    if (ast.elements.length === 0 && ast.rest.length === 1) {
      // Pure array type
      if (ast.isReadonly) {
        return `readonly ${restType}[]`;
      }
      return `${restType}[]`;
    }
    elements.push(`...${restType}[]`);
  }

  const prefix = ast.isReadonly ? "readonly " : "";
  return `${prefix}[${elements.join(", ")}]`;
}

function formatTypeLiteral(ast: AST.TypeLiteral, options: GoOptions): string {
  if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
    return "{}";
  }

  const lines: string[] = [];

  // Add property signatures
  for (const ps of ast.propertySignatures) {
    if (typeof ps.name !== "string" && typeof ps.name !== "number") {
      continue; // Skip symbol keys for simplicity
    }

    const propName = escapePropertyName(ps.name);
    const typeStr = go(ps.type, options, "handle-identifier");
    // Get description from either the property signature or its type
    const description = getDescription(ps) ?? getDescription(ps.type);
    const comment = formatComment(description, "  ");
    const readonly = ps.isReadonly ? "readonly " : "";
    const optional = ps.isOptional ? "?" : "";

    lines.push(`${comment}  ${readonly}${propName}${optional}: ${typeStr};`);
  }

  // Add index signatures
  for (const is of ast.indexSignatures) {
    const paramType = go(is.parameter, options, "handle-identifier");
    const valueType = go(is.type, options, "handle-identifier");
    const readonly = is.isReadonly ? "readonly " : "";
    lines.push(`  ${readonly}[key: ${paramType}]: ${valueType};`);
  }

  if (lines.length === 0) {
    return "{}";
  }

  return `{\n${lines.join("\n")}\n}`;
}
