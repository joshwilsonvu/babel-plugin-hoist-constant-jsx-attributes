# babel-plugin-hoist-constant-jsx-attributes

![Version](https://img.shields.io/github/package-json/v/joshwilsonvu/babel-plugin-hoist-constant-jsx-attributes)
![NPM Version](https://img.shields.io/npm/v/babel-plugin-hoist-constant-jsx-attributes)
![License](https://img.shields.io/github/license/joshwilsonvu/babel-plugin-hoist-constant-jsx-attributes)
![Build Status](https://img.shields.io/github/workflow/status/joshwilsonvu/babel-plugin-hoist-constant-jsx-attributes/CI)
![Supported Node Version](https://img.shields.io/node/v/babel-plugin-hoist-constant-jsx-attributes)

This plugin can reduce React rerenders and garbage collection pressure by pulling
constant object attribute values (like `style={{ color: 'red' }}`) out of functions 
and into the highest possible scope. This means the objects will only get allocated once,
and they will keep the same identity across renders. 

Objects are only pulled out if they are plain old data and don't reference any 
variables, so more dynamic use cases will still work as written.

## Example

**In**

```js
const Component = () => <div style={{ color: 'red', fontSize: 14 }}>Text</div>;
```

**Out**

```js
const _style = { color: 'red', fontSize: 14 };
const Component = () => <div style={_style}>Text</div>;
```

## Options

### `include`

`RegExp`, or `string` to be matched with [`micromatch`](https://github.com/micromatch/micromatch)

Only hoist attribute values if the *element* name matches.

### `exclude`

`RegExp`, or `string` to be matched with [`micromatch`](https://github.com/micromatch/micromatch)

Only hoist attributes values if the *element* name does not match.

### `includeAttributes`

`RegExp`, or `string` to be matched with [`micromatch`](https://github.com/micromatch/micromatch)

Only hoist attribute values if the *attribute* name matches.

### `excludeAttributes`

`RegExp`, or `string` to be matched with [`micromatch`](https://github.com/micromatch/micromatch)

Only hoist attributes values if the *attribute* name does not match.

### `lowerCaseOnly`

`boolean`, defaults to `false`

Only hoist object attribute values on primitive elements like `div` and `button`.

### `freezeObjects`

`false`, `'development'`, or `'always'`, defaults to `false`.

If set to `'development'`, check at runtime to see if `process.env.NODE_ENV === 'development'`,
and if so deeply freeze hoisted objects. If set to `'always'`, deeply
freeze hoisted objects unconditionally.

Use this option for extra safety if you want to ensure that the attribute values 
are never mutated. If there is an attempt to mutate a hoisted attribute value, an
exception will be thrown. Slightly increases the compiled code size.

## Note

The React team considers this transformation unsafe to run by default, because it 
*is* possible to rely on object attribute values to have different identities every 
render. See [this GitHub issue](https://github.com/facebook/react/issues/3226) 
for more information. 

*However*, the vast majority of cases will benefit from this transformation. The
main reason they consider it unsafe is precisely because it can reduce the number
of times a component rerenders, which is likely to be what you want. Unless you were
to intentionally tinker with object referential equality, or mutate received `props`
—and you would know if you were—this transformation will be safe.

Still, to be extra careful, you can set the `lowerCaseOnly` plugin option to `true`.
You can also set the `freezeObjects` plugin option to `'development'` or `'always'`
to receive an error if a component tries to mutate its `props`.