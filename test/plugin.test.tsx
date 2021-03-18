import plugin from '../src';
import pluginTester from 'babel-plugin-tester';

pluginTester({
  plugin,
  pluginName: 'hoist-constant-jsx-attributes',
  tests: {
    'hoists a style object attribute from a component': {
      code: `const Component = () => <div style={{ color: 'red', fontSize: 14 }}>Text</div>;`,
      output: `
      const _style = { color: 'red', fontSize: 14 };
      const Component = () => <div style={_style}>Text</div>;`,
    },
    'hoists an object attribute regardless of naming': {
      code: `const Hondo = () => <Quux zzyzx={{ foo: 'FOO' }}>Text</Quux>;`,
      output: `
      const _zzyzx = { foo: 'FOO' };
      const Hondo = () => <Quux zzyzx={_zzyzx}>Text</Quux>;`,
    },
    'hoists nested constant objects': {
      code: `const Component = () => <Bee attr={{ foo: { bar: 'baz' }}} />;`,
      output: `
      const _attr = { foo: { bar: 'baz' } };
      const Component = () => <Bee attr={_attr} />;`,
    },
    'hoists nested constant arrays': {
      code: `const Component = () => <Bee attr={{ foo: ['bar', 'baz'] }} />`,
      output: `
      const _attr = { foo: ['bar', 'baz'] };
      const Component = () => <Bee attr={_attr} />;`,
    },
    'hoists constant template literals in objects': {
      code: `const Component = () => <Bee attr={{ foo: \`\${4}px\` }} />`,
      output: `
      const _attr = { foo: \`\${4}px\` };
      const Component = () => <Bee attr={_attr} />;`,
    },
    'hoists constant negative numbers in objects': {
      code: `const Component = () => <Bee attr={{ foo: -4.0 }} />`,
      output: `
      const _attr = { foo: -4.0 };
      const Component = () => <Bee attr={_attr} />;`,
    },
    'hoists an array': {
      code: `const Component = () => <Bee attr={['a', 5, {}]} />`,
      output: `
      const _attr = ['a', 5, {}];
      const Component = () => <Bee attr={_attr} />;`,
    },
    'hoists multiple object attributes': {
      code: `const Component = () => <a b={{ c: 'c' }} d={{ e: 'e' }} f={{ g: 'g' }} />`,
      output: `
      const _b = { c: 'c' },
        _d = { e: 'e' },
        _f = { g: 'g' };
      const Component = () => <a b={_b} d={_d} f={_f} />;`,
    },
    'hoists attributes of multiple components': {
      code: `const Component = () => <A a={{ a: 'a' }}><B b={{ b: 'b' }} /></A>`,
      output: `
      const _a = { a: 'a' },
        _b = { b: 'b' };
      const Component = () => (
        <A a={_a}>
          <B b={_b} />
        </A>
      );`,
    },
    'hoists attributes of multiple components, handling conflicts': {
      code: `const Component = () => <A a={{ a: 'a' }}><B a={{ a: 'b' }} b={{ b: 'b' }} /></A>`,
      output: `
      const _a = { a: 'a' },
        _a2 = { a: 'b' },
        _b = { b: 'b' };
      const Component = () => (
        <A a={_a}>
          <B a={_a2} b={_b} />
        </A>
      );`,
    },
    'hoists object attributes in function components': {
      code: `
      function Component() {
        return <Plex style={{ 'line-height': 5 }} />;
      }`,
      output: `
      const _style = { 'line-height': 5 };
      function Component() {
        return <Plex style={_style} />;
      }`,
    },
    'hoists object attributes in object method': {
      code: `
      const obj = {
        render() {
          return <Plex style={{ 'line-height': 5 }} />;
        }
      };`,
      output: `
      const _style = { 'line-height': 5 };
      const obj = {
        render() {
          return <Plex style={_style} />;
        },
      };`,
    },
    'hoists object attributes in class method': {
      code: `
      class Class {
        render() {
          return <Plex style={{ 'line-height': 5 }} />;
        }
      }`,
      output: `
      const _style = { 'line-height': 5 };
      class Class {
        render() {
          return <Plex style={_style} />;
        }
      }`,
    },
    'does nothing for an attribute that is not an object': {
      code: `const Component = () => <div attribute={'string'}>Text</div>;`,
    },
    'does nothing for an element that is not wrapped in a function': {
      code: `const element = <div style={{ color: 'red' }}>Text</div>;`,
    },
    'does nothing for a string-valued attribute': {
      code: `const Component = () => <button type="submit">Text</button>;`,
    },
    'does nothing for an object attribute that references a variable': {
      code: `const Component = () => <div style={{ color: divColor }}>Text</div>;`,
    },
    "hoists object attributes for an unwrapped element if 'alwaysHoist' is set to true": {
      pluginOptions: {
        alwaysHoist: true,
      },
      code: `const element = <div style={{ color: 'red' }}>Text</div>;`,
      output: `
      const _style = { color: 'red' };
      const element = <div style={_style}>Text</div>;`,
    },
    "doesn't break anything if 'alwaysHoist' is set to true": {
      pluginOptions: {
        alwaysHoist: true,
      },
      code: `const Component = () => <div style={{ color: 'red', fontSize: 14 }}>Text</div>;`,
      output: `
      const _style = { color: 'red', fontSize: 14 };
      const Component = () => <div style={_style}>Text</div>;`,
    },
    "hoists attributes on lowercase JSX elements if 'lowerCaseOnly' is set to true": {
      pluginOptions: {
        lowerCaseOnly: true,
      },
      code: `const Component = () => <div style={{ color: 'red', fontSize: 14 }}>Text</div>;`,
      output: `
      const _style = { color: 'red', fontSize: 14 };
      const Component = () => <div style={_style}>Text</div>;`,
    },
    "doesn't run on uppercase JSX elements if 'lowerCaseOnly' is set to true": {
      pluginOptions: {
        lowerCaseOnly: true,
      },
      code: `const Component = () => <Box style={{ color: 'red', fontSize: 14 }}>Text</Box>;`,
    },
    "hoists only matching elements when 'include' is set to a Regex": {
      pluginOptions: {
        include: /^[BD]$/,
      },
      code: `const Component = () => <><A a={{}} /><B b={{}} /><C c={{}} /><D d={{}} /></>;`,
      output: `
      const _b = {},
        _d = {};
      const Component = () => (
        <>
          <A a={{}} />
          <B b={_b} />
          <C c={{}} />
          <D d={_d} />
        </>
      );`,
    },
    "hoists all but matching elements when 'exclude' is set to a Regex": {
      pluginOptions: {
        exclude: /^[BD]$/,
      },
      code: `const Component = () => <><A a={{}} /><B b={{}} /><C c={{}} /><D d={{}} /></>;`,
      output: `
      const _a = {},
        _c = {};
      const Component = () => (
        <>
          <A a={_a} />
          <B b={{}} />
          <C c={_c} />
          <D d={{}} />
        </>
      );`,
    },
    "hoists only micromatching elements when 'include' is set to a string": {
      pluginOptions: {
        include: '(B|D)',
      },
      code: `const Component = () => <><A a={{}} /><B b={{}} /><C c={{}} /><D d={{}} /></>;`,
      output: `
      const _b = {},
        _d = {};
      const Component = () => (
        <>
          <A a={{}} />
          <B b={_b} />
          <C c={{}} />
          <D d={_d} />
        </>
      );`,
    },
    "hoists all but micromatching elements when 'exclude' is set to a string": {
      pluginOptions: {
        exclude: '(B|D)',
      },
      code: `const Component = () => <><A a={{}} /><B b={{}} /><C c={{}} /><D d={{}} /></>;`,
      output: `
      const _a = {},
        _c = {};
      const Component = () => (
        <>
          <A a={_a} />
          <B b={{}} />
          <C c={_c} />
          <D d={{}} />
        </>
      );`,
    },
    "handles mixing 'include' and 'exclude' with Regexes": {
      pluginOptions: {
        include: /^[AB]$/,
        exclude: /^[BC]$/,
      },
      code: `const Component = () => <><A a={{}} /><B b={{}} /><C c={{}} /><D d={{}} /></>;`,
      output: `
      const _a = {};
      const Component = () => (
        <>
          <A a={_a} />
          <B b={{}} />
          <C c={{}} />
          <D d={{}} />
        </>
      );`,
    },
    "handles mixing 'include' and 'exclude' with strings": {
      pluginOptions: {
        include: '(A|B)',
        exclude: '(B|C)',
      },
      code: `const Component = () => <><A a={{}} /><B b={{}} /><C c={{}} /><D d={{}} /></>;`,
      output: `
      const _a = {};
      const Component = () => (
        <>
          <A a={_a} />
          <B b={{}} />
          <C c={{}} />
          <D d={{}} />
        </>
      );`,
    },
    "handles mixing 'include' and 'lowerCaseOnly'": {
      pluginOptions: {
        include: /^[Aa]$/,
        lowerCaseOnly: true,
      },
      code: `const Component = () => <><a attr={{}} /><b attr={{}} /><A attr={{}} /></>;`,
      output: `
      const _attr = {};
      const Component = () => (
        <>
          <a attr={_attr} />
          <b attr={{}} />
          <A attr={{}} />
        </>
      );`,
    },
    "hoists only matching attributes when 'includeAttributes' is set to a Regex": {
      pluginOptions: {
        includeAttributes: /^[bd]$/,
      },
      code: `const Component = () => <A b={{ c: 'c' }} d={{ e: 'e' }} f={{ g: 'g' }} />`,
      output: `
      const _b = { c: 'c' },
        _d = { e: 'e' };
      const Component = () => <A b={_b} d={_d} f={{ g: 'g' }} />;`,
    },
    "hoists all but matching attributes when 'excludeAttributes' is set to a Regex": {
      pluginOptions: {
        excludeAttributes: /^[bd]$/,
      },
      code: `const Component = () => <A b={{ c: 'c' }} d={{ e: 'e' }} f={{ g: 'g' }} />`,
      output: `
      const _f = { g: 'g' };
      const Component = () => <A b={{ c: 'c' }} d={{ e: 'e' }} f={_f} />;`,
    },
    "hoists only micromatching attributes when 'includeAttributes' is set to a string": {
      pluginOptions: {
        includeAttributes: '(b|d)',
      },
      code: `const Component = () => <A b={{ c: 'c' }} d={{ e: 'e' }} f={{ g: 'g' }} />`,
      output: `
      const _b = { c: 'c' },
        _d = { e: 'e' };
      const Component = () => <A b={_b} d={_d} f={{ g: 'g' }} />;`,
    },
    "hoists all but micromatching attributes when 'excludeAttributes' is set to a string": {
      pluginOptions: {
        excludeAttributes: '(b|d)',
      },
      code: `const Component = () => <A b={{ c: 'c' }} d={{ e: 'e' }} f={{ g: 'g' }} />`,
      output: `
      const _f = { g: 'g' };
      const Component = () => <A b={{ c: 'c' }} d={{ e: 'e' }} f={_f} />;`,
    },
    "handles mixing 'includeAttributes' and 'excludeAttributes' with Regexes": {
      pluginOptions: {
        includeAttributes: /^[df]$/,
        excludeAttributes: /^[bd]$/,
      },
      code: `const Component = () => <A b={{ c: 'c' }} d={{ e: 'e' }} f={{ g: 'g' }} h={{ i: 'i' }} />;`,
      output: `
      const _f = { g: 'g' };
      const Component = () => (
        <A b={{ c: 'c' }} d={{ e: 'e' }} f={_f} h={{ i: 'i' }} />
      );`,
    },
    "handles mixing 'includeAttributes' and 'excludeAttributes' with strings": {
      pluginOptions: {
        includeAttributes: '(d|f)',
        excludeAttributes: '(b|d)',
      },
      code: `const Component = () => (
        <A b={{ c: 'c' }} d={{ e: 'e' }} f={{ g: 'g' }} h={{ i: 'i' }} />
      )`,
      output: `
      const _f = { g: 'g' };
      const Component = () => (
        <A b={{ c: 'c' }} d={{ e: 'e' }} f={_f} h={{ i: 'i' }} />
      );`,
    },
    "handles mixing 'include' and 'includeAttributes'": {
      pluginOptions: {
        include: 'A',
        includeAttributes: 'a',
      },
      code: `const Component = () => <><A a={{}} b={{}} /><B a={{}} b={{}} /></>;`,
      output: `
      const _a = {};
      const Component = () => (
        <>
          <A a={_a} b={{}} />
          <B a={{}} b={{}} />
        </>
      );`,
    },
    "deep freezes objects only in development is 'freezeObjects' is set to 'development'": {
      pluginOptions: {
        freezeObjects: 'development',
      },
      code: `const Component = () => <a b={{ c: 'c' }} d={['e', 'f']} g={\`he\${"ll"}o\`} />`,
      output: `
      const _deepFreeze = (object) => {
        Object.getOwnPropertyNames(object).forEach((name) => {
          const value = object[name];
          if (value && typeof value === 'object') {
            /*#__PURE__*/ _deepFreeze(value);
          }
        });
        return Object.freeze(object);
      };
      const _b =
          process.env.NODE_ENV === 'development'
            ? /*#__PURE__*/ _deepFreeze({ c: 'c' })
            : { c: 'c' },
        _d =
          process.env.NODE_ENV === 'development'
            ? _deepFreeze(['e', 'f'])
            : ['e', 'f'],
        _g = \`he\${'ll'}o\`;
      const Component = () => <a b={_b} d={_d} g={_g} />;`,
    },
    "deep freezes objects unconditionally when is 'freezeObjects' is set to 'always'": {
      pluginOptions: {
        freezeObjects: 'always',
      },
      code: `const Component = () => <a b={{ c: 'c' }} d={['e', 'f']} g={\`he\${"ll"}o\`} />`,
      output: `
      const _deepFreeze = (object) => {
        Object.getOwnPropertyNames(object).forEach((name) => {
          const value = object[name];
          if (value && typeof value === 'object') {
            /*#__PURE__*/ _deepFreeze(value);
          }
        });
        return Object.freeze(object);
      };
      const _b = /*#__PURE__*/ _deepFreeze({ c: 'c' }),
        _d = _deepFreeze(['e', 'f']),
        _g = \`he\${'ll'}o\`;
      const Component = () => <a b={_b} d={_d} g={_g} />;`,
    },
  },
  babelOptions: {
    plugins: ['@babel/plugin-syntax-jsx'],
    compact: true,
  },
});
