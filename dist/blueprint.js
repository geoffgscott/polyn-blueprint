"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Node, or global
;

(function (root) {
  // eslint-disable-line no-extra-semi
  'use strict';

  var module = {
    factories: {}
  };
  Object.defineProperty(module, 'exports', {
    get: function get() {
      return null;
    },
    set: function set(val) {
      module.factories[val.name] = val.factory;
    },
    // this property should show up when this object's property names are enumerated
    enumerable: true,
    // this property may not be deleted
    configurable: false
  });
  module.exports = {
    name: 'blueprint',
    factory: function factory(is) {
      'use strict';

      var validators = {};

      var ValueOrError = function ValueOrError(input) {
        _classCallCheck(this, ValueOrError);

        this.err = input.err || null;
        this.value = is.defined(input.value) ? input.value : null;

        if (is.array(input.messages)) {
          this.messages = input.messages;
        } else if (input.err) {
          this.messages = [input.err.message];
        } else {
          this.messages = null;
        }

        Object.freeze(this);
      };

      var ValidationContext = function ValidationContext(input) {
        _classCallCheck(this, ValidationContext);

        this.key = input.key;
        this.value = input.value;
        this.input = input.input;
        this.root = input.root;
        this.schema = input.schema;
      };

      var Blueprint = function Blueprint(input) {
        _classCallCheck(this, Blueprint);

        this.name = input.name;
        this.schema = input.schema;
        this.validate = input.validate;
        Object.freeze(this);
      };
      /**
       * Makes a message factory that produces an error message on demand
       * @param {string} options.key - the property name
       * @param {any} options.value - the value being validated
       * @param {any} options.input - the object being validated
       * @param {any?} options.schema - the type definitions
       * @param {string?} options.type - the type this key should be
       */


      var makeDefaultErrorMessage = function makeDefaultErrorMessage(options) {
        return function () {
          options = options || {};
          var key = options.key;
          var value = Object.keys(options).includes('value') ? options.value : options.input && options.input[key];
          var actualType = is.getType(value);
          var expectedType = options.type || options.schema && options.schema[key];
          return "expected `".concat(key, "` {").concat(actualType, "} to be {").concat(expectedType, "}");
        };
      };
      /**
       * Support for ad-hoc polymorphism for `isValid` functions: they can throw,
       * return boolean, or return { isValid: 'boolean', value: 'any', message: 'string[]' }.
       * @curried
       * @param {function} isValid - the validation function
       * @param {ValidationContext} context - the validation context
       * @param {function} defaultMessageFactory - the default error message
       */


      var normalIsValid = function normalIsValid(isValid) {
        return function (context, defaultMessageFactory) {
          try {
            var result = isValid(context);

            if (is.boolean(result)) {
              return result ? new ValueOrError({
                value: context.value
              }) : new ValueOrError({
                err: new Error(defaultMessageFactory())
              });
            } else if (result) {
              return {
                err: result.err,
                value: result.value
              };
            } else {
              return new ValueOrError({
                err: new Error("ValidationError: the validator for `".concat(context.key, "` didn't return a value"))
              });
            }
          } catch (err) {
            return new ValueOrError({
              err: err
            });
          }
        };
      };
      /**
       * Validates the input values against the schema expectations
       * @curried
       * @param {string} name - the name of the model being validated
       * @param {object} schema - the type definitions
       * @param {object} input - the values being validated
       */


      var validate = function validate(name, schema) {
        return function (input, root) {
          var outcomes = Object.keys(schema).reduce(function (output, key) {
            var keyName = root ? "".concat(name, ".").concat(key) : key;

            if (is.object(schema[key])) {
              var child = validate("".concat(keyName), schema[key])(input[key], root || input);

              if (child.err) {
                output.validationErrors = output.validationErrors.concat(child.messages);
              }

              output.value[key] = child.value;
              return output;
            }

            var validator;

            if (is.function(schema[key])) {
              validator = normalIsValid(schema[key]);
            } else if (is.regexp(schema[key])) {
              validator = normalIsValid(validators.expression(schema[key]));
            } else {
              validator = validators[schema[key]];
            }

            if (is.not.function(validator)) {
              output.validationErrors.push("I don't know how to validate ".concat(schema[key]));
              return output;
            }

            var context = new ValidationContext({
              key: "".concat(keyName),
              value: input && input[key],
              input: input,
              root: root || input,
              schema: schema
            });
            var result = validator(context, makeDefaultErrorMessage(context));

            if (result && result.err) {
              output.validationErrors.push(result.err.message);
              return output;
            }

            output.value[key] = result ? result.value : input[key];
            return output;
          }, {
            validationErrors: [],
            value: {}
          });

          if (outcomes.validationErrors.length) {
            return new ValueOrError({
              err: new Error("Invalid ".concat(name, ": ").concat(outcomes.validationErrors.join(', '))),
              messages: outcomes.validationErrors
            });
          }

          return new ValueOrError({
            value: outcomes.value
          });
        };
      }; // /validate

      /**
      * Returns a validator (fluent interface) for validating the input values
      * against the schema expectations
      * @param {string} name - the name of the model being validated
      * @param {object} schema - the type definitions
      * @param {object} validate.input - the values being validated
      */


      var blueprint = function blueprint(name, schema) {
        if (is.not.string(name) || is.not.object(schema)) {
          throw new Error('blueprint requires a name {string}, and a schema {object}');
        }

        return new Blueprint({
          name: name,
          schema: schema,
          validate: validate(name, schema)
        });
      };
      /**
       * Registers a validator by name, so it can be used in blueprints
       * @param {string} name - the name of the validator
       * @param {function} validator - the validator
       */


      var registerValidator = function registerValidator(name, validator) {
        if (is.not.string(name) || is.not.function(validator)) {
          throw new Error('registerValidator requires a name {string}, and a validator {function}');
        }

        if (name === 'expression') {
          validators[name] = validator;
        } else {
          validators[name] = normalIsValid(validator);
        }

        return validator;
      }; // /registerValidator

      /**
       * Registers a validator, and a nullable validator by the given name, using
       * the given isValid function
       * @param {string} name - the name of the type
       * @param {function} isValid - the validator for testing one instance of this type (must return truthy/falsey)
       */


      var registerInstanceOfType = function registerInstanceOfType(name, isValid) {
        var test = normalIsValid(isValid);
        return [// required
        registerValidator(name, function (context) {
          var key = context.key;
          return test(context, makeDefaultErrorMessage({
            key: key,
            value: context.value,
            type: name
          }));
        }), // nullable
        registerValidator("".concat(name, "?"), function (context) {
          var key = context.key,
              value = context.value;

          if (is.nullOrUndefined(value)) {
            return {
              err: null,
              value: value
            };
          } else {
            return test(context, makeDefaultErrorMessage({
              key: key,
              value: context.value,
              type: name
            }));
          }
        })];
      };
      /**
       * Registers an array validator, and a nullable array validator by the given
       * name, using the given isValid function
       * @param {string} name - the name of the type
       * @param {function} isValid - the validator for testing one instance of this type (must return truthy/falsey)
       */


      var registerArrayOfType = function registerArrayOfType(instanceName, arrayName, isValid) {
        var test = normalIsValid(isValid);

        var validateMany = function validateMany(context, errorMessageFactory) {
          if (is.not.array(context.value)) {
            return {
              err: new Error(errorMessageFactory()),
              value: null
            };
          }

          var errors = [];
          var values = [];
          context.value.forEach(function (value, index) {
            var key = "".concat(context.key, "[").concat(index, "]");
            var result = test({
              key: key,
              value: value,
              input: context.input,
              root: context.root
            }, makeDefaultErrorMessage({
              key: key,
              value: value,
              type: instanceName
            }));

            if (result.err) {
              // make sure the array key[index] is in the error message
              var message = result.err.message.indexOf("[".concat(index, "]")) > -1 ? result.err.message : "(`".concat(key, "`) ").concat(result.err.message);
              return errors.push(message);
            }

            return values.push(result.value);
          });

          if (errors.length) {
            return {
              err: new Error(errors.join(', ')),
              value: null
            };
          }

          return {
            err: null,
            value: values
          };
        };

        return [// required
        registerValidator(arrayName, function (context) {
          var key = context.key;
          return validateMany(context, makeDefaultErrorMessage({
            key: key,
            value: context.value,
            type: arrayName
          }));
        }), // nullable
        registerValidator("".concat(arrayName, "?"), function (context) {
          var key = context.key,
              value = context.value;

          if (is.nullOrUndefined(value)) {
            return {
              err: null,
              value: value
            };
          } else {
            return validateMany(context, makeDefaultErrorMessage({
              key: key,
              value: context.value,
              type: arrayName
            }));
          }
        })];
      };
      /**
       * Registers a validator, a nullable validator, an array validator, and
       * a nullable array validator based on the given name, using the
       * given validator function
       * @param {string} name - the name of the type
       * @param {function} validator - the validator for testing one instance of this type (must return truthy/falsey)
       */


      var registerType = function registerType(name, validator) {
        if (is.not.string(name) || is.not.function(validator)) {
          throw new Error('registerType requires a name {string}, and a validator {function}');
        }

        registerInstanceOfType(name, validator);
        registerArrayOfType(name, "".concat(name, "[]"), validator);
        var output = {};
        output[name] = validators[name];
        output["".concat(name, "?")] = validators["".concat(name, "?")];
        output["".concat(name, "[]")] = validators["".concat(name, "[]")];
        output["".concat(name, "[]?")] = validators["".concat(name, "[]?")];
        return output;
      };
      /**
       * Registers a blueprint that can be used as a validator
       * @param {string} name - the name of the model being validated
       * @param {object} schema - the type definitions
       */


      var registerBlueprint = function registerBlueprint(name, schema) {
        var bp;

        if (schema && schema.schema) {
          // this must be an instance of a blueprint
          bp = blueprint(name, schema.schema);
        } else {
          bp = blueprint(name, schema);
        }

        if (bp.err) {
          throw bp.err;
        }

        var cleanMessage = function cleanMessage(message) {
          return message.replace("Invalid ".concat(bp.name, ": "), '');
        };

        registerType(bp.name, function (_ref) {
          var value = _ref.value;
          var result = bp.validate(value);

          if (result.err) {
            result.err.message = cleanMessage(result.err.message);
          }

          return result;
        });
        return bp;
      };
      /**
       * Registers a regular expression validator by name, so it can be used in blueprints
       * @param {string} name - the name of the validator
       * @param {string|RegExp} expression - the expression that will be  used to validate the values
       */


      var registerExpression = function registerExpression(name, expression) {
        if (is.not.string(name) || is.not.regexp(expression) && is.not.string(expression)) {
          throw new Error('registerExpression requires a name {string}, and an expression {expression}');
        }

        var regex = is.string(expression) ? new RegExp(expression) : expression;
        return registerType(name, function (_ref2) {
          var key = _ref2.key,
              value = _ref2.value;
          return regex.test(value) === true ? new ValueOrError({
            value: value
          }) : new ValueOrError({
            err: new Error("expected `".concat(key, "` to match ").concat(regex.toString()))
          });
        });
      };

      var getValidators = function getValidators() {
        return _objectSpread({}, validators);
      };

      var getValidator = function getValidator(name) {
        if (!validators[name]) {
          return;
        }

        return _objectSpread({}, validators[name]);
      };

      return {
        blueprint: blueprint,
        registerValidator: registerValidator,
        registerType: registerType,
        registerBlueprint: registerBlueprint,
        registerExpression: registerExpression,
        // below are undocumented / subject to breaking changes
        registerInstanceOfType: registerInstanceOfType,
        registerArrayOfType: registerArrayOfType,
        getValidators: getValidators,
        getValidator: getValidator
      };
    }
  };
  module.exports = {
    name: 'is',
    factory: function factory() {
      'use strict';

      var is = {
        getType: undefined,
        defined: undefined,
        nullOrUndefined: undefined,
        function: undefined,
        func: undefined,
        object: undefined,
        array: undefined,
        string: undefined,
        boolean: undefined,
        date: undefined,
        regexp: undefined,
        number: undefined,
        nullOrWhitespace: undefined,
        decimal: undefined,
        not: {
          defined: undefined,
          nullOrUndefined: undefined,
          function: undefined,
          func: undefined,
          object: undefined,
          array: undefined,
          string: undefined,
          boolean: undefined,
          date: undefined,
          regexp: undefined,
          number: undefined,
          nullOrWhitespace: undefined,
          decimal: undefined
        }
      };
      var class2Types = {};
      var class2ObjTypes = ['Boolean', 'Number', 'String', 'Function', 'Array', 'Date', 'RegExp', 'Object'];
      var name;

      for (var i = 0; i < class2ObjTypes.length; i += 1) {
        name = class2ObjTypes[i];
        class2Types['[object ' + name + ']'] = name.toLowerCase();
      }

      is.getType = function (obj) {
        if (typeof obj === 'undefined') {
          return 'undefined';
        }

        if (obj === null) {
          return String(obj);
        }

        return _typeof(obj) === 'object' || typeof obj === 'function' ? class2Types[Object.prototype.toString.call(obj)] || 'object' : _typeof(obj);
      };

      is.defined = function (obj) {
        try {
          return is.getType(obj) !== 'undefined';
        } catch (e) {
          return false;
        }
      };

      is.not.defined = function (obj) {
        return is.defined(obj) === false;
      };

      is.nullOrUndefined = function (obj) {
        return is.not.defined(obj) || obj === null;
      };

      is.not.nullOrUndefined = function (obj) {
        return is.nullOrUndefined(obj) === false;
      };

      is.not.nullOrWhitespace = function (str) {
        if (typeof str === 'undefined' || str === null) {
          return false;
        } else if (Array.isArray(str)) {
          return true;
        } // ([^\s]*) = is not whitespace
        // /^$|\s+/ = is empty or whitespace


        return /([^\s])/.test(str);
      };

      is.nullOrWhitespace = function (str) {
        return is.not.nullOrWhitespace(str) === false;
      };

      is.function = function (obj) {
        return is.getType(obj) === 'function';
      };

      is.func = is.function; // typescript support

      is.not.function = function (obj) {
        return is.function(obj) === false;
      };

      is.not.func = is.not.function; // typescript support

      is.object = function (obj) {
        return is.getType(obj) === 'object';
      };

      is.not.object = function (obj) {
        return is.object(obj) === false;
      };

      is.array = function (obj) {
        return is.getType(obj) === 'array';
      };

      is.not.array = function (obj) {
        return is.array(obj) === false;
      };

      is.string = function (obj) {
        return is.getType(obj) === 'string';
      };

      is.not.string = function (obj) {
        return is.string(obj) === false;
      };

      is.boolean = function (obj) {
        return is.getType(obj) === 'boolean';
      };

      is.not.boolean = function (obj) {
        return is.boolean(obj) === false;
      };

      is.date = function (obj) {
        return is.getType(obj) === 'date' && is.function(obj.getTime) && !isNaN(obj.getTime());
      };

      is.not.date = function (obj) {
        return is.date(obj) === false;
      };

      is.regexp = function (obj) {
        return is.getType(obj) === 'regexp';
      };

      is.not.regexp = function (obj) {
        return is.regexp(obj) === false;
      };

      is.number = function (obj) {
        return is.getType(obj) === 'number';
      };

      is.not.number = function (obj) {
        return is.number(obj) === false;
      };

      is.decimal = function (num, places) {
        if (is.not.number(num)) {
          return false;
        }

        if (!places && is.number(num)) {
          return true;
        }

        var padded = +(+num || 0).toFixed(20); // pad to the right for whole numbers

        return padded.toFixed(places) === "".concat(+num);
      };

      is.not.decimal = function (val, places) {
        return is.decimal(val, places) === false;
      };

      return is;
    }
  };
  module.exports = {
    name: 'numberValidators',
    factory: function factory(is) {
      'use strict';

      var makeErrorMessage = function makeErrorMessage(options) {
        return "expected `".concat(options.key, "` to be ").concat(options.comparator, " ").concat(options.boundary);
      };

      var gt = function gt(min) {
        if (is.not.number(min)) {
          throw new Error('gt requires a minimum number to compare values to');
        }

        return function (_ref3) {
          var key = _ref3.key,
              value = _ref3.value;

          if (is.number(value) && value > min) {
            return {
              err: null,
              value: value
            };
          }

          return {
            err: new Error(makeErrorMessage({
              key: key,
              comparator: 'greater than',
              boundary: min
            })),
            value: null
          };
        };
      };

      var gte = function gte(min) {
        if (is.not.number(min)) {
          throw new Error('gte requires a minimum number to compare values to');
        }

        return function (_ref4) {
          var key = _ref4.key,
              value = _ref4.value;

          if (is.number(value) && value >= min) {
            return {
              err: null,
              value: value
            };
          }

          return {
            err: new Error(makeErrorMessage({
              key: key,
              comparator: 'greater than, or equal to',
              boundary: min
            })),
            value: null
          };
        };
      };

      var lt = function lt(max) {
        if (is.not.number(max)) {
          throw new Error('lt requires a maximum number to compare values to');
        }

        return function (_ref5) {
          var key = _ref5.key,
              value = _ref5.value;

          if (is.number(value) && value < max) {
            return {
              err: null,
              value: value
            };
          }

          return {
            err: new Error(makeErrorMessage({
              key: key,
              comparator: 'less than',
              boundary: max
            })),
            value: null
          };
        };
      };

      var lte = function lte(max) {
        if (is.not.number(max)) {
          throw new Error('lte requires a maximum number to compare values to');
        }

        return function (_ref6) {
          var key = _ref6.key,
              value = _ref6.value;

          if (is.number(value) && value <= max) {
            return {
              err: null,
              value: value
            };
          }

          return {
            err: new Error(makeErrorMessage({
              key: key,
              comparator: 'less than, or equal to',
              boundary: max
            })),
            value: null
          };
        };
      };

      var range = function range(options) {
        if (!options) {
          throw new Error('You must specify a range');
        } else if (is.not.number(options.gt) && is.not.number(options.gte)) {
          throw new Error('You must specify `gt`, or `gte` {number} when defining a range');
        } else if (is.not.number(options.lt) && is.not.number(options.lte)) {
          throw new Error('You must specify `lt`, or `lte` {number} when defining a range');
        }

        var gtExpression = options.gt ? gt(options.gt) : gte(options.gte);
        var ltExpression = options.lt ? lt(options.lt) : lte(options.lte);
        return function (input) {
          var ltOutcome = ltExpression(input);

          if (ltOutcome.err) {
            return ltOutcome;
          }

          return gtExpression(input);
        };
      };

      var optional = function optional(comparator) {
        return function (input) {
          var validator = comparator(input);
          return function (context) {
            var value = context.value;

            if (is.nullOrUndefined(value)) {
              return {
                err: null,
                value: value
              };
            } else {
              return validator(context);
            }
          };
        };
      };

      return {
        gt: gt,
        gte: gte,
        lt: lt,
        lte: lte,
        range: range,
        optional: {
          gt: optional(gt),
          gte: optional(gte),
          lt: optional(lt),
          lte: optional(lte),
          range: optional(range)
        }
      };
    }
  };
  module.exports = {
    name: 'registerCommonTypes',
    factory: function factory(is, Blueprint) {
      'use strict';

      var registerType = Blueprint.registerType;
      var types = ['function', 'object', 'array', 'boolean', 'date', 'number', 'decimal', 'regexp' // 'string' registered separately, below
      ];

      var errorMessage = function errorMessage(type) {
        return function (key, value) {
          return "expected `".concat(key, "` {").concat(is.getType(value), "} to be {").concat(type, "}");
        };
      };

      types.forEach(function (type) {
        registerType(type, function (_ref7) {
          var key = _ref7.key,
              value = _ref7.value;
          return is[type](value) ? {
            err: null,
            value: value
          } : {
            err: new Error(errorMessage(type)(key, value)),
            value: null
          };
        });
      });
      registerType('string', function (_ref8) {
        var key = _ref8.key,
            value = _ref8.value;
        return is.string(value) ? {
          err: null,
          value: value.trim()
        } : {
          err: new Error(errorMessage('string')(key, value)),
          value: null
        };
      });
      registerType('any', function (_ref9) {
        var key = _ref9.key,
            value = _ref9.value;
        return is.not.nullOrUndefined(value) ? {
          err: null,
          value: value
        } : {
          err: new Error(errorMessage('any')(key, value)),
          value: null
        };
      });
    }
  };
  module.exports = {
    name: 'registerDecimals',
    factory: function factory(is, Blueprint) {
      'use strict';

      var registerValidator = Blueprint.registerValidator; // support up to 15 decimal places for decimal precision

      var _loop = function _loop(i) {
        registerValidator("decimal:".concat(i), function (_ref10) {
          var key = _ref10.key,
              value = _ref10.value;
          return is.decimal(value, i) ? {
            err: null,
            value: value
          } : {
            err: new Error("expected `".concat(key, "` to be a {decimal} with ").concat(i, " places")),
            value: null
          };
        });
        registerValidator("decimal:".concat(i, "?"), function (_ref11) {
          var key = _ref11.key,
              value = _ref11.value;

          if (is.nullOrUndefined(value)) {
            return {
              err: null,
              value: value
            };
          } else if (is.decimal(value, i)) {
            return {
              err: null,
              value: value
            };
          } else {
            return {
              err: new Error("expected `".concat(key, "` to be a {decimal} with ").concat(i, " places")),
              value: null
            };
          }
        });
      };

      for (var i = 1; i <= 15; i += 1) {
        _loop(i);
      }
    }
  };
  module.exports = {
    name: 'registerExpressions',
    factory: function factory(Blueprint) {
      'use strict';

      var registerValidator = Blueprint.registerValidator;
      registerValidator('expression', function (regex) {
        return function (_ref12) {
          var key = _ref12.key,
              value = _ref12.value;
          return regex.test(value) === true ? {
            value: value
          } : {
            err: new Error("expected `".concat(key, "` to match ").concat(regex.toString()))
          };
        };
      });
    }
  };
  var is = module.factories.is();
  var blueprint = Object.assign({
    is: is
  }, module.factories.numberValidators(is), module.factories.blueprint(is));
  root.polyn = root.polyn || {};
  root.polyn.blueprint = Object.freeze(blueprint);
  module.factories.registerCommonTypes(is, root.polyn.blueprint);
  module.factories.registerDecimals(is, root.polyn.blueprint);
  module.factories.registerExpressions(root.polyn.blueprint); // we don't need these anymore

  delete module.factories;
})(window);