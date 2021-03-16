import { Visitor, Node, NodePath } from '@babel/traverse';
import * as BabelTypes from '@babel/types';
import micromatch from 'micromatch';

type Types = typeof BabelTypes;
interface Opts {
  include?: RegExp | string;
  exclude?: RegExp | string;
  primitiveOnly?: boolean;
  alwaysHoist?: boolean;
}

interface State {
  declarators?: Array<BabelTypes.VariableDeclarator>;
  programPath?: NodePath<BabelTypes.Program>;
  opts: Opts;
}

interface Plugin {
  name: string;
  visitor: Visitor<State>;
}

export default function babelPluginHoistConstantJsxAttributes({ types: t }: { types: Types }): Plugin {
  function isConstantObject(node: Node): node is BabelTypes.ObjectExpression {
    return t.isObjectExpression(node) &&
      node.properties.every(
        prop => t.isObjectProperty(prop) && !prop.computed && isConstant(prop.value)
      )
  }
  function isConstant(node: Node): boolean {
    return (
      t.isStringLiteral(node) ||
      t.isNumericLiteral(node) ||
      (t.isTemplateLiteral(node) && node.expressions.every(isConstant)) ||
      (t.isArrayExpression(node) && node.elements.every(e => e && isConstant(e))) ||
      isConstantObject(node)
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
        if (
          (typeof opts.include === 'string' &&
            (!attrName || !micromatch.isMatch(attrName, opts.include))) ||
          (opts.include instanceof RegExp &&
            (!attrName || !opts.include.test(attrName))) ||
          (typeof opts.exclude === 'string' &&
            (!attrName || micromatch.isMatch(attrName, opts.exclude))) ||
          (opts.exclude instanceof RegExp &&
            (!attrName || opts.exclude.test(attrName)))
        ) {
          return;
        }

        const valuePath = path.get('value');
        if (!valuePath.isJSXExpressionContainer()) {
          return;
        }

        if (opts.primitiveOnly) {
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
        const expr = valuePath.get('expression');
        if (!isConstantObject(expr.node)) {
          return;
        }

        // move the style expression to a variable declaration at the highest scope,
        // and replace the style expression to a reference to that variable
        const reference = state.programPath!.scope.generateUidIdentifier(attrName);
        const declarator = t.variableDeclarator(reference, expr.node);
        state.declarators = state.declarators || [];
        state.declarators.push(declarator);
        expr.replaceWith(reference);
      },
      Program: {
        enter(path, state) {
          state.programPath = path;
        },
        exit(path, state) {
          if (state.declarators) {
            const decl = t.variableDeclaration('const', state.declarators);
            path.node.body.unshift(decl);
          }
        },
      },
    },
  };
}
