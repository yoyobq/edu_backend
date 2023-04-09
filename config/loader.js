/**
 * Egg-Loader 是 Egg.js 框架中的一个插件，它主要用于加载配置和插件，实现了自动化的加载和注册功能，简化了应用程序的开发和维护。
 * config/loader.js 文件主要用于配置 Egg.js 应用程序的 Loader，包括定义要加载的文件类型、目录、以及如何处理这些文件。
 *
 * module.exports = {
 *  customLoader: {
 *     // 自定义 loader 的名称
 *    example: {
 *       // 需要加载的文件所在的目录
 *       directory: '/path/to/example',
 *       // 注入到应用程序中的属性名，这里使用了 'app' 表示注入到 app 属性中
 *       inject: 'app',
 *       // 是否按照单元测试的方式加载文件，默认为 false
 *       loadunit: true,
 *       // 文件名大小写风格，默认为 'lower'
 *       caseStyle: 'lower',
 *       // 需要加载的文件名匹配规则，默认为 **//* .js
 *       match: '**//* .js',
 *       // 需要忽略的文件名匹配规则
 *       ignore: '** /ignore/**//* .js',
 *     },
 *   },
 * };
 */
