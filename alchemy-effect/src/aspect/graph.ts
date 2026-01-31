import {
  isAspect,
  type Aspect,
  type AspectName,
  type IAspect,
  type Ref,
} from "./aspect.ts";

export const deriveGraph = <A extends IAspect>(agent: A): AspectGraph<A> => {
  const seen = new Set<FQN>();
  return [agent, ...agent.references.flatMap((v) => visit(v, seen))].reduce(
    (acc: AspectGraph<A>, aspect) => ({
      ...acc,
      [aspect.type]: {
        ...acc[aspect.type as keyof AspectGraph<A>],
        [aspect.id as keyof AspectGraph<A>[keyof AspectGraph<A>]]: aspect,
      },
    }),
    {} as AspectGraph<A>,
  );
};

const visit = <A>(a: A, seen: Set<FQN>): Aspect[] => {
  if (isAspect(a)) {
    const fqn = getFqn(a);
    if (!seen.has(fqn)) {
      seen.add(fqn);
      return [a, ...a.references.flatMap((v) => visit(v, seen))];
    }
  } else if (Array.isArray(a)) {
    return a.flatMap((v) => visit(v, seen));
  } else if (a instanceof Set) {
    return Array.from(a).flatMap((v) => visit(v, seen));
  } else if (a instanceof Map) {
    return Array.from(a.values()).flatMap((v) => visit(v, seen));
  } else if (typeof a === "object" && a !== null) {
    return Object.values(a).flatMap((v) => visit(v, seen));
  }
  return [];
};

export type AspectGraph<A extends IAspect> = {
  [type in AspectSet<A>["type"]]: {
    [id in Extract<AspectSet<A>, { type: type }>["id"]]: Extract<
      Extract<AspectSet<A>, { type: type }>,
      { id: id }
    >;
  };
};

export type AspectCategory<Aspects extends Aspect> = {
  [id in keyof Aspects["id"]]: Extract<Aspects, { id: id }>;
};

export type AspectSet<A extends IAspect = any> =
  | A
  | Visit<A["references"][number], FQN<A>>;

type Visit<Value, Seen extends string = never> =
  Ref.Resolve<Value> extends infer A
    ? A extends {
        type: string;
        id: AspectName;
        references: infer References extends any[];
      }
      ? FQN<A> extends Seen
        ? never
        : A | Visit<References[number], Seen | FQN<A>>
      : A extends readonly (infer I)[]
        ? Visit<I, Seen>
        : A extends Record<string, infer V>
          ? Visit<V, Seen>
          : never
    : never;

type FQN<A extends { type: string; id: AspectName } = any> =
  A["id"] extends string ? `${A["type"]}:${A["id"]}` : never;

const getFqn = <A extends { type: string; id: AspectName }>(a: A): FQN<A> =>
  `${a.type}:${a.id}` as FQN<A>;
