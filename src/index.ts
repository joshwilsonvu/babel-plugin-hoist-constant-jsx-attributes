import { Visitor, NodePath } from '@babel/traverse';
import * as BabelTypes from '@babel/types';
import template from '@babel/template';
import micromatch from 'micromatch';

interface Opts {
  include?: RegExp | string;
  exclude?: RegExp | string;
  includeAttributes?: RegExp | string;
  excludeAttributes?: RegExp | string;
  lowerCaseOnly?: boolean;
  alwaysHoist?: boolean;
  freezeObjects?: false | 'development' | 'always';
}

interface State {
  constantAttributes?: Array<{
    exprPath: NodePath<BabelTypes.Expression>;
    attrName?: string;
  }>;
  opts: Opts;
}

interface Plugin {
  name: string;
  visitor: Visitor<State>;
}

const buildDeepFreezeFnDecl = template.statement(
  `const DEEP_FREEZE_FN_NAME = object => {
    Object.getOwnPropertyNames(object).forEach(name => {
      const value = object[name];
      if (value && typeof value === "object") {
        /*#__PURE__*/ DEEP_FREEZE_FN_NAME(value);
      }
    })
    return Object.freeze(object);
  };
`,
  { preserveComments: true }
);
const buildDeepFreezeObjectInDevelopment = template.expression(
  `(process.env.NODE_ENV === "development" ? /*#__PURE__*/ DEEP_FREEZE_FN_NAME(OBJ) : OBJ)`,
  {
    preserveComments: true,
    placeholderPattern: /^(?:DEEP_FREEZE_FN_NAME|OBJ)$/,
  }
);
const buildDeepFreezeObjectAlways = template.expression(
  `/*#__PURE__*/ DEEP_FREEZE_FN_NAME(OBJ)`,
  { preserveComments: true }
);

export default function babelPluginHoistConstantJsxAttributes({
  types: t,
}: {
  types: typeof BabelTypes;
}): Plugin {
  function isConstant(path: NodePath): boolean {
    return (
      path.isStringLiteral() ||
      path.isNumericLiteral() ||
      path.isNullLiteral() ||
      path.isBooleanLiteral() ||
      (path.isUnaryExpression({ operator: '-' }) &&
        path.get('argument').isNumericLiteral()) ||
      isNontrivialConstant(path)
    );
  }
  function isNontrivialConstant(path: NodePath): boolean {
    return (
      isConstantObject(path) ||
      (path.isTemplateLiteral() &&
        (path.get('expressions') as Array<NodePath>).every(isConstant))
    );
  }
  function isConstantObject(path: NodePath): boolean {
    return (
      (path.isObjectExpression() &&
        (path.get('properties') as Array<NodePath>).every(
          prop =>
            prop.isObjectProperty() &&
            !prop.node.computed &&
            isConstant(prop.get('value') as NodePath)
        )) ||
      (path.isArrayExpression() &&
        (path.get('elements') as Array<NodePath>).every(
          e => e && isConstant(e)
        ))
    );
  }

  return {
    name: 'babel-plugin-hoist-constant-jsx-attributes',
    visitor: {
      JSXAttribute(path, state) {
        const opts = state.opts;
        const namePath = path.get('name');
        const attrName = namePath.isJSXIdentifier()
          ? namePath.node.name
          : undefined;

        if (
          !isIncluded(attrName, opts.includeAttributes, opts.excludeAttributes)
        ) {
          // Only run if the attribute name is included/not excluded
          return;
        }

        const valuePath = path.get('value');
        if (!valuePath.isJSXExpressionContainer()) {
          return;
        }

        const parentPath = path.parentPath;
        const elementNamePath =
          parentPath.isJSXOpeningElement() && parentPath.get('name');
        const elementName =
          elementNamePath &&
          !Array.isArray(elementNamePath) &&
          elementNamePath.isJSXIdentifier()
            ? elementNamePath.node.name
            : undefined;

        if (
          !elementName ||
          (opts.lowerCaseOnly &&
            elementName[0] !== elementName[0].toLowerCase()) ||
          !isIncluded(elementName, opts.include, opts.exclude)
        ) {
          // only run if the element name is included/not excluded
          return;
        }

        // No point hoisting attributes for elements in the global scope
        if (!opts.alwaysHoist && !path.getFunctionParent()) {
          return;
        }

        // Check if the expression is a constant expression that requires an allocation
        const exprPath = valuePath.get('expression') as NodePath<
          BabelTypes.Expression
        >;
        if (!isNontrivialConstant(exprPath)) {
          return;
        }

        // move the expression to a variable declaration at the highest scope,
        // and replace the attribute value with a reference to that variable
        state.constantAttributes = state.constantAttributes || [];
        state.constantAttributes.push({
          exprPath,
          attrName,
        });
      },
      Program: {
        exit(path, state) {
          if (state.constantAttributes) {
            const freezeObjects = state.opts.freezeObjects;
            if (freezeObjects === 'development' || freezeObjects === 'always') {
              const deepFreezeFnId = path.scope.generateUidIdentifier(
                'deepFreeze'
              );
              const declarators = state.constantAttributes.reduce(
                (declarators, { exprPath, attrName }) => {
                  const reference = path.scope.generateUidIdentifier(attrName);
                  if (isConstantObject(exprPath)) {
                    const buildDeepFreezeObject =
                      freezeObjects === 'development'
                        ? buildDeepFreezeObjectInDevelopment
                        : buildDeepFreezeObjectAlways;
                    const wrappedExpr = buildDeepFreezeObject({
                      DEEP_FREEZE_FN_NAME: deepFreezeFnId,
                      OBJ: exprPath.node,
                    });
                    declarators.push(
                      t.variableDeclarator(reference, wrappedExpr)
                    );
                  } else {
                    declarators.push(
                      t.variableDeclarator(reference, exprPath.node)
                    );
                  }
                  exprPath.replaceWith(reference);
                  return declarators;
                },
                [] as Array<BabelTypes.VariableDeclarator>
              );
              const deepFreezeFnDecl = buildDeepFreezeFnDecl({
                DEEP_FREEZE_FN_NAME: deepFreezeFnId,
              });
              const varDecl = t.variableDeclaration('const', declarators);
              path.node.body.unshift(deepFreezeFnDecl, varDecl);
            } else {
              const declarators = state.constantAttributes.reduce(
                (declarators, { exprPath, attrName }) => {
                  const reference = path.scope.generateUidIdentifier(attrName);
                  declarators.push(
                    t.variableDeclarator(reference, exprPath.node)
                  );
                  exprPath.replaceWith(reference);
                  return declarators;
                },
                [] as Array<BabelTypes.VariableDeclarator>
              );
              const varDecl = t.variableDeclaration('const', declarators);
              path.node.body.unshift(varDecl);
            }
          }
        },
      },
    },
  };
}

function isIncluded(
  value?: string,
  include?: RegExp | string,
  exclude?: RegExp | string
) {
  let included = true,
    excluded = false;
  if (typeof include === 'string') {
    if (!value || !micromatch.isMatch(value, include)) {
      included = false;
    }
  } else if (include instanceof RegExp) {
    if (!value || !include.test(value)) {
      included = false;
    }
  }
  if (typeof exclude === 'string') {
    if (!value || micromatch.isMatch(value, exclude)) {
      excluded = true;
    }
  } else if (exclude instanceof RegExp) {
    if (!value || exclude.test(value)) {
      excluded = true;
    }
  }
  return included && !excluded;
}
