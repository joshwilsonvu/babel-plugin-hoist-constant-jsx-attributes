import { Visitor, NodePath } from '@babel/traverse';
import * as BabelTypes from '@babel/types';
import micromatch from 'micromatch';

type Types = typeof BabelTypes;
interface Opts {
  include?: RegExp | string;
  exclude?: RegExp | string;
  lowerCaseOnly?: boolean;
  alwaysHoist?: boolean;
}

interface State {
  constantAttributes?: Array<{
    exprPath: NodePath<BabelTypes.ObjectExpression>;
    attrName?: string;
  }>;
  opts: Opts;
}

interface Plugin {
  name: string;
  visitor: Visitor<State>;
}

export default function babelPluginHoistConstantJsxAttributes({
  types: t,
}: {
  types: Types;
}): Plugin {
  function isConstantObject(path: NodePath): boolean {
    return (
      path.isObjectExpression() &&
      (path.get('properties') as Array<NodePath>).every(
        prop =>
          prop.isObjectProperty() &&
          !prop.node.computed &&
          isConstant(prop.get('value') as NodePath)
      )
    );
  }
  function isConstant(path: NodePath): boolean {
    return (
      path.isStringLiteral() ||
      path.isNumericLiteral() ||
      (path.isTemplateLiteral() &&
        (path.get('expressions') as Array<NodePath>).every(isConstant)) ||
      (path.isArrayExpression() &&
        (path.get('elements') as Array<NodePath>).every(
          e => e && isConstant(e)
        )) ||
      isConstantObject(path)
    );
  }

  return {
    name: 'babel-plugin-hoist-constant-jsx-attributes',
    visitor: {
      JSXAttribute(path, state) {
        const opts = state.opts;
        // Find the style attribute, or run the plugin for all attributes?
        const namePath = path.get('name');
        const attrName = namePath.isJSXIdentifier()
          ? namePath.node.name
          : undefined;

        if (!isIncluded(attrName, opts.include, opts.exclude)) {
          return;
        }

        const valuePath = path.get('value');
        if (!valuePath.isJSXExpressionContainer()) {
          return;
        }

        if (opts.lowerCaseOnly) {
          const parentPath = path.parentPath;
          const elementNamePath =
            parentPath.isJSXOpeningElement() && parentPath.get('name');
          if (
            elementNamePath &&
            !Array.isArray(elementNamePath) &&
            elementNamePath.isJSXIdentifier()
          ) {
            const elementName = elementNamePath.node.name;
            if (
              !elementName ||
              elementName[0] !== elementName[0].toLowerCase()
            ) {
              return;
            }
          }
        }

        // No point hoisting attributes for elements in the global scope
        if (!opts.alwaysHoist && !path.getFunctionParent()) {
          return;
        }

        // Check if the expression is a constant object
        const exprPath = valuePath.get('expression') as NodePath;
        if (!isConstantObject(exprPath)) {
          return;
        }

        // move the style expression to a variable declaration at the highest scope,
        // and replace the style expression to a reference to that variable
        state.constantAttributes = state.constantAttributes || [];
        state.constantAttributes.push({
          exprPath: exprPath as NodePath<BabelTypes.ObjectExpression>,
          attrName,
        });
      },
      Program: {
        exit(path, state) {
          if (state.constantAttributes) {
            const declarators = state.constantAttributes.reduce(
              (declarators, { exprPath, attrName }) => {
                const reference = path.scope.generateUidIdentifier(attrName);
                const exprNode = exprPath.node;
                exprPath.replaceWith(reference);
                declarators.push(t.variableDeclarator(reference, exprNode));
                return declarators;
              },
              [] as Array<BabelTypes.VariableDeclarator>
            );
            const decl = t.variableDeclaration('const', declarators);
            path.node.body.unshift(decl);
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
