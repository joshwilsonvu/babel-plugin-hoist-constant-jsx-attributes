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
    "hoists only matching attributes when 'include' is set to a Regex": {
      pluginOptions: {
        include: /^[bd]$/,
      },
      code: `const Component = () => <a b={{ c: 'c' }} d={{ e: 'e' }} f={{ g: 'g' }} />`,
      output: `
      const _b = { c: 'c' },
        _d = { e: 'e' };
      const Component = () => <a b={_b} d={_d} f={{ g: 'g' }} />;`,
    },
    "hoists all but matching attributes when 'exclude' is set to a Regex": {
      pluginOptions: {
        exclude: /^[bd]$/,
      },
      code: `const Component = () => <a b={{ c: 'c' }} d={{ e: 'e' }} f={{ g: 'g' }} />`,
      output: `
      const _f = { g: 'g' };
      const Component = () => <a b={{ c: 'c' }} d={{ e: 'e' }} f={_f} />;`,
    },
    "hoists only micromatching attributes when 'include' is set to a string": {
      pluginOptions: {
        include: '(b|d)',
      },
      code: `const Component = () => <a b={{ c: 'c' }} d={{ e: 'e' }} f={{ g: 'g' }} />`,
      output: `
      const _b = { c: 'c' },
        _d = { e: 'e' };
      const Component = () => <a b={_b} d={_d} f={{ g: 'g' }} />;`,
    },
    "hoists all but micromatching attributes when 'exclude' is set to a string": {
      pluginOptions: {
        exclude: '(b|d)',
      },
      code: `const Component = () => <a b={{ c: 'c' }} d={{ e: 'e' }} f={{ g: 'g' }} />`,
      output: `
      const _f = { g: 'g' };
      const Component = () => <a b={{ c: 'c' }} d={{ e: 'e' }} f={_f} />;`,
    },
    "handles mixing 'include' and 'exclude' with Regexes": {
      pluginOptions: {
        include: /^[df]$/,
        exclude: /^[bd]$/,
      },
      code: `const Component = () => (
        <a b={{ c: 'c' }} d={{ e: 'e' }} f={{ g: 'g' }} h={{ i: 'i' }} />
      )`,
      output: `
      const _f = { g: 'g' };
      const Component = () => (
        <a b={{ c: 'c' }} d={{ e: 'e' }} f={_f} h={{ i: 'i' }} />
      );`,
    },
    "handles mixing 'include' and 'exclude' with strings": {
      pluginOptions: {
        include: '(d|f)',
        exclude: '(b|d)',
      },
      code: `const Component = () => (
        <a b={{ c: 'c' }} d={{ e: 'e' }} f={{ g: 'g' }} h={{ i: 'i' }} />
      )`,
      output: `
      const _f = { g: 'g' };
      const Component = () => (
        <a b={{ c: 'c' }} d={{ e: 'e' }} f={_f} h={{ i: 'i' }} />
      );`,
    },
  },
  babelOptions: {
    plugins: ['@babel/plugin-syntax-jsx'],
    compact: true,
  },
});