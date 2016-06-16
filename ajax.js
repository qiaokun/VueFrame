/**
 * @file ajax扩展
 *
 * @author CK
 */

var $ = require('jquery');
var vue = require('vue');

$.extend({

    /**
     * 默认的请求函数
     *
     * @param  {string} path 请求路径
     * @param  {Object} params 请求参数
     * @return {Object} 返回请求的promise对象
     */
    request: function (path, params) {
        var deferred = new $.Deferred();
        var requestParams = $.extend(true, {
            url: path,
            data: {},
            type: 'GET',
            dataType: 'json'
        }, params);

        $.ajax(requestParams).done(function (response) {
            var status = response.status !== undefined ? response.status : response.code;
            // 状态为302，重定向到首页
            if (status === 0) {
                deferred.resolve(response);
            }
            else if (status === 302) {
                location.href = response.statusInfo;
            }
            else if (status === 403 || status === 500) {
                location.hash = response.statusInfo;
            }
            else {
                deferred.reject(response);
            }
        }).fail(function (response) {
            deferred.reject(response);
        });
        return deferred.promise();
    }
});

vue.component('ajax', {
    ready: function () {
        if (!this.url) {
            return;
        }
        var me = this;
        $.request(this.url, this.$data).then(function (json) {
            var ns = me.bind.split('.');
            var base = me.$parent.$data;
            for (var i = 0; i < ns.length - 1; i++) {
                base = base[ns[i]];
            }

            base[ns[ns.length - 1]] = json.data || json;
        });
    },
    props: ['url', 'method', 'bind']
});
