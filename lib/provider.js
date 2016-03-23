"use strict";

var completions = require('../completions.json');

var packageName = 'atom-react-native-css';
var propertyNameWithColonPattern = /^\s*(\S+)\s*:/;
var propertyNamePrefixPattern = /[a-zA-Z]+[-a-zA-Z]*$/;

module.exports = {
    selector: '.source.css, .source.sass',
    disableForSelector: '.source.css .comment, .source.css .string, .source.sass .comment, .source.sass .string',
    filterSuggestions: true,
    getSuggestions: function(request) {
        var prefix = request.prefix,
            bufferPosition = request.bufferPosition,
            editor = request.editor,
            scopes = request.scopeDescriptor.getScopesArray(),
            line = editor.getTextInRange([
                [bufferPosition.row, 0], bufferPosition
            ]),
            isSass = this.hasScopeDescriptor(scopes, 'source.sass');

        if (this.isCompletingValue(prefix, scopes, bufferPosition, editor)) {
            return this.getPropertyValueCompletions(bufferPosition, editor)
        } else {
            if (isSass && this.isCompletingNameOrTag(prefix, scopes, bufferPosition, editor)) {
                return this.getPropertyNameCompletions(scopes, bufferPosition, editor, line, request);
            } else if (!isSass && this.isCompletingName(prefix, scopes, bufferPosition, editor)) {
                return this.getPropertyNameCompletions(scopes, bufferPosition, editor, line, request);
            }
        }
    },
    onDidInsertSuggestion: function(request) {
        if (request.suggestion.rightLabelHTML === 'react-native' && request.suggestion.type === 'property') {
            setTimeout(function() {
                atom.commands.dispatch(atom.views.getView(request.editor), 'autocomplete-plus:activate', {
                    activatedManually: false
                });
            }, 1);
        }
    },
    getValue: function(property, value) {
        if (property === 'resize-mode') {
            return '"JS(' + value + ')"';
        } else if (property.match(/shadow-offset|text-shadow-offset/)) {
            return '"JS({width: 0, height: 0})"';
        }
        return value;
    },
    getText: function(property, value) {
        if (property === 'resize-mode') {
            return value.split('.').pop();
        }
        return value;
    },
    getPreviousPropertyName: function(bufferPosition, editor) {
        var ref;
        var row = bufferPosition.row;

        while (row >= 0) {
            ref = propertyNameWithColonPattern.exec(editor.lineTextForBufferRow(row));
            if (ref) {
                return ref[1]
            }
            row--;
        }

        return null;
    },
    getPropertyValueCompletions: function(bufferPosition, editor) {
        var _completions = [],
            property = this.getPreviousPropertyName(bufferPosition, editor);

        if (property !== null && completions.values[property]) {
            var text;
            for (var i = 0; i < completions.values[property].length; i++) {
                text = completions.values[property][i];
                _completions.push({
                    type: 'value',
                    text: this.getValue(property, text),
                    displayText: this.getText(property, text),
                    rightLabelHTML: "react-native"
                });
            }
        }
        return _completions;
    },
    getPropertyNameCompletions: function(scopes, bufferPosition, editor, line, arg) {
        if (this.hasScopeDescriptor(scopes, ['source.sass']) && !line.match(/^(\s|\t)/)) {
            return [];
        }
        var prefix = this.getPropertyNamePrefix(bufferPosition, editor);
        if (!(arg.activatedManually || prefix)) {
            return [];
        }
        var _completions = [];
        for (var i = 0; i < completions.propertyName.length; i++) {
            _completions.push({
                type: 'property',
                text: completions.propertyName[i] + ": ",
                displayText: completions.propertyName[i],
                replacementPrefix: prefix,
                rightLabelHTML: "react-native"
            });
        }
        return _completions;
    },
    getPropertyNamePrefix: function(bufferPosition, editor) {
        var line, ref;
        line = editor.getTextInRange([
            [bufferPosition.row, 0], bufferPosition
        ]);
        return (ref = propertyNamePrefixPattern.exec(line)) != null ? ref[0] : void 0;
    },
    isPropertyNamePrefix: function(prefix) {
        if (prefix == null) {
            return false;
        }
        prefix = prefix.trim();
        return prefix.length > 0 && prefix.match(/^[a-zA-Z-]+$/);
    },
    isCompletingValue(prefix, scopes, bufferPosition, editor) {
        if (prefix.endsWith(';')) {
            return false;
        }
        if (this.hasScopeDescriptor(scopes, [/meta.property-value.(css|scss)/]) && !this.hasScopeDescriptor(scopes, [/punctuation.separator.key-value.(css|scss)/])) {
            return true;
        }
        var previousBufferPosition = [bufferPosition.row, Math.max(0, bufferPosition.column - prefix.length - 1)],
            previousScopes = editor.scopeDescriptorForBufferPosition(previousBufferPosition),
            previousScopesArray = previousScopes.getScopesArray();

        return this.hasScopeDescriptor(scopes, ['source.sass']) &&
            (this.hasScopeDescriptor(scopes, ['meta.property-value.sass']) || (!this.hasScopeDescriptor(previousScopesArray, "entity.name.tag.css.sass") && prefix.trim() === ":"));
    },
    isCompletingName: function(prefix, scopes, bufferPosition, editor) {
        var lineLength = editor.lineTextForBufferRow(bufferPosition.row).length,
            isAtTerminator = prefix.endsWith(';'),
            isAtParentSymbol = prefix.endsWith('&'),
            isInPropertyList = !isAtTerminator && this.hasScopeDescriptor(scopes, ['meta.property-list.css', 'meta.property-list.scss']);

        if (!isInPropertyList || isAtParentSymbol) {
            return false;
        }

        var previousBufferPosition = [bufferPosition.row, Math.max(0, bufferPosition.column - prefix.length - 1)],
            previousScopes = editor.scopeDescriptorForBufferPosition(previousBufferPosition),
            previousScopesArray = previousScopes.getScopesArray();

        if (this.hasScopeDescriptor(previousScopesArray, ['entity.other.attribute-name.class.css', 'entity.other.attribute-name.id.css', 'entity.other.attribute-name.id', 'entity.other.attribute-name.parent-selector.css', 'entity.name.tag.reference.scss', 'entity.name.tag.scss'])) {
            return false;
        }

        if (this.hasScopeDescriptor(scopes, ['punctuation.section.property-list.begin.css', 'punctuation.section.property-list.begin.scss'])) {
            return prefix.endsWith('{');
        } else if (this.hasScopeDescriptor(scopes, ['punctuation.section.property-list.end.css', 'punctuation.section.property-list.end.scss'])) {
            return !prefix.endsWith('}');
        } else {
            return true;
        }
    },
    isCompletingNameOrTag: function(prefix, scopes, bufferPosition, editor) {
        var prefix = this.getPropertyNamePrefix(bufferPosition, editor);
        return this.isPropertyNamePrefix(prefix) && this.hasScopeDescriptor(scopes, ['meta.selector.css']) && !this.hasScopeDescriptor(scopes, ['entity.other.attribute-name.id.css.sass']) && !this.hasScopeDescriptor(scopes, ['entity.other.attribute-name.class.sass']);
    },
    hasScopeDescriptor: function(fromScopes, toScopes) {
        var i, j, scope, text;
        for (i = 0; i < toScopes.length; i++) {
            scope = toScopes[i];
            if (typeof(scope) === 'string') {
                if (fromScopes.indexOf(scope) !== -1) {
                    return true;
                }
            } else {
                for (j = 0; j < fromScopes.length; j++) {
                    text = fromScopes[j];
                    if (scope.test(text)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
