/**
 * @file ViewModel构造函数
 *
 * @author CK
 *
 * @desc 处理easyui组件与vue之前的兼容性，工作内容主要包括：
 *      1. 处理combobox textbox searchbox组件的数据双向绑定；
 *      2. 处理v-if指令显示时，内部eaysui组件没有解析的问题；
 * 说明：
 *      1. combo组件开发不完善，在项目中使用情况少，
 *              且combo组件调用setValue后，组件无法自己更新text，故没做数据双向绑定
 */

'use strict';

var vue = require('vue');

function init() {
    rewriteVueIf();
    rewriteUIsetValue();
    handlerInputEvt();
}

/**
 * 重写vue的v-if指令，处理展示时解析easyui组件
 */
function rewriteVueIf() {
    var insert = vue.options.directives.if.insert;
    vue.options.directives.if.insert = function (value) {
        if (this.el.parentNode !== null) {
            $.parser.parse(this.el.parentNode);     // v-if 不显示的dom放在documentfragment节点中
        }
        insert.call(this);
    };
}

/**
 * 处理combo和combobox组件，由view->data的绑定
 *
 */
function rewriteUIsetValue() {
    var updateVmodel = function (jq, value) {
        jq.each(function () {
            if (this.__v_model) {
                var ns = this.__v_model.expression.split('.');
                var base = this.__v_model.vm.$data;
                var key = ns[ns.length - 1];
                for (var i = 0; i < ns.length - 1; i++) {
                    base = base[ns[i]];
                }
                if ($.isArray(value)) {
                    if (!$.isArray(base[key]) && value.length === 1) {
                        base[key] = value[0];
                    }
                    else if (!isEqualArr(value, base[key])) {
                        base[key] = value;
                    }
                }
                else {
                    if (base[key] !== value) {
                        base[key] = value;
                    }
                }
            }
        });
    };
    var comboboxSetValue = $.fn.combobox.methods.setValue;
    $.fn.combobox.methods.setValue = function (jq, value) {
        updateVmodel.call(this, jq, value);
        comboboxSetValue.call(this, jq, value);
    };
    var comboboxSetValues = $.fn.combobox.methods.setValues;
    $.fn.combobox.methods.setValues = function (jq, value) {
        updateVmodel.call(this, jq, value);
        comboboxSetValues.call(this, jq, value);
    };
    var comboSetValue = $.fn.combo.methods.setValue;
    $.fn.combo.methods.setValue = function (jq, value) {
        updateVmodel.call(this, jq, value);
        comboSetValue.call(this, jq, value);
    };
    var comboSetValues = $.fn.combo.methods.setValues;
    $.fn.combo.methods.setValues = function (jq, value) {
        updateVmodel.call(this, jq, value);
        comboSetValues.call(this, jq, value);
    };
}

/**
 * 监听input事件，处理input标签由view->data的绑定
 *
 */
function handlerInputEvt() {
    var onInputFn = function (evt) {
        var target = $(evt.target).parent().prev();
        if (target.length > 0 && target[0].__v_model) {
            var vmode = target[0].__v_model;
            var ns = vmode.expression.split('.');
            var base = vmode.vm.$data;
            var key = ns[ns.length - 1];
            for (var i = 0; i < ns.length - 1; i++) {
                base = base[ns[i]];
            }
            base[key] = evt.target.value;
        }
    };
    $(document.body).on('input', onInputFn);
}

/**
 * 判断两个数组内容是否相同，不包括复杂对象
 *
 * @param {Array} arr1 数组对象1
 * @param {Array} arr2 数组对象2
 *
 * @return {boolean} 内容是否完全相同
 */
function isEqualArr(arr1, arr2) {
    if (!$.isArray(arr1) || !$.isArray(arr2) || arr1.length !== arr2.length) {
        return false;
    }
    for (var i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}

/**
 * vue组件ready时，解析easyui组件
 * 同时处理combobox textbox searchbox三个组件由data->view的绑定
 */
function onComponentReady() {
    var content = this.$el;
    // v-if 组件中，内容不存在dom结构中，存在于#comment标签中
    if (this.$el.nodeName === '#comment') {
        content = this.$el.parentElement;
    }

    // 处理组件data->view的绑定
    var doms = $('.easyui-combobox, .easyui-textbox, .easyui-searchbox', content);
    doms.each(function (index, item) {
        if (item.__v_model) {
            // var update = item.__v_model.update;
            item.__v_model.update = function (value) {
                var reg = /easyui-(\w+)/;
                var result = item.className.match(reg);
                if (result && result.length > 1) {
                    var key = result[1];
                    var oldValue;
                    var $item = $(item);
                    if ($item.next().children()[0].value === value) {
                        return;
                    }
                    if ($.isArray(value)) {
                        oldValue = $item[key]('getValues');
                        if (!isEqualArr(value, oldValue)) {
                            $item[key]('setValues', value);
                        }
                    }
                    else {
                        oldValue = $item[key]('getValue');
                        if (String(value) !== oldValue) {
                            $item[key]('setValue', value);
                        }
                    }
                }
                // update.call(this, value);
            };
        }
    });

    // 解析 easyui
    $.parser.parse(content);

    if (this.$root && this.$root.$children.length > 0 && this.$root.$children[0].$el === this.$el) {
        if (typeof this.$el.hasAttribute === 'function') {
            if (!this.$el.hasAttribute('data-transition')) {
                this.$root.$emit('allCompRady');
            }
        }
        else {
            this.$root.$emit('allCompRady');
        }
    }
}

function getComponent(options) {
    options.ready = options.ready ? [options.ready] : [];
    options.ready.unshift(onComponentReady);

    return vue.extend(options);
}

/**
 * 页面切换时删除无用DOM，注意全局router对象
 */
if (window.router) {
    var router = window.router;
    router.beforeEach(function (transition) {
        var childs = $(document.body).children('div');
        childs.each(function (index, item) {
            if (item === router.app.$el) {
                childs.splice(index, 1);
            }
        });
        childs.remove();

        transition.next();
    });
}

// just for debug
window.vue = vue;

init();

module.exports = {
    getComponent: getComponent
};
